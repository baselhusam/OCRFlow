import { cn } from "@/lib/utils";

type ApertureMotifProps = {
  className?: string;
};

export function ApertureMotif({ className }: ApertureMotifProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className={cn("pointer-events-none", className)}
    >
      <circle
        cx="100"
        cy="100"
        r="80"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="446 56"
        strokeDashoffset="28"
        opacity="0.18"
      />
      <line
        x1="100"
        y1="100"
        x2="196"
        y2="100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.14"
      />
      <rect
        x="190"
        y="93"
        width="14"
        height="14"
        fill="var(--pulse)"
        opacity="0.5"
      />
    </svg>
  );
}
