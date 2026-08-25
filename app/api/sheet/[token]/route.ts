import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("sheets").select("*").eq("token", token).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  return NextResponse.json({ sheet: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const supabase = createAdminClient();
  const { data: current } = await supabase.from("sheets").select("id").eq("token", token).maybeSingle();
  if (!current) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { data, error } = await supabase
    .from("sheets")
    .update({ data: body.data, title: String(body.title || "Ficha").slice(0, 120) })
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheet: data });
}
