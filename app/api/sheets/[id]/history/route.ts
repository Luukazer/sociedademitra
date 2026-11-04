import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MIGRATION_HINT } from "@/lib/live";

export const dynamic = "force-dynamic";

async function ownedSheetId(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  const admin = createAdminClient();
  const { data } = await admin.from("sheets").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 }) };
  return { admin, sheetId: data.id as string };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedSheetId(id);
  if ("error" in r && r.error) return r.error;
  const { admin, sheetId } = r as { admin: ReturnType<typeof createAdminClient>; sheetId: string };

  const { data, error } = await admin
    .from("roll_history")
    .select("id,results,successes,alignment,ordem3,vantagem,desvantagem,created_at")
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MIGRATION_HINT : error.message }, { status: 500 });
  }
  return NextResponse.json({ rolls: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedSheetId(id);
  if ("error" in r && r.error) return r.error;
  const { admin, sheetId } = r as { admin: ReturnType<typeof createAdminClient>; sheetId: string };

  const { error } = await admin.from("roll_history").delete().eq("sheet_id", sheetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
