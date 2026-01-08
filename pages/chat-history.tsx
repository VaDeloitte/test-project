import React, { useState, useEffect } from 'react';
import { getConversationsForUser } from '@/utils/app/conversation';
import { IconMessage, IconMessageCircle } from '@tabler/icons-react';
import { useRouter } from 'next/router';

const ChatHistory: React.FC = () => {
  const router = useRouter();
  const [chatData, setChatData] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  console.log(selectedChat, 'chatttt')
  const handleReactivateButton = async () => {
    if (selectedChat) {
      const chat_id = selectedChat.id;
      const workflow_id = selectedChat?.id?.split('_')[1]
      // console.log(workflow_id,'wfid')
      if (chat_id.includes("_")) {
        router.push(`/chat?id=${chat_id}&wid=${workflow_id}`).then(() => {
          // window.location.reload();
        });

      }
      else {
        router.push(`/chat?id=${chat_id}`).then(() => {
          // window.location.reload();
        });
      }
      // await router.push(`/chat?id=${chat_id}&wid=${workflow_id}`).then(() => {
      //   window.location.reload();
      // });

    }
    else {
      alert("Please select a chat")
    }
  }
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getConversationsForUser(100, 0);
        setChatData(data);
        console.log(data, 'dat123a');
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '25%',
          background: '#282828', // Dark grey background for sidebar
          // borderRight: '1px solid #ccc',
          padding: '10px',
          overflowY: 'auto',
          position: 'fixed',
          height: '100%',
          color: 'white',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>

          <strong >All Chats</strong>
        </div>
        {isLoading ? (
          <p>Loading chats...</p>
        ) : chatData.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
            {chatData.map((chat: any, index: number) => (
              chat.messages.length > 2 && (
                <div
                  className={
                    selectedChat?.id === chat.id
                      ? "text-sidebar flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-[40px] dark:bg-dark p-[10px] duration-200 bg-black mb-2"
                      : "text-sidebar flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-[40px] dark:hover:bg-dark p-[10px] duration-200 hover:bg-black mb-2"
                  }
                  key={index}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div>
                    <IconMessage size={20} className="dark:hover:bg-main" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                      }}
                    >
                      {chat.name.length>30?chat.name.slice(0,24)+'...':chat.name || `Chat ${index + 1}`}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#B0B0B0', // Lighter gray for date
                        marginTop: '0px',
                      }}
                    >
                      {new Date(chat.createdAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                </div>
              )
            ))}
          </ul>

        ) : (
          <p>No chats available</p>
        )}
      </div>

      {/* Chat Display */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          marginLeft: '25%',
          background: '#191919', // Dark background for main chat display
          color: 'white',
          overflowY: 'auto',
        }}
      >
        {selectedChat ? (
          <div>
            <div>
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {selectedChat.messages.map((message: any, index: number) => {
                    const isFirstUserMessage = message.role === 'user' && index === 0;

                    return (
                      !isFirstUserMessage && (
                        <li
                          key={index}
                          style={{
                            margin: '10px 0',
                            padding: '10px',
                            background: message.role === 'user' ? '#2C5234' : '', // Green for user messages
                            borderRadius: '5px',
                            color: message.role === 'user' ? 'white' : '#d1d1d1',
                            maxWidth: '100%', // Limits the maximum width of the message
                            width: 'fit-content', // Adjusts width to the content of the message
                            marginLeft: message.role === 'user' ? 'auto' : '', // Align user messages to the right
                            marginRight: message.role === 'user' ? '0' : 'auto', // Bot messages to the left
                            textAlign: 'left', // Ensures text inside the box starts from the left
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                              alignItems: 'center',
                            }}
                          >
                            {message.role !== 'user' ? (
                              <img
                                src={`/assets/logo-with-shadow.svg`}
                                alt="Tax Genie logo"
                                height={20}
                                width={20}
                              />
                            ) : null}
                            <p
                              style={{
                                marginLeft: message.role !== 'user' ? '10px' : '0',
                                marginRight: message.role === 'user' ? '10px' : '0',
                                wordWrap: 'break-word', // Ensures long text wraps within the maxWidth
                                whiteSpace: 'pre-wrap', // Preserves formatting and line breaks
                              }}
                            >
                              {message.content}
                            </p>
                          </div>
                        </li>
                      )
                    );
                  })}
                </ul>
              ) : (
                <p>No messages available for this chat.</p>
              )}
            </div>
          </div>
        ) : (
          <p>Select a chat to view its details</p>
        )}
      </div>
      <button
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '30px',
          background: '#282828',
          color: 'white',
          borderRadius: '30px',
          height: '55px',
          width: '250px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: 'none',
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          gap: '10px', // Adds space between text and icon
          fontSize: '16px',
          fontWeight: '500',
        }}
        onClick={handleReactivateButton}
      >
        <span>Continue Conversation</span>
        <IconMessageCircle size={24} />
      </button>
    </div>
  );
};

export default ChatHistory;
