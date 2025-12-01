"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline as UnderlineIcon, Palette, Highlighter } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Close dropdowns when clicking outside
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler]);
}

type TaskDescriptionEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
};

export function TaskDescriptionEditor({
  value = "",
  onChange,
  placeholder = "Description de la tâche",
  id,
  name,
}: TaskDescriptionEditorProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const textColorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [editorState, setEditorState] = useState(0); // Force re-render on editor changes
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string | null>(null); // Track selected highlight color

  useClickOutside(textColorPickerRef, () => setShowTextColorPicker(false));
  useClickOutside(highlightPickerRef, () => setShowHighlightPicker(false));

  const editor = useEditor({
    extensions: [
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
      Underline,
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Update hidden input for form submission
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = html;
      }
      // Force re-render to update button states
      setEditorState((prev) => prev + 1);
      onChange?.(html);
    },
    onSelectionUpdate: () => {
      // Update button states when selection changes
      setEditorState((prev) => prev + 1);
    },
    onTransaction: () => {
      // Update button states on any transaction (including when applying marks)
      setEditorState((prev) => prev + 1);
    },
    onFocus: () => {
      // Update button states when editor gets focus
      setEditorState((prev) => prev + 1);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm text-foreground",
        "data-placeholder": placeholder,
      },
    },
  });

  // Update editor content when value prop changes (for controlled component)
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML();
      // Only update if different to avoid infinite loops
      if (currentHtml !== value) {
        editor.commands.setContent(value || "", { emitUpdate: false });
      }
    }
  }, [editor, value]);

  // Update hidden input whenever editor content changes
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

  // Get current text color and highlight color
  // Use editorState to force recalculation on updates
  // Suppress unused variable warning
  void editorState;
  
  const currentTextColor = editor ? (editor.getAttributes('textStyle').color || null) : null;
  
  // Get highlight color - Tiptap stores it in the highlight mark attributes
  let currentHighlight: string | null = null;
  const isHighlightActive = editor ? editor.isActive('highlight') : false;
  
  if (editor) {
    // Priority 1: Check getAttributes (works when cursor is on highlighted text)
    // This is the most reliable method when the cursor is on highlighted text
    if (isHighlightActive) {
      const highlightAttrs = editor.getAttributes('highlight');
      if (highlightAttrs?.color) {
        currentHighlight = highlightAttrs.color;
      }
    }
    
    // Priority 2: Check stored marks (for next text to be typed)
    if (!currentHighlight) {
      const storedMarks = editor.state.storedMarks;
      if (storedMarks) {
        const highlightMark = storedMarks.find(mark => mark.type.name === 'highlight');
        if (highlightMark && highlightMark.attrs?.color) {
          currentHighlight = highlightMark.attrs.color;
        }
      }
    }
    
    // Priority 3: Check marks at the cursor position
    if (!currentHighlight) {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const marks = $pos.marks();
      const highlightMark = marks.find(mark => mark.type.name === 'highlight');
      if (highlightMark && highlightMark.attrs?.color) {
        currentHighlight = highlightMark.attrs.color;
      }
    }
    
    // Priority 4: Check marks in the text node at cursor position
    if (!currentHighlight) {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const node = $pos.node();
      if (node && node.marks) {
        const highlightMark = node.marks.find(mark => mark.type.name === 'highlight');
        if (highlightMark && highlightMark.attrs?.color) {
          currentHighlight = highlightMark.attrs.color;
        }
      }
    }
    
    // Priority 5: Only use selectedHighlightColor if highlight is active (for stored marks)
    // Don't use it as fallback when there's no active highlight
    if (!currentHighlight && selectedHighlightColor && isHighlightActive) {
      // Check if selectedHighlightColor is in stored marks
      const storedMarks = editor.state.storedMarks;
      if (storedMarks) {
        const highlightMark = storedMarks.find(mark => mark.type.name === 'highlight');
        if (highlightMark) {
          currentHighlight = selectedHighlightColor;
        }
      }
    }
  }
  
  // Update selectedHighlightColor when highlight is detected to keep visual feedback consistent
  // Also clear it when highlight is no longer active
  useEffect(() => {
    if (isHighlightActive && currentHighlight && currentHighlight !== selectedHighlightColor) {
      setSelectedHighlightColor(currentHighlight);
    } else if (!isHighlightActive && !currentHighlight && selectedHighlightColor) {
      // Clear selectedHighlightColor when there's no active highlight and no color detected
      setSelectedHighlightColor(null);
    }
  }, [currentHighlight, isHighlightActive, selectedHighlightColor]);

  if (!editor) {
    return null;
  }

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    // Force update after setting color
    setTimeout(() => setEditorState((prev) => prev + 1), 0);
  };

  const setHighlightColor = (color: string | null) => {
    // If color is null, remove highlight
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
    
    // Store the selected color
    setSelectedHighlightColor(color);
    
    // If there's a selection, apply highlight to it
    const { from, to } = editor.state.selection;
    if (from !== to) {
      // There's a selection - remove existing highlight first, then apply new color
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run();
    } else {
      // No selection - set as stored mark for next text to be typed
      // First unset any existing highlight mark, then set the new one
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run();
    }
    // Force update after setting highlight - use multiple methods to ensure update
    setTimeout(() => {
      setEditorState((prev) => prev + 1);
    }, 0);
    requestAnimationFrame(() => {
      setEditorState((prev) => prev + 1);
    });
  };

  return (
    <div className="border border-input rounded-md bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-input bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            editor.chain().focus().toggleBold().run();
            setTimeout(() => setEditorState((prev) => prev + 1), 0);
          }}
          className={editor.isActive("bold") ? "bg-accent text-accent-foreground border border-border" : ""}
          aria-label="Gras"
          title="Gras"
        >
          <Bold className={`h-4 w-4 ${editor.isActive("bold") ? "font-bold" : ""}`} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            editor.chain().focus().toggleItalic().run();
            setTimeout(() => setEditorState((prev) => prev + 1), 0);
          }}
          className={editor.isActive("italic") ? "bg-accent text-accent-foreground border border-border" : ""}
          aria-label="Italique"
          title="Italique"
        >
          <Italic className={`h-4 w-4 ${editor.isActive("italic") ? "italic" : ""}`} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            editor.chain().focus().toggleUnderline().run();
            setTimeout(() => setEditorState((prev) => prev + 1), 0);
          }}
          className={editor.isActive("underline") ? "bg-accent text-accent-foreground border border-border" : ""}
          aria-label="Souligné"
          title="Souligné"
        >
          <UnderlineIcon className={`h-4 w-4 ${editor.isActive("underline") ? "underline" : ""}`} />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <div className="relative" ref={textColorPickerRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightPicker(false);
            }}
            className={`${showTextColorPicker ? "bg-accent text-accent-foreground border border-border" : ""} ${currentTextColor ? "border-2" : ""}`}
            style={currentTextColor ? { borderColor: currentTextColor } : undefined}
            aria-label="Couleur du texte"
            title={currentTextColor ? `Couleur: ${currentTextColor}` : "Couleur du texte"}
          >
            <div className="relative">
              <Palette className="h-4 w-4" />
              {currentTextColor && (
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                  style={{ backgroundColor: currentTextColor }}
                />
              )}
            </div>
          </Button>
          {showTextColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2.5 bg-popover border border-border rounded-md shadow-lg z-10 w-40">
              <div className="grid grid-cols-6 gap-2">
                {[
                    "#000000", "#A50021", "#E00000", "#F08A00", "#F2D500", "#FFFFFF",
                    "#008A00", "#00B5CE", "#0070C0", "#002060", "#7030A0", "#FF99FF"
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform flex-shrink-0"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setTextColor(color);
                      setShowTextColorPicker(false);
                    }}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={highlightPickerRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowTextColorPicker(false);
            }}
            className={`${showHighlightPicker ? "bg-accent text-accent-foreground border border-border" : ""} ${isHighlightActive ? "bg-accent/50 border-2" : ""}`}
            style={currentHighlight ? { borderColor: currentHighlight } : isHighlightActive ? { borderColor: '#FFFF00' } : undefined}
            aria-label="Surlignage"
            title={currentHighlight ? `Surlignage: ${currentHighlight}` : isHighlightActive ? "Surlignage actif" : "Surlignage"}
          >
            <div className="relative">
              <Highlighter className={`h-4 w-4 ${isHighlightActive ? 'opacity-100' : 'opacity-60'}`} />
              {isHighlightActive && currentHighlight && (
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: currentHighlight }}
                />
              )}
            </div>
          </Button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 p-2.5 bg-popover border border-border rounded-md shadow-lg z-10 w-40">
              <div className="space-y-2">
                {/* Option "Aucune couleur" */}
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-xs text-left rounded border border-border hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => {
                    setHighlightColor(null);
                    setShowHighlightPicker(false);
                  }}
                  aria-label="Retirer le surlignage"
                >
                  <div className="w-4 h-4 rounded border border-border bg-background flex items-center justify-center pb-0.5">
                    <span className="text-[10px]">×</span>
                  </div>
                  <span>Aucune couleur</span>
                </button>
                {/* Grille de couleurs */}
                <div className="grid grid-cols-5 gap-2">
                  {[
                      "#FFFF00", "#FF0000", "#00FF00", "#00FFFF", "#0000FF",
                      "#FF00FF", "#000000", "#FFFFFF", "#EEECE1", "#1F497D",
                      "#4F81BD", "#A2C4C9", "#F2DCDB", "#E5B8B7", "#D8E4BC"
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform flex-shrink-0"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setHighlightColor(color);
                        setShowHighlightPicker(false);
                      }}
                      aria-label={`Surlignage ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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


