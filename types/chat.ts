import { OpenAIModel } from './openai';
import { WorkflowI } from './workflow';

export interface Message {
  role: Role;
  content: string | any;
  file?: any;  // Assuming you're using the File API for uploaded files
  prompt?:any;
  timestamp?: string;
  citations?: Array<{file_name: string; excerpt: string}>;  // ✅ RAG citations from backend
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
  userId?: string | null;
  workflow?: WorkflowI | null;
}
