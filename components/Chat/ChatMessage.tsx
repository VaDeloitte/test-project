import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconFile,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/context/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getFileIcon } from '@/utils/helper/helper';
import { useRouter } from 'next/router';
import { deleteMessage } from '@/utils/app/conversation';

import Image from 'next/image';
export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message,messageObj?:any) => void;
  isPrompt?:boolean
}
var originalFileNames:any = "";
export const ChatMessage: FC<Props> = memo(
  ({ message, messageIndex, onEdit, isPrompt }) => {
    const { t } = useTranslation('chat');

    const {
      state: {
        selectedConversation,
        conversations,
        currentMessage,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
    } = useContext(HomeContext);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const router = useRouter();
    const { id, conversationId } = router.query;  // Retrieve 'id' from the route

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
          onEdit(message, messageObj);
          
        }
      }
      setIsEditing(false);
    };

    const handleDeleteMessage = () => {
      console.log("selectedConversationselectedConversation",selectedConversation)

      const { messages } = selectedConversation;
      // const findIndex = messages.findIndex((elm:any) => elm === message);
      // console.log("findIndexfindIndex",findIndex)
      if (messageIndex < 0) return;

      if (
        messageIndex < messages.length - 1 &&
        messages[messageIndex + 1].role === 'assistant'
      ) {
        //  messages.splice(messageIndex, 2);
      } else {
        // messages.splice(messageIndex, 1);
        
      }
      messages.splice(messageIndex, 1)
      const updatedConversation = {
        ...selectedConversation,
        messages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );
      let userId = localStorage.getItem("userId") || 1;
      // homeDispatch({ field: 'selectedConversation', value: single });
      // homeDispatch({ field: 'conversations', value: all });
       deleteMessage(selectedConversation.id, userId, messageIndex);
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const handleFileImage = (message:any) => {
      if (message?.file) {
          // Extract 'originalFileName' from each file object and join them with a newline
           originalFileNames = message.file.map((file:any) => file.originalFileName);
          return originalFileNames && originalFileNames.map((fileName:any) => <div className="inline-flex items-center xl:text-[14px] text-[12px] xl:min-w-[180px] min-w-[100px]"> <Image
          src={getFileIcon(fileName)}
          alt="Genie"
          height={50}
          width={50}
          className="ml-2 max-w-[50px]"

      />{fileName} </div>);
      }
      return '';
  };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      navigator.clipboard.writeText(message.content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
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
      {message.content && !message.content.includes('Ask How Can I Help You Today? only')  ? <div
        className={`group md:px-4 ${
          message.role === 'assistant'
            ? '  text-gray-800   dark:text-gray-100'
            : ' bg-transparent text-gray-800  dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >

        <div className={`relative  flex p-4 text-base gap-2 md:gap-4 md:py-6 lg:px-0`} dir={message.role !== 'assistant' ? 'rtl':''}>
          <div className="text-right font-bold flex">
            {message.role === 'assistant' ? (
              <>
              <Image src={`/assets/logo-with-shadow.svg`} alt="Tax Genie logo" height={20} width={20} /></>
            ) : (
              <></>
            )}
          </div>
              
          <div className={`${isPrompt ? '':'prose-lg'} mt-[-2px] w-full dark:prose-invert mr-[20px]`}>
            
            {message.role === 'user'  ? (
              <div className="flex w-full">
                {isEditing ? (
                  <div className="flex w-full flex-col ">
                    <textarea
                      dir="ltr"
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-primary m-0 p-3 "
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

                    <div className="mt-8 flex justify-center space-x-4">
                      <button
                        className="h-[35px] rounded-md bg-default px-4  text-sm font-medium text-white enabled:hover:bg-secondary ml-4 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[35px] rounded-md border border-neutral-300 px-4  text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div  dir='ltr' className="flex flex-col text-left items-end">
                  <div dir='rtl'>  {handleFileImage(message)} </div>
                  {message.content && !message.content.includes('Ask How Can I Help You Today? only one time') ? <div className="prose-xl whitespace-pre-wrap dark:prose-invert  dark:bg-default bg-white dark:text-white px-4 py-1 mt-[2px] rounded-2xl ml-auto">
                  {message.content && !message.content.includes('Ask How Can I Help You Today? only one time') ? message.content:''}
                  </div>:null}
                  </div>
                  
                )}

                {!isEditing && (
                  <div  className="md:-mr-8 mr-1 md:mr-4 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={toggleEditing}
                    >
                      <IconEdit size={20} />
                    </button>
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash size={20} />
                    </button>
                  </div>
                )}

              </div>

            ) : (
              <div className={`flex ${isPrompt ? ' first-message':''} ${message && message.content && message.content.length >  100 ? 'space-right':''}`}>
                <MemoizedReactMarkdown
                  className={` ${isPrompt ? ' ':'dark:prose-invert w-full'} ${message?.file ? 'mark-down':''}`}
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeMathjax]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      if (children.length) {
                        if (children[0] == '▍') {
                          return (
                            <span className="animate-pulse cursor-default mt-1">
                              ▍
                            </span>
                          );
                        }

                        children[0] = (children[0] as string).replace(
                          '`▍`',
                          '▍',
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
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                          {children}
                        </table>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="break-words border border-black px-3 py-1 dark:border-white">
                          {children}
                        </td>
                      );
                    },
                  }}
                >
                 
                  {`${message.content} ${
                    messageIsStreaming &&
                    messageIndex ==
                      (selectedConversation?.messages.length ?? 0) - 1
                      ? '`▍`'
                      : ''
                  }`}
                </MemoizedReactMarkdown>
                {!message.file && <div className="md:-mr-40 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  {messagedCopied ? (
                    <IconCheck
                      size={20}
                      className="text-green-500 dark:text-green-400"
                    />
                  ) : (
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-1 ml-2"
                      onClick={copyOnClick}
                    >
                      <IconCopy size={20} />
                    </button>
                  )}
                </div>}
              </div>
            )}
          </div>
        </div>
      </div>:null}</>
    );
  },
);
ChatMessage.displayName = 'ChatMessage';
