import mysql from 'mysql';
import util from 'util';

function makeDb(config) {
  const connection = mysql.createConnection(config);

  connection.on('enqueue', sequence => {
    if ('Query' === sequence.constructor.name) {
      console.log('\nExecuted SQL query', sequence.sql, '\n');
    }
  });

  return {
    query(sql, args) {
      return util.promisify(connection.query).call(connection, sql, args);
    },
    close() {
      return util.promisify(connection.end).call(connection);
    },
  };
}

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

let db;
export function getDbConnection() {
  if (!db) {
    db = makeDb(config);
  }

  return db;
}
