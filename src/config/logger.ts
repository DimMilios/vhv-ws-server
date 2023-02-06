import pinoHttp from 'pino-http';

export const logger = pinoHttp({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
