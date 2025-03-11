/**
 * API service for chat functionality
 */
import { Conversation } from '../../pages/chat/types/message';

// Base API URL - dynamically detect if we're in dev or prod
const API_BASE = window.location.href.includes('localhost') 
  ? 'http://localhost:8000' 
  : window.location.origin;

/**
 * Send a message to the chat API with streaming support
 */
export async function sendMessage(
  authToken: string,
  options: {
    message: string;
    conversationId?: string;
    onToken?: (content: string, isComplete?: boolean) => void;
  }
): Promise<{
  conversationId: string;
  id?: string;
}> {
  const { message, conversationId, onToken } = options;
  
  // Create the request body
  const body = JSON.stringify({
    message,
    conversation_id: conversationId
  });
  
  // Set up headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  // Send the request
  const response = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers,
    body
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  // Handle streaming response
  const reader = response.body?.getReader();
  let decoder = new TextDecoder('utf-8');
  let buffer = '';
  let conversationIdFromResponse = '';
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining buffer
        if (buffer && onToken) {
          onToken(buffer, true);
        }
        break;
      }
      
      // Decode this chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process SSE format (data: {...})
      while (buffer.includes('\n\n')) {
        const eventEnd = buffer.indexOf('\n\n');
        const eventData = buffer.substring(0, eventEnd);
        buffer = buffer.substring(eventEnd + 2);
        
        // Extract JSON data from SSE format
        if (eventData.startsWith('data: ')) {
          try {
            const jsonStr = eventData.substring(6);
            const data = JSON.parse(jsonStr);
            
            // Handle error response
            if (data.error) {
              throw new Error(data.error);
            }
            
            // Extract conversation ID if available
            if (data.conversation_id && !conversationIdFromResponse) {
              conversationIdFromResponse = data.conversation_id;
            }
            
            // Extract and process token content
            let content = '';
            let isComplete = false;
            
            if (data.choices && data.choices.length > 0) {
              // Handle OpenAI format
              const choice = data.choices[0];
              if (choice.delta && choice.delta.content) {
                content = choice.delta.content;
              }
              isComplete = choice.finish_reason !== null;
            } else if (data.response) {
              // Handle Ollama format
              content = data.response;
              isComplete = data.done === true;
            } else if (data.content) {
              // Generic format
              content = data.content;
            }
            
            // Send token to callback
            if (content && onToken) {
              onToken(content, isComplete);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  }
  
  // Return the conversation ID and message ID
  return {
    conversationId: conversationIdFromResponse || conversationId || '',
    // We can't reliably get the message ID from streaming, it will be updated via websocket
  };
}

/**
 * Get a list of user conversations
 */
export async function getConversations(authToken: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}/api/chat/conversations`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load conversations: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Map API response to our Conversation type
  return data.conversations.map((conv: any) => ({
    id: conv.id || conv.conversation_id,
    title: conv.title || "New conversation",
    createdAt: new Date(conv.created_at).getTime(),
    updatedAt: new Date(conv.updated_at || conv.created_at).getTime()
  }));
}

/**
 * Get a single conversation with its messages
 */
export async function getConversation(
  authToken: string, 
  conversationId: string
): Promise<{
  conversation: Conversation;
  messages: any[];
}> {
  const response = await fetch(`${API_BASE}/api/chat/conversation/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load conversation: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Format conversation
  const conversation: Conversation = {
    id: data.id || data.conversation_id,
    title: data.title || "New conversation",
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at || data.created_at).getTime()
  };
  
  // Format messages
  const messages = Array.isArray(data.messages) 
    ? data.messages.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        status: 'complete'
      }))
    : [];
  
  return { conversation, messages };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  authToken: string,
  title: string = "New conversation"
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/api/chat/conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ title })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.conversation_id,
    title: data.title || title,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  authToken: string,
  conversationId: string
): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/chat/conversation/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }
  
  return true;
}