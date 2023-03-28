import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as mutex from 'lib0/mutex';
import * as map from 'lib0/map';

import debounce from 'lodash.debounce';

import { fromUint8Array, toUint8Array } from 'js-base64';

import * as actionsRepository from '../../repositories/actions';

const callbackHandler = require('./callback').callbackHandler;
const isCallbackSet = require('./callback').isCallbackSet;
import { URLSearchParams } from 'url';
import { db } from '../../db-connection';
import { logger } from '../logger';
import WebSocket from 'ws';
import { ActionType } from '../../types';

const CALLBACK_DEBOUNCE_WAIT =
  parseInt(process.env.CALLBACK_DEBOUNCE_WAIT) || 2000;
const CALLBACK_DEBOUNCE_MAXWAIT =
  parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT) || 10000;

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0';
const persistenceDir = process.env.YPERSISTENCE;

/**
 * @type {{bindState: function(string,WSSharedDoc):void, writeState:function(string,WSSharedDoc):Promise<any>, provider: any}|null}
 */
let persistence = null;

if (typeof persistenceDir === 'string') {
  console.info('Persisting documents to "' + persistenceDir + '"');
  // @ts-ignore
  persistence = {
    // Retrieve data from DB and apply to Yjs document
    bindState: async (identifier, ydoc) => {
      console.log('===BindState');
      // let params = new URLSearchParams(identifier);
      // let docId = Number(params.get('docId'));
      // let title = params.get('fileName');
      // if (!docId || !title) {
      //   console.error(
      //     'Missing required data to load document data from database'
      //   );
      //   return;
      // }

      // const results = await db.query(
      //   `
      //   SELECT d.y_doc_state
      //   FROM documents d
      //   WHERE d.id = ? AND d.title = ?`,
      //   [docId, title]
      // );

      // if (results?.length > 0 && results[0]?.y_doc_state?.length > 0) {
      //   let binaryEncoded = toUint8Array(results[0].y_doc_state);
      //   Y.applyUpdate(ydoc, binaryEncoded);
      // }

      // console.log('Loaded state for document');
    },
    // Store Yjs document data to DB
    writeState: async (identifier, ydoc) => {
      // console.log('===WriteState===');
      // let params = new URLSearchParams(identifier);
      // let docId = Number(params.get('docId'));
      // let title = params.get('fileName');
      // if (!docId || !title) {
      //   console.error('Missing required data to persist document to database');
      //   return;
      // }
      // const state = fromUint8Array(Y.encodeStateAsUpdate(ydoc));
      // const { pool } = await db();
      // const results = pool.pool.query(
      //   `
      //   INSERT INTO documents (id, title, y_doc_state)
      //   VALUES (?, ?, ?)
      //   ON DUPLICATE KEY
      //     UPDATE title=?, y_doc_state=?`,
      //   [docId, title, state, title, state]
      // );
    },
  };
}

/**
 * @param {{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>,provider:any}|null} persistence_
 */
export const setPersistence = persistence_ => {
  persistence = persistence_;
};

/**
 * @return {null|{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
 */
export const getPersistence = () => persistence;

export const docs: Map<string, WSSharedDoc> = new Map();
// exporting docs so that others can use it

const messageSync = 0;
const messageAwareness = 1;
// const messageAuth = 2
const messageActionsReset = 100;

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

export class WSSharedDoc extends Y.Doc {
  name: string;
  mux: mutex.mutex;
  /**
   * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
   */
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: gcEnabled });
    this.name = name;
    this.mux = mutex.createMutex();
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs: Set<number> = this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID: number) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID: number) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };
    this.awareness.on('update', awarenessChangeHandler);
    this.on('update', updateHandler);
    if (isCallbackSet) {
      this.on(
        'update',
        debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
          maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
        })
      );
    }
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param docname - the name of the Y.Doc to find or create
 * @param gc - whether to allow gc on the doc (applies only when created)
 */
