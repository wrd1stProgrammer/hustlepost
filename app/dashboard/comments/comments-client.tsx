"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Reply, RefreshCcw, Loader2 } from "lucide-react";

/* ─── Reply Form with loading state ─── */
export function ReplyForm({
  action,
  hiddenFields,
  placeholder,
  hint,
  buttonLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  placeholder: string;
  hint: string;
  buttonLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await action(formData);
        });
      }}
      className="mt-3 ml-6"
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <textarea
        name="replyText"
        rows={2}
        placeholder={placeholder}
        disabled={isPending}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">{hint}</p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Reply className="h-3.5 w-3.5" />
          )}
          {isPending ? "..." : buttonLabel}
        </button>
      </div>
    </form>
  );
}

/* ─── Refresh / Filter Submit Button ─── */
export function RefreshButton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      type="submit"
      className={className}
      disabled={isSubmitting}
      onClick={() => setIsSubmitting(true)}
    >
      <RefreshCcw className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
      {label && <span>{label}</span>}
    </button>
  );
}

/* ─── Filter Apply Button ─── */
export function FilterApplyButton({ label }: { label: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      type="submit"
      disabled={isSubmitting}
      onClick={() => setIsSubmitting(true)}
      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCcw className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
