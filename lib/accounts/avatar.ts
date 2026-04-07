import type { ConnectedAccountRecord } from "@/lib/types/db";

type AccountIdentity = Pick<
  ConnectedAccountRecord,
  "platform" | "platform_user_id" | "username" | "display_name" | "avatar_url"
>;

export function getConnectedAccountAvatarCandidates(account: AccountIdentity) {
  const candidates: string[] = [];

  if (account.avatar_url) {
    candidates.push(account.avatar_url);
  }

  if (account.platform === "threads" && account.platform_user_id) {
    candidates.push(
      `https://graph.facebook.com/${account.platform_user_id}/picture?type=large`,
    );
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

export function getConnectedAccountAvatarUrl(account: AccountIdentity) {
  return getConnectedAccountAvatarCandidates(account)[0] ?? null;
}

export function getConnectedAccountDisplayLabel(account: AccountIdentity) {
  return account.username
    ? `@${account.username}`
    : account.display_name || "Threads";
}

export function getConnectedAccountSecondaryLabel(account: AccountIdentity) {
  return account.display_name || account.platform_user_id;
}

export function getConnectedAccountInitial(account: AccountIdentity) {
  return (account.username || account.display_name || "T")[0]?.toUpperCase() || "T";
}
