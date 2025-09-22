/**
 * Utility to separate thinking content from response content
 * Handles <think> tags that come from thinking models
 */

export interface SeparatedContent {
  response: string;
  thinking: string;
}

/**
 * Separates content containing <think> tags into response and thinking sections
 * @param content - Raw content that may contain <think> tags
 * @returns Object with separated response and thinking content
 */
export function separateThinkingContent(content: string): SeparatedContent {
  // Handle null/undefined content
  if (!content) {
    return { response: '', thinking: '' };
  }

  // Match <think> tags and their content, including nested tags
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let thinking = '';
  let response = content;

  // Extract all thinking sections
  const matches = content.matchAll(thinkRegex);
  for (const match of matches) {
    thinking += match[1];
    // Remove the entire think tag and its content from response
    response = response.replace(match[0], '');
  }

  // Clean up any extra whitespace
  return {
    response: response.trim(),
    thinking: thinking.trim()
  };
}

/**
 * Checks if content has incomplete think tags (for streaming scenarios)
 * @param content - Content to check
 * @returns true if there's an unclosed <think> tag
 */
export function hasIncompleteThinkTag(content: string): boolean {
  if (!content) return false;

  // Count opening and closing tags
  const openCount = (content.match(/<think>/gi) || []).length;
  const closeCount = (content.match(/<\/think>/gi) || []).length;

  return openCount > closeCount;
}

/**
 * Extracts partial thinking content during streaming
 * Returns the content up to the last complete think tag pair
 * @param content - Streaming content that may have partial think tags
 * @returns Object with complete content and any incomplete remainder
 */
export function extractCompleteThinking(content: string): {
  complete: SeparatedContent;
  incomplete: string;
} {
  if (!content) {
    return {
      complete: { response: '', thinking: '' },
      incomplete: ''
    };
  }

  // Find the last complete </think> tag
  const lastCloseIndex = content.lastIndexOf('</think>');

  if (lastCloseIndex === -1) {
    // No complete think tags yet
    const firstOpenIndex = content.indexOf('<think>');
    if (firstOpenIndex === -1) {
      // No think tags at all, all content is response
      return {
        complete: { response: content, thinking: '' },
        incomplete: ''
      };
    } else {
      // We have an opening tag but no closing tag yet
      return {
        complete: { response: content.substring(0, firstOpenIndex), thinking: '' },
        incomplete: content.substring(firstOpenIndex)
      };
    }
  }

  // We have at least one complete think tag pair
  const completeContent = content.substring(0, lastCloseIndex + '</think>'.length);
  const incompleteContent = content.substring(lastCloseIndex + '</think>'.length);

  return {
    complete: separateThinkingContent(completeContent),
    incomplete: incompleteContent
  };
}