import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyLive, type LiveState } from "./types";

export const LIVE_COLUMNS = "dano_atual,dano_total,pressao_atual,pressao_total,last_roll";

export const MIGRATION_HINT =
  "Tabelas novas ausentes. Execute supabase/migration-live-rolls-labels.sql no SQL Editor do Supabase.";

/** Lê o estado ao vivo; cria a linha (zerada) se a ficha ainda não tiver uma. */
export async function getOrCreateLive(admin: SupabaseClient, sheetId: string): Promise<LiveState> {
  const { data, error } = await admin.from("sheet_live").select(LIVE_COLUMNS).eq("sheet_id", sheetId).maybeSingle();
  if (error) throw error;
  if (data) return data as LiveState;

  const { error: insertError } = await admin
    .from("sheet_live")
    .upsert({ sheet_id: sheetId }, { onConflict: "sheet_id", ignoreDuplicates: true });
  if (insertError) throw insertError;
  return { ...emptyLive };
}
