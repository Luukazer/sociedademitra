 "use client";

import { useEffect, useRef, useState } from "react";
import type { Sheet, SheetData } from "@/lib/types";

const compLeft = ["Atletismo","Eletromecânica","Exociência","Furtivo","História","Imanência","Influência"];
const compRight = ["Investigação","Medicina","Ofício","Primor","Propósito","Sentidos","Sobrevivência"];

function Meter({ value, max=5, onChange, diamond=false }: { value:number; max?:number; onChange:(n:number)=>void; diamond?:boolean }) {
  return <div className={`meter ${diamond ? "diamond-meter" : ""}`}>
    {Array.from({length:max}).map((_,i)=><button type="button" key={i} className={i < value ? "active" : ""} onClick={()=>onChange(i+1)} aria-label={`${i+1}`}>{diamond ? "◇" : "○"}</button>)}
  </div>
}

function TextField({label,value,onChange, className=""}:{label:string;value:string;onChange:(v:string)=>void;className?:string}) {
  return <label className={`field ${className}`}><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} /></label>
}

export default function PlayerSheet({ sheet: initial }: { sheet: Sheet }) {
  const [sheet, setSheet] = useState(initial);
  const [status, setStatus] = useState("SALVO");
  const [uploading, setUploading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("SALVANDO...");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/sheet/${sheet.token}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({data:sheet.data, title:sheet.data.nome || sheet.title})
      });
      setStatus(r.ok ? "✓ SALVO" : "ERRO AO SALVAR");
    }, 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.data]);

  function patch(patch: Partial<SheetData>) {
    const next = {...sheet.data, ...patch};
    setSheet(s => ({...s, data: next}));
  }

  function setNested<K extends keyof SheetData>(key: K, value: SheetData[K]) {
    const next = {...sheet.data, [key]: value};
    setSheet(s => ({...s, data: next}));
  }

  async function uploadImage(file: File) {
    setUploading(true); setStatus("ENVIANDO IMAGEM...");
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`/api/sheet/${sheet.token}/image`, {method:"POST", body:fd});
    const x = await r.json();
    if (r.ok) {
      const next = {...sheet.data, personagemImagem:x.url};
      setSheet(s=>({...s,data:next}));
      setStatus("✓ SALVO");
    } else setStatus(x.error || "ERRO");
    setUploading(false);
  }

  const d = sheet.data;

  return (
    <main className="sheet-page">
      <div className="sheet-status">{status}</div>

      <section className="sheet-top">
        <div className="ornament corner-left">╲╱</div>
        <div className="identity">
          <TextField label="CODINOME:" value={d.codinome} onChange={v=>patch({codinome:v})}/>
          <TextField label="NOME:" value={d.nome} onChange={v=>patch({nome:v})} className="wide"/>
          <TextField label="IDADE:" value={d.idade} onChange={v=>patch({idade:v})}/>
          <TextField label="FILOSOFIA:" value={d.filosofia} onChange={v=>patch({filosofia:v})} className="wide"/>
          <TextField label="ÂNCORA:" value={d.ancora} onChange={v=>patch({ancora:v})} className="wide"/>
          <TextField label="I. DE CONEXÃO:" value={d.conexao} onChange={v=>patch({conexao:v})}/>
          <TextField label="N. DE EXPERIÊNCIA:" value={d.experiencia} onChange={v=>patch({experiencia:v})}/>
          <TextField label="PRIMEIRA MORTE:" value={d.primeiraMorte} onChange={v=>patch({primeiraMorte:v})} className="full"/>
        </div>
        <div className="change-panel">
          <div className="banner">EVENTOS DE MUDANÇA</div>
          <h4>PONTOS DE EXPERIÊNCIA</h4>
          <Meter value={d.eventosMudanca} max={10} onChange={n=>patch({eventosMudanca:n})}/>
        </div>
        <div className="hope-panel">
          <div className="banner">ESPERANÇA</div>
          <h4>ATIVE HABILIDADES OU GASTE 2PE = +2D</h4>
          <input className="number-box hope" type="number" value={d.esperanca} onChange={e=>patch({esperanca:Number(e.target.value)})}/>
        </div>
      </section>

      <section className="sheet-grid">
        <div className="card pillar-card">
          <div className="ribbon">PILAR</div>
          <div className="pillar-grid">
            {([["ímpeto","impeto"],["resolução","resolucao"],["instinto","instinto"],["cognição","cognicao"]] as const).map(([label,key])=>(
              <div className="pillar-stat" key={key}><h3>{label}</h3><Meter value={d.pilar[key]} onChange={n=>setNested("pilar",{...d.pilar,[key]:n})}/></div>
            ))}
          </div>
          <div className="ribbon">COMPETÊNCIA</div>
          <div className="competency-grid">
            <div>{compLeft.map(k=><div className="comp" key={k}><span>{k}</span><Meter value={d.competencias[k]||0} onChange={n=>setNested("competencias",{...d.competencias,[k]:n})} diamond/></div>)}</div>
            <div>{compRight.map(k=><div className="comp" key={k}><span>{k}</span><Meter value={d.competencias[k]||0} onChange={n=>setNested("competencias",{...d.competencias,[k]:n})} diamond/></div>)}</div>
          </div>
        </div>

        <div className="card equipment-card">
          <div className="stat-row">
            <TextField label="MODELO:" value={d.modelo} onChange={v=>patch({modelo:v})}/>
            <TextField label="DANO:" value={d.dano} onChange={v=>patch({dano:v})}/>
            <TextField label="ALCANCE:" value={d.alcance} onChange={v=>patch({alcance:v})}/>
            <TextField label="HABILIDADE:" value={d.habilidade} onChange={v=>patch({habilidade:v})} className="full"/>
          </div>
          <TextField label="ACESSÓRIO:" value={d.acessorio} onChange={v=>patch({acessorio:v})} className="box-textarea"/>
          <TextField label="FERRAMENTAS" value={d.ferramentas} onChange={v=>patch({ferramentas:v})} className="box-textarea"/>
        </div>

        <div className="card portrait-card">
          <div className="portrait-frame">
            {d.personagemImagem ? <img src={d.personagemImagem} alt="Personagem" /> : <span>IMAGEM DO PERSONAGEM</span>}
            <label className="upload-button">{uploading ? "ENVIANDO..." : "ADICIONAR IMAGEM"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>e.target.files?.[0] && uploadImage(e.target.files[0])}/></label>
          </div>
          <div className="condition-area">
            <div className="condition-list">
              <label><input type="checkbox" checked={d.condicoes.aflito} onChange={e=>setNested("condicoes",{...d.condicoes,aflito:e.target.checked})}/> AFLITO</label>
              <label><input type="checkbox" checked={d.condicoes.debilitado} onChange={e=>setNested("condicoes",{...d.condicoes,debilitado:e.target.checked})}/> DEBILITADO</label>
              <label><input type="checkbox" checked={d.condicoes.imobilizado} onChange={e=>setNested("condicoes",{...d.condicoes,imobilizado:e.target.checked})}/> IMOBILIZADO</label>
            </div>
            <label className="numeric-card"><span>REDUÇÃO</span><input type="number" value={d.reducao} onChange={e=>patch({reducao:Number(e.target.value)})}/></label>
            <label className="numeric-card"><span>EVASÃO</span><input type="number" value={d.evasao} onChange={e=>patch({evasao:Number(e.target.value)})}/></label>
          </div>
        </div>
      </section>

      <section className="second-page">
        <div className="card language-card">
          <div className="ribbon">IDIOMA SINGULAR</div>
          <div className="language-grid">
            <div><h2>Alvos</h2><p>LU — HUMANO</p><p>KIB — OBJETO</p><p>UDUG — CORROMPIDO</p><p>NAGU — ZONA</p></div>
            <div><h2>Duração</h2><p>HAMTA — INSTANTÂNEO</p><p>TAHAZU — CENA</p><p>UDA — MOMENTOS</p></div>
          </div>
          <label className="big-text"><span>AÇÕES</span><textarea value={d.idioma.acoes} onChange={e=>setNested("idioma",{...d.idioma,acoes:e.target.value})} placeholder="Descreva as ações e combinações do seu Idioma Singular..." /></label>
          <label className="big-text"><span>MARCAS</span><textarea value={d.marcas} onChange={e=>patch({marcas:e.target.value})}/></label>
        </div>
        <div className="card techniques-card">
          <div className="ribbon">TÉCNICAS</div>
          <TextField label="ARQUÉTIPO:" value={d.arquetipo} onChange={v=>patch({arquetipo:v})}/>
          <label className="big-text technique-input"><span>TÉCNICAS</span><textarea value={d.tecnicas} onChange={e=>patch({tecnicas:e.target.value})} placeholder="Escreva aqui suas técnicas..." /></label>
        </div>
      </section>
    </main>
  );
}
