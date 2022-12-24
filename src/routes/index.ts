import express from 'express';
// import fsp from 'fs/promises';
import path from 'path';
export const router = express.Router();

router.get('/', (req, res) => {
  res.send('<h1>Bye</h1>');
});

/*
router.get('/features', (req, res) => {
  fsp
    .readFile(path.resolve(process.cwd(), 'features.json'))
    .then(features => {
      res.send(200).json(features);
    })
    .catch(err => {
      res.send(400).json({ error: 'Could not get features' });
    });
});
*/
