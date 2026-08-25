 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Sheet } from "@/lib/types";

export default function MasterPanel({ initialUser }: { initialUser: string | null }) {
  const router = useRouter();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" });
    router.push("/mestre/login");
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/ficha/${token}`);
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

      <section className="sheet-list">
        <div className="section-heading"><h2>FICHAS DA CAMPANHA</h2><span>{sheets.length}</span></div>
        {loading ? <p className="muted">Carregando...</p> : sheets.length === 0 ? (
          <div className="empty-state">Nenhuma ficha criada ainda.</div>
        ) : sheets.map(sheet => (
          <article className="sheet-row" key={sheet.id}>
            <div className="sheet-avatar">{(sheet.title || "?").slice(0,1).toUpperCase()}</div>
            <div className="sheet-info">
              <strong>{sheet.title}</strong>
              <small>Atualizada em {new Date(sheet.updated_at).toLocaleString("pt-BR")}</small>
            </div>
            <div className="sheet-actions">
              <button className="small-button" onClick={()=>copyLink(sheet.token)}>COPIAR LINK</button>
              <a className="small-button" href={`/ficha/${sheet.token}`} target="_blank">ABRIR</a>
              <button className="danger-button" onClick={()=>removeSheet(sheet.id)}>EXCLUIR</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
