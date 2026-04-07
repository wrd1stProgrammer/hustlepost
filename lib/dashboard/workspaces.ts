import "server-only";

import { cookies } from "next/headers";
import type { ConnectedAccountWithKeywords } from "@/lib/types/db";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const WORKSPACE_COOKIE_KEY = "hustle_workspace_state_v1";

export type WorkspaceCustomization = {
  targetAudience: string;
  productLink: string;
  commonInstruction: string;
  informationalFocus: string;
  engagementFocus: string;
  productFocus: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  keywords: string[];
  customization: WorkspaceCustomization;
  connectedAccountIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: WorkspaceRecord[];
};

type WorkspaceRow = {
  id: string;
  name: string;
  target_audience: string;
  product_link: string;
  common_instruction: string;
  informational_focus: string;
  engagement_focus: string;
  product_focus: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workspace_keywords?: Array<{
    keyword: string;
    position: number;
  }>;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
};

const EMPTY_CUSTOMIZATION: WorkspaceCustomization = {
  targetAudience: "",
  productLink: "",
  commonInstruction: "",
  informationalFocus: "",
  engagementFocus: "",
  productFocus: "",
};

function normalizeKeywords(keywords: unknown) {
  if (!Array.isArray(keywords)) return [];

  return keywords
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeCustomization(raw: unknown): WorkspaceCustomization {
  if (!raw || typeof raw !== "object") {
    return EMPTY_CUSTOMIZATION;
  }

  const source = raw as Record<string, unknown>;

  return {
    targetAudience:
      typeof source.targetAudience === "string"
        ? source.targetAudience
        : typeof source.audienceAngle === "string"
          ? source.audienceAngle
          : "",
    productLink:
      typeof source.productLink === "string"
        ? source.productLink
        : typeof source.productContext === "string"
          ? source.productContext
          : "",
    commonInstruction:
      typeof source.commonInstruction === "string"
        ? source.commonInstruction
        : "",
    informationalFocus:
      typeof source.informationalFocus === "string"
        ? source.informationalFocus
        : "",
    engagementFocus:
      typeof source.engagementFocus === "string"
        ? source.engagementFocus
        : "",
    productFocus:
      typeof source.productFocus === "string"
        ? source.productFocus
        : "",
  };
}

function mapWorkspaceRow(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    keywords: (row.workspace_keywords ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((keyword) => keyword.keyword),
    customization: {
      targetAudience: row.target_audience ?? "",
      productLink: row.product_link ?? "",
      commonInstruction: row.common_instruction ?? "",
      informationalFocus: row.informational_focus ?? "",
      engagementFocus: row.engagement_focus ?? "",
      productFocus: row.product_focus ?? "",
    },
    connectedAccountIds: [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseLegacyWorkspaceState(raw: string | undefined | null) {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      activeWorkspaceId?: string;
      workspaces?: Array<{
        id?: string;
        name?: string;
        keywords?: string[];
        customization?: Record<string, unknown>;
        createdAt?: string;
        updatedAt?: string;
      }>;
    };
  } catch {
    return null;
  }
}

async function replaceWorkspaceKeywords(workspaceId: string, keywords: string[]) {
  const supabase = await createSupabaseServerClient();
  const cleanedKeywords = normalizeKeywords(keywords);

  const { error: deleteError } = await supabase
    .from("workspace_keywords")
    .delete()
    .eq("workspace_id", workspaceId);

  if (deleteError) {
    throw deleteError;
  }

  if (cleanedKeywords.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("workspace_keywords").insert(
    cleanedKeywords.map((keyword, index) => ({
      workspace_id: workspaceId,
      keyword,
      position: index + 1,
      updated_at: new Date().toISOString(),
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

async function listWorkspaceRows(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      target_audience,
      product_link,
      common_instruction,
      informational_focus,
      engagement_focus,
      product_focus,
      is_active,
      created_at,
      updated_at,
      workspace_keywords (
        keyword,
        position
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkspaceRow[];
}

async function findWorkspaceRowByName(input: {
  userId: string;
  name: string;
}) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      target_audience,
      product_link,
      common_instruction,
      informational_focus,
      engagement_focus,
      product_focus,
      is_active,
      created_at,
      updated_at,
      workspace_keywords (
        keyword,
        position
      )
    `,
    )
    .eq("user_id", input.userId)
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle<WorkspaceRow>();

  if (error) {
    throw error;
  }

  return data;
}

function isWorkspaceNameConflictError(error: PostgrestLikeError | null) {
  return (
    error?.code === "23505" &&
    (error.message?.includes("workspaces_user_id_name_idx") ||
      error.details?.includes("lower(name)") ||
      false)
  );
}

async function importLegacyCookieWorkspaces(input: {
  userId: string;
  fallbackKeywords: string[];
}) {
  const existingRows = await listWorkspaceRows(input.userId);
  if (existingRows.length > 0) {
    return existingRows.map(mapWorkspaceRow);
  }

  const cookieStore = await cookies();
  const parsed = safeParseLegacyWorkspaceState(
    cookieStore.get(WORKSPACE_COOKIE_KEY)?.value,
  );

  const workspaces = parsed?.workspaces ?? [];
  if (workspaces.length === 0) {
    return [] as WorkspaceRecord[];
  }

  for (const workspace of workspaces) {
    await createWorkspaceRecord({
      userId: input.userId,
      name:
        typeof workspace.name === "string" && workspace.name.trim()
          ? workspace.name.trim()
          : "workspace",
      keywords:
        normalizeKeywords(workspace.keywords).length > 0
          ? normalizeKeywords(workspace.keywords)
          : input.fallbackKeywords,
      customization: normalizeCustomization(workspace.customization),
      isActive: workspace.id === parsed?.activeWorkspaceId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      allowExistingNameReuse: true,
    });
  }

  const importedRows = await listWorkspaceRows(input.userId);
  return importedRows.map(mapWorkspaceRow);
}

export async function getWorkspaceState(input: {
  userId: string;
  fallbackKeywords?: string[];
}) {
  let workspaces = (await listWorkspaceRows(input.userId)).map(mapWorkspaceRow);

  if (workspaces.length === 0) {
    try {
      workspaces = await importLegacyCookieWorkspaces({
        userId: input.userId,
        fallbackKeywords: input.fallbackKeywords ?? [],
      });
    } catch (error) {
      if (!isWorkspaceNameConflictError(error as PostgrestLikeError)) {
        throw error;
      }

      workspaces = (await listWorkspaceRows(input.userId)).map(mapWorkspaceRow);
    }
  }

  return {
    activeWorkspaceId:
      workspaces.find((workspace) => workspace.isActive)?.id ??
      workspaces[0]?.id ??
      null,
    workspaces,
  } satisfies WorkspaceState;
}

export function getActiveWorkspace(
  state: WorkspaceState,
  workspaceId?: string | null,
) {
  if (workspaceId) {
    const requested = state.workspaces.find((workspace) => workspace.id === workspaceId);
    if (requested) return requested;
  }

  return (
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ??
    state.workspaces[0] ??
    null
  );
}

export async function createWorkspaceRecord(input: {
  userId: string;
  name: string;
  keywords: string[];
  customization?: Partial<WorkspaceCustomization>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  allowExistingNameReuse?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const customization = {
    ...EMPTY_CUSTOMIZATION,
    ...(input.customization ?? {}),
  };
  const shouldActivate = input.isActive ?? true;

  if (shouldActivate) {
    const { error: deactivateError } = await supabase
      .from("workspaces")
      .update({
        is_active: false,
        updated_at: now,
      })
      .eq("user_id", input.userId)
      .eq("is_active", true);

    if (deactivateError) {
      throw deactivateError;
    }
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: input.userId,
      name: input.name.trim() || "workspace",
      target_audience: customization.targetAudience,
      product_link: customization.productLink,
      common_instruction: customization.commonInstruction,
      informational_focus: customization.informationalFocus,
      engagement_focus: customization.engagementFocus,
      product_focus: customization.productFocus,
      is_active: shouldActivate,
      created_at: input.createdAt ?? now,
      updated_at: input.updatedAt ?? now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (input.allowExistingNameReuse && isWorkspaceNameConflictError(error)) {
      const existingWorkspace = await findWorkspaceRowByName({
        userId: input.userId,
        name: input.name,
      });

      if (existingWorkspace) {
        return mapWorkspaceRow(existingWorkspace);
      }
    }

    throw error;
  }

  await replaceWorkspaceKeywords(data.id, input.keywords);

  const nextState = await getWorkspaceState({ userId: input.userId });
  const createdWorkspace = nextState.workspaces.find((workspace) => workspace.id === data.id);

  if (!createdWorkspace) {
    throw new Error("Failed to load created workspace");
  }

  return createdWorkspace;
}

export async function updateWorkspaceRecord(input: {
  userId: string;
  workspaceId: string;
  name: string;
  keywords: string[];
  customization: Partial<WorkspaceCustomization>;
}) {
  const supabase = await createSupabaseServerClient();
  const customization = {
    ...EMPTY_CUSTOMIZATION,
    ...(input.customization ?? {}),
  };

  const { error } = await supabase
    .from("workspaces")
    .update({
      name: input.name.trim() || "workspace",
      target_audience: customization.targetAudience,
      product_link: customization.productLink,
      common_instruction: customization.commonInstruction,
      informational_focus: customization.informationalFocus,
      engagement_focus: customization.engagementFocus,
      product_focus: customization.productFocus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.workspaceId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }

  await replaceWorkspaceKeywords(input.workspaceId, input.keywords);
}

export async function setActiveWorkspace(input: {
  userId: string;
  workspaceId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { error: clearError } = await supabase
    .from("workspaces")
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("is_active", true);

  if (clearError) {
    throw clearError;
  }

  const { error: activateError } = await supabase
    .from("workspaces")
    .update({
      is_active: true,
      updated_at: now,
    })
    .eq("id", input.workspaceId)
    .eq("user_id", input.userId);

  if (activateError) {
    throw activateError;
  }
}

export function deriveWorkspaceKeywordsFromAccounts(
  accounts: ConnectedAccountWithKeywords[],
) {
  return Array.from(
    new Set(
      accounts.flatMap((account) =>
        account.keywords
          .map((entry) => entry.keyword.trim())
          .filter(Boolean),
      ),
    ),
  ).slice(0, 3);
}
