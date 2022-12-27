import express from 'express';

export const router = express.Router();

router.get('/', async (_req, res) => {
  // const comments = await prisma.comment.findMany();
  res.status(200).json();
});

router.post('/', async (req: any, res) => {
  // const {
  //   content,
  //   parentCommentId,
  //   clientId,
  //   documentId,
  //   multiSelectElements,
  // } = req.body;
  // const userId = req.user.id;
  console.log(req.body);

  try {
  } catch (error) {
    console.log(error);
    res.status(400).json('Something went wrong');
  }
});

router.delete('/:commentId', async (req, res, next) => {
  const { userId, documentId, clientId } = req.body;
  const commentId = req?.params?.commentId;

  try {
    return res
      .status(200)
      .json({ msg: `Comment of id: ${commentId} has been deleted` });
  } catch (error) {
    console.log('Could not delete comment with id ', commentId, error);
    next(error);
  }
});

router.delete('/', async (req, res, next) => {
  const { documentId, clientId } = req.body;

  try {
    return res.status(200).json({
      msg: `Comments for document with id: ${documentId} have been deleted`,
    });
  } catch (error) {
    console.log(
      'Could not delete comments for document with id',
      documentId,
      error
    );
    next(error);
  }
});
