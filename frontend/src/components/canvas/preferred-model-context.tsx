"use client";

import { createContext, useContext } from "react";

/** Id of the user's default OCR model, so palette items can mark it. */
const PreferredModelContext = createContext<string | null>(null);

export const PreferredModelProvider = PreferredModelContext.Provider;

export function usePreferredModelId(): string | null {
  return useContext(PreferredModelContext);
}
