/**
 * Optimized TokenBufferManager - reduces React re-renders during streaming
 * by batching updates and preventing memory leaks
 */
export class TokenBufferManager {
  private buffer: string = '';
  private timeoutId: number | null = null;
  private updateCallback: (tokens: string) => void;
  private flushDelay: number;
  private maxBufferSize: number;
  private totalProcessed: number = 0;
  private isDisposedFlag: boolean = false;
  private lastFlushTime: number = 0;
  private creationTime: number = Date.now();

  /**
   * Create a new token buffer manager with enhanced performance
   * @param updateCallback Function to call when tokens are flushed
   * @param options Configuration options
   */
  constructor(
    updateCallback: (tokens: string) => void,
    options: { flushDelay?: number; maxBufferSize?: number } = {}
  ) {
    this.updateCallback = updateCallback;
    // Smaller flush delay for more responsiveness with smaller batches
    this.flushDelay = options.flushDelay || 50; // ms (reduced from 100ms)
    // Larger buffer size to reduce update frequency
    this.maxBufferSize = options.maxBufferSize || 80; // characters (increased from 50)
    this.lastFlushTime = Date.now();
  }

  /**
   * Add tokens to the buffer with adaptive batching
   * @param tokens Tokens to add
   */
  addTokens(tokens: string): void {
    // Safety check to avoid memory leaks
    if (this.isDisposedFlag) {
      console.warn('Attempted to add tokens to disposed TokenBufferManager');
      return;
    }
    
    // Track total processed
    this.totalProcessed += tokens.length;
    this.buffer += tokens;
    
    const now = Date.now();
    const timeSinceLastFlush = now - this.lastFlushTime;
    
    // Flush in any of these conditions:
    // 1. Buffer exceeds max size
    // 2. It's been more than 100ms since last flush
    // 3. Total processed is very large (memory safety)
    if (
      this.buffer.length >= this.maxBufferSize || 
      timeSinceLastFlush > 100 ||
      this.totalProcessed > 50000
    ) {
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled with adaptive delay
    if (this.timeoutId === null) {
      // Shorter delay for smaller buffers to improve visual responsiveness
      const adaptiveDelay = this.buffer.length < 20 ? 30 : this.flushDelay;
      
      this.timeoutId = window.setTimeout(() => {
        // Execute flush in animation frame for smoother updates
        window.requestAnimationFrame(() => {
          if (!this.isDisposedFlag) {
            this.flush();
          }
        });
      }, adaptiveDelay);
    }
  }

  /**
   * Force flush buffer immediately
   * Calls the update callback with current buffer contents
   */
  flush(): void {
    if (this.isDisposedFlag) return;
    
    if (this.buffer.length > 0) {
      try {
        this.updateCallback(this.buffer);
      } catch (error) {
        console.error('Error in token buffer update callback:', error);
      }
      this.buffer = '';
      this.lastFlushTime = Date.now();
    }
    
    this.clearTimeout();
  }

  /**
   * Clear any pending timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Clean up resources and prevent memory leaks
   * Should be called when this manager is no longer needed
   */
  dispose(): void {
    if (this.isDisposedFlag) return;
    
    this.flush();
    this.clearTimeout();
    this.isDisposedFlag = true;
    
    // Clear buffer and callback references to help garbage collection
    this.buffer = '';
    this.updateCallback = () => {}; // Replace with no-op function
    
    // Log lifetime for monitoring
    const lifetime = Date.now() - this.creationTime;
    console.log(`TokenBufferManager disposed after ${lifetime}ms, processed ${this.totalProcessed} characters`);
  }
  
  /**
   * Check if the buffer manager has been disposed
   * @returns boolean indicating if this instance is disposed
   */
  isDisposed(): boolean {
    return this.isDisposedFlag;
  }
}