'use client';

import { EditorContent } from '@tiptap/react';
import { TaskDescriptionToolbar } from './task-description-toolbar';
import { useRef, useState } from 'react';
import { useTaskDescriptionEditor } from '@/lib/hooks/tasks/use-task-description-editor';

type TaskDescriptionEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
};

export function TaskDescriptionEditor({
  value = '',
  onChange,
  placeholder = 'Description de la tâche',
  id,
  name,
}: TaskDescriptionEditorProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const {
    editor,
    currentTextColor,
    currentHighlight,
    isHighlightActive,
    setTextColor,
    setHighlightColor,
  } = useTaskDescriptionEditor({
    value,
    onChange,
    placeholder,
    hiddenInputRef,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input rounded-md bg-background">
      <TaskDescriptionToolbar
        editor={editor}
        currentTextColor={currentTextColor}
        currentHighlight={currentHighlight}
        isHighlightActive={isHighlightActive}
        showTextColorPicker={showTextColorPicker}
        showHighlightPicker={showHighlightPicker}
        onShowTextColorPickerChange={setShowTextColorPicker}
        onShowHighlightPickerChange={setShowHighlightPicker}
        onTextColorSelect={setTextColor}
        onHighlightColorSelect={setHighlightColor}
        onEditorStateUpdate={() => {}}
      />
      {/* Editor */}
      <div className="relative min-h-[80px] resize-y overflow-auto">
        <EditorContent editor={editor} />
      </div>
      {/* Hidden input for form submission */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        id={id}
        name={name}
        defaultValue={editor.getHTML()}
        onChange={(e) => {
          // Ensure hidden input is updated when form is submitted
          e.target.value = editor.getHTML();
        }}
      />
    </div>
  );
}
