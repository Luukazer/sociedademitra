export type SheetData = {
  codinome: string;
  nome: string;
  idade: string;
  filosofia: string;
  ancora: string;
  conexao: string;
  experiencia: string;
  primeiraMorte: string;
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
