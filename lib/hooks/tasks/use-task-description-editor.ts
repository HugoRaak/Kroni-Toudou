'use client';

import { useEditor, Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { createTaskEditorExtensions, createTaskEditorProps } from '@/lib/editor/task-editor-config';

type UseTaskDescriptionEditorOptions = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  hiddenInputRef: React.RefObject<HTMLInputElement | null>;
};

type UseTaskDescriptionEditorReturn = {
  editor: Editor | null;
  editorState: number;
  currentTextColor: string | null;
  currentHighlight: string | null;
  isHighlightActive: boolean;
  setTextColor: (color: string) => void;
  setHighlightColor: (color: string | null) => void;
  forceUpdate: () => void;
};

export function useTaskDescriptionEditor({
  value = '',
  onChange,
  placeholder = 'Description de la tâche',
  hiddenInputRef,
}: UseTaskDescriptionEditorOptions): UseTaskDescriptionEditorReturn {
  const [editorState, setEditorState] = useState(0);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string | null>(null);

  const editor = useEditor({
    extensions: createTaskEditorExtensions(),
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = html;
      }
      setEditorState((prev) => prev + 1);
      onChange?.(html);
    },
    onSelectionUpdate: () => {
      setEditorState((prev) => prev + 1);
    },
    onTransaction: () => {
      setEditorState((prev) => prev + 1);
    },
    onFocus: () => {
      setEditorState((prev) => prev + 1);
    },
    editorProps: createTaskEditorProps(placeholder),
  });

  // Sync editor content when value prop changes
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== value) {
        editor.commands.setContent(value || '', { emitUpdate: false });
      }
    }
  }, [editor, value]);

  // Update hidden input on editor changes
  useEffect(() => {
    if (!editor || !hiddenInputRef.current) return;

    const updateHiddenInput = () => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = editor.getHTML();
      }
    };

    const forceUpdate = () => {
      setEditorState((prev) => prev + 1);
    };

    editor.on('update', updateHiddenInput);
    editor.on('create', updateHiddenInput);
    editor.on('transaction', forceUpdate);
    editor.on('selectionUpdate', forceUpdate);
    editor.on('focus', forceUpdate);

    return () => {
      editor.off('update', updateHiddenInput);
      editor.off('create', updateHiddenInput);
      editor.off('transaction', forceUpdate);
      editor.off('selectionUpdate', forceUpdate);
      editor.off('focus', forceUpdate);
    };
  }, [editor]);

  // Update hidden input before form submission
  useEffect(() => {
    if (!hiddenInputRef.current || !editor) return;

    const form = hiddenInputRef.current.closest('form');
    if (!form) return;

    const handleSubmit = () => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = editor.getHTML();
      }
    };

    form.addEventListener('submit', handleSubmit);
    return () => {
      form.removeEventListener('submit', handleSubmit);
    };
  }, [editor]);

  // Get current colors
  const hasGetAttributes = editor && typeof (editor as any).getAttributes === 'function';
  const hasIsActive = editor && typeof (editor as any).isActive === 'function';

  const currentTextColor = hasGetAttributes
    ? ((editor as any).getAttributes('textStyle')?.color ?? null)
    : null;

  const isHighlightActive = hasIsActive ? (editor as any).isActive('highlight') : false;

  let currentHighlight: string | null = null;
  if (editor) {
    if (isHighlightActive) {
      const highlightAttrs = editor.getAttributes('highlight');
      if (highlightAttrs?.color) {
        currentHighlight = highlightAttrs.color;
      }
    }

    if (!currentHighlight) {
      const storedMarks = editor.state.storedMarks;
      if (storedMarks) {
        const highlightMark = storedMarks.find((mark) => mark.type.name === 'highlight');
        if (highlightMark && highlightMark.attrs?.color) {
          currentHighlight = highlightMark.attrs.color;
        }
      }
    }

    if (!currentHighlight) {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const marks = $pos.marks();
      const highlightMark = marks.find((mark) => mark.type.name === 'highlight');
      if (highlightMark && highlightMark.attrs?.color) {
        currentHighlight = highlightMark.attrs.color;
      }
    }

    if (!currentHighlight) {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const node = $pos.node();
      if (node && node.marks) {
        const highlightMark = node.marks.find((mark) => mark.type.name === 'highlight');
        if (highlightMark && highlightMark.attrs?.color) {
          currentHighlight = highlightMark.attrs.color;
        }
      }
    }

    if (!currentHighlight && selectedHighlightColor && isHighlightActive) {
      const storedMarks = editor.state.storedMarks;
      if (storedMarks) {
        const highlightMark = storedMarks.find((mark) => mark.type.name === 'highlight');
        if (highlightMark) {
          currentHighlight = selectedHighlightColor;
        }
      }
    }
  }

  // selectedHighlightColor is only set by user action (setHighlightColor)
  // It's used as a fallback when currentHighlight is not available

  const setTextColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
    setTimeout(() => setEditorState((prev) => prev + 1), 0);
  };

  const setHighlightColor = (color: string | null) => {
    if (!editor) return;

    if (color === null) {
      setSelectedHighlightColor(null);
      editor.chain().focus().unsetHighlight().run();
      setTimeout(() => {
        setEditorState((prev) => prev + 1);
      }, 0);
      requestAnimationFrame(() => {
        setEditorState((prev) => prev + 1);
      });
      return;
    }

    setSelectedHighlightColor(color);

    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run();
    }

    setTimeout(() => {
      setEditorState((prev) => prev + 1);
    }, 0);
    requestAnimationFrame(() => {
      setEditorState((prev) => prev + 1);
    });
  };

  const forceUpdate = () => {
    setEditorState((prev) => prev + 1);
  };

  return {
    editor,
    editorState,
    currentTextColor,
    currentHighlight,
    isHighlightActive,
    setTextColor,
    setHighlightColor,
    forceUpdate,
  };
}
