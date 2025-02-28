import { Node, mergeAttributes } from '@tiptap/core';

interface CodeBlockExtensionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customCodeBlock: {
      /**
       * Add a code block
       */
      setCodeBlock: (code: string, language?: string) => ReturnType;
    };
  }
}

export const CodeBlockExtension = Node.create<CodeBlockExtensionOptions>({
  name: 'customCodeBlock',
  
  group: 'block',
  
  content: 'text*',
  
  marks: '',
  
  defining: true,
  
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'code-block',
      },
    };
  },
  
  addAttributes() {
    return {
      language: {
        default: 'javascript',
        parseHTML: element => element.getAttribute('data-language') || 'javascript',
        renderHTML: attributes => {
          return {
            'data-language': attributes.language,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'pre[data-language]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ['code', {}, 0],
    ];
  },
  
  addCommands() {
    return {
      setCodeBlock: (code: string, language = 'javascript') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { language },
          content: [{ type: 'text', text: code }],
        });
      },
    };
  },
});

export default CodeBlockExtension;