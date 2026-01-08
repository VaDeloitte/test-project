'use client';
import { useEffect, useRef, useState, useContext, useMemo } from 'react';
import { useQuery } from 'react-query';
import { AuthContext } from '@/utils/app/azureAD';

// import { GetServerSideProps } from 'next';
// import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

// Notification library
import toast from 'react-hot-toast';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import { Chatbar } from '@/components/Chatbar/Chatbar';

import HomeContext from '../../context/home.context';
import { HomeInitialState, initialState } from '../../context/home.state';
import { useSpaces } from '@/context/SpacesContext';
import { general_space } from '@/types/space';
import { getConversationsForUser } from '@/utils/app/conversation';

import { v4 as uuidv5 } from 'uuid';
import { API_KEY } from "../../utils/app/const"
import { useRouter } from 'next/router';
import HeaderNew from '../HomeHeader/HomeHeaderNew';
import About from '@/pages/about';
import Accordion from '@/pages/faq';
import InfoContainer from '../Folder/NewComp/InfoContainer';
import SrcAppPage from '@/pages/src-app';
import AgentBuilderContent from '../AgentBuilder/AgentBuilderContent';
import LeadershipDashboard from '@/pages/leadership_dashboard/mainContent';
import Home from '@/pages';
import TeamSpacePageEdit from '@/pages/teamspace_edit';
import TeamSpacePage from '@/pages/teamspace';
import Admin from '@/pages/admin/workflows';

interface Props {
//  serverSideApiKeyIsSet: boolean;
//  serverSidePluginKeysSet: boolean;
//  defaultModelId: OpenAIModelID;
  children:any
}

export const HomeLayout = ({
  children
}: Props) => {

  const serverSideApiKeyIsSet = !!process.env.OPENAI_API_KEY;
  const location=window.location.pathname;
  let serverSidePluginKeysSet = false;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;
  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  const defaultModelId: OpenAIModelID =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL as OpenAIModelID) ||
    fallbackModelID;

