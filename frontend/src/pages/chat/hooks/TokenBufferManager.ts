/**
 * TokenBufferManager - optimizes token streaming by batching updates
 * This helps reduce the number of React re-renders during streaming
 */
export class TokenBufferManager {
  private buffer: string = '';
  private timeoutId: number | null = null;
  private updateCallback: (tokens: string) => void;
  private flushDelay: number;
  private maxBufferSize: number;

  /**
   * Create a new token buffer manager
   * @param updateCallback Function to call when tokens are flushed
   * @param options Configuration options
   */
  constructor(
    updateCallback: (tokens: string) => void,
    options: { flushDelay?: number; maxBufferSize?: number } = {}
  ) {
    this.updateCallback = updateCallback;
    this.flushDelay = options.flushDelay || 100; // ms
    this.maxBufferSize = options.maxBufferSize || 50; // characters
  }

  /**
   * Add tokens to the buffer
   * Will automatically flush if buffer size exceeds maxBufferSize
   * @param tokens Tokens to add
   */
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

  /**
   * Force flush buffer immediately
   * Calls the update callback with current buffer contents
   */
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

  /**
   * Clean up resources
   * Should be called when this manager is no longer needed
   */
  dispose(): void {
    this.flush();
  }
}