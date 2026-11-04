"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RollRecord, Sheet } from "@/lib/types";
import LabelsEditor from "./labels-editor";

export default function MasterPanel({ initialUser }: { initialUser: string | null }) {
  const router = useRouter();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [rolls, setRolls] = useState<RollRecord[]>([]);
  const [historyMsg, setHistoryMsg] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!initialUser) { router.replace("/mestre/login"); return; }
    fetch("/api/sheets").then(r => r.json()).then(x => setSheets(x.sheets || [])).finally(() => setLoading(false));
  }, [initialUser, router]);

  async function createSheet() {
    if (!newName.trim()) return;
    setBusy(true);
    const r = await fetch("/api/sheets", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({title:newName}) });
    const x = await r.json();
    if (r.ok) { setSheets(prev => [x.sheet, ...prev]); setNewName(""); }
    setBusy(false);
  }

  async function removeSheet(id: string) {
    if (!confirm("Excluir esta ficha? Esta ação não pode ser desfeita.")) return;
    const r = await fetch(`/api/sheets/${id}`, { method:"DELETE" });
    if (r.ok) setSheets(prev => prev.filter(s => s.id !== id));
  }

  async function renameSheet(id: string) {
    const title = editingName.trim();
    if (!title) return;
    const r = await fetch(`/api/sheets/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ title }) });
    const x = await r.json();
    if (r.ok) { setSheets(prev => prev.map(s => s.id === id ? { ...s, title: x.sheet.title, updated_at: x.sheet.updated_at } : s)); setEditingId(null); }
    else flash(x.error || "Erro ao renomear.");
  }

  async function toggleHistory(id: string) {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id); setRolls([]); setHistoryMsg("Carregando...");
    const r = await fetch(`/api/sheets/${id}/history`);
    const x = await r.json();
    if (r.ok) { setRolls(x.rolls || []); setHistoryMsg(""); } else setHistoryMsg(x.error || "Erro ao carregar histórico.");
  }

  async function clearHistory(id: string) {
    if (!confirm("Excluir todo o histórico de rolagens desta ficha?")) return;
    const r = await fetch(`/api/sheets/${id}/history`, { method:"DELETE" });
    if (r.ok) { setRolls([]); setHistoryMsg("Histórico apagado."); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" });
    router.push("/mestre/login");
  }

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    flash(`${label} copiado.`);
  }

  if (!initialUser) return null;

  return (
    <main className="master-shell">
      <header className="master-header">
        <div>
          <p className="eyebrow">ARQUIVO CENTRAL</p>
          <h1>PAINEL DO MESTRE</h1>
          <p className="muted">{initialUser}</p>
        </div>
        <button className="ghost-button" onClick={logout}>SAIR</button>
      </header>

      <section className="create-card">
        <div>
          <p className="eyebrow">NOVA FICHA</p>
          <h2>Crie uma ficha para um jogador</h2>
        </div>
        <div className="create-row">
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome da ficha / personagem" onKeyDown={e=>e.key==="Enter" && createSheet()} />
          <button className="gold-button" disabled={busy} onClick={createSheet}>+ CRIAR FICHA</button>
        </div>
      </section>

      <LabelsEditor />

      <section className="sheet-list">
        <div className="section-heading"><h2>FICHAS DA CAMPANHA</h2><span>{sheets.length}</span></div>
        {notice && <p className="muted master-notice">{notice}</p>}
        {loading ? <p className="muted">Carregando...</p> : sheets.length === 0 ? (
          <div className="empty-state">Nenhuma ficha criada ainda.</div>
        ) : sheets.map(sheet => (
          <div className="sheet-block" key={sheet.id}>
            <article className="sheet-row">
              <div className="sheet-avatar">{(sheet.title || "?").slice(0,1).toUpperCase()}</div>
              <div className="sheet-info">
                {editingId === sheet.id ? (
                  <input
                    className="rename-input" autoFocus value={editingName} maxLength={120}
                    onChange={e=>setEditingName(e.target.value)}
                    onKeyDown={e=>{ if (e.key==="Enter") renameSheet(sheet.id); if (e.key==="Escape") setEditingId(null); }}
                  />
                ) : <strong>{sheet.title}</strong>}
                <small>Atualizada em {new Date(sheet.updated_at).toLocaleString("pt-BR")}</small>
              </div>
              <div className="sheet-actions">
                {editingId === sheet.id ? (
                  <>
                    <button className="small-button" onClick={()=>renameSheet(sheet.id)}>SALVAR</button>
                    <button className="small-button ghost" onClick={()=>setEditingId(null)}>CANCELAR</button>
                  </>
                ) : (
                  <button className="small-button" onClick={()=>{ setEditingId(sheet.id); setEditingName(sheet.title); }}>RENOMEAR</button>
                )}
                <button className="small-button" onClick={()=>copy(`${window.location.origin}/ficha/${sheet.token}`, "Link da ficha")}>COPIAR LINK</button>
                <button className="small-button" onClick={()=>copy(`${window.location.origin}/obs/${sheet.id}/rolagem`, "Link OBS de rolagem")}>OBS ROLAGEM</button>
                <button className="small-button" onClick={()=>copy(`${window.location.origin}/obs/${sheet.id}/integridade`, "Link OBS de integridade")}>OBS INTEGRIDADE</button>
                <button className="small-button" onClick={()=>toggleHistory(sheet.id)}>{historyId === sheet.id ? "FECHAR HISTÓRICO" : "HISTÓRICO"}</button>
                <a className="small-button" href={`/ficha/${sheet.token}`} target="_blank">ABRIR</a>
                <button className="danger-button" onClick={()=>removeSheet(sheet.id)}>EXCLUIR</button>
              </div>
            </article>

            {historyId === sheet.id && (
              <div className="history-panel">
                <div className="history-head">
                  <strong>HISTÓRICO DE ROLAGENS</strong>
                  <button className="danger-button" onClick={()=>clearHistory(sheet.id)}>APAGAR HISTÓRICO</button>
                </div>
                {historyMsg && <p className="muted">{historyMsg}</p>}
                {!historyMsg && rolls.length === 0 && <p className="muted">Nenhuma rolagem registrada.</p>}
                {rolls.map(roll => (
                  <div className="history-item" key={roll.id}>
                    <strong>{roll.results.length} dado(s)</strong> — <strong>{roll.successes} sucesso(s)</strong>
                    <div>Resultados: {roll.results.join(" | ")}</div>
                    <small>{new Date(roll.created_at).toLocaleString("pt-BR")}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
