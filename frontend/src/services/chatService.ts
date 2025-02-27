import { fetchApi } from '../config/api';

export interface ChatRequestParams {
  message: string;
  conversation_id?: string;
  file?: File; // For image or PDF uploads
}

export interface ChatResponse {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
}

/**
 * Sends a message to the LLM backend
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
  // Check if we need to handle file upload
  if (params.file) {
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('message', params.message);
    formData.append('file', params.file);
    
    if (params.conversation_id) {
      formData.append('conversation_id', params.conversation_id);
    }
    
    // Use fetchApi with FormData
    return await fetchApi<ChatResponse>('/api/chat/message', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });
  } else {
    // Regular JSON request for text-only messages
    return await fetchApi<ChatResponse>('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: params.message,
        conversation_id: params.conversation_id,
      }),
    });
  }
}

/**
 * Creates a new conversation
 * @returns Promise with the new conversation ID
 */
export async function createConversation(): Promise<{ conversation_id: string }> {
  return await fetchApi<{ conversation_id: string }>('/api/chat/conversation', {
    method: 'POST',
  });
}

/**
 * Retrieves conversation history
 * @param conversationId The ID of the conversation to retrieve
 * @returns Promise with the conversation history
 */
export async function getConversation(conversationId: string): Promise<{
  conversation_id: string;
  messages: ChatResponse[];
}> {
  return await fetchApi<{
    conversation_id: string;
    messages: ChatResponse[];
  }>(`/api/chat/conversation/${conversationId}`, {
    method: 'GET',
  });
}

// Mock implementation for development until backend is ready
export class MockChatService {
  // Generate a mock delay between 1-2 seconds
  private static getMockDelay(): number {
    return Math.floor(1000 + Math.random() * 1000);
  }
  
  // Mock send message function
  static async sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.getMockDelay()));
    
    let responseText = '';
    
    // Generate different response based on input
    if (params.file) {
      responseText = `I received your file "${params.file.name}" (${(params.file.size / (1024 * 1024)).toFixed(2)}MB).
      
Based on what I can see, this appears to be ${params.file.type.split('/')[0]} content. I'll do my best to help you with questions related to this material.

What specific questions do you have about this content?`;
    } else if (params.message.toLowerCase().includes('math') || params.message.toLowerCase().includes('equation')) {
      responseText = `Here's a mathematical explanation:

The quadratic formula is used to solve equations of the form $ax^2 + bx + c = 0$, where $a \\neq 0$.

The solution is given by:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

For example, to solve $x^2 - 5x + 6 = 0$:
1. Identify that $a=1$, $b=-5$, and $c=6$
2. Substitute into the formula:
   $$x = \\frac{5 \\pm \\sqrt{(-5)^2 - 4 \\cdot 1 \\cdot 6}}{2 \\cdot 1}$$
   $$x = \\frac{5 \\pm \\sqrt{25 - 24}}{2}$$
   $$x = \\frac{5 \\pm \\sqrt{1}}{2}$$
   $$x = \\frac{5 \\pm 1}{2}$$
3. This gives us $x = 3$ or $x = 2$

You can verify these solutions work by substituting back into the original equation.`;
    } else if (params.message.toLowerCase().includes('code') || params.message.toLowerCase().includes('python')) {
      responseText = `Here's a code example in Python that demonstrates a simple recursive function:

\`\`\`python
def factorial(n):
    """
    Calculates the factorial of a number using recursion.
    
    Args:
        n (int): The number to calculate factorial for
        
    Returns:
        int: The factorial of n
    """
    # Base case
    if n == 0 or n == 1:
        return 1
    
    # Recursive case
    return n * factorial(n - 1)

# Test the function
for i in range(10):
    print(f"{i}! = {factorial(i)}")
\`\`\`

This implementation uses recursion to calculate factorials. The base case returns 1 for inputs of 0 or 1, and the recursive case multiplies the current number by the factorial of (n-1).

Would you like me to explain how recursion works in more detail?`;
    } else {
      responseText = `I understand your question about "${params.message}". 

To properly answer this, I would need to consider multiple perspectives. In general, this topic involves several key concepts that build upon each other.

First, let's establish the fundamentals...

The most important thing to remember is that context matters significantly in how we approach problems like this. When facing similar challenges in the future, try to identify the underlying patterns first.

Does this help answer your question? I can go into more detail on any specific aspect you'd like to explore further.`;
    }
    
    // Return mock response
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      conversation_id: params.conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content: responseText,
      created_at: new Date().toISOString(),
    };
  }
  
  // Mock create conversation
  static async createConversation(): Promise<{ conversation_id: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.getMockDelay()));
    
    return {
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
  
  // Mock get conversation history
  static async getConversation(conversationId: string): Promise<{
    conversation_id: string;
    messages: ChatResponse[];
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.getMockDelay()));
    
    // Mock conversation with system greeting and empty history
    return {
      conversation_id: conversationId,
      messages: [
        {
          id: `msg_${Date.now() - 1000}_${Math.random().toString(36).substring(2, 9)}`,
          conversation_id: conversationId,
          content: "Hello! I'm your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?",
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ],
    };
  }
}