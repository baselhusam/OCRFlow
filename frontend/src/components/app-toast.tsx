"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppToastVariant = "error" | "success" | "info";

type AppToastProps = {
  message: string;
  variant?: AppToastVariant;
  title?: string;
  toastKey?: string | number;
  onDismiss?: () => void;
};

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconClassName: "bg-primary/10 text-primary",
    label: "Saved",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "bg-destructive/10 text-destructive",
    label: "Error",
  },
  info: {
    icon: Info,
    iconClassName: "bg-secondary text-primary",
    label: "Notice",
  },
} as const;

export function AppToast({
  message,
  variant = "error",
  title,
  toastKey,
  onDismiss,
}: AppToastProps) {
  const prefersReducedMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const animationKey = toastKey ?? message;

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(true);
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [animationKey, message]);

  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => onDismiss?.()}>
      {open ? (
        <motion.div
          key={String(animationKey)}
          role="status"
          aria-live="polite"
          initial={
            prefersReducedMotion
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 20, scale: 0.97 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 14, scale: 0.98 }
          }
          transition={motionTransition}
          className={cn(
            "pointer-events-auto fixed right-5 bottom-5 z-[200] w-[min(100vw-2.5rem,360px)]",
            "shadow-[0_1px_2px_rgba(20,18,37,0.05),0_16px_40px_-16px_rgba(91,46,239,0.22)]",
            "dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_16px_40px_-14px_rgba(91,46,239,0.35)]",
            "sm:right-6 sm:bottom-6",
          )}
        >
          <div className="relative flex items-start gap-3 rounded-xl border border-border bg-card p-4 pr-11">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                config.iconClassName,
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-primary uppercase">
                {title ?? config.label}
              </p>
              <p className="mt-1 text-sm leading-snug font-semibold text-foreground">
                {message}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 size-7 text-muted-foreground hover:text-foreground"
              onClick={dismiss}
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
