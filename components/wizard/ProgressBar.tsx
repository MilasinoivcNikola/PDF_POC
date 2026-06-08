// The "Step NN of 06" indicator in the site header (the prototype's `.steps` /
// `.steps__bar`). Pure presentational; the fill reflects how far through the six
// steps the user is. The bar's filled portion is driven by `step / total` so it
// advances as the wizard progresses (the prototype hardcoded a single position).

/** Zero-pad a step number to two digits, matching the prototype counter. */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

interface ProgressBarProps {
  /** Current step, 1-based. */
  step: number;
  /** Total steps (06 for this wizard). */
  total?: number;
}

export function ProgressBar({ step, total = 6 }: ProgressBarProps) {
  const remaining = Math.max(0, Math.min(100, ((total - step) / total) * 100));
  return (
    <div className="steps">
      <span>
        Step {pad(step)} of {pad(total)}
      </span>
      <span
        className="steps__bar"
        style={{ "--steps-remaining": `${remaining}%` } as React.CSSProperties}
      />
    </div>
  );
}
