"use client";

import Image from "next/image";
import { useState } from "react";
import type { ConnectedAccountRecord } from "@/lib/types/db";
import {
  getConnectedAccountAvatarCandidates,
  getConnectedAccountInitial,
} from "@/lib/accounts/avatar";

type ConnectedAccountAvatarProps = {
  account: Pick<
    ConnectedAccountRecord,
    "platform" | "platform_user_id" | "username" | "display_name" | "avatar_url"
  >;
  size?: number;
  showPlatformBadge?: boolean;
  ringColorClassName?: string;
  className?: string;
  initialsClassName?: string;
};

export function ConnectedAccountAvatar({
  account,
  size = 44,
  showPlatformBadge = true,
  ringColorClassName = "ring-[#20c997]",
  className = "",
  initialsClassName = "",
}: ConnectedAccountAvatarProps) {
  const avatarCandidates = getConnectedAccountAvatarCandidates(account);
  const accountKey = [
    account.platform,
    account.platform_user_id,
    account.username,
    account.display_name,
    account.avatar_url,
  ].join("|");
  const [avatarState, setAvatarState] = useState<{ key: string; index: number }>({
    key: accountKey,
    index: 0,
  });
  const avatarIndex = avatarState.key === accountKey ? avatarState.index : 0;
  const avatarUrl = avatarCandidates[avatarIndex] ?? null;
  const initial = getConnectedAccountInitial(account);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-white ${className}`}
      style={{ height: size, width: size }}
    >
      <div
        className={`flex h-full w-full items-center justify-center rounded-full ring-[3px] ring-offset-2 ring-offset-[#f4f5f8] ${ringColorClassName}`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={size}
            height={size}
            unoptimized
            referrerPolicy="no-referrer"
            className="h-full w-full rounded-full object-cover"
            onError={() => {
              setAvatarState((current) => {
                const currentIndex = current.key === accountKey ? current.index : 0;

                return {
                  key: accountKey,
                  index:
                    currentIndex < avatarCandidates.length - 1
                      ? currentIndex + 1
                      : avatarCandidates.length,
                };
              });
            }}
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center rounded-full bg-[#1a1c29] font-bold text-white ${initialsClassName}`}
          >
            {initial}
          </span>
        )}
      </div>

      {showPlatformBadge ? (
        <div className="absolute -left-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm">
          <span className="-mt-px text-[11px] font-bold text-slate-900">@</span>
        </div>
      ) : null}
    </div>
  );
}
