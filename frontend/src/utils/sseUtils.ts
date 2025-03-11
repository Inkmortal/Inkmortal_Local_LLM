/**
 * Server-Sent Events (SSE) utilities for streaming responses
 */

/**
 * Parse an SSE event line into parts
 * @param line Event line from SSE
 * @returns Parsed event data or null if not a data line
 */
export function parseSSELine(line: string): string | null {
  // Check if it's a data line
  if (line.startsWith('data: ')) {
    return line.substring(6); // Remove 'data: ' prefix
  }
  return null;
}

/**
 * Process SSE text content into usable objects/strings
 * @param content Full SSE response text
 * @returns Array of parsed data items from the stream
 */
export function processSSEContent(content: string): any[] {
  const results: any[] = [];
  
  // Split by double newlines which separate events
  const events = content.split(/\n\n/);
  
  for (const event of events) {
    // Skip empty events
    if (!event.trim()) continue;
    
    // Check for data lines
    const lines = event.split('\n');
    for (const line of lines) {
      const data = parseSSELine(line);
      if (data) {
        try {
          // Try to parse as JSON
          results.push(JSON.parse(data));
        } catch (e) {
          // If not valid JSON, use as raw text
          results.push(data);
        }
      }
    }
  }
  
  return results;
}

/**
 * Creates a reader function that processes a ReadableStream from fetch
 * @param stream ReadableStream to process
 * @param onChunk Callback for each chunk of data
 * @returns Promise that resolves when stream is fully processed
 */
export async function processSSEStream(
  stream: ReadableStream<Uint8Array>, 
  onChunk: (data: any) => void,
  onError?: (error: any) => void
): Promise<void> {
  try {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process any complete events (ending with double newline)
      const parts = buffer.split(/\n\n/);
      // Keep the last part in buffer if it's incomplete
      buffer = parts.pop() || '';
      
      // Process complete events
      for (const part of parts) {
        if (!part.trim()) continue;
        
        // Look for data lines
        const lines = part.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6); // Remove 'data: ' prefix
            try {
              // Try to parse as JSON first
              onChunk(JSON.parse(data));
            } catch (e) {
              // If not valid JSON, send as text
              onChunk(data);
            }
          }
        }
      }
    }
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          try {
            onChunk(JSON.parse(data));
          } catch (e) {
            onChunk(data);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing SSE stream:', error);
    if (onError) {
      onError(error);
    }
  }
}

/**
 * Creates a streaming fetch request for SSE content
 * @param url URL to fetch
 * @param options Fetch options
 * @param onChunk Callback for each chunk of data
 * @returns Promise that resolves when stream is fully processed
 */
export async function fetchSSE(
  url: string,
  options: RequestInit,
  onChunk: (data: any) => void,
  onError?: (error: any) => void
): Promise<void> {
  try {
    // Check if the stream option is supported and use it
    const fetchOptions: RequestInit = {
      ...options,
      // Ensure proper headers for SSE
      headers: {
        ...options.headers,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    };
    
    console.log('Fetching SSE from:', url);
    
    const response = await fetch(url, fetchOptions);
    
    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SSE HTTP error:', response.status, errorText);
      
      throw new Error(`HTTP error! Status: ${response.status}, ${errorText}`);
    }
    
    // Check content type for debugging
    const contentType = response.headers.get('Content-Type');
    console.log('SSE Content-Type:', contentType);
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    await processSSEStream(response.body, onChunk, onError);
    console.log('SSE stream completed successfully');
  } catch (error) {
    console.error('Error in fetchSSE:', error);
    if (onError) {
      onError(error);
    }
  }
}