 "use client";

import { useEffect, useRef, useState } from "react";
import type { LiveState, Sheet, SheetData } from "@/lib/types";
import { COMP_LEFT as compLeft, COMP_RIGHT as compRight, DEFAULT_LABELS, type Labels } from "@/lib/labels";
import LivePanel from "./live-panel";
import { networkError, readApi } from "@/lib/api";

function Meter({ value, max=5, onChange, diamond=false }: { value:number; max?:number; onChange:(n:number)=>void; diamond?:boolean }) {
  return <div className={`meter ${diamond ? "diamond-meter" : ""}`}>
    {Array.from({length:max}).map((_,i)=>{
      const selected = i < value;
      const isLastSelected = i === value - 1;
      return <button
        type="button"
        key={i}
        className={selected ? "active" : ""}
        onClick={()=>onChange(isLastSelected ? 0 : i + 1)}
        aria-pressed={selected}
        aria-label={selected ? `Desmarcar ${i+1}` : `Marcar ${i+1}`}
      >{diamond ? (selected ? "◆" : "◇") : (selected ? "●" : "○")}</button>;
    })}
  </div>
}

function TextField({label,value,onChange, className=""}:{label:string;value:string;onChange:(v:string)=>void;className?:string}) {
  return <label className={`field ${className}`}><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} /></label>
}

type Change = { path: string[]; value: string | number | boolean };
const SEP = "\u0001";
const EDIT_GUARD_MS = 2500; // campo mexido há pouco por você não é sobrescrito por dados vindos de fora
const POLL_MS = 4000;

