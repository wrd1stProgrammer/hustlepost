import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
