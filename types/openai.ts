import { OPENAI_API_TYPE } from '../utils/app/const';

export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
  label: string;
  heading: string;
  message: string;
}

/* The below are equivalent to the actual model type deployed on deployment center (ex: GPT4o, GPT-3.5, etc..*/
export enum OpenAIModelID {
  //GPT_TUNED = 'tax_specialist_genie', 
 // GPT_FREESTYLE = 'standard_freestyle_genie',
  GPT_5 = 'gpt-5' ,
 GPT_5_MINI = 'gpt-5-mini',
 // GPT_4_1 = 'gpt-4.1',
  ALJAIS = 'aljais',
  CLAUDE_SONNET = 'claude-sonnet-4-5',
}

export const fallbackModelID = OpenAIModelID.GPT_5_MINI;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  // [OpenAIModelID.GPT_TUNED]: {
  //   id: OpenAIModelID.GPT_TUNED,  
  //   name: 'gpt-4o',
  //   maxLength: 96000,
  //   tokenLimit: 32000,
  //   label: 'GPT-4o',
  //   heading: 'Tax Data Tuned Model',
  //   message: 'A specialized model fine-tuned for tax-related queries and calculations.'
  // },
  // [OpenAIModelID.GPT_FREESTYLE]: {
  //   id: OpenAIModelID.GPT_FREESTYLE,
  //   name: 'gpt-4o',
  //   maxLength: 96000,
  //   tokenLimit: 32000,
  //   label: 'GPT-4o',
  //   heading: 'Standard Model',
  //   message: 'A general-purpose model suitable for various tasks and queries.'
  // },
   [OpenAIModelID.GPT_5]: {
    id: OpenAIModelID.GPT_5,
    name: 'gpt-5',
    maxLength: 128000,
    tokenLimit: 272000,
    label: 'GPT-5',
    heading: 'GPT-5',
    message: 'An advanced iteration of GPT-4 with improved reasoning, accuracy, and performance across complex tasks.'
  },
  [OpenAIModelID.GPT_5_MINI]: {
    id: OpenAIModelID.GPT_5_MINI,
    name: 'gpt-5-mini',
    maxLength: 128000,
    tokenLimit: 272000,
    label: 'GPT-5-mini',
    heading: 'GPT-5-mini',
    message: 'The future of AI, with cutting-edge capabilities in a more compact form, delivering intelligent and creative outputs faster and more efficiently.'
  },
[OpenAIModelID.ALJAIS]: {
    id: OpenAIModelID.ALJAIS,
    name: 'aljais',
    maxLength: 8192,
    tokenLimit: 8192,
    label: 'Aljais',
    heading: 'Aljais Model',
    message: 'A specialized AI model optimized for regional language understanding and culturally relevant responses.'
  },
[OpenAIModelID.CLAUDE_SONNET]: {
    id: OpenAIModelID.CLAUDE_SONNET,
    name: 'claude-sonnet-4-5',
    maxLength: 96000,
    tokenLimit: 200000,
    label: 'Claude Sonnet 4.5',
    heading: 'Claude Sonnet 4.5',
    message: 'An advanced AI model with superior reasoning, analysis, and multimodal capabilities for complex tax and business scenarios.'
  },

};