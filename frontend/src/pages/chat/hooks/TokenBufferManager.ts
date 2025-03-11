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

  // Add tokens to buffer with empty token support
  addTokens(tokens: string): void {
    // Track if this is an empty token message (important for streaming start)
    const isEmpty = tokens === '';
    
    // For backend streaming, we receive full content each time, not incremental tokens
    // So we REPLACE the buffer with the new tokens instead of appending
    if (!isEmpty) {
      this.buffer = tokens; // Replace instead of append
    }
    
    // Always flush immediately for empty tokens
    // This helps ensure the UI updates promptly at streaming start
    if (isEmpty) {
      this.buffer = ''; // Clear buffer for empty tokens
      this.flush();
      return;
    }
    
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