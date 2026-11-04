import PlayerSheet from "@/components/player-sheet";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateLive } from "@/lib/live";
import { resolveLabels } from "@/lib/labels";
import { emptyLive, type LiveState } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data: sheet } = await supabase
    .from("sheets")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!sheet) notFound();

  // As tabelas novas são opcionais para a ficha abrir: se a migração ainda não foi aplicada, usa os padrões.
  let live: LiveState = { ...emptyLive };
  try {
    live = await getOrCreateLive(supabase, sheet.id);
  } catch {}

  let overrides: unknown = null;
  try {
    const { data } = await supabase.from("campaign_settings").select("labels").eq("owner_id", sheet.owner_id).maybeSingle();
    overrides = data?.labels ?? null;
  } catch {}

  return <PlayerSheet sheet={sheet} labels={resolveLabels(overrides)} live={live} />;
}
