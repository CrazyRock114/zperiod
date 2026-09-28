import React from 'react';

/**
 * The single loading indicator used by the router's Suspense boundaries.
 * `animate-spin` is the class the browser audit looks for to decide whether a
 * route has finished loading, so it must stay on the element.
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`mx-auto h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--surface-3)] border-t-[var(--accent)] ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    />
  );
}
