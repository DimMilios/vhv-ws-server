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
  change_pitch = 'change_pitch',
  change_chord = 'change_chord',
  add_comment = 'add_comment',
  undo = 'undo',
  transpose = 'transpose',
  connect = 'connect',
  disconnect = 'disconnect',
  export = 'export',
}
