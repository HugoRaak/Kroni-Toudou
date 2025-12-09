'use client';

import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { TextColorPicker } from './text-color-picker';
import { HighlightColorPicker } from './highlight-color-picker';

type TaskDescriptionToolbarProps = {
  editor: Editor;
  currentTextColor: string | null;
  currentHighlight: string | null;
  isHighlightActive: boolean;
  showTextColorPicker: boolean;
  showHighlightPicker: boolean;
  onShowTextColorPickerChange: (open: boolean) => void;
  onShowHighlightPickerChange: (open: boolean) => void;
  onTextColorSelect: (color: string) => void;
  onHighlightColorSelect: (color: string | null) => void;
  onEditorStateUpdate: () => void;
};

export function TaskDescriptionToolbar({
  editor,
  currentTextColor,
  currentHighlight,
  isHighlightActive,
  showTextColorPicker,
  showHighlightPicker,
  onShowTextColorPickerChange,
  onShowHighlightPickerChange,
  onTextColorSelect,
  onHighlightColorSelect,
  onEditorStateUpdate,
}: TaskDescriptionToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-input bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          editor.chain().focus().toggleBold().run();
          setTimeout(() => onEditorStateUpdate(), 0);
        }}
        className={
          editor.isActive('bold') ? 'bg-accent text-accent-foreground border border-border' : ''
        }
        aria-label="Gras"
        title="Gras"
      >
        <Bold className={`h-4 w-4 ${editor.isActive('bold') ? 'font-bold' : ''}`} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          editor.chain().focus().toggleItalic().run();
          setTimeout(() => onEditorStateUpdate(), 0);
        }}
        className={
          editor.isActive('italic') ? 'bg-accent text-accent-foreground border border-border' : ''
        }
        aria-label="Italique"
        title="Italique"
      >
        <Italic className={`h-4 w-4 ${editor.isActive('italic') ? 'italic' : ''}`} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          editor.chain().focus().toggleUnderline().run();
          setTimeout(() => onEditorStateUpdate(), 0);
        }}
        className={
          editor.isActive('underline')
            ? 'bg-accent text-accent-foreground border border-border'
            : ''
        }
        aria-label="Souligné"
        title="Souligné"
      >
        <UnderlineIcon className={`h-4 w-4 ${editor.isActive('underline') ? 'underline' : ''}`} />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <TextColorPicker
        currentColor={currentTextColor}
        isOpen={showTextColorPicker}
        onOpenChange={(open) => {
          onShowTextColorPickerChange(open);
          if (open) onShowHighlightPickerChange(false);
        }}
        onColorSelect={onTextColorSelect}
      />
      <HighlightColorPicker
        currentColor={currentHighlight}
        isActive={isHighlightActive}
        isOpen={showHighlightPicker}
        onOpenChange={(open) => {
          onShowHighlightPickerChange(open);
          if (open) onShowTextColorPickerChange(false);
        }}
        onColorSelect={onHighlightColorSelect}
      />
    </div>
  );
}
