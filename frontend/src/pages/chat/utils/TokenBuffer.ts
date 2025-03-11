import { ContentUpdateMode } from '../types/message';

export class TokenBuffer {
  private buffer: string = '';
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastFlushTime: number = 0;
  private readonly callback: (content: string, mode: ContentUpdateMode) => void;
  private readonly flushDelay: number;
  private readonly maxBufferSize: number;
  private readonly debug: boolean;
  
  constructor(
    callback: (content: string, mode: ContentUpdateMode) => void,
    options: {
      flushDelay?: number;
      maxBufferSize?: number;
      debug?: boolean;
    } = {}
  ) {
    this.callback = callback;
    this.flushDelay = options.flushDelay || 50; // Default 50ms
    this.maxBufferSize = options.maxBufferSize || 50; // Default 50 chars
    this.debug = options.debug || false;
    
    if (this.debug) {
      console.log('[TokenBuffer] Created with options:', options);
    }
  }
  
  public addTokens(tokens: string, mode: ContentUpdateMode = ContentUpdateMode.APPEND): void {
    if (!tokens) {
      if (this.debug) {
        console.log('[TokenBuffer] Ignoring empty token');
      }
      return;
    }
    
    if (this.debug) {
      console.log(`[TokenBuffer] Adding ${tokens.length} chars with mode ${mode}`);
    }
    
    // If we're in REPLACE mode, clear the buffer first
    if (mode === ContentUpdateMode.REPLACE) {
      this.buffer = tokens;
    } else {
      // Normal APPEND mode
      this.buffer += tokens;
    }
    
    if (this.debug) {
      console.log(`[TokenBuffer] Buffer size now: ${this.buffer.length} chars`);
    }
    
    // Flush immediately if buffer exceeds max size
    if (this.buffer.length >= this.maxBufferSize) {
      if (this.debug) {
        console.log('[TokenBuffer] Flushing immediately due to max size reached');
      }
      this.flush(mode);
      return;
    }
    
    // Schedule a flush if not already scheduled
    if (!this.timerId) {
      // Use high precision timer for better accuracy
      const now = performance.now();
      const timeUntilNextFlush = Math.max(0, this.flushDelay - (now - this.lastFlushTime));
      
      if (this.debug) {
        console.log(`[TokenBuffer] Scheduling flush in ${timeUntilNextFlush}ms`);
      }
      
      this.timerId = setTimeout(() => {
        if (this.debug) {
          console.log('[TokenBuffer] Executing scheduled flush');
        }
        this.flush(mode);
      }, timeUntilNextFlush);
    }
  }
  
  public flush(mode: ContentUpdateMode = ContentUpdateMode.APPEND): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    if (this.buffer.length === 0) {
      return;
    }
    
    if (this.debug) {
      console.log(`[TokenBuffer] Flushing ${this.buffer.length} chars with mode ${mode}`);
    }
    
    this.lastFlushTime = performance.now();
    const content = this.buffer;
    this.buffer = '';
    
    try {
      this.callback(content, mode);
    } catch (error) {
      console.error('[TokenBuffer] Error in callback:', error);
    }
  }
  
  public dispose(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    // Flush any remaining content
    if (this.buffer.length > 0) {
      this.flush();
    }
    
    if (this.debug) {
      console.log('[TokenBuffer] Disposed');
    }
  }
}