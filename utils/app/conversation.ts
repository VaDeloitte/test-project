import { Conversation } from '@/types/chat';
import { authenticatedFetch } from './csrf';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  // localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const saveFiles = (files: any) => {
  localStorage.setItem('files', JSON.stringify(files));
};

export const getFiles = () => {
  const files = localStorage.getItem('files');
  return files ? JSON.parse(files) : null;
};

// export function getAllConversationsFromLocalStorage() {
//   const conversations = [];
//   for (let i = 0; i < localStorage.length; i++) {
//     const key = localStorage.key(i);
//     if (key && key.startsWith("conversation_")) {
//       const conversationData = localStorage.getItem(key);
//       if (conversationData) {
//         conversations.push(JSON.parse(conversationData));
//       }
//     }
//   }
//   return conversations;
// }

// export function clearAllConversationsFromLocalStorage() {
//   // Retrieve all keys from local storage
//   const keys = Object.keys(localStorage);

//   // Iterate over the keys
//   for (const key of keys) {
//     // Check if the key starts with "conversation_"
//     if (key.startsWith("conversation_")) {
//       // Remove the item from local storage
//       localStorage.removeItem(key);
//     }
//   }
// }

// export function deleteConversationById(conversationId:any) {
//   const key = `conversation_${conversationId}`;
//   localStorage.removeItem(key);
// }

// export function changeConversationNameById(conversationId:any, newName:any) {
//   const key = `conversation_${conversationId}`;
//   const conversationData = localStorage.getItem(key);
//   if (conversationData) {
//     const conversation = JSON.parse(conversationData);
//     conversation.name = newName;  // Update the name of the conversation
//     localStorage.setItem(key, JSON.stringify(conversation));  // Save the updated conversation back to local storage
//     return true;  // Return true if the operation was successful
//   }
//   return false;  // Return false if the conversation was not found
// }

export function clearMessagesInSelectedConversation() {
  // Retrieve the selectedConversation object from localStorage
  const selected:any = localStorage.getItem('selectedConversation');
  const selectedConversation:any = JSON.parse(selected);

  if (selectedConversation) {
      // Clear the messages array
      selectedConversation.messages = [];

      // Store the updated object back into localStorage
      //localStorage.setItem('selectedConversation', JSON.stringify(selectedConversation));

      console.log('Messages cleared successfully.');
  } else {
      console.log('No selectedConversation found in localStorage.');
  }
}

// export function changeIdForSelectedConversation(id:any) {
//   // Retrieve the selectedConversation object from localStorage
//   const selected:any = localStorage.getItem('selectedConversation');
//   const selectedConversation:any = JSON.parse(selected);

  

//   if (selectedConversation) {
//       // Generate a new ID (e.g., using a simple UUID function)
//       selectedConversation.id = id;

//       // Store the updated object back into localStorage
//       localStorage.setItem('selectedConversation', JSON.stringify(selectedConversation));

//       console.log('ID changed successfully.');
//   } else {
//       console.log('No selectedConversation found in localStorage.');
//   }
// }

export const getConversationsForUser = async (limit:number,skip:number,type = 1) => {
  try {
    // Get userId from localStorage (set during Azure AD login)
    let userId = localStorage.getItem("userId");
    
    // If userId not found, try to get from user object
    if (!userId) {
      const userDataStr = localStorage.getItem('user');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          userId = userData.id;
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }
    
    if (!userId) {
      console.error('No userId found - user may not be authenticated');
      return [];
    }
    const response = await fetch(`/api/conversations?userId=${userId}&type=${type}&limit=${limit}&skip=${skip}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result; // Array of conversations
    } else {
      console.error(result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

export async function deleteAllConversations(userId:any) {
  try {
    const response = await fetch(`/api/conversations?type=all&&userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete conversations');
    }

    const data = await response.json();
    console.log('Conversations deleted successfully:', data);
  } catch (error) {
    console.error('Error deleting conversations:', error);
  }
}

export async function updateConversationName(id:any, userId:any, name:any) {
  try {
    const response = await authenticatedFetch('/api/conversations', {
      method: 'PUT',
      body: JSON.stringify({ id, userId, name }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('Conversation updated successfully:', data.data);
    } else {
      console.error('Failed to update conversation:', data.message);
    }
  } catch (error:any) {
    console.error('An error occurred:', error.message);
  }
}


export async function deleteConversation(userId: any, id: any) {
  try {
    const response = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('Conversation deleted successfully:', data.data);
      return data; // Return the API result
    } else {
      console.error('Failed to delete conversation:', data.message);
      return data; // Return the API result with failure message
    }
  } catch (error: any) {
    console.error('An error occurred:', error.message);
    return { success: false, message: error.message }; // Return error result
  }
}

export async function updateMessage(conversationId:any, userId:any, messageIndex:any, newContent:any, newFile:any=[], newRole:any) {
  const url = `/api/conversations?conversationId=${conversationId}&userId=${userId}`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer yourAuthToken' // Include authorization or other necessary headers
      },
      body: JSON.stringify({
        messageIndex,
        newContent,
        newFile,
        newRole
      })
    });

    const data = await response.json();
    console.log('Success:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update the message');
    }

    return data; // Return the response data for further processing if needed
  } catch (error) {
    console.error('Error:', error);
    throw error; // Rethrow the error to handle it in the calling context
  }
}



export async function deleteMessage(conversationId:any, userId:any, messageIndex:any) {
  try {
    // Construct the API URL with query parameters
    const url = new URL('/api/conversations/messages', window.location.origin);
    url.searchParams.append('conversationId', conversationId);
    url.searchParams.append('userId', userId);
    url.searchParams.append('type', 'one');
    url.searchParams.append('messageIndex', messageIndex);

    // Perform the DELETE request
    const response = await fetch(url, {
      method: 'DELETE',
    });

    // Handle the response
    const result = await response.json();

    if (response.ok) {
      return result;
      console.log('Message deleted successfully:', result);
    } else {
      console.error('Failed to delete message:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


