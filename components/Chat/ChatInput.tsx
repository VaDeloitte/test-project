import {
  IconArrowDown,
  IconBolt,
  IconBrandGoogle,
  IconPlayerStop,
  IconRepeat,
  IconSend,
  IconPaperclip,
  IconTrash,
  IconFile
} from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
  
import HomeContext from '@/context/home.context';
import { useRouter } from 'next/router';

import { PluginSelect } from './PluginSelect';
import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';
import { handleFileChange } from '@/utils/app/handleFileChange';
import Terms from '../Modals/Terms';
import { getFileIcon } from '@/utils/helper/helper';
import Image from 'next/image';
import {
  saveFiles,
  getFiles
} from '@/utils/app/conversation';
import { uploadDocuments } from '@/services/uploadService';
import { AuthContext } from '@/utils/app/azureAD';
import FileDisplay from './FileDisplay';

// interface FileDisplayProps {
//   file: File;
//   onRemove: (file: File) => void;  // Function to call when the remove button is clicked
//   isUploading: boolean;

// }

interface Props {
  onSend: (message: Message, plugin: Plugin | null, file?: any) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  onUpload: any;
  token: any;
  handleStopConversation: () => void
}


export const ChatInput = (props: any) => {
  const {
    onSend,
    onRegenerate,
    onScrollDownClick,
    textareaRef,
    showScrollDownButton,
    onUpload,
    handleStopConversation,
    token,
  }: Props = props;
  const { t } = useTranslation('chat');
  const [files, setFiles] = useState<File[]>([]);
  const {
    state: { selectedConversation, messageIsStreaming, prompts, conversations },

    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const authContext = useContext(AuthContext);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showPluginSelect, setShowPluginSelect] = useState(false);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errorMessage, setMessageError] = useState<any>('');
  const [errorMessageStyle, setMessageStyle] = useState<any>('');
  const [label, setLabel] = useState<any>('');
  const promptListRef = useRef<HTMLUListElement | null>(null);
  const router = useRouter();


  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = selectedConversation?.model.maxLength;
    setMessageError("");

    if (maxLength && value.length > maxLength) {
      setMessageError(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setContent(value);
    updatePromptListVisibility(value);
  };

  // const FileDisplay: React.FC<FileDisplayProps> = ({ file, isUploading, onRemove }) => {
  //   return (
  //     <div className="dark:bg-[#343540] bg-[#FFF0A44D] border dark:border-[#B7B7B7] border-[#C5C5D1] mb-2 file-info flex  justify-between items-center file-info mr-2 px-4 py-1 rounded-lg text-black dark:text-white">
  //       <div>
  //         <div className="inline-flex items-center xl:text-[14px] text-[12px] xl:min-w-[180px] min-w-[100px]">
  //           <Image
  //                 src={getFileIcon(file.name)}
  //                 alt="Genie"
  //                 height={30}
  //                 width={30}
  //                 className="min-w-[40px] mr-1"
  //             />
  //            <div>
  //           {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
  //           <p className="text-[9px] text-[#9D9D9D] ]">{Math.round(file.size / 1024)} KB</p></div></div>
  //       </div>
  //       {!isUploading && <button onClick={() => onRemove(file)} className="remove-btn ml-2 text-red-500 hover:text-red-700">
  //         <IconTrash size={26} />
  //       </button>}
  //     </div>
  //   );
  // };

  //   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //     const fileInput = event.target;
  //     const newFiles = fileInput.files ? Array.from(fileInput.files) : [];
  //     setMessageError("");

  //     // Filter files by acceptable formats
  //     const filteredFiles = newFiles.filter(file => /\.(pdf|docx?|txt)$/i.test(file.name));
  //     if (filteredFiles.length < newFiles.length) {
  //         setMessageError("Some files were not added because of unacceptable file formats.");
  //         // Reset the file input
  //         fileInput.value = "";
  //         return;
  //     }

  //     // Calculate total size of existing and new files
  //     const totalSize = filteredFiles.reduce((acc, file) => acc + file.size, files.reduce((acc, file) => acc + file.size, 0));
  //     if (totalSize > 20 * 1024 * 1024) {
  //         setMessageError("Total file size cannot exceed 20MB.");
  //         fileInput.value = "";
  //         return;
  //     }

  //     // Update files state
  //     setFiles([...files, ...filteredFiles]);
  //     // Reset the file input to allow re-uploading the same file if needed
  //     fileInput.value = "";
  // };



  const handleSend = async () => {

    
    if (errorMessage.length != "") {
      return;
    }

    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      setMessageError('Please enter a message');
      return;
    }
    if(showPopup){
      setMessageError(`Upload blocked: found sensitive keywords`)
      return;
    }

    const refreshedToken = await authContext?.validateAndRefreshToken(token);
    let files = await handleUpload(refreshedToken);
    onSend({ role: 'user', content: content, file: files?.urls }, plugin);


    setContent('');
    setMessageError("");
    setPlugin(null);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };


  const handleUpload = async (refreshedToken: string | null | undefined) => {
    if (files.length === 0) {
      setError("No files selected.");
      return;
    }

    const formData = new FormData();
  
    files.forEach(file =>
       formData.append('files', file),
       formData.append('useremail', authContext?.user?.email || '')
      ); // Ensure 'file' matches server expectation

    setIsUploading(true);
    setError("");



    try {
      const myHeaders: any = new Headers();
      refreshedToken ? myHeaders.set('Authorization', `Bearer ${refreshedToken}`) : null;
      const result = await uploadDocuments(formData, refreshedToken);
      if (!result) {
        throw new Error(`Failed to upload files`);
      }

      setIsUploading(false);
      setFiles([]);
      let filesStorage: any = localStorage.getItem('files');
      let filesData: any = JSON.parse(filesStorage) || {};

      // Extract azureFileNames from result.urls
      const azureFileNames = result.urls.map((file: any) => file.azureFileName);

      // Define the key for new data using workflow._id
      let selectedId: any = selectedConversation.id;

      // Update filesData with new file information under the selectedId
      if (!filesData[selectedId]) {
        filesData[selectedId] = [];
      }
      filesData[selectedId].push(...azureFileNames);  // Use spread operator to add new file names
      saveFiles(filesData);
      return result;
    } catch (error: any) {
      console.error('Error uploading files:', error);
      setError(error.message);
      setIsUploading(false);

    }
  };



  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleChangeEvent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event, files, setFiles, setMessageError, setShowPopup);
    setUploadModalOpen(false);
  };


  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      setShowPluginSelect(!showPluginSelect);
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
    if(showPopup){
        setShowPopup(false);
        setMessageError("");
    }
   
  };

  const handleFiles = () => {
    setUploadModalOpen(true);

  }

  const confirm = () => {
    const ele: any = document?.querySelector('#file-upload')
    if (ele) {
      ele.click();
    }
  }

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
        }`;
    }
  }, [content]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  function showPaperclip() {
    // const files = getFiles() || null;
    // const id = selectedConversation.id;
    // return files && files.length !=0 ?  (id in files): false
    return true;
  }



  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent from-transparent via-white  pt-6 md:pt-2">
      {isUploadModalOpen && <Terms
        submit={() => confirm()}
        store={false}
        modalOpen={isUploadModalOpen}
        setModalOpen={() => {
          setUploadModalOpen(false)
        }}
      />}
      <div className="stretch mx-2 mt-4 flex flex-row gap-3 last:mb-2 md:mx-4 md:mt-[60px] md:last:mb-6 ">
        {messageIsStreaming && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-[40px] border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600  dark:text-white md:mb-0 md:mt-2 dark:bg-primary"
            onClick={handleStopConversation}
          >
            <IconPlayerStop size={16} /> {t('Stop Generating')}
          </button>
        )}

        {!messageIsStreaming &&
          selectedConversation &&
          selectedConversation.messages.length > 3 && (
            <button
              className="absolute md:top-0 top-[-12px] left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-[40px] border border-neutral-200 bg-white dark:bg-primary py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600  dark:text-white md:my-2"
              onClick={onRegenerate}
            >
              <IconRepeat size={16} /> {t('Regenerate response')}
            </button>
          )}


        <div className="relative mx-2 flex w-full flex-grow flex-col rounded-md  sm:mx-6 ">
          {isUploading ? <span className="dark:text-white text-black py-4 loading-dots">Uploading</span> : null}
          {files && files.length != 0 ? <div className="xl:flex overflow-auto dark:text-white text-black text-left">
            {files.map((file, index) => (
              <FileDisplay isUploading={isUploading} key={index} file={file} onRemove={removeFile} />
            ))}
          </div> : null}

          {/* <button
            className="absolute left-2 xl:bottom-2 bottom-[5px] rounded-sm p-1 cursor-pointer text-neutral-800 opacity-60 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
            onClick={() => setShowPluginSelect(!showPluginSelect)}
            onKeyDown={(e) => {}}
            disabled
          >
            {plugin ? <IconBrandGoogle size={20} /> : <IconBolt size={20} />}
          </button> */}


          <button
            disabled={messageIsStreaming || isUploading}
            className="absolute right-[70px] xl:bottom-2 bottom-[5px] rounded-sm z-4 p-1 cursor-pointer disabled:opacity-[.4] disabled:cursor-default"
            onClick={(event) => (handleFiles())}
          >
            <input
              type="file"
              onChange={(event:any) => {
                handleChangeEvent(event);
                event.target.value = null; 
              }}

              multiple
              className="hidden"
              id="file-upload"
              accept=".pdf, .doc, .docx, .txt, .xls, .xlsx, .csv, .ppt, .pptx, .jpg, .png, jpeg"  // Specify allowed file types
            />
            <>
              <label htmlFor={label}>
                <IconPaperclip size={18} className={`text-[#707087] dark:text-white ${!isUploading && 'cursor-pointer'}`} />
              </label>
            </>
          </button>



          {showPluginSelect && (
            <div className="absolute left-0 bottom-14 rounded bg-white dark:bg-Info">
              <PluginSelect
                plugin={plugin}
                onKeyDown={(e: any) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowPluginSelect(false);
                    textareaRef.current?.focus();
                  }
                }}
                onPluginChange={(plugin: Plugin) => {
                  setPlugin(plugin);
                  setShowPluginSelect(false);

                  if (textareaRef && textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
              />
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="m-0 w-full resize-none border-1  bg-white p-0 py-2 pr-8 pl-3  text-black dark:text-white dark:bg-[#191919]  md:py-3 md:px-8 md:pr-24 rounded-[40px] border border-gray outline-none leading-normal"
            style={{
              resize: 'none',
              bottom: `${textareaRef?.current?.scrollHeight}px`,
              maxHeight: '400px',
              overflow: `${textareaRef.current && textareaRef.current.scrollHeight > 400
                ? 'auto'
                : 'hidden'
                }`,
            }}
            placeholder={
              t('Type a message...') || ''
            }
            value={content}
            rows={1}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />


          <button
            disabled={isUploading}
            className="absolute right-5 pl-4  border-l border-gray-500 xl:bottom-2 bottom-[5px] rounded-sm p-1 text-neutral-800   dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
            onClick={handleSend}
          >
            {messageIsStreaming || isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
            ) : (
              <IconSend size={18} />
            )}
          </button>

          {showScrollDownButton && (
            <div className="absolute bottom-12 right-0 md:bottom-0 md:-right-8">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                onClick={onScrollDownClick}
                style={{marginBottom:'8px'}}
              >
                <IconArrowDown size={18} />
              </button>
            </div>
          )}

          {showPromptList && filteredPrompts.length > 0 && (
            <div className="absolute bottom-12 w-full">
              <PromptList
                activePromptIndex={activePromptIndex}
                prompts={filteredPrompts}
                onSelect={handleInitModal}
                onMouseOver={setActivePromptIndex}
                promptListRef={promptListRef}
              />
            </div>
          )}

          {isModalVisible && (
            <VariableModal
              prompt={filteredPrompts[activePromptIndex]}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => setIsModalVisible(false)}
            />
          )}
        </div>
      </div>
      {errorMessage ? <p className={`text-red-600 relative left-[44px] top-4 ${errorMessageStyle}`}>{errorMessage}</p> : null}
      <div className="px-3 pt-2 pb-3 text-center text-[12px]  dark:text-[#9A9B9F] bg-transparent dark:bg-transparent text-black md:px-8 md:pt-8 md:pb-6 ">
        {' '}
        {t(
          'Version 2.0, Genie developed by Deloitte Middle East Services in conjunction with the Deloitte Middle East AI Institute',
        )}
      </div>
    </div>
  );
};
