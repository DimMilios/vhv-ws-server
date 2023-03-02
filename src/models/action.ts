import { ActionType } from '../types';

export interface IAction {
  id: number;
  created_at?: Date;
  type?: ActionType;
  content?: string;
  username?: string;
  filename?: string;
  course?: string;
}

export class Action implements IAction {
  constructor(
    public id: number,
    public created_at?: Date,
    public type?: ActionType,
    public content?: string,
    public username?: string,
    public filename?: string,
    public course?: string
  ) {}
}
