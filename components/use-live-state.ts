"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LiveState } from "@/lib/types";

/**
 * Assina o estado ao vivo de uma ficha (tabela sheet_live) via Supabase Realtime,
 * com consulta periódica de segurança caso o websocket caia durante a live.
 * O primeiro estado recebido é entregue com `initial = true`.
 */
export function useLiveState(sheetId: string, onState: (s: LiveState, initial: boolean) => void) {
  const cb = useRef(onState);
  cb.current = onState;

  useEffect(() => {
    const supabase = createClient();
    let first = true;
    let stopped = false;

    const deliver = (row: Partial<LiveState> | null | undefined) => {
      if (!row || stopped) return;
      const state: LiveState = {
        dano_atual: row.dano_atual ?? 0,
        dano_total: row.dano_total ?? 0,
        pressao_atual: row.pressao_atual ?? 0,
        pressao_total: row.pressao_total ?? 0,
        last_roll: row.last_roll ?? null
      };
      const initial = first;
      first = false;
      cb.current(state, initial);
    };

    const fetchNow = async () => {
      const { data } = await supabase
        .from("sheet_live")
        .select("dano_atual,dano_total,pressao_atual,pressao_total,last_roll")
        .eq("sheet_id", sheetId)
        .maybeSingle();
      if (data) deliver(data as LiveState);
    };

    fetchNow();

    const channel = supabase
      .channel(`live-${sheetId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sheet_live", filter: `sheet_id=eq.${sheetId}` }, payload => {
        deliver(payload.new as Partial<LiveState>);
      })
      .subscribe();

    const poll = setInterval(fetchNow, 3000);

    return () => {
      stopped = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [sheetId]);
}
