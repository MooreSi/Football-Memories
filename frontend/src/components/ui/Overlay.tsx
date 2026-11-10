import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Popups render on <body>, above every panel and the sticky header. A panel with a
 *  transform or backdrop filter would otherwise trap a fixed overlay inside itself. */
export function Overlay({ label, onClose, children, className = "max-w-md" }: {
  label: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink-950/75 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className={`panel max-h-[calc(100dvh-2rem)] w-full space-y-4 overflow-y-auto p-5 ${className}`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
