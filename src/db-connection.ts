import { rejects } from 'assert';
import mysql2 from 'mysql2/promise';

async function makeDb(
  config: mysql2.ConnectionOptions
): Promise<mysql2.Connection> {
  try {
    const connection = await mysql2.createConnection(config);
    // connection.on('enqueue', sequence => {
    //   if ('Query' === sequence.constructor.name) {
    //     console.log('\nExecuted SQL query', sequence.sql, '\n');
    //   }
    // });

    const oldQuery = connection.query;
    connection.query = function (...args) {
      const queryCmd = oldQuery.apply(connection, args);
      console.log(queryCmd.sql);
      return queryCmd;
    };

    console.log('Db initialized and saved to variable');
    return connection;
  } catch (error) {
    console.error(`Database connection failed`, error);
  }
}

const config: mysql2.ConnectionOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export let db: mysql2.Connection;

export function initDB(): void {
  if (!db) {
    makeDb(config).then(conn => {
      db = conn;
      const oldQuery = db.query;
      db.query = function (...args) {
        const queryCmd = oldQuery.apply(db, args);
        console.log('\n\n***Executing query***');
        console.log(args.join('\n'));
        console.log('***Query End***\n');
        return queryCmd;
      };

      const oldExecute = db.execute;
      db.execute = function (...args) {
        const executeCmdPromise = oldExecute.apply(db, args);
        console.log('\n\n***Executing query***');
        console.log(args.join('\n'));
        console.log('***Query End***\n');
        return executeCmdPromise;
      };
    });
  }
}

export function getDb() {
  if (!db) {
    initDB();
  }

  return db;
}
