import { User } from '@/types';
import { Conversation, Message } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { Space, general_space } from '@/types/space';
import {OpenAIModels} from '@/types/openai';

export interface HomeInitialState {
  apiKey: string;
  pluginKeys: PluginKey[];
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  models: OpenAIModel[];
  selectedModel: any;
  myFiles: any;
  folders: FolderInterface[];
  conversations: Conversation[] | any;
  selectedConversation: Conversation | any;
  spaces: Space[] ;
  activeSpace: Space ;
  messages: Message[] ;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  temperature: number;
  showChatbar: boolean;
  showPromptbar: boolean;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  userData: User;
  workflow:any; //todo change this
  callPromptApi?:boolean 
}

export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  pluginKeys: [],
  lightMode: 'light',
  messageIsStreaming: false,
  modelError: null,
  models: [],
  selectedModel: OpenAIModels[OpenAIModelID.GPT_5],
  myFiles: [],
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  spaces: [],
  activeSpace: general_space,
  messages: [],
  currentMessage: undefined,
  prompts: [],
  temperature: 1,
  showPromptbar: true,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: undefined,
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  userData: {loggedIn: false},
  workflow:[] //todo change this
  
};
