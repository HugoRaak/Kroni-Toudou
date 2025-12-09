'use client';

import { Button } from '@/components/ui/button';
import { Highlighter } from 'lucide-react';
import { useClickOutside } from '@/lib/hooks/ui/use-click-outside';
import { useRef } from 'react';

const HIGHLIGHT_COLORS = [
  '#FFFF00',
  '#FF0000',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#000000',
  '#FFFFFF',
  '#EEECE1',
  '#1F497D',
  '#4F81BD',
  '#A2C4C9',
  '#F2DCDB',
  '#E5B8B7',
  '#D8E4BC',
];

type HighlightColorPickerProps = {
  currentColor: string | null;
  isActive: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onColorSelect: (color: string | null) => void;
};

export function HighlightColorPicker({
  currentColor,
  isActive,
  isOpen,
  onOpenChange,
  onColorSelect,
}: HighlightColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(pickerRef, () => onOpenChange(false));

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onOpenChange(!isOpen)}
        className={`${isOpen ? 'bg-accent text-accent-foreground border border-border' : ''} ${isActive ? 'bg-accent/50 border-2' : ''}`}
        style={
          currentColor
            ? { borderColor: currentColor }
            : isActive
              ? { borderColor: '#FFFF00' }
              : undefined
        }
        aria-label="Surlignage"
        title={
          currentColor
            ? `Surlignage: ${currentColor}`
            : isActive
              ? 'Surlignage actif'
              : 'Surlignage'
        }
      >
        <div className="relative">
          <Highlighter className={`h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
          {isActive && currentColor && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </div>
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2.5 bg-popover border border-border rounded-md shadow-lg z-10 w-40">
          <div className="space-y-2">
            <button
              type="button"
              className="w-full px-2 py-1.5 text-xs text-left rounded border border-border hover:bg-accent transition-colors flex items-center gap-2"
              onClick={() => {
                onColorSelect(null);
                onOpenChange(false);
              }}
              aria-label="Retirer le surlignage"
            >
              <div className="w-4 h-4 rounded border border-border bg-background flex items-center justify-center pb-0.5">
                <span className="text-[10px]">×</span>
              </div>
              <span>Aucune couleur</span>
            </button>
            <div className="grid grid-cols-5 gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorSelect(color);
                    onOpenChange(false);
                  }}
                  aria-label={`Surlignage ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
