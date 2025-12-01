"use client";

import { sanitizeClient } from "@/lib/sanitize-client";

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
  const sanitizedHTML = sanitizeClient(description);

  return (
    <div
      className={`text-sm text-muted-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}

