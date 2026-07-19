import { cn } from "@/lib/utils";

type SegmentMarkProps = {
  className?: string;
  size?: number;
};

export function SegmentMark({ className, size }: SegmentMarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    >
      <circle
        cx="60"
        cy="60"
        r="40"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="61.78 22"
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="20" r="10" fill="var(--accent, #5b2eef)" />
    </svg>
  );
}
