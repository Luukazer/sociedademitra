import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function master() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await master();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "Informe um nome." }, { status: 400 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sheets")
    .update({ title })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  return NextResponse.json({ sheet: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await master();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: sheet } = await admin.from("sheets").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  // Remove antes os registros ligados à ficha (rolagens e estado ao vivo), para que nada bloqueie a exclusão.
  // Se as tabelas novas ainda não existirem, ignora e segue.
  await admin.from("roll_history").delete().eq("sheet_id", id);
  await admin.from("sheet_live").delete().eq("sheet_id", id);

  const { error } = await admin.from("sheets").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
