/**
 * Simple event emitter for WebSocket and message events
 * 
 * This provides a pub/sub pattern to decouple WebSocket message handling from React components.
 * Components subscribe to events without creating closure-based handlers that capture stale state.
 */

// Event listener type for all subscribers
export type EventListener = (data?: any) => void;

export class EventEmitter {
  private listeners: Record<string, Set<EventListener>> = {};

  /**
   * Subscribe to an event
   * @param event Event name to subscribe to
   * @param listener Function to call when event is emitted
   * @returns Unsubscribe function
   */
  public on(event: string, listener: EventListener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    
    this.listeners[event].add(listener);
    
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name to unsubscribe from
   * @param listener The specific listener to remove
   */
  public off(event: string, listener: EventListener): void {
    if (this.listeners[event]) {
      this.listeners[event].delete(listener);
      
      // Clean up empty listener sets
      if (this.listeners[event].size === 0) {
        delete this.listeners[event];
      }
    }
  }

  /**
   * Emit an event with optional data
   * @param event Event name to emit
   * @param data Optional data to pass to listeners
   */
  public emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event only once
   * @param event Event name to subscribe to
   * @param listener Function to call when event is emitted
   */
  public once(event: string, listener: EventListener): () => void {
    const onceListener: EventListener = (data) => {
      this.off(event, onceListener);
      listener(data);
    };
    
    return this.on(event, onceListener);
  }

  /**
   * Remove all listeners for a specific event
   * @param event Event name to clear listeners for
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  /**
   * Get all currently registered events
   * @returns Array of event names
   */
  public events(): string[] {
    return Object.keys(this.listeners);
  }

  /**
   * Check if an event has any listeners
   * @param event Event name to check
   * @returns True if event has listeners
   */
  public hasListeners(event: string): boolean {
    return !!this.listeners[event] && this.listeners[event].size > 0;
  }
}

// Create a singleton instance
export const eventEmitter = new EventEmitter();