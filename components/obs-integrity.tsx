"use client";

import { useRef, useState } from "react";
import { useLiveState } from "./use-live-state";

/** Overlay de Índice de Dano e Pressão para o OBS (equivalente a obs_integridade.html / .js). */
export default function ObsIntegrity({ sheetId }: { sheetId: string }) {
  const [vals, setVals] = useState({ dCur: 0, dTot: 0, pCur: 0 });
  const [warnD, setWarnD] = useState(false);
  const [warnP, setWarnP] = useState(false);
  const dmgEl = useRef<HTMLDivElement>(null);
  const presEl = useRef<HTMLDivElement>(null);
  const last = useRef<{ d: number | null; p: number | null }>({ d: null, p: null });

  const impact = (el: HTMLElement | null) => {
    if (!el) return;
    el.classList.remove("impact");
    void el.offsetWidth;
    el.classList.add("impact");
  };

  useLiveState(sheetId, state => {
    const dCur = state.dano_atual, dTot = state.dano_total;
    const pCur = state.pressao_atual, pTot = state.pressao_total;

    setVals({ dCur, dTot, pCur });
    if (last.current.d !== null && dCur !== last.current.d) impact(dmgEl.current);
    if (last.current.p !== null && pCur !== last.current.p) impact(presEl.current);
    last.current = { d: dCur, p: pCur };

    setWarnD(dTot > 0 && dCur / dTot >= 0.8);
    setWarnP(pTot > 0 && pCur / pTot >= 0.8);
  });

  return (
    <div className="obs-integrity-stage">
      <div ref={dmgEl} className={`obs-stat damage${warnD ? " warning" : ""}`}>
        <span>{vals.dCur}</span>
        <span className="slash">/</span>
        <span>{vals.dTot}</span>
      </div>
      <div ref={presEl} className={`obs-stat pressure${warnP ? " warning" : ""}`}>
        <span>{vals.pCur}</span>
      </div>
    </div>
  );
}
