// Chat Mode Definitions and Configurations

export enum ChatMode {
  NORMAL = 'normal',
  PROACTIVE_AI = 'proactive_ai',
  AGENT_BUILDER = 'agent_builder'
}

export interface ChatModeConfig {
  mode: ChatMode;
  maxFileUploads: number;
  maxAudioUploads: number;
  allowMultipleFiles: boolean;
  allowAudioUpload: boolean;
  allowFileUpload: boolean;
  showWorkflowSuggestions: boolean;
  customPlaceholder?: string;
  customInstructions?: string;
  modeLabel?: string;
  modeColor?: string;
}

export const CHAT_MODE_CONFIGS: Record<ChatMode, ChatModeConfig> = {
  [ChatMode.NORMAL]: {
    mode: ChatMode.NORMAL,
    maxFileUploads: 10,
    maxAudioUploads: 5,
    allowMultipleFiles: true,
    allowAudioUpload: true,
    allowFileUpload: true,
    showWorkflowSuggestions: true,
    customPlaceholder: 'Start writing or add a file and Genie will suggest appropriate agents',
    modeLabel: 'Normal Chat',
    modeColor: 'blue'
  },
  [ChatMode.PROACTIVE_AI]: {
    mode: ChatMode.PROACTIVE_AI,
    maxFileUploads: 1,
    maxAudioUploads: 1,
    allowMultipleFiles: false,
    allowAudioUpload: true,
    allowFileUpload: true,
    showWorkflowSuggestions: false,
    customPlaceholder: 'Describe your task (1 file and 1 audio max)',
    customInstructions: 'Proactive AI Mode: Maximum 1 file and 1 audio recording allowed',
    modeLabel: 'Proactive AI',
    modeColor: 'purple'
  },
  [ChatMode.AGENT_BUILDER]: {
    mode: ChatMode.AGENT_BUILDER,
    maxFileUploads: 10,
    maxAudioUploads: 0,
    allowMultipleFiles: true,
    allowAudioUpload: false,
    allowFileUpload: true,
    showWorkflowSuggestions: false,
    customPlaceholder: 'Describe your agent requirements',
    customInstructions: 'Agent Builder Mode: Focus on describing your custom agent needs',
    modeLabel: 'Agent Builder',
    modeColor: 'green'
  }
};

/**
 * Get configuration for a specific chat mode
 */
export function getChatModeConfig(mode: ChatMode | string): ChatModeConfig {
  const chatMode = (mode as ChatMode) || ChatMode.NORMAL;
  return CHAT_MODE_CONFIGS[chatMode] || CHAT_MODE_CONFIGS[ChatMode.NORMAL];
}
