import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { deleteConversation, updateConversation } from '@/utils/app/conversation';
import { downloadFile } from '@/services/fileService';

import { Message } from '@/types/chat';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';
import { CodeBlock } from '../Markdown/CodeBlock';
import rehypeMathjax from 'rehype-mathjax/browser';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from "rehype-raw";

import HomeContext from '@/context/home.context';
import { TbCopy, TbCopyCheck } from "react-icons/tb";
import { getFileIcon } from '../Icons/FileIcons';
import { deleteMessage } from '@/utils/app/conversation';

import Image from 'next/image';
import { useRouter } from 'next/router';
export interface PropsUserMessageBubble {
  message: Message;
  messageIndex: number;
  onEdit?: any;
  messages:any;
  isPrompt?:boolean;
  onDelete:any;
  type?:string;
}
var originalFileNames:any = "";
export const UserMessageBubble: FC<PropsUserMessageBubble> = memo(
  ({messages, message, messageIndex, onEdit, isPrompt,type,onDelete }) => {
    const { t } = useTranslation('chat');
    const router=useRouter();
    const {id}=router.query;
    const {
      state: {
        selectedConversation,
        conversations,
        currentMessage,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
      handleNewConversation
    } = useContext(HomeContext);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setMessageContent(event.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const handleEditMessage = async () => {
      if (message.content != messageContent) {
        if (selectedConversation && onEdit) {
          let messageObj = { ...message, content: messageContent };
          let userId = localStorage.getItem("userId") || 1;
          onEdit(messageContent, messageIndex);
          
        }
      }
      setIsEditing(false);
    };

    const deletingMessage = () => {
      setIsDeleting(true);
    };

    const confirmDelete = () => {
      handleDeleteMessage();
      setIsDeleting(false);
    };

    const cancelDelete = () => {
      setIsDeleting(false);
    };

    const handleDeleteMessage = async () => {
      console.log("selectedConversation", selectedConversation);

      if(type=="agent"){
        if(onDelete){
           onDelete(messageContent, messageIndex);
        }
      }else{const { messages } = selectedConversation;
      
      if (messageIndex < 0) return;

      let deleteCount = 1;
      
      if (
        messageIndex < messages.length - 1 &&
        messages[messageIndex + 1].role === 'assistant'
      ) {
        deleteCount = 2;
      }
      
      let userId = localStorage.getItem("userId") || 1;
      
      try {
        // Delete from backend first
       const res= await deleteMessage(selectedConversation.id, userId, messageIndex);
        
        // if (deleteCount === 2) {
        //   await deleteMessage(selectedConversation.id, userId, messageIndex + 1);
        // }
         if(messageIndex===0&&messages.length===2&&id!==""){
          deleteConversation(userId, id).then((res: any) => {
                  handleNewConversation();
                });
        }
        // Only update local state if API calls succeed
        messages.splice(messageIndex, deleteCount);
        
        const updatedConversation = {
          ...selectedConversation,
          messages,
        };

        const { single, all } = updateConversation(
          updatedConversation,
          conversations,
        );
       
        homeDispatch({ field: 'selectedConversation', value: single });
        homeDispatch({ field: 'conversations', value: all });
      } catch (error) {
        console.error("Failed to delete message:", error);
        // Optionally show error to user
      }}
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const showFiles = (message: any) => {
      if (message?.file) {
        const azureFileNames = message.file.map((file: any) => file.azureFileName);
        const originalFileNames = message.file.map((file: any) => file.originalFileName);
        return (
          <div className='flex flex-wrap gap-1 items-center py-1'>
            {originalFileNames.map((fileName: any, idx:number) => (
              <div key={idx} className='flex gap-1 bg-gray-100 p-3 rounded-2xl w-auto max-w-[200px]'>
                <div className="flex items-center justify-center relative">
                  {getFileIcon(fileName)}
                </div>
                <div className="min-w-0 relative cursor-pointer" onClick={()=>downloadFile(azureFileNames[idx], originalFileNames)}>
                  <p className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                    {fileName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };


   
    const handleCopy = async () => {
      if (!navigator.clipboard) return;
      try {
          await navigator.clipboard.writeText(message.content);
          setMessageCopied(true);
          setTimeout(() => setMessageCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy:', err);
      }
    };

    useEffect(() => {
      setMessageContent(message.content);
    }, [message.content]);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

   
    return (
      <>
        <div className="flex justify-between w-full bg-white dark:bg-[#1e1e1e] rounded-md">
          {isEditing ? (
            <div className="flex w-full flex-col items-start font-calibri text-black dark:text-gray-100 text-[12px] font-semibold">
              <textarea
                dir="ltr"
                ref={textareaRef}
                className="w-full whitespace-pre-wrap border-none font-calibri text-black dark:text-gray-100 bg-transparent text-[12px] font-semibold mb-2 focus:outline-none"
                value={messageContent}
                onChange={handleInputChange}
                onKeyDown={handlePressEnter}
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  overflow: 'hidden',
                }}
              />

                    <div className=" flex justify-center space-x-4">
                      <button
                        className=""
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
<IconCheck size={18} className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors" strokeWidth={1}/>
                      </button>
                      <button
                        className=""
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
<IconX size={18} className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors" strokeWidth={1}/>
                      </button>
                    </div>
                  </div>
                ) : (
<div dir='ltr' className="flex flex-col font-calibri text-black dark:text-gray-100 text-[12px] font-semibold text-left">
                    {message.content}
                    {showFiles(message)}
                  </div>
                  
                )}

                {!isEditing && (
                  isDeleting ? (
                    <div className="flex gap-2">
                      <button
                        className=""
                        onClick={confirmDelete}
                        title="Confirm delete"
                      >
                        <IconCheck size={18} color='green' strokeWidth={2}/>
                      </button>
                      <button
                        className=""
                        onClick={cancelDelete}
                        title="Cancel"
                      >
                        <IconX size={18} color='red' strokeWidth={2}/>
                      </button>
                    </div>
                  ) : (
                  <div  className="md:-mr-8 mr-1 md:mr-4 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                    <button
                      className=""
                      onClick={handleCopy}
                      disabled={messageContent.trim().length <= 0}
                    > {messagedCopied ? TbCopyCheck({size:18, color:'gray', strokeWidth:1}) as JSX.Element
                      : TbCopy({size:18, color:'gray', strokeWidth:1}) as JSX.Element
                      }
                    </button>
                    <button
                      className=""
                      onClick={toggleEditing}
                    >
<IconEdit size={18} className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white" strokeWidth={1}/>
                    </button>
                    <button
                      className=""
                      onClick={deletingMessage}
                    >
<IconTrash size={18} className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors" strokeWidth={1}/>
                    </button>
                  </div>
                  )
                )}

              </div>

    </>
    );
  },
);
UserMessageBubble.displayName = 'UserMessageBubble';


export interface PropsAssistantMessageBubble {
  message: Message;
  messageIndex: number;
  onRegenerate?: any;
  isPrompt?:boolean
}

export const AssistantMessageBubble: FC<PropsAssistantMessageBubble> = memo(
  ({ message, messageIndex, onRegenerate }) => {

    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);

    const handleCopy = async () => {
      if (!navigator.clipboard) return;
      try {
          await navigator.clipboard.writeText(message.content);
          setMessageCopied(true);
          setTimeout(() => setMessageCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy:', err);
      }
    };

    useEffect(() => {
      setMessageContent(message.content);
    }, [message.content]);

const markdownText =
  typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content, null, 2);
    return (
      <>
		    <div className="group prose-sm mt-0 w-full dark:prose-invert">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-start space-y-2 md:space-y-0 md:space-x-4">
                {/* Markdown Content */}
                <div className="w-full">
                    <MemoizedReactMarkdown
                        className="prose-sm dark:prose-invert dark:text-[#e8ebec] w-full mark-down "
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeMathjax,rehypeRaw as any]}
                        skipHtml={false}
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                if (children.length && children[0] === '▍') {
                                    return (
                                        <span className="animate-pulse cursor-default inline-block align-middle text-base leading-none text-gray-800 dark:text-gray-200">
                                            ▍
                                        </span>
                                    );
                                }

                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                    <CodeBlock
                                        key={Math.random()}
                                        language={(match && match[1]) || ''}
                                        value={String(children).replace(/\n$/, '')}
                                        {...props}
                                    />
                                ) : (
                                    <code
                                        className={`rounded bg-gray-100 px-1 py-[2px] text-xs font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-100 ${className || ''}`}
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                );
                            },
                            pre({ children }) {
                              return (
                                <pre className="overflow-auto rounded bg-gray-900 p-3 text-gray-100 text-xs my-2">
                                  {children}
                                </pre>
                              );
                            },
                            table({ children }) {
                                return (
                                    <div className="overflow-x-auto my-2">
                                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                                            {children}
                                        </table>
                                    </div>
                                );
                            },

                            th({ children }) {
                                return (
                                    <th className="whitespace-nowrap border border-gray-300 bg-gray-900 px-2 py-1 text-left text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                                        {children}
                                    </th>
                                );
                            },

                            td({ children }) {
                                return (
                                    <td className="break-words border border-gray-200 px-2 py-1 align-top text-gray-800 dark:border-gray-700 dark:text-gray-200">
                                        {children}
                                    </td>
                                );
                            },
                        }}
                    >
                      {markdownText}
                    </MemoizedReactMarkdown>
                </div>

            </div>
        </div>

        {/* Citations Section - Matching source.png design */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {message.citations.map((citation: any, citIndex: number) => (
              <button 
                key={citIndex} 
                onClick={async () => {
                  const userUploaded = isUUIDFileName(citation.file_name);
                  if (userUploaded) {
                    downloadFile(citation.file_name, citation.file_name);
                  } else {
                    try {
                      const response = await fetch(`/api/download_citation_file?file_name=${encodeURIComponent(citation.file_name)}`);
                      if (!response.ok) throw new Error('Download failed');
                      
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = citation.file_name;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Citation download failed:', error);
                      alert('Failed to download file. Please try again.');
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                // title={`${citation.file_name}${citation.page && citation.page !== 'N/A' ? ` - Page ${citation.page}` : ''}\n\n"${citation.excerpt}"\n\nClick to download file`}
                title={"Click to download file"}
             >
                <span className="inline-flex items-center justify-center w-4 h-4 bg-black dark:bg-white text-white dark:text-black rounded-sm text-[9px] font-bold">
                  {citIndex + 1}
                </span>
                <span className="text-[11px] truncate max-w-[150px]" title={citation.file_name}>
                  {citation.file_name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 "
                onClick={() => onRegenerate(messageIndex - 1)}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="tabler-icon tabler-icon-regenerate"
                >
                    <path d="M21 12a9 9 0 1 1-3.5-7.1" />
                    <polyline points="22 4 21 10 15 9" />
                </svg>
                <span className="font-calibri text-[12px] font-medium">Regenerate</span>
            </button>

            <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="tabler-icon tabler-icon-copy"
                >
                    <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
                    <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
                </svg>
                {messagedCopied ? (
                  <span className="font-calibri text-[12px] font-medium">Copied...</span>
                ) : (
                  <span className="font-calibri text-[12px] font-medium">Copy Response</span>
                )}
            </button>
        </div>
      </>
    );
  },
);


export function isUUIDFileName(fileName: string): boolean {
  if (!fileName) return false;

  // Remove path (if any) and extension
  const baseName = fileName.split("/").pop()?.split("\\").pop();
  if (!baseName) return false;

  const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(nameWithoutExt);
}
