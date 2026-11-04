export type SheetData = {
  codinome: string;
  nome: string;
  idade: string;
  filosofia: string;
  ancora: string;
  conexao: string;
  experiencia: string;
  primeiraMorte: string;
  anotacoes: string;
  eventosMudanca: number;
  esperanca: number;
  pilar: {
    impeto: number;
    resolucao: number;
    instinto: number;
    cognicao: number;
  };
  competencias: Record<string, number>;
  modelo: string;
  dano: string;
  alcance: string;
  habilidade: string;
  acessorio: string;
  ferramentas: string;
  arquetipo: string;
  tecnicas: string;
  marcas: string;
  idioma: {
    alvo: string;
    duracao: string;
    acoes: string;
  };
  reducao: number;
  evasao: number;
  condicoes: {
    aflito: boolean;
    debilitado: boolean;
    imobilizado: boolean;
  };
  personagemImagem: string;
};

export type Sheet = {
  id: string;
  token: string;
  title: string;
  image_url: string | null;
  data: SheetData;
  created_at: string;
  updated_at: string;
};

/** Última rolagem publicada para o OBS (guardada em sheet_live.last_roll). */
export type LastRoll = {
  id: string;
  results: number[];
  successes: number;
  alignment: "Ordem" | "Caos" | "Normal";
  ordem3: boolean;
  vantagem: boolean;
  desvantagem: boolean;
  timestamp: number;
};

/** Estado ao vivo de uma ficha: Índice de Dano, Pressão e última rolagem. Fonte única para ficha e OBS. */
export type LiveState = {
  dano_atual: number;
  dano_total: number;
  pressao_atual: number;
  pressao_total: number;
  last_roll: LastRoll | null;
};

export const emptyLive: LiveState = {
  dano_atual: 0,
  dano_total: 0,
  pressao_atual: 0,
  pressao_total: 0,
  last_roll: null
};

export type RollRecord = {
  id: number;
  results: number[];
  successes: number;
  alignment: string;
  ordem3: boolean;
  vantagem: boolean;
  desvantagem: boolean;
  created_at: string;
};
