export interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  draft: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
