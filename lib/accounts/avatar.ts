import type { ConnectedAccountRecord } from "@/lib/types/db";

type AccountIdentity = Pick<
  ConnectedAccountRecord,
  "platform" | "platform_user_id" | "username" | "display_name" | "avatar_url"
>;

export function getConnectedAccountAvatarUrl(account: AccountIdentity) {
  if (account.avatar_url) {
    return account.avatar_url;
  }

  if (account.platform === "threads" && account.platform_user_id) {
    return `https://graph.facebook.com/${account.platform_user_id}/picture?type=large`;
  }

  return null;
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
