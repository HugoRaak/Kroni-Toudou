"use client";

import { sanitizeTaskDescription } from "@/lib/utils/html-sanitizer";

type TaskDescriptionViewProps = {
  description?: string | null;
  className?: string;
};

export function TaskDescriptionView({
  description,
  className = "",
}: TaskDescriptionViewProps) {
  if (!description) {
    return null;
  }

  // Sanitize HTML before rendering (defense in depth)
  const sanitizedHTML = sanitizeTaskDescription(description);

  return (
    <div
      className={`text-sm text-muted-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}

