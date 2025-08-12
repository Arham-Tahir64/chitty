export interface Room {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface Message {
  type: string;
  room: string;
  user: string;
  content: string;
  time: string;
}
