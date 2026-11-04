"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LABELS, LABEL_GROUPS, type Labels } from "@/lib/labels";

export default function LabelsEditor() {
  const [saved, setSaved] = useState<Labels>({});
  const [draft, setDraft] = useState<Labels>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch("/api/labels").then(r => r.json()).then(x => {
      setSaved(x.labels || {}); setDraft(x.labels || {});
      if (x.warning) { setMsg(x.warning); setIsError(true); }
    }).finally(() => setLoading(false));
  }, []);

  const changed = JSON.stringify(clean(draft)) !== JSON.stringify(clean(saved));

  function clean(l: Labels) {
    return Object.fromEntries(Object.entries(l).filter(([k, v]) => v.trim() && v.trim() !== DEFAULT_LABELS[k]).sort());
  }

  async function save(next: Labels) {
    setBusy(true); setMsg(""); setIsError(false);
    const r = await fetch("/api/labels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labels: next }) });
    const x = await r.json();
    if (r.ok) { setSaved(x.labels); setDraft(x.labels); setMsg("Nomenclatura salva. As fichas já usam os novos nomes."); }
    else { setMsg(x.error || "Erro ao salvar."); setIsError(true); }
    setBusy(false);
  }

  return (
    <section className="labels-card">
      <details>
        <summary>
          <span>
            <span className="eyebrow">NOMENCLATURA</span>
            <strong>Editar nomes da ficha</strong>
          </span>
          <span className="small-button">ABRIR / FECHAR</span>
        </summary>

        <p className="muted">
          Altere o texto exibido em perícias, pilares, campos e títulos. Vale para todas as fichas da campanha.
          Os dados dos personagens não são alterados — só o nome mostrado. Deixe em branco para voltar ao padrão.
        </p>

        {loading ? <p className="muted">Carregando...</p> : LABEL_GROUPS.map(group => (
          <div className="labels-group" key={group.title}>
            <h3>{group.title}</h3>
            <div className="labels-grid">
              {group.items.map(item => (
                <label className="labels-item" key={item.key}>
                  <small>{item.label}</small>
                  <input
                    value={draft[item.key] ?? ""}
                    placeholder={item.label}
                    maxLength={120}
                    onChange={e => setDraft(d => ({ ...d, [item.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="labels-actions">
          <button className="gold-button" disabled={busy || !changed} onClick={() => save(draft)}>{busy ? "SALVANDO..." : "SALVAR NOMENCLATURA"}</button>
          <button
            className="ghost-button" disabled={busy || Object.keys(saved).length === 0}
            onClick={() => { if (confirm("Restaurar todos os nomes padrão?")) save({}); }}
          >RESTAURAR PADRÕES</button>
          {msg && <span className={isError ? "error" : "muted"}>{msg}</span>}
        </div>
      </details>
    </section>
  );
}
