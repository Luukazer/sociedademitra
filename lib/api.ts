/** Lê a resposta de uma rota da API sem estourar quando o servidor devolve HTML/erro em vez de JSON. */
export async function readApi<T = Record<string, unknown>>(r: Response): Promise<{ ok: boolean; status: number; data: T; error: string }> {
  const text = await r.text();
  let data = {} as T;
  try { data = JSON.parse(text) as T; } catch {}
  const apiError = (data as { error?: string })?.error;
  const error = r.ok ? "" : apiError || `O servidor respondeu ${r.status}${r.statusText ? " " + r.statusText : ""}.`;
  return { ok: r.ok, status: r.status, data, error };
}

export function networkError(e: unknown) {
  return e instanceof Error && e.message ? `Falha de rede: ${e.message}` : "Falha de rede.";
}