export const getYDoc = (docname: string, gc: boolean = true): WSSharedDoc =>
  map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (persistence !== null) {
      logger.logger.info('Binding doc to persistence', docname);
      persistence.bindState(docname, doc);
    }
    docs.set(docname, doc);
    return doc;
  });

const messageListener = (
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array
) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, null);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
      case messageActionsReset: {
        logger.logger.info('Received actions reset message');
        // Broadcast a message to all peers so that they can refetch and populate their interaction history
        doc.conns.forEach((_, conn) => send(doc, conn, message));
        break;
      }
    }
  } catch (err) {
    console.error(err);
    doc.emit('error', [err]);
  }
};

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc: WSSharedDoc, conn: any) => {
  if (doc.conns.has(conn)) {
    const controlledIds: Set<number> = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );
    if (doc.conns.size === 0 && persistence !== null) {
      logger.logger.info(
        'All connections are closed. Destroying Yjs document.'
      );
      // if persisted, we store state and destroy ydocument
      persistence?.writeState(doc.name, doc).then(() => {
        doc.destroy();
      });
      docs.delete(doc.name);
    }
  }
  conn.close();
};

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, (err: any) => {
      err != null && closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

/**
 * @param {any} conn
 * @param {any} req
 * @param {any} opts
 */
export const setupWSConnection = () => {
  return (
    conn: WebSocket,
    req: { url: string },
    { docName = req.url.slice(1).split('?')[0], gc = true } = {}
  ) => {
    logger.logger.info(
      'Setting up a new WebSocket connection for room: ' + docName
    );

    conn.binaryType = 'arraybuffer';
    // get doc, initialize if it does not exist yet
    const doc = getYDoc(docName, gc);
    doc.conns.set(conn, new Set());

    const searchParams = new URLSearchParams(req.url.slice(1).split('?')[1]);
    let connectId: number | undefined;

    actionsRepository
      .create(
        ActionType.connect,
        searchParams.get('username'),
        searchParams.get('course') === 'null'
          ? null
          : searchParams.get('course'),
        searchParams.get('file'),
        null
      )
      .then(res => {
        logger.logger.info(res);
        connectId = res.insertId;
      })
      .catch(err => {
        logger.logger.error(err);
      });

    logger.logger.info(
      `${doc.conns.size} active connections on doc: ${doc.guid}`
    );
    // listen and reply to events
    conn.on('message', (message: ArrayBuffer) => {
      messageListener(conn, doc, new Uint8Array(message));
    });

    // Check if connection is still alive
    let pongReceived = true;
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        if (doc.conns.has(conn)) {
          closeConn(doc, conn);
        }
        clearInterval(pingInterval);
      } else if (doc.conns.has(conn)) {
        pongReceived = false;
        try {
          conn.ping();
        } catch (e) {
          closeConn(doc, conn);
          clearInterval(pingInterval);
        }
      }
    }, pingTimeout);
    conn.on('close', () => {
      closeConn(doc, conn);
      clearInterval(pingInterval);
      logger.logger.info(
        `A connection was closed, number for active connections: ${doc.conns.size}`
      );

      actionsRepository
        .create(
          ActionType.disconnect,
          searchParams.get('username'),
          searchParams.get('course') === 'null'
            ? null
            : searchParams.get('course'),
          searchParams.get('file'),
          JSON.stringify({ connectId })
        )
        .then(res => logger.logger.info(res))
        .catch(err => {
          logger.logger.error(err);
        });
    });
    conn.on('pong', () => {
      pongReceived = true;
    });
    // put the following in a variables in a block so the interval handlers don't keep in in
    // scope
    {
      // send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      send(doc, conn, encoding.toUint8Array(encoder));
      const awarenessStates = doc.awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(awarenessStates.keys())
          )
        );
        send(doc, conn, encoding.toUint8Array(encoder));
      }
    }
  };
};
