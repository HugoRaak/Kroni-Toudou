import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';

export function createTaskEditorExtensions() {
  return [
    StarterKit.configure({
      // Disable heading, bulletList, orderedList, blockquote, codeBlock, horizontalRule
      heading: false,
      bulletList: false,
      orderedList: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
  ];
}

export function createTaskEditorProps(placeholder: string) {
  return {
    attributes: {
      class:
        'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm text-foreground',
      'data-placeholder': placeholder,
    },
  };
}
