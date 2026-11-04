import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateLive, LIVE_COLUMNS, MIGRATION_HINT } from "@/lib/live";

export const dynamic = "force-dynamic";

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), 9999)) : null);

/**
 * PATCH com um destes formatos:
 *  { stat: "dano" | "pressao", delta: number }  -> soma/subtrai, mantendo 0 <= atual <= total (igual ao site de rolagem)
 *  { values: { danoAtual?, danoTotal?, pressaoAtual?, pressaoTotal? } } -> define valores digitados
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const admin = createAdminClient();
  const { data: sheet } = await admin.from("sheets").select("id").eq("token", token).maybeSingle();
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  try {
    const live = await getOrCreateLive(admin, sheet.id);
    const patch: Record<string, number> = {};

    if (body.stat === "dano" || body.stat === "pressao") {
      const delta = Number(body.delta);
      if (!Number.isFinite(delta)) return NextResponse.json({ error: "Delta inválido." }, { status: 400 });
      const curKey = body.stat === "dano" ? "dano_atual" : "pressao_atual";
      const totKey = body.stat === "dano" ? "dano_total" : "pressao_total";
      patch[curKey] = Math.max(0, Math.min(live[curKey] + Math.trunc(delta), live[totKey]));
    } else if (body.values && typeof body.values === "object") {
      const v = body.values as Record<string, unknown>;
      const map: [string, string][] = [
        ["danoAtual", "dano_atual"],
        ["danoTotal", "dano_total"],
        ["pressaoAtual", "pressao_atual"],
        ["pressaoTotal", "pressao_total"]
      ];
      for (const [from, to] of map) {
        if (from in v) {
          const n = int(v[from]);
          if (n === null) return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
          patch[to] = n;
        }
      }
    } else {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ live });

    const { data, error } = await admin.from("sheet_live").update(patch).eq("sheet_id", sheet.id).select(LIVE_COLUMNS).single();
    if (error) throw error;
    return NextResponse.json({ live: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message || "";
    const missing = /relation|does not exist|schema cache/i.test(message);
    return NextResponse.json({ error: missing ? MIGRATION_HINT : message || "Erro ao salvar." }, { status: 500 });
  }
}
