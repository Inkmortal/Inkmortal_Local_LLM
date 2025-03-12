/**
 * TokenBufferManager for efficient UI updates during streaming
 * 
 * This class efficiently batches token updates from streaming responses to reduce UI re-rendering.
 * It provides a balance between responsiveness and performance by:
 * 1. Collecting tokens in a buffer
 * 2. Flushing the buffer when it reaches a certain size
 * 3. Scheduling periodic flushes for smaller amounts of content
 * 4. Supporting empty token handling for incremental streaming
 * 5. Handling full-content updates from backend (not just incremental tokens)
 */
export class TokenBufferManager {
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
    this.flushDelay = options.flushDelay || 30; // ms (reduced from 50ms for even smoother streaming)
    this.maxBufferSize = options.maxBufferSize || 10; // characters (reduced from 20 for more frequent updates)
    console.log("TokenBufferManager created with delay:", this.flushDelay, "max size:", this.maxBufferSize);
  }

  // Add tokens to buffer with support for both incremental tokens and full content updates
  addTokens(tokens: string): void {
    // Track if this is an empty token message (important for streaming start)
    const isEmpty = tokens === '';
    
    // Log tokens being added
    console.log("TokenBufferManager addTokens:", isEmpty ? "empty token" : tokens);
    
    // Always handle empty tokens immediately (common at stream start)
    if (isEmpty) {
      // Just ignore empty tokens instead of clearing buffer
      console.log("TokenBufferManager: Ignoring empty token");
      return;
    }
    
    // APPEND the tokens to our buffer to accumulate them
    // This is the correct behavior for actual token-by-token streaming
    this.buffer += tokens;
    console.log("TokenBufferManager buffer now:", this.buffer.length, "chars");
    
    // Flush buffer if it exceeds max size
    if (this.buffer.length >= this.maxBufferSize) {
      console.log("TokenBufferManager buffer full, flushing");
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled
    if (this.timeoutId === null) {
      this.timeoutId = window.setTimeout(() => {
        console.log("TokenBufferManager scheduled flush executing");
        this.flush();
      }, this.flushDelay);
    }
  }

  // Force flush buffer immediately
  flush(): void {
    if (this.buffer.length > 0) {
      console.log("TokenBufferManager flushing buffer of", this.buffer.length, "chars");
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
    console.log("TokenBufferManager being disposed");
    this.flush();
  }
}