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
  createdAt?: string;
  created_at?: string;
}

export interface ChatMessage {
  type: 'chat';
  room: string;
  user: string;
  content: string;
  time: string;
}

export interface Member {
  id: string;
  name: string;
}
