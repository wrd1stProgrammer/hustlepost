import "server-only";

import type { User } from "@supabase/supabase-js";
import { encryptSecret } from "@/lib/crypto";
import type {
  AccountKeywordRecord,
  ConnectedAccountRecord,
  ConnectedAccountWithKeywords,
  UpsertConnectedAccountInput,
  UpsertOauthTokenInput,
} from "@/lib/types/db";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const CONNECTED_ACCOUNT_SELECT =
  "id, platform, platform_user_id, username, display_name, avatar_url, account_status, created_at, updated_at";
const CONNECTED_ACCOUNT_FALLBACK_SELECT =
  "id, platform, platform_user_id, username, display_name, account_status, created_at, updated_at";

function isMissingAvatarColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("avatar_url"));
}

export async function ensureProfile(user: User) {
  const supabase = await createSupabaseServerClient();
  const displayName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "Hustler";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

export async function upsertConnectedAccount(
  input: UpsertConnectedAccountInput,
) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    user_id: input.userId,
    platform: input.platform,
    platform_user_id: input.platformUserId,
    username: input.username ?? null,
    display_name: input.displayName ?? null,
    avatar_url: input.avatarUrl ?? null,
    account_status: input.accountStatus ?? "active",
    last_validated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("connected_accounts")
    .upsert(payload, {
      onConflict: "platform,platform_user_id",
    })
    .select(CONNECTED_ACCOUNT_SELECT)
    .single<ConnectedAccountRecord>();

  if (isMissingAvatarColumnError(error)) {
    const { avatar_url, ...fallbackPayload } = payload;
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("connected_accounts")
      .upsert(fallbackPayload, {
        onConflict: "platform,platform_user_id",
      })
      .select(CONNECTED_ACCOUNT_FALLBACK_SELECT)
      .single<ConnectedAccountRecord>();

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertOauthToken(input: UpsertOauthTokenInput) {
  const supabase = await createSupabaseServerClient();

  const payload = {
    connected_account_id: input.connectedAccountId,
    platform: input.platform,
    access_token_ciphertext: encryptSecret(input.accessToken),
    refresh_token_ciphertext: input.refreshToken
      ? encryptSecret(input.refreshToken)
      : null,
    token_type: input.tokenType ?? null,
    scopes: input.scopes ?? [],
    expires_at: input.expiresAt ?? null,
    refresh_expires_at: input.refreshExpiresAt ?? null,
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("oauth_tokens").upsert(payload, {
    onConflict: "connected_account_id,platform",
    ignoreDuplicates: false,
  });

  if (error) {
    throw error;
  }
}

export async function listConnectedAccounts(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select(CONNECTED_ACCOUNT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (isMissingAvatarColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("connected_accounts")
      .select(CONNECTED_ACCOUNT_FALLBACK_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      throw fallbackError;
    }

    return (fallbackData ?? []) as ConnectedAccountRecord[];
  }

  if (error) {
    throw error;
  }

  return (data ?? []) as ConnectedAccountRecord[];
}

export async function listAccountKeywords(connectedAccountIds: string[]) {
  if (connectedAccountIds.length === 0) {
    return [] as AccountKeywordRecord[];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_keywords")
    .select(
      "id, connected_account_id, keyword, position, created_at, updated_at",
    )
    .in("connected_account_id", connectedAccountIds)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccountKeywordRecord[];
}

export async function listConnectedAccountsWithKeywords(userId: string) {
  const accounts = await listConnectedAccounts(userId);
  const keywords = await listAccountKeywords(accounts.map((account) => account.id));

  const keywordMap = new Map<string, AccountKeywordRecord[]>();
  for (const keyword of keywords) {
    const group = keywordMap.get(keyword.connected_account_id) ?? [];
    group.push(keyword);
    keywordMap.set(keyword.connected_account_id, group);
  }

  return accounts.map((account) => ({
    ...account,
    keywords: keywordMap.get(account.id) ?? [],
  })) as ConnectedAccountWithKeywords[];
}

export async function replaceAccountKeywords(input: {
  userId: string;
  connectedAccountId: string;
  keywords: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const cleanedKeywords = input.keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3);

  const account = await getConnectedAccountForKeywords({
    userId: input.userId,
    connectedAccountId: input.connectedAccountId,
  });

  if (!account) {
    throw new Error("Connected account not found");
  }

  const { error: deleteError } = await supabase
    .from("account_keywords")
    .delete()
    .eq("connected_account_id", input.connectedAccountId);

  if (deleteError) {
    throw deleteError;
  }

  if (cleanedKeywords.length === 0) {
    return [] as AccountKeywordRecord[];
  }

  const payload = cleanedKeywords.map((keyword, index) => ({
    connected_account_id: input.connectedAccountId,
    keyword,
    position: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("account_keywords")
    .insert(payload)
    .select(
      "id, connected_account_id, keyword, position, created_at, updated_at",
    )
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccountKeywordRecord[];
}

export async function disconnectConnectedAccount(input: {
  userId: string;
  connectedAccountId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("id", input.connectedAccountId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }
}

export async function getConnectedAccountWithKeywords(input: {
  userId: string;
  connectedAccountId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select(CONNECTED_ACCOUNT_SELECT)
    .eq("id", input.connectedAccountId)
    .eq("user_id", input.userId)
    .maybeSingle<ConnectedAccountRecord>();

  if (isMissingAvatarColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("connected_accounts")
      .select(CONNECTED_ACCOUNT_FALLBACK_SELECT)
      .eq("id", input.connectedAccountId)
      .eq("user_id", input.userId)
      .maybeSingle<ConnectedAccountRecord>();

    if (fallbackError) {
      throw fallbackError;
    }

    if (!fallbackData) {
      return null;
    }

    const keywords = await listAccountKeywords([fallbackData.id]);

    return {
      ...fallbackData,
      keywords,
    } as ConnectedAccountWithKeywords;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const keywords = await listAccountKeywords([data.id]);

  return {
    ...data,
    keywords,
  } as ConnectedAccountWithKeywords;
}

async function getConnectedAccountForKeywords(input: {
  userId: string;
  connectedAccountId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id")
    .eq("id", input.connectedAccountId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
