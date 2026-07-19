"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  NodeGuideContext,
  NodeGuideDefinition,
} from "@/lib/canvas/node-guide-types";
import { cn } from "@/lib/utils";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;

type NodeGuideShellProps = {
  definition: NodeGuideDefinition;
  context: NodeGuideContext;
  onClose: () => void;
};

export function NodeGuideShell({
  definition,
  context,
  onClose,
}: NodeGuideShellProps) {
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const { steps } = definition;
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [isLast, onClose, steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const stepLabel = String(stepIndex + 1).padStart(2, "0");
  const totalLabel = String(steps.length).padStart(2, "0");

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p
          className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
          aria-live="polite"
        >
          Step {stepLabel} / {totalLabel}
        </p>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Guide progress">
          {steps.map((guideStep, index) => (
            <span
              key={guideStep.id}
              role="tab"
              aria-selected={index === stepIndex}
              aria-label={`Step ${index + 1}: ${guideStep.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[280px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={
              reduceMotion ? false : { opacity: 0, x: 24 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.35, ease: STEP_EASE }
            }
          >
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
            <div className="mt-4">{step.render(context)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBack}
          disabled={isFirst}
          className="min-w-[72px]"
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={goNext}
          className="min-w-[72px]"
        >
          {isLast ? "Got it" : "Next"}
        </Button>
      </div>
    </div>
  );
}
