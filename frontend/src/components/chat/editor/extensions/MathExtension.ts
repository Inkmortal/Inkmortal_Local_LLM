import { Node, mergeAttributes } from '@tiptap/core';

interface MathExtensionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      /**
       * Add a math block
       */
      setMathBlock: (latex: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathExtensionOptions>({
  name: 'mathBlock',
  
  group: 'block',
  
  content: 'text*',
  
  marks: '',
  
  defining: true,
  
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'math-block',
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'math-block' }), 0];
  },
  
  addCommands() {
    return {
      setMathBlock: (latex: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          content: [{ type: 'text', text: latex }],
        });
      },
    };
  },
});

export default MathExtension;