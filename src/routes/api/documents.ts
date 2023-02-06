import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { db } from '../../db-connection';
export const router = express.Router();

router.get(
  '/room-id',
  expressAsyncHandler(async (req: express.Request, res: any) => {
    return res.status(501).end();

    const fileName = req.query.fileName;
    const username = req.query.username;
    console.log({ fileName, username, query: req.query });

    if (!fileName || !username) {
      return res.status(400).json({ error: 'Missing required parameters ' });
    }

    const results = {
      documents: null,
      usersForCurrentDocument: null,
    };

    // TODO: Add types
    const { pool: db2 } = (await db()) as any;

    const documents = await db2.query(
      `
      SELECT d.id as document_id, du.user_id, u.lastname, u.username
      FROM documents d
      INNER JOIN documents_users du
        ON du.document_id = d.id
      INNER JOIN moodle.user u
        ON u.id = du.user_id
      WHERE d.title = ? AND u.username = ?`,
      [fileName, username]
    );
    results.documents = documents;

    if (documents?.length > 0 && documents[0]?.document_id) {
      const usersForCurrentDocument = await db2.query(
        `SELECT u.id, u.username, u.firstname, u.lastname
        FROM moodle.user u
        INNER JOIN documents_users du
          ON u.id = du.user_id
        INNER JOIN documents d
          ON d.id = du.document_id
        WHERE d.id = ?`,
        [documents[0].document_id]
      );

      results.usersForCurrentDocument = usersForCurrentDocument;
    }

    return res.status(200).json(results);
  })
);

router.post(
  '/updates',
  expressAsyncHandler(async (req: express.Request, res: any) => {
    const filename = req.query.filename ?? 'bluesag.krn';
    const username = req.query.username ?? 'milios';
    const course = req.query.course ?? 'bluesag';
    console.log({ filename, username, course });
    console.log({ ace: JSON.stringify(req.body) });

    const data = JSON.stringify({
      ace: JSON.stringify(req.body.data.ace.content),
      comments: JSON.stringify(req.body.data.comments.content),
    });

    const { pool: db2 } = (await db()) as any;

    try {
      const results = await db2.query(
        `
        INSERT INTO document_updates (filename, username, course, doc_update)
        VALUES (?, ?, ?, ?)`,
        [filename, username, course, req.body.data]
      );

      console.log({ results });
      return res.status(200).json(results);
    } catch (error) {
      console.error(error);
    }
  })
);

router.post(
  '/',
  expressAsyncHandler(async (req: any, res: express.Response, next) => {
    let documents = req.user?.documents;

    const title = req.body['document-title'];
    const user = req.user;
    console.log({ title, user });

    res.redirect('/dashboard');
  })
);

router.delete('/:docId', async (req, res, next) => {
  const docId = parseInt(req.params.docId, 10);
  console.log({ docId });

  try {
  } catch (error) {
    console.log('Could not deleted document with id ', docId, error);
    next(error);
  }
});

router.put('/:docId', async (req: any, res, next) => {
  const docId = parseInt(req.params.docId, 10);
  console.log({ docId });

  try {
  } catch (error) {
    console.log('Could not deleted document with id ', docId, error);
    next(error);
  }
});
