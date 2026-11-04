import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRoll, MAX_DICE } from "@/lib/dice";
import { getOrCreateLive, MIGRATION_HINT } from "@/lib/live";
import type { LastRoll } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const qtd = Number(body.qtd);
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_DICE) {
    return NextResponse.json({ error: `Informe de 1 a ${MAX_DICE} dados.` }, { status: 400 });
  }
  const ordem3 = body.ordem3 === true;
  const vantagem = body.vantagem === true;
  const desvantagem = body.desvantagem === true;
  if (vantagem && desvantagem) {
    return NextResponse.json({ error: "Vantagem e Desvantagem não podem ser usadas juntas." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sheet } = await admin.from("sheets").select("id").eq("token", token).maybeSingle();
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const outcome = computeRoll(qtd, { ordem3, vantagem, desvantagem }, () => crypto.randomInt(1, 13));
  const roll: LastRoll = {
    id: crypto.randomUUID(),
    ...outcome,
    ordem3,
    vantagem,
    desvantagem,
    timestamp: Date.now()
  };

  try {
    await getOrCreateLive(admin, sheet.id);
    const { error: liveError } = await admin.from("sheet_live").update({ last_roll: roll }).eq("sheet_id", sheet.id);
    if (liveError) throw liveError;

    const { error: histError } = await admin.from("roll_history").insert({
      sheet_id: sheet.id,
      results: roll.results,
      successes: roll.successes,
      alignment: roll.alignment,
      ordem3,
      vantagem,
      desvantagem
    });
    if (histError) throw histError;
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message || "";
    const missing = /relation|does not exist|schema cache/i.test(message);
    return NextResponse.json({ error: missing ? MIGRATION_HINT : message || "Erro ao registrar rolagem." }, { status: 500 });
  }

  return NextResponse.json({ roll });
}
