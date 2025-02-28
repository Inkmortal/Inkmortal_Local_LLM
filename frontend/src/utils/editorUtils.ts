import { htmlToMarkdown, cleanupMarkdown } from './htmlToMarkdown';

/**
 * Convert HTML from the TipTap editor to markdown format for LLM consumption
 * @param html The HTML content from the editor
 * @returns Properly formatted markdown for LLM consumption
 */
export function convertEditorContentToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';
  
  try {
    // Use our HTML to Markdown converter
    const markdown = cleanupMarkdown(htmlToMarkdown(html));
    console.log('Converted editor HTML to markdown for LLM:', markdown);
    return markdown;
  } catch (error) {
    console.error('Error converting HTML to markdown:', error);
    
    // Create a temporary div to extract text content as fallback
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || html;
  }
}