// Icons
import { IconClearAll, IconSettings, IconFlare } from '@tabler/icons-react';

// React and Next.js hooks and utilities
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

// Notification library
import toast from 'react-hot-toast';

// Types
import { OpenAIModel } from '@/types/openai';
import { Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

// Context
import HomeContext from '@/context/home.context';
import { AuthContext } from '@/utils/app/azureAD';

// Utilities
import { getEndpoint } from '@/utils/app/api';
import { authenticatedFetch } from '@/utils/app/csrf';
import { throttle } from '@/utils/data/throttle';
import { calculateSizeInMB } from '@/utils/helper/helper';
import useHtmlClass from '@/utils/app/getTheme';
import { getCSRFToken } from '@/utils/app/csrf';

// Components
import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import ModelDropdown from './ModelDropdown';
import Terms from '../Modals/Terms';
import { getWorkflowById, incrementWorkflowHitCount } from '@/services/workflowService';
import { getConversationsForUser } from '@/utils/app/conversation';
// Custom events
import {
  SendPromptUsedMetric,
  SendWorkflowUsedMetric,
} from '@/utils/app/appinsightsCustomEvents';
import { updateMessage } from '@/utils/app/conversation';
import { current } from '@reduxjs/toolkit';
import ChatWindow from '../HomeContent/HomeContentNew';



interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

var callPromptApi: boolean = false;

export const Chat = memo((props: any) => {
  const { t } = useTranslation('chat');
  const authContext = useContext(AuthContext);

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
      defaultModelId,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);


  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [workflowData, setWorkflowData] = useState([]);
  const [userData, setUserData]: any = useState(null);
  const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);
  const theme: any = useHtmlClass();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const validateAndRefreshToken = authContext?.validateAndRefreshToken;
  const router = useRouter();
  const { id }: any = router.query;
  console.log(id, 'testing2')
  const { wid }: any = router.query; // Retrieve 'id' from the route
  const stopConversationRef = useRef(false);
  var chatBody: any = {};
  const abortControllerRef = useRef(new AbortController());

  const showInfoMessage = (messages: any) => {
    if (messages && messages.length > 8) {
      return false;
    }
    if (messages && messages.length != 0) {
      return messages[0].content.toLowerCase().includes('how can i help') || messages[0].content.toLowerCase().includes('please provide')
    }

  }
  const handleStopConversation = () => {
    stopConversationRef.current = true;
    homeDispatch({ field: 'loading', value: false });
    homeDispatch({ field: 'messageIsStreaming', value: false });
    // Abort the ongoing API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();  // Reinitialize for next use
    }

    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
    return;
  };

  const handleSend = useCallback(
    async (message: any, deleteCount = 0, plugin: Plugin | null = null, promptWorkflow?: any, withPromptCall?: any, isTyping?: boolean) => {

      if (!authContext || stopConversationRef.current) {
        console.error('Auth context is not available');
        console.log("Conversation was stopped before sending.");
        return;
      }
      let abortErrorOccurred = false;
      const storedData: any = localStorage.getItem('promptWorkflow');
      const JSONstoredData = storedData ? JSON.parse(storedData) : "";
      if (message) {
        message.prompt = JSONstoredData?.includes(promptWorkflow);
      }

      selectedConversation.id = id;
      let exists = selectedConversation.messages.some((m: any) => m.content === message?.content && m.role === message?.role);
      let updatedConversation = { ...selectedConversation };

      if (!exists && message && message.content) { // Only add message if it does not already exist
        if (message.content != "") {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
      }

      let requestFiles: any = [];
      // homeDispatch({
      //   field: 'selectedConversation',
      //   value: updatedConversation,
      // });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });

      let jsonRequestFiles = localStorage.getItem('files');
      let selectedId = selectedConversation.id;
      if (jsonRequestFiles) {
        requestFiles[selectedId] = JSON.parse(jsonRequestFiles);
        requestFiles = requestFiles[selectedId][selectedId];
      }

      if (message?.file) {
        const fileUploadMessage: Message = {
          role: 'user',
          content: '',
          file: message.file.map((file: any) => file.azureFileName)  // here
        };
        updatedConversation.messages.push(fileUploadMessage);
      }

      let updatedMessageRequest = updatedConversation.messages.filter((x: any) => x.content != '');

      chatBody = {
        model: updatedConversation.model,
        messages: updatedMessageRequest,
        key: apiKey,
        prompt: updatedConversation.prompt,
        files: requestFiles ? requestFiles : [],
        workflow: workflowData
      };
      let userPrompt = chatBody.prompt;

      //? when should i call the prompt

      if (wid == undefined) {
        chatBody.workflow = null;
      }
      if (isTyping) {
        callPromptApi = true
      } else {
        callPromptApi = false
      }


      //? Start Azure app function call
      let currentIdToken = authContext.user?.idToken;
      if (callPromptApi) {

        await updatePrompts(chatBody, currentIdToken, abortControllerRef.current.signal).then((res) => {
          if (res) {

            chatBody.prompt = res;
          }
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.log("Fetch aborted.");
            abortErrorOccurred = true;
          } else {
            console.error("Error while updating prompts:", error);
          }
        });
      }
      console.log(chatBody.prompt, 'cb')
      //? End Azure app function call

      if (promptWorkflow && isTyping) {
        chatBody.prompt = promptWorkflow;
      }

      // Remove file from chatBody.messages
      chatBody.messages = chatBody.messages.map((message: any) => {
        const { file, ...rest } = message; // Destructure to separate `file` from other properties
        return rest; // Return the message without the `file` property
      });

      // Validate and refresh the token before making the API call
      if (validateAndRefreshToken && currentIdToken) {
        currentIdToken = await validateAndRefreshToken(currentIdToken) || currentIdToken;
      }
      if (!abortErrorOccurred) {
        const endpoint = getEndpoint(plugin);
        let body = JSON.stringify(chatBody);

        const controller = new AbortController();
        const csrfToken = getCSRFToken();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentIdToken}`,
            'X-XSRF-TOKEN': csrfToken || '',
          },
          signal: controller.signal,  // Use the signal from the newly created controller
          credentials: 'include' as RequestCredentials,
          body,

        });

        const data: any = await response.body;
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }
        homeDispatch({ field: 'loading', value: false });
        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let isFirst = true;
        let text = '';


        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);
          text += chunkValue;
          handleScrollDown();
          if (isFirst) {
            isFirst = false;
            if (!exists) { // Add message only if it didn't exist before
              updatedConversation.messages.push({ role: 'assistant', content: chunkValue });
            }
            // homeDispatch({
            //   field: 'selectedConversation',
            //   value: updatedConversation,
            // });
          } else {
            updatedConversation.messages = updatedConversation.messages.map((msg: any, index: any) => {
              if (index === updatedConversation.messages.length - 1) {
                updatedConversation.name = text;
                return {
                  ...msg,
                  content: text,
                };
              }
              return msg;
            });
            // homeDispatch({
            //   field: 'selectedConversation',
            //   value: updatedConversation,
            // });

            homeDispatch({ field: 'messageIsStreaming', value: false });
            let userId = localStorage.getItem("userId") || 1;
            updatedConversation.userId = userId;
            // Save the updated conversation in local storage
            // localStorage.setItem(`conversation_${id}`, JSON.stringify(updatedConversation));


          }
        }
       



        await createOrUpdateConversation(updatedConversation).then((res) => {
          if (plugin) {
            let data: any = plugin || []; // plugin here is conversations
            // Create a map to store objects by _id
            const mergedData: any = {};
            if (res && res.data) {
              // Add ss to the map
              mergedData[res.data._id] = res.data;

              // Add each object from the data array to the map
              data?.forEach((item: any) => {
                mergedData[item._id] = { ...mergedData[item._id], ...item };
              });

              // Convert the map back to an array if needed
              const mergedArray = Object.values(mergedData);
              props.sendConversation(sortArrayByName(mergedArray))
            }


          }


        });
        // props.update();
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      selectedConversation,
      stopConversationRef,
    ],
  );

  function sortArrayByName(array: any) {
    return array.sort((a: any, b: any) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
  }
  const createOrUpdateConversation = async (conversationData: any) => {
    try {
      const response = await authenticatedFetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating/updating conversation:', error);
    }
  };


  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;
      // console.log(scrollTop, clientHeight, scrollHeight, 'Helloo')
      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        // setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        // setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };
  useEffect(() => {
    if (messageIsStreaming) {
      const interval = setInterval(() => {
        handleScrollDown();
      }, 80); // Adjust timing if needed

      return () => clearInterval(interval); // Cleanup when streaming stops
    } else {
      setTimeout(() => {
        handleScrollDown();

      }, 250); // Final scroll to the latest message
    }
  }, [messageIsStreaming, selectedConversation?.messages.length]);  // Trigger only when messages increase


  // useEffect(() => {
  //   handleScrollDown();
  // }, [currentMessage, conversations, selectedConversation])

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModelObj = models.find(
      (model) => model.id === e.target.value,
    ) as OpenAIModel;
    
    console.log('[Chat.tsx handleChange]: Model selected:', selectedModelObj?.id, selectedModelObj?.name);
    
    // ✅ FIX: Update global selectedModel state
    if (selectedModelObj) {
      homeDispatch({ field: 'selectedModel', value: selectedModelObj });
      console.log('[Chat.tsx handleChange]: ✅ Updated global selectedModel state');
    }
    
    // Also update conversation's model
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: selectedModelObj,
      });
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);


  const updatePrompts = async (body: any, idToken: string | undefined, signal?: any) => {
    try {
      if (validateAndRefreshToken && idToken) {
        idToken = await validateAndRefreshToken(idToken) || idToken;
      }

      const myHeaders = new Headers({
        "Content-Type": "application/json"
      });

      if (idToken) {
        myHeaders.set('Authorization', `Bearer ${idToken}`);
      }

      const csrfToken = getCSRFToken();
      myHeaders.set('X-XSRF-TOKEN', csrfToken || '');
      console.log(body, 'body')
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(body),
        credentials: 'include' as RequestCredentials,
        signal: signal  // Passing the abort signal to fetch
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors ? errorData.errors.join(', ') : 'Failed to send promopt');
      }
      return await response.text();
    } catch (error) {
      throw error;
    }
  }



  //Function to add data to dataArray and save to localStorage

  const addToDataArray = (data: string) => {
    //   // Load the existing data array from localStorage
    let storedData = localStorage.getItem('promptWorkflow');
    let dataArray = storedData ? JSON.parse(storedData) : [];

    if (data && !dataArray.includes(data)) { // Add data only if it's not already in the array
      dataArray.push(data); // Push data directly into the existing array
      localStorage.setItem('promptWorkflow', JSON.stringify(dataArray)); // Save updated array back to localStorage
    }
  };



  useEffect(() => {
    if (authContext) {
      setUserData(authContext.user);
      return;
    }

  }, [authContext]);

  useEffect(() => {
    if (workflowData) {
      setWorkflowData(workflowData);

    }
  }, [workflowData])

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        return;
      }

      try {
        if (userData && wid != undefined) {
          const workflow: any = await getWorkflowById(wid, userData?.idToken, validateAndRefreshToken);
          let workflowJSON = JSON.parse(workflow)?.workflow;
          console.log('=====',workflowJSON)
          if (workflowJSON && wid) {
            var currentMessages: any = {
              role: 'user',
              content: workflowJSON.prompt,
            };
            addToDataArray(workflowJSON.prompt);
            setWorkflowData(workflowJSON);

            // Increment the hit count before sending the initial message
            await incrementWorkflowHitCount(userData?.idToken, wid, workflowJSON, validateAndRefreshToken);

            if (workflowJSON.prompt != "") {
              getConversationsForUser(10, 0)?.then(async (conversations: any) => {
                if (conversations && conversations.length != 0) {

                  homeDispatch({
                    field: 'conversations',
                    value: conversations,
                  })
                }

                const conversation = conversations.find((e: any) => e.id == id);
                await handleSend(currentMessages, 0, conversations, workflowJSON.prompt);
                if (conversations && conversations.length != 0) {
                  if (conversation) {
                    // homeDispatch({
                    //   field: 'selectedConversation',
                    //   value: conversation,
                    // });

                  }
                }
              })

            }
            if (userData) {
              SendWorkflowUsedMetric(userData, workflowJSON);

            }
          }
        }
        if (userData && wid == undefined) {
          var currentMessages: any = {
            role: "user",
            content: "Ask How Can I Help You Today? only",
          };
          getConversationsForUser(10, 0)?.then(async (conversations: any) => {
            if (conversations && conversations.length != 0) {

              homeDispatch({
                field: 'conversations',
                value: conversations,
              })

            }
            const conversation = conversations.find((e: any) => e.id == id);
            if (conversations && conversations.length != 0) {
              if (conversation) {
                // homeDispatch({
                //   field: 'selectedConversation',
                //   value: conversation,
                // });
              } else {
                await handleSend(currentMessages, 0, conversations, null);
              }
            } else {
              await handleSend(currentMessages, 0, conversations, null);
            }

          });
          //
        }

      } catch (error: any) {
        // Handle error if necessary
        router.push("/");

        // Log the entire error object for debugging
        console.error('Error fetching workflow:', error.response);

        // Check if the error response status is 400 Bad Request
        if (error.response && error.response.status === 400) {
          // Log the specific error messages
          if (error.response.data && Array.isArray(error.response.data.errors)) {
            const errorMessages = error.response.data.errors;
            console.log('Error messages:', errorMessages); // Log the specific error messages

            // Display each error message using a toast notification
            errorMessages.forEach((errMsg: string) => {
              toast.error(errMsg);
            });
          } else {
            // Display a generic error message if specific error messages are not available
            toast.error('Bad request. Please check your input.');
          }
        } else {
          // Display a generic error message for other types of errors
          toast.error('An unexpected error occurred.');
        }
      }
    };
    console.log("start fetchData function")
    fetchData();
  }, [userData]);

  useEffect(() => {
    if (userData && selectedConversation && selectedConversation.messages.length > 0) {
      const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
      if (lastMessage.role === 'user') {
        SendPromptUsedMetric(userData, lastMessage.content);
      }
    }
  }, [userData, selectedConversation]);

  async function updateMessageContent(conversations: any, conversationId: any, messageIndex: any, newContent: any) {
    throttledScrollDown();
    // Find the conversation by ID
    let conversation: any = conversations.find((conversation: any) => conversation.id == id);
    if (!conversation) {
      console.log('Conversation not found');
    }
    let currentMessages: any = {
      role: "user",
      content: newContent,
    };
    // Update the message content
    homeDispatch({
      field: 'conversations',
      value: conversations,
    });
    await handleSend(currentMessages, 0, null, null);

  }

  // Load data from localStorage on component mount


  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  if(true){
    return(
    <ChatWindow workflowsData={workflowData} handleSearch={handleChange} token={authContext?.user?.idToken}/>
  )
  }

  return (
    // <div className="flex flex-col w-full">
    //   <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>


    //     {isUploadModalOpen && <Terms
    //       modalOpen={isUploadModalOpen}
    //       setModalOpen={() => {
    //         setUploadModalOpen(false)
    //       }}
    //     />}
    //     <div className="relative flex-1 right-0 left-auto w-full overflow-hidden">
    //       <div className="flex justify-between px-4 md:px-10">
    //         <ModelDropdown
    //           models={models}
    //           selectedConversation={{ model: { id: selectedConversation?.model?.id || defaultModelId } }}
    //           defaultModelId={selectedConversation?.model?.id || defaultModelId}
    //           handleChange={handleChange}
    //         />
    //         <div className='flex items-center gap-2'>
    //           <img
    //             src={`/assets/logo-with-shadow.svg`}
    //             alt="Tax Genie logo" height={40} width={40}
    //           />
    //           <span className="dark:text-white text-black hidden lg:inline text-lg lg:text-[170%] tracking-[-0.04em] antialiased whitespace-nowrap" style={{ fontWeight: 690, textRendering: 'optimizeLegibility' }}>Genie</span>
    //         </div>

    //       </div>
    //       {!(apiKey || serverSideApiKeyIsSet) ? (
    //         <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
    //           <div className="text-center text-4xl font-bold text-black dark:text-white">
    //             Project Genie
    //           </div>
    //         </div>
    //       ) : modelError ? (
    //         <ErrorMessageDiv error={modelError} />
    //       ) : (
    //         <div className="h-screen flex flex-col">

    //           <div
    //             className="flex-1 overflow-y-auto px-4 md:px-10 pb-[100px] pt-2"
    //             ref={chatContainerRef}
    //             onScroll={handleScroll}
    //           >

    //             <button className="hidden gap-1 px-7 py-3 text-black dark:text-white rounded-md absolute right-10 xl:top-6 top-0 text-[18px] z-20">
    //               {/* <AladdinIcon className="text-black dark:text-white "/>  */}
    //               <IconFlare size={20} />
    //               <span className="xl:block hidden font-[400]">Aladdin</span></button>
    //             {selectedConversation?.messages.length === 0 ? (
    //               <>
    //                 <div className="flex flex-col items-center h-full">

    //                   <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
    //                     {models.length === 0 ? (
    //                       <div>
    //                         <Spinner size="16px" className="mx-auto" />
    //                       </div>
    //                     ) : (
    //                       <>
    //                         {/* <Image
    //                     src={'/assets/inverted-white.png'}
    //                     alt="Gennie"
    //                     height={200}
    //                     width={460}
    //                     /> */}

    //                       </>
    //                     )}
    //                   </div>

    //                   {models.length > 0 && wid == undefined && (
    //                     <div className="flex flex-col space-y-2 py-4 w-full">
    //                       <ModelSelect />

    //                       <SystemPrompt
    //                         conversation={selectedConversation}
    //                         prompts={prompts}
    //                         onChangePrompt={(prompt) =>
    //                           handleUpdateConversation(selectedConversation, {
    //                             key: 'prompt',
    //                             value: prompt,
    //                           })
    //                         }
    //                       />

    //                       <TemperatureSlider
    //                       />
    //                     </div>
    //                   )}
    //                 </div>
    //               </>
    //             ) : (
    //               <>
    //                 {false ? <div className="sticky top-0 z-10 flex xl:mb-0 mb-4 justify-end  font-bold  py-2 text-sm text-neutral-500 dark:border-none  dark:text-[#fff]">
    //                   {t('Model')}: {selectedConversation?.model.name}
    //                   {/* {t('Temp')} */}
    //                   {/* : {selectedConversation?.temperature}  */}
    //                   <button
    //                     className="ml-2 cursor-pointer hover:opacity-50"
    //                     onClick={handleSettings}
    //                   >
    //                     <IconSettings size={18} />
    //                   </button>
    //                   <button
    //                     className="ml-2 cursor-pointer hover:opacity-50"
    //                     onClick={onClearAll}
    //                   >
    //                     <IconClearAll size={18} />
    //                   </button>
    //                 </div> : ""}
    //                 {showSettings && (
    //                   <div className="relative flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
    //                     <div className="fixed z-10 right-[100px]">
    //                       <ModelSelect />
    //                     </div>
    //                   </div>
    //                 )}
    //                 {errorMessage ? <p className="text-red-500 ">{errorMessage}</p> : null}
    //                 {selectedConversation?.messages.map((message: any, index: any) => (
    //                   conversations && !message.prompt ?
    //                     <>
    //                       <MemoizedChatMessage
    //                         key={index}
    //                         message={message}
    //                         messageIndex={index}
    //                         isPrompt={!message.promp && index == 1}
    //                         onEdit={async (editedMessage, messageObj) => {
    //                           console.log("start on edit function")
    //                           let userId: any = localStorage.getItem("userId") || 1;
    //                           await updateMessage(id, userId, index, messageObj.content, messageObj.file, messageObj.role).then((res) => {
    //                             if (res && res.data && conversations) {
    //                               updateMessageContent(conversations, id, index, messageObj.content);
    //                             }
    //                           })
    //                         }}
    //                       />
    //                       {index == 1 && !message.prompt && showInfoMessage(selectedConversation?.messages) ?
    //                         <TemperatureSlider
    //                         /> : ""}
    //                     </> : ""
    //                 )

    //                 )}

    //                 {loading && <ChatLoader />}

    //                 <div
    //                   className="h-[1vh] bg-trnasparent "
    //                   ref={messagesEndRef}
    //                 />
    //               </>
    //             )}
    //           </div>

    //         </div>
    //       )}
    //     </div>
    //     <div className="sticky bottom-[-1] translate-y-[-10px] left-0 w-full z-20 shadow-md p-4">


    //       <ChatInput
    //         handleStopConversation={handleStopConversation}
    //         textareaRef={textareaRef}
    //         token={userData?.idToken}
    //         onSend={(message: any, plugin: any) => {
    //           setCurrentMessage(message);
    //           handleSend(message, 0, plugin, null, null, true);

    //         }}
    //         onScrollDownClick={handleScrollDown}
    //         onUpload={() => {
    //           setUploadModalOpen(true);
    //         }}
    //         onRegenerate={() => {
    //           if (currentMessage) {
    //             handleSend(currentMessage, 0, null);
    //           }
    //         }}
    //         showScrollDownButton={showScrollDownButton}
    //       />
    //     </div>
    //   </div>

    // </div>
    <div>hello</div>
  );

  

});
Chat.displayName = 'Chat';