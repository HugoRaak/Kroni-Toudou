"use client";

import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import { useClickOutside } from '@/lib/hooks/ui/use-click-outside';
import { useRef } from 'react';

const TEXT_COLORS = [
  "#000000", "#A50021", "#E00000", "#F08A00", "#F2D500", "#FFFFFF",
  "#008A00", "#00B5CE", "#0070C0", "#002060", "#7030A0", "#FF99FF"
];

type TextColorPickerProps = {
  currentColor: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onColorSelect: (color: string) => void;
};

export function TextColorPicker({
  currentColor,
  isOpen,
  onOpenChange,
  onColorSelect,
}: TextColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(pickerRef, () => onOpenChange(false));

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onOpenChange(!isOpen)}
        className={`${isOpen ? "bg-accent text-accent-foreground border border-border" : ""} ${currentColor ? "border-2" : ""}`}
        style={currentColor ? { borderColor: currentColor } : undefined}
        aria-label="Couleur du texte"
        title={currentColor ? `Couleur: ${currentColor}` : "Couleur du texte"}
      >
        <div className="relative">
          <Palette className="h-4 w-4" />
          {currentColor && (
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </div>
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2.5 bg-popover border border-border rounded-md shadow-lg z-10 w-40">
          <div className="grid grid-cols-6 gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform flex-shrink-0"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onColorSelect(color);
                  onOpenChange(false);
                }}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

