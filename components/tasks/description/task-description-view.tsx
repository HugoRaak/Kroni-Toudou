'use client';

import { sanitizeClient } from '@/lib/sanitize-client';
import { useEffect, useState } from 'react';

type TaskDescriptionViewProps = {
  description?: string | null;
  className?: string;
};

export function TaskDescriptionView({ description, className = '' }: TaskDescriptionViewProps) {
  const [sanitizedHTML, setSanitizedHTML] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSanitizedHTML(sanitizeClient(description ?? ''));
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div
      suppressHydrationWarning
      className={`text-sm text-muted-foreground max-w-[90%] ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}
