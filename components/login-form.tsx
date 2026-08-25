 "use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("E-mail ou senha inválidos.");
    else router.push("/mestre");
    setBusy(false);
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">◆</div>
        <p className="eyebrow">PAINEL DO MESTRE</p>
        <h1>FICHAS</h1>
        <p className="muted">Entre para administrar os personagens da campanha.</p>
        <label>E-MAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>SENHA<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="gold-button" disabled={busy}>{busy ? "ENTRANDO..." : "ENTRAR"}</button>
      </form>
    </main>
  );
}
