'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function CalendarHeader({
  title,
  subtitle,
  loading,
  editing,
  saving,
  onPrev,
  onNext,
  onStartEdit,
  onCancel,
  onSave,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="relative flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        className="cursor-pointer hover:bg-primary/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Button>
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-40" />
            {subtitle !== undefined && <Skeleton className="h-4 w-52" />}
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onStartEdit}
            className="cursor-pointer"
            disabled={loading}
          >
            Modifier la présence
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="cursor-pointer"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={onSave} className="cursor-pointer" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export default CalendarHeader;
