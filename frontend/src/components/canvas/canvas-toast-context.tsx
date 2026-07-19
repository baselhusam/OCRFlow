"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AppToast,
  type AppToastVariant,
} from "@/components/app-toast";

type CanvasToastPayload = {
  message: string;
  variant?: AppToastVariant;
  title?: string;
};

type CanvasToastState = CanvasToastPayload & {
  id: number;
};

type CanvasToastContextValue = {
  showCanvasToast: (toast: CanvasToastPayload) => void;
};

const CanvasToastContext = createContext<CanvasToastContextValue | null>(null);

export function CanvasToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<CanvasToastState | null>(null);
  const toastIdRef = useRef(0);

  const showCanvasToast = useCallback((next: CanvasToastPayload) => {
    toastIdRef.current += 1;
    setToast({ ...next, id: toastIdRef.current });
  }, []);

  const value = useMemo(() => ({ showCanvasToast }), [showCanvasToast]);

  return (
    <CanvasToastContext.Provider value={value}>
      {children}
      {toast ? (
        <AppToast
          toastKey={toast.id}
          message={toast.message}
          variant={toast.variant ?? "success"}
          title={toast.title}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </CanvasToastContext.Provider>
  );
}

export function useCanvasToast(): CanvasToastContextValue {
  const ctx = useContext(CanvasToastContext);
  if (!ctx) {
    throw new Error("useCanvasToast must be used within CanvasToastProvider");
  }
  return ctx;
}
