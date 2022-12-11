import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';

import { router as indexRouter } from './routes';
import { router as commentsRouter } from './routes/api/comments';
import { router as documentsRouter } from './routes/api/documents';
import { router as userRouter } from './routes/api/users';

import CustomError from './util/error';

export const app = express();
// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(cors({ origin: '*', credentials: true }));

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
