import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import actionsRepository from '../../repositories/actions';
export const router = express.Router();

router.post(
  '/',
  expressAsyncHandler(async (req, res: any) => {
    const { type, userId, courseId, content } = req.body;

    try {
      const results = await actionsRepository.create(
        type,
        userId,
        courseId,
        content
      );
      return res.status(201).json(results);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: err.message,
      });
    }
  })
);
