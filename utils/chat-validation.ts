// Chat Mode Validation Utilities

import { ChatMode, ChatModeConfig } from '@/types/chat-modes';

export interface ValidationResult {
  allowed: boolean;
  message?: string;
}

export interface FileSlots {
  used: number;
  available: number;
  total: number;
}

export class ChatModeValidator {
  /**
   * Check if file upload is allowed
   */
  static canUploadFile(
    currentFiles: number,
    config: ChatModeConfig
  ): ValidationResult {
    if (!config.allowFileUpload) {
      return {
        allowed: false,
        message: 'File upload is disabled in this mode'
      };
    }
    
    if (currentFiles >= config.maxFileUploads) {
      return {
        allowed: false,
        message: `Maximum ${config.maxFileUploads} file(s) allowed in ${config.modeLabel || config.mode} mode`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check if audio upload is allowed
   */
  static canUploadAudio(
    currentAudios: number,
    config: ChatModeConfig
  ): ValidationResult {
    if (!config.allowAudioUpload) {
      return {
        allowed: false,
        message: 'Audio upload is disabled in this mode'
      };
    }
    
    if (currentAudios >= config.maxAudioUploads) {
      return {
        allowed: false,
        message: `Maximum ${config.maxAudioUploads} audio file(s) allowed in ${config.modeLabel || config.mode} mode`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Get file upload slots information
   */
  static getFileSlots(
    currentFiles: number,
    config: ChatModeConfig
  ): FileSlots {
    return {
      used: currentFiles,
      available: Math.max(0, config.maxFileUploads - currentFiles),
      total: config.maxFileUploads
    };
  }
  
  /**
   * Get audio upload slots information
   */
  static getAudioSlots(
    currentAudios: number,
    config: ChatModeConfig
  ): FileSlots {
    return {
      used: currentAudios,
      available: Math.max(0, config.maxAudioUploads - currentAudios),
      total: config.maxAudioUploads
    };
  }
  
  /**
   * Check if multiple files can be selected
   */
  static canSelectMultipleFiles(config: ChatModeConfig): boolean {
    return config.allowMultipleFiles && config.maxFileUploads > 1;
  }
  
  /**
   * Get maximum files that can be added
   */
  static getMaxFilesToAdd(
    currentFiles: number,
    config: ChatModeConfig
  ): number {
    return Math.max(0, config.maxFileUploads - currentFiles);
  }
}
