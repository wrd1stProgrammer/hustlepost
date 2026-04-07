"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, X } from "lucide-react";

type DeletePostButtonProps = {
  scheduledPostId: string;
  redirectTo: string;
  disabled?: boolean;
  locale: "en" | "ko";
  action: (formData: FormData) => Promise<void>;
};

export function DeletePostButton({
  scheduledPostId,
  redirectTo,
  disabled = false,
  locale,
  action,
}: DeletePostButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const copy =
    locale === "ko"
      ? {
          title: "게시글을 삭제할까요?",
          body: "Threads와 앱에서 이 글을 삭제합니다. 이미 외부에서 삭제됐다면 앱 상태만 정리합니다.",
          cancel: "취소",
          confirm: "삭제",
        }
      : {
          title: "Delete this post?",
          body: "This removes the post from Threads and updates the app state. If it was already deleted externally, the app will just sync the status.",
          cancel: "Cancel",
          confirm: "Delete",
        };

  function handleConfirm() {
    setIsOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("scheduledPostId", scheduledPostId);
      formData.set("redirectTo", redirectTo);
      await action(formData);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => setIsOpen(true)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
          disabled
            ? "cursor-not-allowed text-slate-300"
            : "cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        }`}
        aria-label="Delete Threads post"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold text-[#1e2330]">
                  {copy.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  {copy.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label={copy.cancel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
