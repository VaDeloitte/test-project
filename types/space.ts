import { Conversation, Message } from "./chat";

export interface Space {
  id?: string;
  name: string;
  region?: string;
  lifetime?: Date | string | null;
  users?: string[];
  documents?: File[];
  conversations?: Conversation[];
}

export const general_space:Space = {
    id: "general_space",
    name: "General Space",
}