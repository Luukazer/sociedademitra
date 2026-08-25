import PlayerSheet from "@/components/player-sheet";
import { createAdminClient } from "@/lib/supabase/admin";
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

  return <PlayerSheet sheet={sheet} />;
}
