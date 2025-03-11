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
    this.flushDelay = options.flushDelay || 100; // ms
    this.maxBufferSize = options.maxBufferSize || 50; // characters
  }

  // Add tokens to buffer with support for both incremental tokens and full content updates
  addTokens(tokens: string): void {
    // Track if this is an empty token message (important for streaming start)
    const isEmpty = tokens === '';
    
    // Always handle empty tokens immediately (common at stream start)
    if (isEmpty) {
      this.buffer = ''; // Clear buffer for empty tokens
      this.flush();
      return;
    }
    
    // APPEND the tokens to our buffer to accumulate them
    // This is the correct behavior for actual token-by-token streaming
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