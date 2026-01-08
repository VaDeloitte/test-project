import { useCallback, useContext, useEffect, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';
import { useSpaces } from '@/context/SpacesContext';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { saveConversation, saveConversations, getConversationsForUser } from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { exportData, importData } from '@/utils/app/importExport';

import { Conversation } from '@/types/chat';
import { LatestExportFormat, SupportedExportFormats } from '@/types/export';
import { OpenAIModels } from '@/types/openai';
import { PluginKey } from '@/types/plugin';

import HomeContext from '@/context/home.context';

import { ChatFolders } from './components/ChatFolders';
import { Conversations } from './components/Conversations';

import Sidebar from '../Sidebar';
import ChatbarContext from './Chatbar.context';
import { ChatbarInitialState, initialState } from './Chatbar.state';

import { v4 as uuidv5 } from 'uuid';
import { useSession } from 'next-auth/react';

export const Chatbar = (props: any) => {
  const { t } = useTranslation('sidebar');
  const session = useSession();
  const activeInfoTab=sessionStorage.getItem("activeInfoTab");
  const { conversationData, selectedConversation, } = props;
  const chatBarContextValue = useCreateReducer<ChatbarInitialState>({
    initialState,
  });

  const {
    state: { conversations, showChatbar, defaultModelId, folders, pluginKeys },
    dispatch: homeDispatch,
    handleCreateFolder,
    handleNewConversation,
    handleUpdateConversation,
  } = useContext(HomeContext);

  const [displayShowMore, setDisplayShowMore] = useState<boolean>(false);
  const {
    state: { searchTerm, filteredConversations },
    dispatch: chatDispatch,
  } = chatBarContextValue;

  const [displayConvo, setDisplayConvo] = useState<Conversation[]>(filteredConversations);
  const { spaces, activeSpace } = useSpaces();
  useEffect(() => {
    // Find the active space object
    const activeSpaceObj = spaces.find((s) => s.id === activeSpace.id);

    // If activeSpaceObj exists, filter its conversations, otherwise use an empty array
    const activeSpaceConversations = activeSpaceObj?.conversations || [];

    // Filter conversations based on the active space
    const updatedDisplayConvo = filteredConversations.includes(selectedConversation)
      ? [selectedConversation, ...filteredConversations.filter((convo) => convo !== selectedConversation)]
      : filteredConversations;

    // Only show conversations from the active space
    const filteredActiveSpaceConvos = updatedDisplayConvo.filter(convo =>
      activeSpaceConversations.some((activeConvo) => activeConvo.id === convo.id)
    );

    // Update displayConvo with filtered active space conversations
    setDisplayConvo(filteredActiveSpaceConvos);

    // Check if we should show "more" based on message count and display length
    // const hasChatWithMessages = filteredActiveSpaceConvos.some(chat => chat.messages.length > 2);
    // if (!(filteredActiveSpaceConvos.length > 5 && hasChatWithMessages)) {
    //   setDisplayShowMore(false);
    // } else {
    //   setDisplayShowMore(true);
    // }

  }, [filteredConversations, selectedConversation, spaces, activeSpace]);


  useEffect(() => {
    const updatedDisplayConvo = filteredConversations.includes(selectedConversation) ? [selectedConversation,
      ...filteredConversations.filter((convo) => convo != selectedConversation)

    ] : filteredConversations

    setDisplayConvo(updatedDisplayConvo);

    // const hasChatWithMessages = updatedDisplayConvo.some(chat => chat.messages.length > 2)
    // if (!(updatedDisplayConvo.length > 5 && hasChatWithMessages)) {
    //   setDisplayShowMore(false);
    // }
    // else{
    //   setDisplayShowMore(true)
    // }

  }, [filteredConversations, selectedConversation])

  const handleApiKeyChange = useCallback(
    (apiKey: string) => {
      homeDispatch({ field: 'apiKey', value: apiKey });

      localStorage.setItem('apiKey', apiKey);
    },
    [homeDispatch],
  );


  const handlePluginKeyChange = (pluginKey: PluginKey) => {
    if (pluginKeys.some((key) => key.pluginId === pluginKey.pluginId)) {
      const updatedPluginKeys = pluginKeys.map((key) => {
        if (key.pluginId === pluginKey.pluginId) {
          return pluginKey;
        }

        return key;
      });

      homeDispatch({ field: 'pluginKeys', value: updatedPluginKeys });

      localStorage.setItem('pluginKeys', JSON.stringify(updatedPluginKeys));
    } else {
      homeDispatch({ field: 'pluginKeys', value: [...pluginKeys, pluginKey] });

      localStorage.setItem(
        'pluginKeys',
        JSON.stringify([...pluginKeys, pluginKey]),
      );
    }
  };
  const [key, setKey] = useState(0);

  const handleClearPluginKey = (pluginKey: PluginKey) => {
    const updatedPluginKeys = pluginKeys.filter(
      (key) => key.pluginId !== pluginKey.pluginId,
    );

    if (updatedPluginKeys.length === 0) {
      homeDispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
      return;
    }

    homeDispatch({ field: 'pluginKeys', value: updatedPluginKeys });

    localStorage.setItem('pluginKeys', JSON.stringify(updatedPluginKeys));
  };

  const handleExportData = () => {
    exportData();
  };

  const handleImportConversations = (data: SupportedExportFormats) => {
    const { history, folders, prompts }: LatestExportFormat = importData(data);
    homeDispatch({ field: 'conversations', value: history });
    homeDispatch({
      field: 'selectedConversation',
      value: history[history.length - 1],
    });
    homeDispatch({ field: 'folders', value: folders });
    homeDispatch({ field: 'prompts', value: prompts });

    window.location.reload();
  };

  const handleClearConversations = () => {
    defaultModelId &&
      homeDispatch({
        field: 'selectedConversation',
        value: {
          id: uuidv5(),
          name: t('New Conversation'),
          messages: [],
          model: OpenAIModels[defaultModelId],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: DEFAULT_TEMPERATURE,
          folderId: null,
        },
      });

    homeDispatch({ field: 'conversations', value: [] });

    localStorage.removeItem('conversationHistory');
    localStorage.removeItem('selectedConversation');

    const updatedFolders = folders.filter((f) => f.type !== 'chat');

    homeDispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    const updatedConversations = conversations.filter(
      (c: any) => c.id !== conversation.id,
    );

    homeDispatch({ field: 'conversations', value: updatedConversations });
    chatDispatch({ field: 'searchTerm', value: '' });
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      // homeDispatch({
      //   field: 'selectedConversation',
      //   value: updatedConversations[updatedConversations.length - 1],
      // });

      saveConversation(updatedConversations[updatedConversations.length - 1]);
    } else {
      defaultModelId &&
        // homeDispatch({
        //   field: 'selectedConversation',
        //   value: {
        //     id: uuidv5(),
        //     name: t('New Conversation'),
        //     messages: [],
        //     model: OpenAIModels[defaultModelId],
        //     prompt: DEFAULT_SYSTEM_PROMPT,
        //     temperature: DEFAULT_TEMPERATURE,
        //     folderId: null,
        //   },
        // });

      localStorage.removeItem('selectedConversation');
    }
  };

  const handleToggleChatbar = () => {
    homeDispatch({ field: 'showChatbar', value: !showChatbar });
    localStorage.setItem('showChatbar', JSON.stringify(!showChatbar));
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      handleUpdateConversation(conversation, { key: 'folderId', value: 0 });
      chatDispatch({ field: 'searchTerm', value: '' });
      e.target.style.background = 'none';
    }
  };

  useEffect(() => {
    if (searchTerm) {
      if (filteredConversations && filteredConversations.length != 0) {
        chatDispatch({
          field: 'filteredConversations',
          value: filteredConversations.filter((conversation) => {
            const searchable =
              conversation.name.toLocaleLowerCase() +
              ' ' +
              conversation.messages.map((message: any) => message.content).join(' ');
            return searchable.toLowerCase().includes(searchTerm.toLowerCase());
          }),
        });
      }

    } else {
      if (conversationData && conversationData.length != 0) {
        chatDispatch({
          field: 'filteredConversations',
          value: sortArrayByUpdatedAt(conversationData),
        });
      }
    }
  }, [searchTerm]);

  function sortArrayByUpdatedAt(array: any[]) {
    return array.sort((a: any, b: any) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
  useEffect(() => {
    if (conversationData && conversationData.length != 0) {
      chatDispatch({
        field: 'filteredConversations',
        value: sortArrayByUpdatedAt(conversationData),
      });
    }

  }, [conversationData]);

  return (
    <ChatbarContext.Provider
      value={{
        ...chatBarContextValue,
        handleDeleteConversation,
        handleClearConversations,
        handleImportConversations,
        handleExportData,
        handlePluginKeyChange,
        handleClearPluginKey,
        handleApiKeyChange,
      }}
    >

      <Sidebar<Conversation>
        key={key}
        isOpen={showChatbar}
        itemComponent={<Conversations update={() => { setKey((prevKey: any) => prevKey + 1) }} conversations={[...displayConvo].reverse()} />}
        folderComponent={<ChatFolders searchTerm={searchTerm} />}
        items={displayConvo.slice(0, 5).reverse()}
        searchTerm={searchTerm}
        handleSearchTerm={(searchTerm: string) =>
          chatDispatch({ field: 'searchTerm', value: searchTerm })
        }
        displayShowMore={displayShowMore}
        onClose={handleToggleChatbar}
        handleCreateItem={handleNewConversation}
        handleCreateFolder={() => handleCreateFolder(t('New folder'), 'chat')}
        handleDrop={handleDrop}
      />
    </ChatbarContext.Provider>
  );
};


