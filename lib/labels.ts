// Nomenclatura da ficha. As CHAVES são estáveis (nunca mudam); o Mestre só altera o TEXTO exibido.
// Os dados dos personagens (ex.: data.competencias["Atletismo"]) continuam guardados sob a chave original.

export type Labels = Record<string, string>;
export type LabelGroup = { title: string; items: { key: string; label: string }[] };

export const COMP_LEFT = ["Atletismo", "Eletromecânica", "Exociência", "Furtivo", "História", "Imanência", "Influência"];
export const COMP_RIGHT = ["Investigação", "Medicina", "Ofício", "Primor", "Propósito", "Sentidos", "Sobrevivência"];

const comp = (names: string[]) => names.map(n => ({ key: `comp.${n}`, label: n }));

export const LABEL_GROUPS: LabelGroup[] = [
  { title: "Perícias (competências)", items: [...comp(COMP_LEFT), ...comp(COMP_RIGHT)] },
  {
    title: "Pilares",
    items: [
      { key: "pilar.impeto", label: "ímpeto" },
      { key: "pilar.resolucao", label: "resolução" },
      { key: "pilar.instinto", label: "instinto" },
      { key: "pilar.cognicao", label: "cognição" }
    ]
  },
  {
    title: "Identificação",
    items: [
      { key: "id.codinome", label: "CODINOME:" },
      { key: "id.nome", label: "NOME:" },
      { key: "id.idade", label: "IDADE:" },
      { key: "id.filosofia", label: "FILOSOFIA:" },
      { key: "id.ancora", label: "ÂNCORA:" },
      { key: "id.conexao", label: "I. DE CONEXÃO:" },
      { key: "id.experiencia", label: "N. DE EXPERIÊNCIA:" },
      { key: "id.primeiraMorte", label: "PRIMEIRA MORTE:" }
    ]
  },
  {
    title: "Seções e títulos",
    items: [
      { key: "sec.eventosMudanca", label: "EVENTOS DE MUDANÇA" },
      { key: "sec.pontosExperiencia", label: "PONTOS DE EXPERIÊNCIA" },
      { key: "sec.esperanca", label: "ESPERANÇA" },
      { key: "sec.esperancaDica", label: "ATIVE HABILIDADES OU GASTE 2PE = +2D" },
      { key: "sec.anotacoes", label: "ANOTAÇÕES" },
      { key: "sec.pilar", label: "PILAR" },
      { key: "sec.competencia", label: "COMPETÊNCIA" },
      { key: "sec.idioma", label: "IDIOMA SINGULAR" },
      { key: "sec.tecnicas", label: "TÉCNICAS" },
      { key: "lang.alvos", label: "Alvos" },
      { key: "lang.duracao", label: "Duração" },
      { key: "lang.acoes", label: "Ações" },
      { key: "lang.acoesPersonalizadas", label: "AÇÕES PERSONALIZADAS" },
      { key: "lang.marcas", label: "MARCAS:" }
    ]
  },
  {
    title: "Equipamento, condições e técnicas",
    items: [
      { key: "eq.modelo", label: "MODELO:" },
      { key: "eq.dano", label: "DANO:" },
      { key: "eq.alcance", label: "ALCANCE:" },
      { key: "eq.habilidade", label: "HABILIDADE:" },
      { key: "eq.acessorio", label: "ACESSÓRIO:" },
      { key: "eq.ferramentas", label: "FERRAMENTAS" },
      { key: "eq.imagem", label: "IMAGEM DO PERSONAGEM" },
      { key: "eq.addImagem", label: "ADICIONAR IMAGEM" },
      { key: "cond.aflito", label: "AFLITO" },
      { key: "cond.debilitado", label: "DEBILITADO" },
      { key: "cond.imobilizado", label: "IMOBILIZADO" },
      { key: "eq.reducao", label: "REDUÇÃO" },
      { key: "eq.evasao", label: "EVASÃO" },
      { key: "tech.arquetipo", label: "ARQUÉTIPO:" },
      { key: "tech.tecnicas", label: "TÉCNICAS" }
    ]
  },
  {
    title: "Rolagem e integridade",
    items: [
      { key: "live.titulo", label: "ROLAGEM DE DADOS" },
      { key: "live.qtd", label: "QUANTIDADE DE DADOS" },
      { key: "live.ordem3", label: "Ordem 3" },
      { key: "live.vantagem", label: "Vantagem" },
      { key: "live.desvantagem", label: "Desvantagem" },
      { key: "live.rolar", label: "ROLAR DADOS" },
      { key: "live.sucessos", label: "Sucessos" },
      { key: "live.integridade", label: "INTEGRIDADE" },
      { key: "live.dano", label: "Índice de Dano" },
      { key: "live.pressao", label: "Pressão" }
    ]
  }
];

export const DEFAULT_LABELS: Labels = Object.fromEntries(
  LABEL_GROUPS.flatMap(g => g.items.map(i => [i.key, i.label]))
);

/** Mescla os textos personalizados sobre os padrões. Vazio ou inválido = padrão. */
export function resolveLabels(overrides?: unknown): Labels {
  const out: Labels = { ...DEFAULT_LABELS };
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
      if (k in DEFAULT_LABELS && typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 120);
    }
  }
  return out;
}

/** Mantém só chaves conhecidas, com texto aparado e diferente do padrão. */
export function sanitizeOverrides(input: unknown): Labels {
  const out: Labels = {};
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (!(k in DEFAULT_LABELS) || typeof v !== "string") continue;
      const t = v.trim().slice(0, 120);
      if (t && t !== DEFAULT_LABELS[k]) out[k] = t;
    }
  }
  return out;
}