export default function PlayerSheet({ sheet: initial, labels, live }: { sheet: Sheet; labels?: Labels; live: LiveState }) {
  const L: Labels = labels ?? DEFAULT_LABELS;
  const [sheet, setSheet] = useState(initial);
  const [status, setStatus] = useState("SALVO");
  const [uploading, setUploading] = useState(false);

  const token = sheet.token;
  const dataRef = useRef<SheetData>(initial.data);            // cópia sempre atual (evita estado velho em cliques rápidos)
  const pending = useRef(new Map<string, Change>());          // alterações ainda não confirmadas pelo servidor
  const lastEdit = useRef(new Map<string, number>());         // quando você mexeu em cada campo pela última vez
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  function commit(next: SheetData) {
    dataRef.current = next;
    setSheet(s => ({ ...s, data: next }));
  }

  /** Aplica dados vindos do servidor, sem tocar nos campos que você acabou de alterar. */
  function mergeRemote(remote: SheetData, since = 0) {
    const now = Date.now();
    const cur = dataRef.current as unknown as Record<string, unknown>;
    const guarded = (path: string[]) => {
      const k = path.join(SEP);
      const t = lastEdit.current.get(k) ?? 0;
      return pending.current.has(k) || t >= since || now - t < EDIT_GUARD_MS;
    };
    const next: Record<string, unknown> = { ...cur };
    let changed = false;
    for (const [k, rv] of Object.entries(remote as unknown as Record<string, unknown>)) {
      const cv = cur[k];
      if (rv && typeof rv === "object" && !Array.isArray(rv)) {
        const merged: Record<string, unknown> = { ...((cv as Record<string, unknown>) ?? {}) };
        let sub = false;
        for (const [sk, srv] of Object.entries(rv as Record<string, unknown>)) {
          if (guarded([k, sk]) || merged[sk] === srv) continue;
          merged[sk] = srv; sub = true;
        }
        if (sub) { next[k] = merged; changed = true; }
      } else if (!guarded([k]) && cv !== rv) {
        next[k] = rv; changed = true;
      }
    }
    if (changed) commit(next as unknown as SheetData);
  }

  /** Envia só o que mudou. Os envios são feitos um de cada vez; o que sobrar vai no próximo. */
  async function flush() {
    if (inFlight.current) return;
    const batch = Array.from(pending.current.entries());
    if (!batch.length) return;
    inFlight.current = true;
    const startedAt = Date.now();
    let failed = false;
    try {
      const r = await fetch(`/api/sheet/${token}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: batch.map(([, c]) => c),
          data: dataRef.current, // só usado como reserva se a migração do banco ainda não foi aplicada
          title: dataRef.current.nome?.trim() || undefined
        })
      });
      const x = await readApi<{ data?: SheetData }>(r);
      if (x.ok) {
        for (const [k, c] of batch) if (pending.current.get(k) === c) pending.current.delete(k);
        if (x.data.data) mergeRemote(x.data.data, startedAt);
        if (pending.current.size === 0) setStatus("✓ SALVO");
      } else { failed = true; setStatus(`ERRO AO SALVAR (${x.status}): ${x.error}`); }
    } catch (e) {
      failed = true; setStatus(`ERRO AO SALVAR: ${networkError(e)}`);
    } finally {
      inFlight.current = false;
      if (pending.current.size > 0) scheduleSave(failed ? 3000 : 50);
    }
  }

  const api = useRef({ flush, mergeRemote });
  api.current = { flush, mergeRemote };

  function scheduleSave(delay = 450) {
    setStatus("SALVANDO...");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => api.current.flush(), delay);
  }

  function queue(changes: Change[]) {
    const now = Date.now();
    for (const c of changes) {
      const k = c.path.join(SEP);
      pending.current.set(k, c);
      lastEdit.current.set(k, now);
    }
    scheduleSave();
  }

  // Busca de tempos em tempos o que o outro jogador (ou o Mestre) alterou, e salva ao sair da aba.
  useEffect(() => {
    let stopped = false;
    const pull = async () => {
      if (document.hidden || inFlight.current) return;
      const startedAt = Date.now();
      try {
        const r = await fetch(`/api/sheet/${token}`, { cache: "no-store" });
        const x = await readApi<{ sheet?: Sheet }>(r);
        if (x.ok && x.data.sheet && !stopped && !inFlight.current) api.current.mergeRemote(x.data.sheet.data, startedAt);
      } catch {}
    };
    const onVisible = () => {
      if (document.hidden) { if (timer.current) clearTimeout(timer.current); api.current.flush(); } else pull();
    };
    const id = setInterval(pull, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [token]);

  function patch(p: Partial<SheetData>) {
    const changes: Change[] = [];
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") changes.push({ path: [k], value: v });
    }
    commit({ ...dataRef.current, ...p });
    queue(changes);
  }

  /** Para grupos (pilar, competências, condições, idioma): grava só a chave que mudou, não o grupo inteiro. */
  function setNested<K extends keyof SheetData>(key: K, value: SheetData[K]) {
    const prev = (dataRef.current[key] ?? {}) as Record<string, unknown>;
    const changes: Change[] = [];
    for (const [k, v] of Object.entries(value as unknown as Record<string, unknown>)) {
      if (prev[k] !== v && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
        changes.push({ path: [key as string, k], value: v });
      }
    }
    commit({ ...dataRef.current, [key]: { ...prev, ...(value as object) } });
    if (changes.length) queue(changes);
  }

  async function uploadImage(file: File) {
    setUploading(true); setStatus("ENVIANDO IMAGEM...");
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`/api/sheet/${token}/image`, {method:"POST", body:fd});
    const x = await r.json();
    if (r.ok) {
      commit({ ...dataRef.current, personagemImagem: x.url });
      lastEdit.current.set(["personagemImagem"].join(SEP), Date.now());
      setStatus("✓ SALVO");
    } else setStatus(x.error || "ERRO");
    setUploading(false);
  }

  const d = sheet.data;
  const anotacoes = d.anotacoes ?? "";

  return (
    <main className="sheet-page">
      <div className="sheet-status">{status}</div>

      <section className="sheet-top">
        <div className="identity">
          <TextField label={L["id.codinome"]} value={d.codinome} onChange={v=>patch({codinome:v})}/>
          <TextField label={L["id.nome"]} value={d.nome} onChange={v=>patch({nome:v})} className="wide"/>
          <TextField label={L["id.idade"]} value={d.idade} onChange={v=>patch({idade:v})}/>
          <TextField label={L["id.filosofia"]} value={d.filosofia} onChange={v=>patch({filosofia:v})} className="wide"/>
          <TextField label={L["id.ancora"]} value={d.ancora} onChange={v=>patch({ancora:v})} className="wide"/>
          <TextField label={L["id.conexao"]} value={d.conexao} onChange={v=>patch({conexao:v})}/>
          <TextField label={L["id.experiencia"]} value={d.experiencia} onChange={v=>patch({experiencia:v})}/>
          <TextField label={L["id.primeiraMorte"]} value={d.primeiraMorte} onChange={v=>patch({primeiraMorte:v})} className="full"/>
        </div>
        <div className="change-panel">
          <div className="banner">{L["sec.eventosMudanca"]}</div>
          <h4>{L["sec.pontosExperiencia"]}</h4>
          <Meter value={d.eventosMudanca} max={24} onChange={n=>patch({eventosMudanca:n})}/>
        </div>
        <div className="hope-panel">
          <div className="banner">{L["sec.esperanca"]}</div>
          <h4>{L["sec.esperancaDica"]}</h4>
          <input className="number-box hope" type="number" min="0" value={d.esperanca} onChange={e=>patch({esperanca:Number(e.target.value)})}/>
        </div>
        <div className="notes-panel">
          <div className="banner">{L["sec.anotacoes"]}</div>
          <textarea value={anotacoes} onChange={e=>patch({anotacoes:e.target.value})} placeholder="Anotações..." />
        </div>
      </section>

      <LivePanel token={sheet.token} sheetId={sheet.id} labels={L} initial={live} />

      <section className="sheet-grid">
        <div className="card pillar-card">
          <div className="ribbon">{L["sec.pilar"]}</div>
          <div className="pillar-grid">
            {([["ímpeto","impeto"],["resolução","resolucao"],["instinto","instinto"],["cognição","cognicao"]] as const).map(([, key])=>(
              <div className="pillar-stat" key={key}><h3>{L[`pilar.${key}`]}</h3><Meter value={d.pilar[key]} onChange={n=>setNested("pilar",{...d.pilar,[key]:n})}/></div>
            ))}
          </div>
          <div className="ribbon">{L["sec.competencia"]}</div>
          <div className="competency-grid">
            <div>{compLeft.map(k=><div className="comp" key={k}><span>{L[`comp.${k}`] ?? k}</span><Meter value={d.competencias[k]||0} onChange={n=>setNested("competencias",{...d.competencias,[k]:n})} diamond/></div>)}</div>
            <div>{compRight.map(k=><div className="comp" key={k}><span>{L[`comp.${k}`] ?? k}</span><Meter value={d.competencias[k]||0} onChange={n=>setNested("competencias",{...d.competencias,[k]:n})} diamond/></div>)}</div>
          </div>
        </div>

        <div className="card equipment-card">
          <div className="stat-row">
            <TextField label={L["eq.modelo"]} value={d.modelo} onChange={v=>patch({modelo:v})}/>
            <TextField label={L["eq.dano"]} value={d.dano} onChange={v=>patch({dano:v})}/>
            <TextField label={L["eq.alcance"]} value={d.alcance} onChange={v=>patch({alcance:v})}/>
            <TextField label={L["eq.habilidade"]} value={d.habilidade} onChange={v=>patch({habilidade:v})} className="full"/>
          </div>
          <label className="box-textarea"><span>{L["eq.acessorio"]}</span><textarea value={d.acessorio} onChange={e=>patch({acessorio:e.target.value})} /></label>
          <label className="box-textarea"><span>{L["eq.ferramentas"]}</span><textarea value={d.ferramentas} onChange={e=>patch({ferramentas:e.target.value})} /></label>
        </div>

        <div className="card portrait-card">
          <div className="portrait-frame">
            {d.personagemImagem ? <img src={d.personagemImagem} alt="Personagem" /> : <span>{L["eq.imagem"]}</span>}
            <label className="upload-button">{uploading ? "ENVIANDO..." : L["eq.addImagem"]}<input type="file" accept="image/*" disabled={uploading} onChange={e=>e.target.files?.[0] && uploadImage(e.target.files[0])}/></label>
          </div>
          <div className="condition-area">
            <div className="condition-list">
              <label><input type="checkbox" checked={d.condicoes.aflito} onChange={e=>setNested("condicoes",{...d.condicoes,aflito:e.target.checked})}/> {L["cond.aflito"]}</label>
              <label><input type="checkbox" checked={d.condicoes.debilitado} onChange={e=>setNested("condicoes",{...d.condicoes,debilitado:e.target.checked})}/> {L["cond.debilitado"]}</label>
              <label><input type="checkbox" checked={d.condicoes.imobilizado} onChange={e=>setNested("condicoes",{...d.condicoes,imobilizado:e.target.checked})}/> {L["cond.imobilizado"]}</label>
            </div>
            <label className="numeric-card"><span>{L["eq.reducao"]}</span><input type="number" value={d.reducao} onChange={e=>patch({reducao:Number(e.target.value)})}/></label>
            <label className="numeric-card"><span>{L["eq.evasao"]}</span><input type="number" value={d.evasao} onChange={e=>patch({evasao:Number(e.target.value)})}/></label>
          </div>
        </div>
      </section>

      <section className="second-page">
        <div className="card language-card">
          <div className="ribbon">{L["sec.idioma"]}</div>
          <div className="language-grid">
            <div><h2>{L["lang.alvos"]}</h2><p>LU — HUMANO</p><p>KIB — OBJETO</p><p>UDUG — CORROMPIDO</p><p>NAGU — ZONA</p></div>
            <div><h2>{L["lang.duracao"]}</h2><p>HAMTA — INSTANTÂNEO</p><p>TAHAZU — CENA</p><p>UDA — MOMENTOS</p></div>
          </div>
          <div className="actions-section">
            <div className="actions-title"><h2>{L["lang.acoes"]}</h2><span>/ Aumente 1 de pressão por palavra escolhida /</span></div>
            <div className="actions-grid">
              {[
                ["GU","ABSORVER"],["SELU","AFIAR"],["DE","AUMENTAR"],
                ["BALA","ATRAVESSAR"],["TIL","BUSCAR"],["KI","CALOR"],
                ["NAG","CALCULAR"],["KIDU","CONECTAR"],["KUS","CRESCER"],
                ["DUG","CRIAR"],["UR","DIMINUIR"],["GUR","DIVIDIR"],
                ["SUM","DOMINAR"],["ZID","ENDURECER"],["TUG","ENVOLVER"],
                ["RU","ENVIAR"],["HARSAG","ESPALHAR"],["KAR","FASCINAR"],
                ["IDA","FRIO"],["NIG","INSPIRAR"],["NISSU","IMATERIAL"],
                ["ZU","LEMBRAR"],["SUB","MANTER"],["US","MANIPULAR"],
                ["SA","MERGULHAR"],["UZ","MULTIPLICAR"],["UR","PERFURAR"],
                ["BIR","RASGAR"],["PAS","REGREDIR"],["TUR","REORGANIZAR"],
                ["BIL","REPELIR"],["GURUN","REVESTIR"],["SID","TRANSFORMAR"]
              ].map(([word, meaning])=><div className="action-pill" key={`${word}-${meaning}`}><span className="action-symbol">◇</span><b>{word}</b><span>{meaning}</span></div>)}
            </div>
          </div>
          <label className="big-text"><span>{L["lang.acoesPersonalizadas"]}</span><textarea value={d.idioma.acoes} onChange={e=>setNested("idioma",{...d.idioma,acoes:e.target.value})} placeholder="Anote combinações ou usos personalizados..." /></label>
          <label className="big-text"><span>{L["lang.marcas"]}</span><textarea value={d.marcas} onChange={e=>patch({marcas:e.target.value})}/></label>
        </div>
        <div className="card techniques-card">
          <div className="ribbon">{L["sec.tecnicas"]}</div>
          <TextField label={L["tech.arquetipo"]} value={d.arquetipo} onChange={v=>patch({arquetipo:v})}/>
          <label className="big-text technique-input"><span>{L["tech.tecnicas"]}</span><textarea value={d.tecnicas} onChange={e=>patch({tecnicas:e.target.value})} placeholder="Escreva aqui suas técnicas..." /></label>
        </div>
      </section>
    </main>
  );
}