//   const { t } = useTranslation('chat');
  const { getModels } = useApiService();

  const router = useRouter();
  const { id } = router.query;  // Retrieve 'id' from the route
  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      temperature,
      showChatbar
    },
    dispatch,
  } = contextValue;

  const {activeSpace,spaces, setActiveSpace} = useSpaces();
  const stopConversationRef = useRef<boolean>(false);
  const [myTime, setMyTime] = useState(1);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (activeSpace.id != general_space.id) {
        dispatch({
          field: 'conversations',
          value: activeSpace.conversations,
        })
    } else if (activeSpace.id === general_space.id) {
          
    }

  },[activeSpace, id,general_space]);


 
  const { data, error, refetch } = useQuery(
    ['GetModels', apiKey, serverSideApiKeyIsSet],
    ({ signal }) => {
      if (!apiKey && !serverSideApiKeyIsSet) return null;

      return getModels(
        {
          key: apiKey,
        },
        signal,
      );
    },
    { enabled: true, refetchOnMount: false },
  );

  

  const handleSelectConversation = (conversation: Conversation) => {
    localStorage.setItem("selectedConversation", JSON.stringify(conversation));
      router.push(`/chat?id=${conversation.id}`);
    // window.location.href = "/chat?id="+conversation.id;
  };



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

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv5(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c: any) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    // saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    dispatch({ field: 'selectedConversation', value: undefined });
    dispatch({ field: 'messages', value: [] });
    dispatch({ field: 'loading', value: false });
    router.push("/");
  };

 

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });
  };


  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation]);

  useEffect(() => {
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
    serverSideApiKeyIsSet &&
      dispatch({
        field: 'serverSideApiKeyIsSet',
        value: serverSideApiKeyIsSet,
      });
    serverSidePluginKeysSet &&
      dispatch({
        field: 'serverSidePluginKeysSet',
        value: serverSidePluginKeysSet,
      });
  }, [defaultModelId, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) {
      dispatch({
        field: 'lightMode',
        value: settings.theme,
      });
    }

    const apiKey = API_KEY;

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });

      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }

    if (window.innerWidth < 640) {
      // dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar === 'true' });
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );

      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }

    const selectedConversation = localStorage.getItem('selectedConversation');
   
    // if (selectedConversation) {
    //   const parsedSelectedConversation: Conversation =
    //     JSON.parse(selectedConversation);
    //   const cleanedSelectedConversation = cleanSelectedConversation(
    //     parsedSelectedConversation,
    //   );

    //   dispatch({
    //     field: 'selectedConversation',
    //     value: cleanedSelectedConversation,
    //   });
    // } else {
    //   const lastConversation =conversations?.length>0&& conversations[conversations?.length - 1];
      // dispatch({
      //   field: 'selectedConversation',
      //   value: {
      //     id: uuidv5(),
      //     name: 'New Conversation',
      //     messages: [],
      //     model: OpenAIModels[defaultModelId],
      //     prompt: DEFAULT_SYSTEM_PROMPT,
      //     temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
      //     folderId: null,
      //   },
      // });
    // }
  }, [
    defaultModelId,
    dispatch,
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
    activeSpace,
    spaces
  ]);


  const [currentTab, setCurrentTab] = useState<string | null>(null);

  useEffect(() => {
    // Initialize currentTab from sessionStorage
    setCurrentTab(sessionStorage.getItem("currentTab"));
    // Reset dashboardIsActive whenever the currentTab or route changes
  }, [router.asPath]);

  // Listen for tab changes
  useEffect(() => {
    let lastTab = sessionStorage.getItem("currentTab");
    
    const handleStorageChange = () => {
      const newTab = sessionStorage.getItem("currentTab");
      // Only update if tab actually changed
      if (newTab !== lastTab) {
        lastTab = newTab;
        setCurrentTab(newTab);
      }
    };

    // Check every 200ms for sessionStorage changes (reduced frequency)
    const interval = setInterval(handleStorageChange, 200);

    return () => clearInterval(interval);
  }, []);

  function renderChildren(){
    const dashboardIsActive=sessionStorage.getItem("dashboard");
    const pathname=window.location.pathname;
    switch(currentTab){
      case "agents-new":
      case "agents-edit":
        return(
          <div className="h-full overflow-hidden" style={{ height: 'calc(100vh - 50px)', marginTop: '10px' }}>
            <AgentBuilderContent/>
          </div>
        );
      case "info":
        return(dashboardIsActive ==="true"? <LeadershipDashboard/> : <InfoContainer />);
      case"dashboard":return(<LeadershipDashboard/>);
      case "chats":
        case "agents":
        return (dashboardIsActive ==="true"? <LeadershipDashboard/> :pathname.includes('admin')?<Admin/>:pathname.includes('edit')?<TeamSpacePageEdit/>:pathname.includes("teamspace")?<TeamSpacePage/>: children);
      case "null":
      default:
        return (dashboardIsActive ==="true"? <LeadershipDashboard/> : children);
    }
  }

  useEffect(()=>{
    console.log('home chagess')
    renderChildren()
  },[currentTab,router.asPath])

 
  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
      }}
    >
      <Head>
        <title>Tax Genie 3.0</title>
        <meta name="description" content="Genie Powered by Generative AI" />
        <meta
          name="viewport"
          content="height=device-height, width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" type="image/svg+xml" href="/assets/IMG_8849.ICO" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin={'anonymous'} />
    
      </Head>

        <div id="portal-root"></div>
      <div className={`container-fluid   xl:px-0 ${currentTab==="info"?"":"px-0"} font-open-sans `}>
       {!location.includes("/admin")&& <HeaderNew  onClick={()=>{dispatch({ field: 'showChatbar', value: showChatbar===true?false:true });}} />}
        <div className="h-screen text-dark dark-gradient md:flex">
          <div className=' '>
          {/* Sidebar panel */}
         {!location.includes('/admin') &&<Chatbar  key={myTime} conversationData={conversations} selectedConversation={selectedConversation} />}
          </div>
          {/* {showSidebar && <HomeSidebar topWorkflows={topWorkflows} token={user?.idToken || ''} />} */}
          <div className={`xl:flex-grow w-full md:ml-[256px] ${location.includes("/admin")?"":"pt-10"}`}>
            {renderChildren()}
            {(currentTab!=="agents-new"&&currentTab!=="agents-edit")&&
            <div className={`lg:text-[10px] ${sessionStorage.getItem("activeInfoTab")==='faq'?'bg-gray-50':sessionStorage.getItem("activeInfoTab")==='more'||sessionStorage.getItem("activeInfoTab")==="about"||sessionStorage.getItem("activeInfoTab")==='models'?"":"dark:bg-[#121212] bg-[#f2f6f7]"}   fixed  dark:text-white text-[9px]   md:ml-[256px] p-1  lg:px-14  left-0 right-0 bottom-0 text-gray-600 text-center flex justify-between`} >
                <div className='pr-4'>Tax Genie, developed by Deloitte Middle East Tax & Legal Services in conjunction with the Deloitte Middle East AI Institute.</div>
                <div className='flex'>
                <div className="flex items-center">
  <span
    onClick={() =>
      window.open('/assets/Tax_Genie_2.0_Rules_of_the_Road.pdf', '_blank')
    }
    className="cursor-pointer underline underline-offset-2"
  >
    Rules of the Road
  </span>

  <span className="px-1">|</span>

  <span
    onClick={() =>
      window.open('/assets/TG_3.0_Privacy_Notice.pdf', '_blank')
    }
    className="cursor-pointer underline underline-offset-2"
  >
    Privacy Policy
  </span>
</div>
                  </div>
            </div>} 
          </div>
        </div>
      </div>
    </HomeContext.Provider>
  );
};


// export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
//   const defaultModelId =
//     (process.env.DEFAULT_MODEL &&
//       Object.values(OpenAIModelID).includes(
//         process.env.DEFAULT_MODEL as OpenAIModelID,
//       ) &&
//       process.env.DEFAULT_MODEL) ||
//     fallbackModelID;

//   let serverSidePluginKeysSet = false;

//   const googleApiKey = process.env.GOOGLE_API_KEY;
//   const googleCSEId = process.env.GOOGLE_CSE_ID;

//   if (googleApiKey && googleCSEId) {
//     serverSidePluginKeysSet = true;
//   }

//   return {
//     props: {
//       serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
//       defaultModelId,
//       serverSidePluginKeysSet,
//       ...(await serverSideTranslations(locale ?? 'en', [
//         'common',
//         'chat',
//         'sidebar',
//         'markdown',
//         'promptbar',
//         'settings',
//       ])),
//     },
//   };
// };
