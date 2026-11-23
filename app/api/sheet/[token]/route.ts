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

  // O título só acompanha o nome do personagem quando ele foi preenchido (evita sobrescrever renomeações do Mestre).
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : undefined;

  // Modo novo: recebe só os campos alterados e os mescla no banco (um jogador não apaga o que o outro fez).
  if (Array.isArray(body.changes)) {
    const changes = sanitizeChanges(body.changes);
    if (!changes) return NextResponse.json({ error: "Alterações inválidas." }, { status: 400 });
    const { data: merged, error: rpcError } = await supabase.rpc("patch_sheet_data", {
      p_token: token,
      p_changes: changes,
      p_title: title ?? null
    });
    if (!rpcError) return NextResponse.json({ data: merged });
    if (/sheet_not_found/.test(rpcError.message)) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
    // Função ainda não instalada no banco: segue para o modo antigo (grava a ficha inteira), se ela veio no pedido.
    const missing = /function|schema cache|does not exist/i.test(rpcError.message);
    if (!missing || !body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }
  }

  const { data: current } = await supabase.from("sheets").select("id").eq("token", token).maybeSingle();
  if (!current) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  if (!body.data || typeof body.data !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const update: { data: unknown; title?: string } = { data: body.data };
  if (title) update.title = title;

  const { data, error } = await supabase
    .from("sheets")
    .update(update)
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheet: data, data: data.data });
}

type Change = { path: string[]; value: string | number | boolean };

/** Aceita só caminhos de 1–2 níveis com valores simples (texto, número, booleano). */
function sanitizeChanges(raw: unknown[]): Change[] | null {
  if (raw.length > 80) return null;
  const out: Change[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const { path, value } = item as { path?: unknown; value?: unknown };
    if (!Array.isArray(path) || path.length < 1 || path.length > 2) return null;
    if (!path.every(p => typeof p === "string" && p.length > 0 && p.length <= 80)) return null;
    if (typeof value === "string") { if (value.length > 50000) return null; }
    else if (typeof value === "number") { if (!Number.isFinite(value)) return null; }
    else if (typeof value !== "boolean") return null;
    out.push({ path: path as string[], value });
  }
  return out;
}
