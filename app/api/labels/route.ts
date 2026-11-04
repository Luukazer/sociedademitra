import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeOverrides } from "@/lib/labels";
import { MIGRATION_HINT } from "@/lib/live";

export const dynamic = "force-dynamic";

async function master() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await master();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("campaign_settings").select("labels").eq("owner_id", user.id).maybeSingle();
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ labels: {}, warning: missing ? MIGRATION_HINT : error.message });
  }
  return NextResponse.json({ labels: sanitizeOverrides(data?.labels) });
}

export async function PUT(req: Request) {
  const user = await master();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const labels = sanitizeOverrides(body?.labels);

  const admin = createAdminClient();
  const { error } = await admin
    .from("campaign_settings")
    .upsert({ owner_id: user.id, labels, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MIGRATION_HINT : error.message }, { status: 500 });
  }
  return NextResponse.json({ labels });
}
