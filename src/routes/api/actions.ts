import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { logger } from '../../config/logger';
import * as actionsRepository from '../../repositories/actions';
export const router = express.Router();

router.post(
  '/',
  expressAsyncHandler(async (req, res: any) => {
    const { type, username, course, filename, content, scoreTitle } = req.body;

    try {
      const results = await actionsRepository.create(
        type,
        username,
        course,
        filename,
        content,
        scoreTitle,
      );
      return res.status(201).json(results);
    } catch (err) {
      logger.logger.error(err);
      return res.status(500).json({
        message: err.message,
      });
    }
  })
);

router.get(
  '/',
  expressAsyncHandler(async (req, res: any) => {
    let filename: string | undefined;
    // prettier-ignore
    if (typeof req.query.filename == 'string' && req.query.filename !== 'null') {
      filename = req.query.filename;
    } else {
      let message = 'Invalid filename query parameter: ' + filename;
      logger.logger.error({ message });
      return res.status(400).json({ message });
    }

    let course: string | undefined;
    if (typeof req.query.course == 'string' && req.query.course !== 'null') {
      course = req.query.course;
    }

    let actionType: string | undefined;
    // prettier-ignore
    if (typeof req.query.actionType == 'string' && req.query.actionType !== 'null') {
      actionType = req.query.actionType;
    }

    const pageSize = Number.isNaN(parseInt(req.query.pageSize as string))
      ? null
      : parseInt(req.query.pageSize as string);
    const lastActionId = Number.isNaN(
      parseInt(req.query.lastActionId as string)
    )
      ? null
      : parseInt(req.query.lastActionId as string);

    try {
      const results = await actionsRepository.findAll(
        filename,
        course,
        actionType,
        pageSize,
        lastActionId
      );
      return res.status(200).json(results);
    } catch (err) {
      logger.logger.error(err);
      return res.status(500).json({
        message: err.message,
      });
    }
  })
);
