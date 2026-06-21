import { createContext, useContext, useState, ReactNode } from "react";

interface ThresholdContextValue {
  /** Per-skuId reorderPoint overrides. Empty = use stored inventory values. */
  thresholds: Record<string, number>;
  setThreshold: (skuId: string, value: number) => void;
  resetThreshold: (skuId: string) => void;
}

const ThresholdContext = createContext<ThresholdContextValue | null>(null);

export function ThresholdProvider({ children }: { children: ReactNode }) {
  const [thresholds, setThresholds] = useState<Record<string, number>>({});

  function setThreshold(skuId: string, value: number) {
    setThresholds((prev) => ({ ...prev, [skuId]: value }));
  }

  function resetThreshold(skuId: string) {
    setThresholds((prev) => {
      const next = { ...prev };
      delete next[skuId];
      return next;
    });
  }

  return (
    <ThresholdContext.Provider value={{ thresholds, setThreshold, resetThreshold }}>
      {children}
    </ThresholdContext.Provider>
  );
}

export function useThresholds(): ThresholdContextValue {
  const ctx = useContext(ThresholdContext);
  if (!ctx) throw new Error("useThresholds must be used inside ThresholdProvider");
  return ctx;
}
