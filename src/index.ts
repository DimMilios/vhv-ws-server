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
import { app } from './server';

const PORT = process.env.PORT ?? 8080;
const server = app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});

const wss = new Server({ noServer: true });

wss.on('connection', setupWSConnection());
server.on('upgrade', (request: any, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});
