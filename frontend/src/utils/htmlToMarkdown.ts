/**
 * Utility function to convert HTML to Markdown
 * This is a simple implementation that handles common HTML tags without external dependencies
 */

/**
 * Converts HTML to Markdown text
 * @param html HTML string to convert
 * @returns Markdown formatted string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';
  
  // First create a DOM element to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process the body content
  const result = processNode(doc.body);

  // Clean up and return
  return cleanupMarkdown(result);
}

/**
 * Converts HTML to markdown with specific emphasis on our TipTap extensions for math and code
 */
export function convertHtmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';
  
  // First create a DOM element to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process math nodes - our TipTap extension uses <math-inline> elements
  const mathNodes = doc.querySelectorAll('[data-type="math"]');
  mathNodes.forEach(node => {
    const mathValue = node.getAttribute('data-value') || '';
    const mathSpan = document.createElement('span');
    mathSpan.setAttribute('class', 'math-inline');
    mathSpan.textContent = mathValue;
    node.parentNode?.replaceChild(mathSpan, node);
  });
  
  // Process the body content
  const result = processNode(doc.body);
  
  // Apply custom transformations specific to our needs
  let markdown = result
    // Convert span.math-inline to $formula$ format
    .replace(/<span class="math-inline">(.*?)<\/span>/g, '$$$1$$')
    // Handle TipTap code blocks with language
    .replace(/<pre data-language="([^"]*)">([\s\S]*?)<\/pre>/g, '```$1\n$2```');
  
  // Clean up and return
  return cleanupMarkdown(markdown);
}

/**
 * Recursively processes DOM nodes and converts to markdown
 */
function processNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const element = node as HTMLElement;
  let result = '';
  
  // Handle nodes based on tag name
  switch (element.tagName.toLowerCase()) {
    case 'div':
      // Handle special math blocks
      if (element.getAttribute('data-type') === 'math-block') {
        const latex = element.textContent || '';
        return `$$${latex}$$\n\n`;
      }
      
      // Regular div - process children and add newlines
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      
      // Only add newlines if not already present
      if (!result.endsWith('\n\n')) {
        result += '\n\n';
      }
      return result;
      
    case 'p':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return result + '\n\n';
      
    case 'br':
      return '\n';
      
    case 'strong':
    case 'b':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `**${result}**`;
      
    case 'em':
    case 'i':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `*${result}*`;
      
    case 'pre':
      // Handle code blocks
      const language = element.getAttribute('data-language') || '';
      const codeElement = element.querySelector('code');
      const code = codeElement ? codeElement.textContent || '' : element.textContent || '';
      return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
      
    case 'code':
      // Only process as inline code if not inside a pre (handled above)
      if (element.parentElement?.tagName.toLowerCase() !== 'pre') {
        result = element.textContent || '';
        return `\`${result}\``;
      }
      return element.textContent || '';
      
    case 'ul':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return result + '\n';
      
    case 'ol':
      result = Array.from(element.childNodes)
        .map((child, index) => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
            const content = processNode(child).trim();
            return `${index + 1}. ${content}\n`;
          }
          return processNode(child);
        })
        .join('');
      return result + '\n';
      
    case 'li':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      
      // Detect if we're in an ordered or unordered list
      const parent = element.parentElement;
      if (parent && parent.tagName.toLowerCase() === 'ol') {
        // Numbering is handled by the ol case
        return result;
      }
      return `- ${result}`;
      
    case 'a':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      const href = element.getAttribute('href') || '';
      return `[${result}](${href})`;
      
    case 'img':
      const alt = element.getAttribute('alt') || '';
      const src = element.getAttribute('src') || '';
      return `![${alt}](${src})`;
      
    case 'h1':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `# ${result}\n\n`;
      
    case 'h2':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `## ${result}\n\n`;
      
    case 'h3':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `### ${result}\n\n`;
      
    case 'h4':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `#### ${result}\n\n`;
      
    case 'h5':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `##### ${result}\n\n`;
      
    case 'h6':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      return `###### ${result}\n\n`;
      
    case 'blockquote':
      result = Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
      // Add > to each line
      return result.split('\n').map(line => 
        line.trim() ? `> ${line}` : '>'
      ).join('\n') + '\n\n';
      
    default:
      // For any other element, just process its children
      return Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
  }
}

/**
 * Cleanup function to fix common markdown issues
 * @param markdown Markdown string to clean
 * @returns Cleaned markdown string
 */
export function cleanupMarkdown(markdown: string): string {
  return markdown
    // Remove excessive newlines (more than 2 in a row)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
}