"use client";

import { useRef, useState } from "react";
import type { Labels } from "@/lib/labels";
import type { LastRoll, LiveState } from "@/lib/types";
import { networkError, readApi } from "@/lib/api";
import { useLiveState } from "./use-live-state";

type StatKey = "dano" | "pressao";

export default function LivePanel({ token, sheetId, labels: L, initial }: { token: string; sheetId: string; labels: Labels; initial: LiveState }) {
  const [qtd, setQtd] = useState(1);
  const [ordem3, setOrdem3] = useState(false);
  const [vantagem, setVantagem] = useState(false);
  const [desvantagem, setDesvantagem] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<LastRoll | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(initial);
  // Quantos pedidos de Dano/Pressão ainda estão a caminho do servidor. Enquanto houver algum, ignoramos
  // atualizações vindas de fora para o número não "pular" para trás no meio de cliques rápidos.
  const inFlight = useRef(0);

  // Mantém Dano/Pressão em sincronia com o que outros jogadores (ou o Mestre) alteram.
  useLiveState(sheetId, s => {
    if (inFlight.current > 0) return;
    if (typeof document !== "undefined" && document.activeElement?.closest(".vital")) return; // não atropela quem está digitando
    setLive(prev =>
      prev.dano_atual === s.dano_atual && prev.dano_total === s.dano_total &&
      prev.pressao_atual === s.pressao_atual && prev.pressao_total === s.pressao_total
        ? prev
        : { ...prev, ...s }
    );
  });

  async function rollDice() {
    setError("");
    if (vantagem && desvantagem) { setError("Vantagem e Desvantagem não podem ser usadas juntas."); return; }
    setRolling(true);
    try {
      const r = await fetch(`/api/sheet/${token}/roll`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qtd, ordem3, vantagem, desvantagem })
      });
      const x = await readApi<{ roll: LastRoll }>(r);
      if (x.ok) setRoll(x.data.roll); else setError(x.error);
    } catch (e) { setError(networkError(e)); }
    setRolling(false);
  }

  async function sendVitals(body: object) {
    setError("");
    inFlight.current++;
    try {
      const r = await fetch(`/api/sheet/${token}/vitals`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const x = await readApi<{ live: LiveState }>(r);
      // Só a última resposta é a "verdade": respostas antigas não sobrescrevem cliques mais novos.
      if (x.ok) { if (inFlight.current === 1) setLive(s => ({ ...s, ...x.data.live })); } else setError(x.error);
    } catch (e) { setError(networkError(e)); }
    inFlight.current--;
  }

  /** + / −: mostra o novo valor na hora e confirma com o servidor em seguida. */
  function bump(key: StatKey, delta: number) {
    const cur = key === "dano" ? "dano_atual" : "pressao_atual";
    const tot = key === "dano" ? "dano_total" : "pressao_total";
    setLive(s => ({ ...s, [cur]: Math.max(0, Math.min(s[cur] + delta, s[tot])) }));
    sendVitals({ stat: key, delta });
  }

  function setField(field: keyof LiveState, apiKey: string, raw: string) {
    const n = Math.max(0, Math.min(parseInt(raw, 10) || 0, 9999));
    setLive(s => ({ ...s, [field]: n }));
    return { [apiKey]: n };
  }

  const stat = (key: StatKey, title: string) => {
    const cur = key === "dano" ? "dano_atual" : "pressao_atual";
    const tot = key === "dano" ? "dano_total" : "pressao_total";
    const apiCur = key === "dano" ? "danoAtual" : "pressaoAtual";
    const apiTot = key === "dano" ? "danoTotal" : "pressaoTotal";
    return (
      <div className={`vital vital-${key}`}>
        <h4>{title}</h4>
        <div className="vital-row">
          <button type="button" className="vital-btn" aria-label="Diminuir" onClick={() => bump(key, -1)}>−</button>
          <input
            className="number-box" type="number" min={0} value={live[cur]}
            onChange={e => setField(cur, apiCur, e.target.value)}
            onBlur={e => sendVitals({ values: { [apiCur]: Math.max(0, parseInt(e.target.value, 10) || 0) } })}
          />
          <span className="vital-sep">/</span>
          <input
            className="number-box" type="number" min={0} value={live[tot]}
            onChange={e => setField(tot, apiTot, e.target.value)}
            onBlur={e => sendVitals({ values: { [apiTot]: Math.max(0, parseInt(e.target.value, 10) || 0) } })}
          />
          <button type="button" className="vital-btn" aria-label="Aumentar" onClick={() => bump(key, 1)}>+</button>
        </div>
      </div>
    );
  };

  return (
    <section className="live-section">
      <div className="card roll-card">
        <div className="ribbon">{L["live.titulo"]}</div>
        <div className="roll-controls">
          <label className="field">
            <span>{L["live.qtd"]}</span>
            <input type="number" min={1} max={100} value={qtd} onChange={e => setQtd(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          </label>
          <div className="roll-options">
            <label><input type="checkbox" checked={ordem3} onChange={e => setOrdem3(e.target.checked)} /> {L["live.ordem3"]}</label>
            <label><input type="checkbox" checked={vantagem} onChange={e => setVantagem(e.target.checked)} /> {L["live.vantagem"]}</label>
            <label><input type="checkbox" checked={desvantagem} onChange={e => setDesvantagem(e.target.checked)} /> {L["live.desvantagem"]}</label>
          </div>
          <button type="button" className="gold-button" disabled={rolling} onClick={rollDice}>{rolling ? "ROLANDO..." : L["live.rolar"]}</button>
        </div>
        {error && <p className="error">{error}</p>}
        {roll && (
          <div className="roll-result" aria-live="polite">
            <div className="dice-list">
              {roll.results.map((r, i) => <span key={i} className={r === 1 ? "die-one" : r === 12 ? "die-twelve" : ""}>{r}</span>)}
            </div>
            <div className="success-count">{roll.successes}</div>
            <div className="success-label">{L["live.sucessos"]}</div>
          </div>
        )}
      </div>

      <div className="card vitals-card">
        <div className="ribbon">{L["live.integridade"]}</div>
        {stat("dano", L["live.dano"])}
        {stat("pressao", L["live.pressao"])}
      </div>
    </section>
  );
}
