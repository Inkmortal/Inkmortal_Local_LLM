import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathNodeView from '../nodeviews/MathNodeView';

interface MathInlineExtensionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      /**
       * Add an inline math expression
       */
      insertMathInline: (latex: string) => ReturnType;
    };
  }
}

export const MathInlineExtension = Node.create<MathInlineExtensionOptions>({
  name: 'mathInline',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'math-inline',
      },
    };
  },
  
  addAttributes() {
    return {
      value: {
        default: '',
        parseHTML: element => element.getAttribute('data-value'),
        renderHTML: attributes => {
          return {
            'data-value': attributes.value,
            'data-type': 'math-inline',
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: element => {
          if (typeof element === 'string') return {}
          const value = (element as HTMLElement).getAttribute('data-value')
          return { value }
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'math-inline' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
  
  addCommands() {
    return {
      insertMathInline: (latex: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { value: latex },
        });
      },
    };
  },
});

export default MathInlineExtension;