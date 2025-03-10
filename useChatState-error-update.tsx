// TokenBufferManager - optimizes token streaming by batching updates
class TokenBufferManager {
  private buffer: string = '';
  private timeoutId: number | null = null;
  private updateCallback: (tokens: string) => void;
  private flushDelay: number;
  private maxBufferSize: number;

  constructor(
    updateCallback: (tokens: string) => void,
    options: { flushDelay?: number; maxBufferSize?: number } = {}
  ) {
    this.updateCallback = updateCallback;
    this.flushDelay = options.flushDelay || 100; // ms
    this.maxBufferSize = options.maxBufferSize || 50; // characters
  }

  // Add tokens to buffer
  addTokens(tokens: string): void {
    this.buffer += tokens;
    
    // Flush buffer if it exceeds max size
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled
    if (this.timeoutId === null) {
      this.timeoutId = window.setTimeout(() => {
        this.flush();
      }, this.flushDelay);
    }
  }

  // Force flush buffer immediately
  flush(): void {
    if (this.buffer.length > 0) {
      this.updateCallback(this.buffer);
      this.buffer = '';
    }
    
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  // Clean up resources
  dispose(): void {
    this.flush();
  }
}

// In useChatState.tsx, add this to the component:
// Create refs
const tokenBufferRef = useRef<TokenBufferManager | null>(null);

// In the sendUserMessage function:
// Initialize token buffer manager for this message
tokenBufferRef.current = new TokenBufferManager((tokens) => {
  if (!isMountedRef.current) return;
  
  setMessages(prev => {
    const assistantMsg = prev.find(msg => 
      msg.role === 'assistant' && 
      msg.status === MessageStatus.STREAMING
    );
    
    if (assistantMsg) {
      return prev.map(msg => 
        msg.id === assistantMsg.id 
          ? { ...msg, content: msg.content + tokens } 
          : msg
      );
    } else {
      const newAssistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: tokens,
        timestamp: new Date(),
        status: MessageStatus.STREAMING
      };
      return [...prev, newAssistantMsg];
    }
  });
});

// Update onToken handler:
onToken: (token) => {
  if (!isMountedRef.current) return;
  
  // Add tokens to buffer manager to optimize rendering
  if (tokenBufferRef.current) {
    tokenBufferRef.current.addTokens(token);
  } else {
    // Fallback to direct update if buffer not initialized
    setMessages(prev => {
      // (original code)
    });
  }
}