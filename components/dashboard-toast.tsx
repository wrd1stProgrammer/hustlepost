"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type DashboardToastProps = {
  toast?: {
    type: "error" | "success" | "info";
    message: string;
  } | null;
  clearKeys?: string[];
  durationMs?: number;
};

export function DashboardToast({
  toast,
  clearKeys = [],
  durationMs = 3600,
}: DashboardToastProps) {
  const [visible, setVisible] = useState(Boolean(toast));
  const toastKey = useMemo(
    () => (toast ? `${toast.type}:${toast.message}` : null),
    [toast],
  );

  useEffect(() => {
    if (!toastKey) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setVisible(true);
    });
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, toastKey]);

  useEffect(() => {
    if (!toastKey || clearKeys.length === 0) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    let changed = false;

    for (const key of clearKeys) {
      if (currentUrl.searchParams.has(key)) {
        currentUrl.searchParams.delete(key);
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    const nextQuery = currentUrl.searchParams.toString();
    const nextUrl = `${currentUrl.pathname}${nextQuery ? `?${nextQuery}` : ""}${currentUrl.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [clearKeys, toastKey]);

  if (!toast || !visible) {
    return null;
  }

  const tone =
    toast.type === "error"
      ? {
          container: "border-red-200 bg-red-50/95 text-red-700 shadow-[0_18px_40px_rgba(127,29,29,0.12)]",
          icon: <AlertCircle className="h-4 w-4 shrink-0" />,
        }
      : toast.type === "info"
        ? {
            container: "border-slate-200 bg-white/95 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.10)]",
            icon: <Info className="h-4 w-4 shrink-0" />,
          }
        : {
            container: "border-emerald-200 bg-emerald-50/95 text-emerald-700 shadow-[0_18px_40px_rgba(6,95,70,0.12)]",
            icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
          };

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[120] flex justify-end sm:left-auto sm:right-6 sm:top-6 sm:w-[min(420px,calc(100vw-32px))]">
      <div
        aria-live="polite"
        className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-sm transition ${tone.container}`}
      >
        <div className="mt-0.5">{tone.icon}</div>
        <p className="flex-1 leading-6">{toast.message}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="inline-flex cursor-pointer items-center justify-center rounded-full p-1 text-current/60 transition hover:bg-black/5 hover:text-current"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
