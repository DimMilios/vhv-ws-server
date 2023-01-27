import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

export type QueryResult =
  | RowDataPacket[][]
  | RowDataPacket[]
  | OkPacket
  | OkPacket[]
  | ResultSetHeader;

export function isOkPacket(result: QueryResult): result is OkPacket {
  return 'insertId' in result && 'affectedRows' in result;
}

export type QueryError = {
  message?: string;
  query?: string;
};

export enum ActionType {
  notes = 'notes',
  chords = 'chords',
  score = 'score',
  comments = 'comments',
}
