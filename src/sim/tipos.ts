import type { Especial } from './layout';
import type { Rng } from './rng';

export type TipoVirus = 'sequestro' | 'enxame' | 'fofoca';
export type TipoAparelho = 'pc' | 'celular' | 'roteador' | 'tv' | 'camera' | 'geladeira';
export type Vetor = 'pendrive' | 'corrente' | 'zapgold' | 'wifi' | 'senha' | 'movimento' | 'iot';
export type HumorDandara = 'distraida' | 'desconfiada' | 'cacando' | 'furiosa';

export interface Pessoa {
  id: string;
  nome: string;
  casa: string;
  idade: number;
  clica: number;        // chance de clicar no que chega
  senhaFraca: boolean;
  grupos: string[];
  desconfianca: number; // cresce com as palestras da Dandara
  segredo?: string;
  apelido?: string;     // personagens com nome no roteiro
}

export interface Aparelho {
  id: string;
  tipo: TipoAparelho;
  casa: string;
  dono?: string;
  infectado: boolean;
  desde: number;
  protegido: Vetor[];
}

export interface Casa {
  id: string;
  nome: string;
  especial?: Especial;
  pessoas: string[];
  aparelhos: string[];
  wifiFraco: boolean;
  comercio: boolean;
  sequestrada: boolean;
  x: number; z: number;
}

export interface Habilidade {
  id: string;
  nome: string;
  custo: number;
  tipo?: TipoVirus;
  requer?: string[];
  vetor?: Vetor;
  desc: string;
  como: string;
  defesa: string;
}

export type Canal = 'radio' | 'zap' | 'sistema' | 'dandara' | 'voce';

export interface Evento {
  hora: number;
  canal: Canal;
  texto: string;
  fala?: { quem: string; texto: string };
  casa?: string;
}

export interface Fim { vitoria: boolean; titulo: string; texto: string }

export interface Estado {
  rng: Rng;
  hora: number;
  tipo: TipoVirus;
  acessos: number;
  dinheiro: number;
  ruido: number;          // barulho acumulado da ultima hora
  alerta: number;         // 0 a 100: quanto a Dandara esta prestando atencao
  conhecimento: number;   // 0 a 100: quanto ela entende de voce
  vacina: number;         // 0 a 100: quando chega a 100, voce perde
  humor: HumorDandara;
  segredos: string[];
  habilidades: string[];
  pessoas: Record<string, Pessoa>;
  aparelhos: Record<string, Aparelho>;
  casas: Record<string, Casa>;
  grupos: Record<string, string[]>;
  vetoresUsados: Partial<Record<Vetor, number>>;
  vetoresVistos: Vetor[];
  dandara: { casa: string; proxima: number; palestras: number; ultimaAtualizacao: number };
  log: Evento[];
  marcos: string[];
  fim?: Fim;
}
