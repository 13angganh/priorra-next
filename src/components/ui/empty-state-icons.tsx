/**
 * Line-art SVG icons for EmptyState, drawn to match the app's
 * single-accent-color identity (Master Instruction section 21) —
 * replacing the generic large unicode symbols (✓, ▢, ☑) that were
 * there before, which looked like placeholder characters rather
 * than a designed icon set. currentColor throughout so they inherit
 * EmptyState's icon-wrapper color automatically.
 */
export function TasksEmptyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
      <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M14 16h12M14 21h12M14 26h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="27" cy="28" r="6" fill="currentColor" fillOpacity="0.12" />
      <path d="M24.5 28l1.8 1.8L29.5 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpacesEmptyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
      <rect x="5" y="10" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="22" y="10" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="2" fillOpacity="0.1" fill="currentColor" />
      <rect x="5" y="27" width="13" height="8" rx="3" stroke="currentColor" strokeWidth="2" fillOpacity="0.1" fill="currentColor" />
      <rect x="22" y="27" width="13" height="8" rx="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function CompletedEmptyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
      <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />
      <path d="M14 20.5l4 4 8.5-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
