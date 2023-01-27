import dotenv from 'dotenv';
import path from 'path';
dotenv.config({
  path: path.resolve(
    process.cwd(),
    process.env?.NODE_ENV === 'production' ? '.env' : 'development.env'
  ),
});

console.log('Process config', process.env.DB_HOST, process.env.DB_DATABASE);
import { Server } from 'ws';
import { setupWSConnection } from './config/websocket/wsUtils';
import { initDB } from './db-connection';

const PORT = process.env.PORT ?? 8080;

if (process.env.YPERSISTENCE === 'mysql') {
  initDB();
}
/*
const server = app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
*/

import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';

import type { ErrorRequestHandler } from 'express';
import cors from 'cors';

import { router as indexRouter } from './routes';
import { router as commentsRouter } from './routes/api/comments';
import { router as documentsRouter } from './routes/api/documents';
import { router as userRouter } from './routes/api/users';
import { router as actionsRouter } from './routes/api/actions';

import CustomError from './util/error';

export const app = express();

// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(cors({ origin: '*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/ping', async (_req, res) => {
  return res.status(200).json({
    message: 'pong',
  });
});

app.use('/', indexRouter);

app.use('/api/users', userRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/actions', actionsRouter);

app.get('/not-found', (req, res) => {
  return res.render('error', {
    message: 'Resource not found',
  });
});

app.get('*', (req, res, next) => {
  const error = new CustomError(
    301,
    `${req.ip} tried to access ${req.originalUrl}`
  );
  next(error);
});

let errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (!error.statusCode) {
    error.statusCode = 500;
  }

  if (error.statusCode === 301) {
    return res.status(301).send('ops');
  }

  return res.status(error.statusCode).json({ error: error.toString() });
};
app.use(errorHandler);

let server: https.Server | http.Server;

let keyPath = 'musicolab.hmu.gr.key';
let certPath = 'musicolab.hmu.gr.crt';

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const privateKey = fs.readFileSync(keyPath);
  const certificate = fs.readFileSync(certPath);

  server = https.createServer(
    {
      key: privateKey,
      cert: certificate,
    },
    app
  );

  server.on('connection', e => {
    console.log(`Connection event: ${e}`);
  });

  server.on('secureConnection', e => {
    console.log(`Secure Connection event: ${e}`);
  });

  server.on('tlsClientError', e => {
    console.log(`TLS Client Error event: ${e}`);
  });
} else {
  server = http.createServer(app);
}

const wss = new Server({ noServer: true });
wss.on('connection', setupWSConnection());

server.on('upgrade', (request: any, socket, head) => {
  console.log(`[${new Date().toISOString()}]: Received upgrade request`);
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => `Server running at localhost:${PORT}`);
