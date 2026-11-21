// simulacao do contagio de Santa Rita do Oeste. Nao sabe nada de 3D: so regras, para o robo jogar sem navegador.
import { gerarLayout, type CasaLayout } from './layout';
import { criarRng, escolher, embaralhar } from './rng';
import {
  BOATOS_RADIO, BOATOS_ZAP, DEFESA_PENDRIVE, DIAS, ELENCO, HABILIDADES, META_DINHEIRO, META_ENXAME, META_SEGREDOS,
  NOME_VETOR, NOMES, SOBRENOMES,
} from './dados';
import type { Aparelho, Canal, Casa, Estado, Evento, HumorDandara, Pessoa, TipoAparelho, TipoVirus, Vetor } from './tipos';

export const CUSTO_ATAQUE = 5;
export const LIMITE_FOFOCA = 30; // a Fofoca perde se a Dandara entender metade do que ela e
const IOT: TipoAparelho[] = ['tv', 'camera', 'geladeira'];
const TODOS_VETORES: Vetor[] = ['pendrive', 'corrente', 'zapgold', 'wifi', 'senha', 'movimento', 'iot'];

const NOME_ESPECIAL: Record<string, string> = {
  lan: 'LAN House', bar: 'Bar do Jura', dandara: 'Dandara Tec', prefeitura: 'Prefeitura',
  padaria: 'Padaria Pão Quente', farmacia: 'Farmácia', mercadinho: 'Mercadinho', rosimeire: 'Casa da Dona Rosimeire',
};

// ---------- criacao ----------
export function criarJogo(semente: number, tipo: TipoVirus, layout: CasaLayout[] = gerarLayout()): Estado {
  const rng = criarRng(semente);
  const e: Estado = {
    rng, hora: 0, tipo, acessos: 10, dinheiro: 0, ruido: 0, alerta: 0, conhecimento: 0, vacina: 0,
    humor: 'distraida', segredos: [], habilidades: [], pessoas: {}, aparelhos: {}, casas: {}, grupos: {},
    vetoresUsados: {}, vetoresVistos: [], dandara: { casa: 'E10.5', proxima: 0, palestras: 0, ultimaAtualizacao: 0 },
    log: [], marcos: [],
  };
  let np = 0, na = 0;
  const aparelho = (casa: Casa, t: TipoAparelho, dono?: string) => {
    const a: Aparelho = { id: 'a' + na++, tipo: t, casa: casa.id, dono, infectado: false, desde: 0, protegido: [] };
    e.aparelhos[a.id] = a; casa.aparelhos.push(a.id); return a;
  };
  const pessoa = (casa: Casa, p: Omit<Pessoa, 'id' | 'casa' | 'grupos' | 'desconfianca'>) => {
    const x: Pessoa = { id: 'p' + np++, casa: casa.id, grupos: [], desconfianca: 0, ...p };
    e.pessoas[x.id] = x; casa.pessoas.push(x.id); return x;
  };

  // familias: casas residenciais em grupos de 3 ou 4 vizinhas
  const residenciais = layout.filter(c => !c.especial || c.especial === 'rosimeire')
    .sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  const familiaDe: Record<string, number> = {};
  const sobrenomes = embaralhar(rng, [...SOBRENOMES]);
  let fam = 0, cont = 0, tam = 3 + Math.floor(rng() * 2);
  for (const c of residenciais) {
    familiaDe[c.id] = fam;
    if (++cont >= tam) { fam++; cont = 0; tam = 3 + Math.floor(rng() * 2); }
  }
  const nomes = embaralhar(rng, [...NOMES]);
  let ni = 0;
  const proximoNome = () => nomes[ni++ % nomes.length];

  for (const l of layout) {
    const esp = l.especial;
    const f = familiaDe[l.id];
    const sobrenome = f !== undefined ? sobrenomes[f % sobrenomes.length] : '';
    const comercio = !!esp && esp !== 'rosimeire';
    const casa: Casa = {
      id: l.id, nome: esp ? NOME_ESPECIAL[esp] : `Casa dos ${sobrenome}`, especial: esp, pessoas: [], aparelhos: [],
      wifiFraco: esp === 'dandara' ? false : rng() < (comercio ? 0.55 : 0.7), comercio, sequestrada: false, x: l.x, z: l.z,
    };
    e.casas[casa.id] = casa;
    if (esp && ELENCO[esp]) for (const p of ELENCO[esp]) pessoa(casa, { ...p });
    if (!esp) {
      const n = 1 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const idade = i === 0 ? 25 + Math.floor(rng() * 55) : 6 + Math.floor(rng() * 70);
        const clica = idade < 20 ? 0.45 + rng() * 0.4 : idade > 60 ? 0.55 + rng() * 0.4 : 0.2 + rng() * 0.45;
        pessoa(casa, { nome: `${proximoNome()} ${sobrenome}`, idade, clica, senhaFraca: rng() < 0.6 });
      }
    }
    // aparelhos
    for (const pid of casa.pessoas) if (e.pessoas[pid].idade >= 9) aparelho(casa, 'celular', pid);
    aparelho(casa, 'roteador');
    const pcs = esp === 'lan' ? 8 : esp === 'prefeitura' ? 6 : esp === 'dandara' ? 3 : comercio ? 2 : rng() < 0.55 ? 1 : 0;
    for (let i = 0; i < pcs; i++) aparelho(casa, 'pc', casa.pessoas[i % Math.max(1, casa.pessoas.length)]);
    if (rng() < (esp === 'bar' ? 1 : comercio ? 0.3 : 0.5)) aparelho(casa, 'tv');
    if (rng() < (comercio ? 0.6 : 0.1)) aparelho(casa, 'camera');
    if (!comercio && rng() < 0.15) aparelho(casa, 'geladeira');
    if (esp === 'dandara') for (const aid of casa.aparelhos) e.aparelhos[aid].protegido = [...TODOS_VETORES];
  }

  // grupos do ZapZap
  const add = (g: string, p: Pessoa) => { (e.grupos[g] ??= []).push(p.id); p.grupos.push(g); };
  for (const p of Object.values(e.pessoas)) {
    if (p.apelido === 'dandara') continue;
    const f = familiaDe[p.casa];
    if (f !== undefined) add('Família ' + sobrenomes[f % sobrenomes.length], p);
    if (p.idade >= 18 && (rng() < 0.6 || e.casas[p.casa].comercio)) add('Santa Rita Notícias', p);
    if (p.idade >= 45 && rng() < 0.6) add('Oração das 6h', p);
    if (p.idade >= 10 && p.idade <= 19) add('3º Ano Bagunça', p);
    if (p.idade >= 15 && p.idade <= 50 && rng() < 0.35) add('Futebol de Quinta', p);
    if (p.grupos.length === 0) add('Santa Rita Notícias', p);
  }
  // os netos tambem estao no grupo da avo
  const rosi = Object.values(e.pessoas).find(p => p.apelido === 'rosimeire')!;
  const thal = Object.values(e.pessoas).find(p => p.apelido === 'thalisson')!;
  for (const g of rosi.grupos) if (!thal.grupos.includes(g)) add(g, thal);

  // o comeco: um PC da LAN House e o celular do Thalisson
  const lan = Object.values(e.casas).find(c => c.especial === 'lan')!;
  const pcLan = lan.aparelhos.map(id => e.aparelhos[id]).find(a => a.tipo === 'pc')!;
  pcLan.infectado = true;
  const celThal = Object.values(e.aparelhos).find(a => a.dono === thal.id && a.tipo === 'celular')!;
  celThal.infectado = true;
  e.dandara.casa = Object.values(e.casas).find(c => c.especial === 'dandara')!.id;
  evento(e, 'voce', 'Você existe. Um PC da LAN House e o celular do Thalisson.');
  return e;
}

// ---------- utilidades ----------
const tem = (e: Estado, h: string) => e.habilidades.includes(h);
export const infectados = (e: Estado) => Object.values(e.aparelhos).filter(a => a.infectado);
export const totalAparelhos = (e: Estado) => Object.keys(e.aparelhos).length;
export const infectadosNaCasa = (e: Estado, casa: string) => e.casas[casa].aparelhos.filter(id => e.aparelhos[id].infectado).length;
export const dia = (e: Estado) => Math.floor(e.hora / 24) + 1;
export const horaDoDia = (e: Estado) => (e.hora + 14) % 24; // comeca as 14h
export const pessoaPorApelido = (e: Estado, ap: string) => Object.values(e.pessoas).find(p => p.apelido === ap);

function evento(e: Estado, canal: Canal, texto: string, extra: Partial<Evento> = {}) {
  e.log.push({ hora: e.hora, canal, texto, ...extra });
}

function chanceClique(p: Pessoa | undefined) {
  if (!p || p.apelido === 'dandara') return 0;
  return p.clica * (1 - p.desconfianca);
}

function barulhoBase(e: Estado) {
  let b = e.tipo === 'sequestro' ? 0.9 : e.tipo === 'enxame' ? 0.55 : 0.38;
  if (tem(e, 'disfarce')) b *= 0.6;
  if (tem(e, 'dormente')) b *= 0.5;
  return b;
}

function infectar(e: Estado, a: Aparelho | undefined, v: Vetor, barulho = 1): boolean {
  if (!a || a.infectado || a.protegido.includes(v)) return false;
  if (IOT.includes(a.tipo) && v !== 'iot') return false;
  a.infectado = true; a.desde = e.hora;
  e.vetoresUsados[v] = (e.vetoresUsados[v] ?? 0) + 1;
  e.ruido += barulhoBase(e) * barulho;
  if (e.rng() < (e.alerta / 100) * 0.25 + 0.01) {
    e.conhecimento = Math.min(100, e.conhecimento + 0.5 * (tem(e, 'rastros') ? 0.4 : 1));
    if (!e.vetoresVistos.includes(v)) e.vetoresVistos.push(v);
  }
  return true;
}

const aparelhosDe = (e: Estado, casa: Casa) => casa.aparelhos.map(id => e.aparelhos[id]);
const celularDe = (e: Estado, pid: string) => Object.values(e.aparelhos).find(a => a.dono === pid && a.tipo === 'celular');
const temSenhaFraca = (e: Estado, casa: Casa) => casa.pessoas.some(p => e.pessoas[p].senhaFraca);
const distancia = (a: Casa, b: Casa) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------- espalhamento passivo ----------
function espalhar(e: Estado) {
  const r = e.rng;
  const casas = Object.values(e.casas);
  const comercio = casas.filter(c => c.comercio);
  for (const a of infectados(e)) {
    const casa = e.casas[a.casa];
    if (a.tipo === 'pc' && r() < 0.012) {
      const alvo = escolher(r, casas);
      const pc = aparelhosDe(e, alvo).find(x => x.tipo === 'pc' && !x.infectado);
      const quem = alvo.pessoas.length ? e.pessoas[escolher(r, alvo.pessoas)] : undefined;
      if (pc && r() < chanceClique(quem) * 0.6) infectar(e, pc, 'pendrive');
    }
    if (a.tipo === 'celular' && a.dono) {
      const dono = e.pessoas[a.dono];
      if (tem(e, 'corrente') && dono.grupos.length && r() < 0.03) {
        const g = escolher(r, dono.grupos);
        for (const m of e.grupos[g]) {
          if (m !== dono.id && r() < chanceClique(e.pessoas[m]) * 0.15) infectar(e, celularDe(e, m), 'corrente');
        }
      }
      if (tem(e, 'zapgold') && dono.grupos.length && r() < 0.025) {
        const m = escolher(r, e.grupos[escolher(r, dono.grupos)]);
        if (r() < chanceClique(e.pessoas[m]) * 0.65) infectar(e, celularDe(e, m), 'zapgold');
      }
    }
    if (tem(e, 'wifi') && casa.wifiFraco) {
      for (const b of aparelhosDe(e, casa)) {
        if (b.infectado) continue;
        if (IOT.includes(b.tipo)) { if (tem(e, 'iot') && r() < 0.03) infectar(e, b, 'iot', 0.6); }
        else if (r() < 0.03) infectar(e, b, 'wifi');
      }
      if (a.tipo === 'roteador' && r() < 0.025) {
        const viz = casas.filter(c => c !== casa && c.wifiFraco && distancia(c, casa) < 13);
        if (viz.length) infectar(e, aparelhosDe(e, escolher(r, viz)).find(x => x.tipo === 'roteador'), 'wifi');
      }
    }
    if (tem(e, 'senha') && (a.tipo === 'pc' || a.tipo === 'roteador') && r() < 0.02) {
      const perto = casas.filter(c => c !== casa && distancia(c, casa) < 22 && temSenhaFraca(e, c));
      if (perto.length) {
        const alvo = escolher(r, perto);
        infectar(e, aparelhosDe(e, alvo).find(x => (x.tipo === 'pc' || x.tipo === 'roteador') && !x.infectado), 'senha');
      }
    }
    if (tem(e, 'movimento') && casa.comercio && a.tipo === 'pc' && r() < 0.04) {
      const alvo = escolher(r, comercio);
      infectar(e, aparelhosDe(e, alvo).find(x => x.tipo === 'pc' && !x.infectado), 'movimento');
    }
  }
}

// ---------- acoes do jogador ----------
export function podeComprar(e: Estado, id: string): boolean {
  const h = HABILIDADES.find(x => x.id === id);
  if (!h || tem(e, id) || e.fim) return false;
  if (h.tipo && h.tipo !== e.tipo) return false;
  if (h.requer && !h.requer.every(r => tem(e, r))) return false;
  return e.acessos >= h.custo;
}

export function comprar(e: Estado, id: string): boolean {
  if (!podeComprar(e, id)) return false;
  const h = HABILIDADES.find(x => x.id === id)!;
  e.acessos -= h.custo; e.habilidades.push(id);
  if (id === 'rastros') e.conhecimento = Math.max(0, e.conhecimento - 20);
  evento(e, 'voce', `Você aprendeu: ${h.nome}.`);
  return true;
}

export function vetoresDoAtaque(e: Estado, casaId: string): Vetor[] {
  const casa = e.casas[casaId];
  const v: Vetor[] = [];
  if (aparelhosDe(e, casa).some(a => a.tipo === 'pc')) v.push('pendrive');
  if (tem(e, 'corrente')) v.push('corrente');
  if (tem(e, 'wifi') && casa.wifiFraco) v.push('wifi');
  if (tem(e, 'senha') && temSenhaFraca(e, casa)) v.push('senha');
  if (tem(e, 'iot') && casa.wifiFraco) v.push('iot');
  return v;
}

export function atacar(e: Estado, casaId: string): number {
  const casa = e.casas[casaId];
  if (!casa || e.fim || e.acessos < CUSTO_ATAQUE || casa.especial === 'dandara') return 0;
  e.acessos -= CUSTO_ATAQUE;
  const r = e.rng;
  let n = 0;
  const quem = () => casa.pessoas.length ? e.pessoas[escolher(r, casa.pessoas)] : undefined;
  for (const a of aparelhosDe(e, casa)) {
    if (a.infectado) continue;
    let ok = false;
    if (a.tipo === 'pc') ok = r() < chanceClique(quem()) * 0.6 && infectar(e, a, 'pendrive', 1.5);
    if (!ok && a.tipo === 'celular' && tem(e, 'corrente')) ok = r() < chanceClique(a.dono ? e.pessoas[a.dono] : undefined) * 0.7 && infectar(e, a, 'corrente', 1.5);
    if (!ok && !IOT.includes(a.tipo) && tem(e, 'wifi') && casa.wifiFraco) ok = r() < 0.45 && infectar(e, a, 'wifi', 1.5);
    if (!ok && (a.tipo === 'pc' || a.tipo === 'roteador') && tem(e, 'senha') && temSenhaFraca(e, casa)) ok = r() < 0.55 && infectar(e, a, 'senha', 1.5);
    if (!ok && IOT.includes(a.tipo) && tem(e, 'iot') && casa.wifiFraco) ok = r() < 0.6 && infectar(e, a, 'iot', 1.5);
    if (ok) n++;
  }
  e.ruido += 0.6;
  evento(e, 'voce', n ? `Ataque em ${casa.nome}: ${n} aparelho${n > 1 ? 's' : ''} novo${n > 1 ? 's' : ''}.` : `Ataque em ${casa.nome}: ninguém caiu.`, { casa: casaId });
  return n;
}

export function valorResgate(e: Estado, casaId: string): number {
  const casa = e.casas[casaId];
  let v = 0;
  for (const a of aparelhosDe(e, casa)) if (a.infectado) v += a.tipo === 'pc' ? 900 : a.tipo === 'celular' ? 220 : 120;
  if (casa.especial === 'prefeitura') v *= 4;
  else if (casa.comercio) v *= 2;
  if (tem(e, 'dupla')) v *= 1.6;
  return Math.round(v);
}

export function podeSequestrar(e: Estado, casaId: string) {
  const casa = e.casas[casaId];
  return !e.fim && tem(e, 'cripto') && !!casa && !casa.sequestrada && infectadosNaCasa(e, casaId) > 0;
}

export function sequestrar(e: Estado, casaId: string): number {
  if (!podeSequestrar(e, casaId)) return 0;
  const casa = e.casas[casaId];
  const v = valorResgate(e, casaId);
  e.dinheiro += v; casa.sequestrada = true;
  e.ruido += 10; e.alerta = Math.min(100, e.alerta + 7);
  e.conhecimento = Math.min(100, e.conhecimento + 4 * (tem(e, 'rastros') ? 0.4 : 1));
  e.dandara.proxima = Math.min(e.dandara.proxima, e.hora + 2);
  evento(e, 'radio', `Rádio Santa Rita: ${casa.nome} teve os arquivos trancados e pagou R$ ${v.toLocaleString('pt-BR')} de resgate.`, { casa: casaId });
  return v;
}

// ---------- a Dandara ----------
function humorPara(alerta: number): HumorDandara {
  return alerta < 10 ? 'distraida' : alerta < 35 ? 'desconfiada' : alerta < 70 ? 'cacando' : 'furiosa';
}

const FALAS_HUMOR: Record<HumorDandara, string> = {
  distraida: 'Deve ser só o Wi-Fi da cidade de novo.',
  desconfiada: 'Três celulares rosa na mesma rua? Isso não é o 5G.',
  cacando: 'Tem alguma coisa pulando de casa em casa. E eu vou achar.',
  furiosa: 'Chega. Vou montar uma vacina nem que eu durma aqui.',
};

export function limparCasa(e: Estado, casaId: string): number {
  const casa = e.casas[casaId];
  let n = 0;
  for (const a of aparelhosDe(e, casa)) {
    if (!a.infectado) continue;
    if (tem(e, 'persistencia') && e.rng() < 0.4) continue;
    a.infectado = false; n++;
    for (const v of e.vetoresVistos) if (!a.protegido.includes(v)) a.protegido.push(v);
  }
  e.conhecimento = Math.min(100, e.conhecimento + 2.5 * (tem(e, 'rastros') ? 0.4 : 1));
  return n;
}

function dandaraAge(e: Estado) {
  const novo = humorPara(e.alerta);
  if (novo !== e.humor) {
    const subiu = ['distraida', 'desconfiada', 'cacando', 'furiosa'].indexOf(novo) > ['distraida', 'desconfiada', 'cacando', 'furiosa'].indexOf(e.humor);
    e.humor = novo;
    if (subiu) evento(e, 'dandara', `A Dandara está ${novo === 'desconfiada' ? 'desconfiada' : novo === 'cacando' ? 'caçando você' : novo === 'furiosa' ? 'furiosa' : 'distraída'}.`, { fala: { quem: 'dandara', texto: FALAS_HUMOR[novo] } });
  }
  if (e.humor === 'distraida') return;
  const d = e.dandara;
  if (e.hora >= d.proxima) {
    const alvos = Object.values(e.casas)
      .map(c => ({ c, n: infectadosNaCasa(e, c.id) + (c.sequestrada ? 3 : 0) }))
      .filter(x => x.n > 0 && x.c.especial !== 'dandara')
      .sort((a, b) => b.n - a.n);
    if (alvos.length) {
      const alvo = alvos[Math.floor(e.rng() * Math.min(3, alvos.length))].c;
      const n = limparCasa(e, alvo.id);
      d.casa = alvo.id;
      evento(e, 'dandara', `A Dandara limpou ${alvo.nome}${n ? `: ${n} aparelho${n > 1 ? 's' : ''} perdido${n > 1 ? 's' : ''}` : ', mas você se escondeu'}.`, { casa: alvo.id });
    }
    d.proxima = e.hora + (e.humor === 'desconfiada' ? 8 : e.humor === 'cacando' ? 5 : 3);
  }
  if ((e.humor === 'cacando' || e.humor === 'furiosa') && d.palestras < 2 && e.hora - d.ultimaAtualizacao > 20 && e.rng() < 0.03) {
    d.palestras++;
    for (const p of Object.values(e.pessoas)) p.desconfianca = Math.min(0.85, p.desconfianca + 0.25);
    evento(e, 'dandara', 'A Dandara deu uma palestra na igreja. A cidade está mais desconfiada.', { fala: { quem: 'dandara', texto: 'Gente, pelo amor de Deus: NÃO CLICA EM LINK DE GRUPO.' } });
  }
  if ((e.humor === 'cacando' || e.humor === 'furiosa') && e.hora - d.ultimaAtualizacao >= 48) {
    const conhecido = e.vetoresVistos.filter(v => v !== 'pendrive').sort((a, b) => (e.vetoresUsados[b] ?? 0) - (e.vetoresUsados[a] ?? 0))[0];
    if (conhecido) {
      d.ultimaAtualizacao = e.hora;
      for (const a of Object.values(e.aparelhos)) if (e.rng() < 0.2 && !a.protegido.includes(conhecido)) a.protegido.push(conhecido);
      evento(e, 'dandara', `A Dandara espalhou uma atualização contra ${NOME_VETOR[conhecido]}. Parte da cidade ficou imune a esse caminho.`);
    }
  }
  if (e.humor === 'furiosa') e.vacina = Math.min(100, e.vacina + (e.conhecimento / 100) * 0.55);
}

// ---------- uma hora de jogo ----------
export function passarHora(e: Estado) {
  if (e.fim) return;
  e.hora++;
  e.ruido = 0;
  espalhar(e);
  const inf = infectados(e);
  e.acessos += inf.length * (e.tipo === 'enxame' ? 0.032 : 0.028) + (e.tipo === 'fofoca' ? 0.03 : 0);
  if (e.tipo === 'fofoca') coletarSegredos(e);
  e.alerta = Math.max(0, Math.min(100, e.alerta + e.ruido * 1.3 * (1 - e.alerta / 150) - 0.25));
  dandaraAge(e);
  noticias(e, inf.length);
  checarFim(e);
}

function coletarSegredos(e: Estado) {
  const prazo = tem(e, 'escuta') ? 40 : 72;
  for (const p of Object.values(e.pessoas)) {
    if (!p.segredo || e.segredos.includes(p.segredo)) continue;
    const meus = Object.values(e.aparelhos).filter(a => a.dono === p.id && a.tipo === 'celular' && a.infectado && e.hora - a.desde >= prazo);
    if (meus.length) {
      e.segredos.push(p.segredo);
      e.ruido += 4; e.conhecimento = Math.min(100, e.conhecimento + 5 * (tem(e, 'rastros') ? 0.5 : 1));
      evento(e, 'voce', `Segredo descoberto (${e.segredos.length}/${META_SEGREDOS}): ${p.segredo}`, { casa: p.casa });
    }
  }
}

function marco(e: Estado, id: string, f: () => void) {
  if (e.marcos.includes(id)) return;
  e.marcos.push(id); f();
}

function noticias(e: Estado, n: number) {
  if (n >= 10) marco(e, '10', () => evento(e, 'zap', 'Dona Rosimeire no grupo da família: "Que vídeo lindo, gente! Encaminhem!"', { fala: { quem: 'rosimeire', texto: 'Gente, que vídeo lindo! Encaminhem pra todo mundo!!!' } }));
  if (n >= 40) marco(e, '40', () => evento(e, 'radio', 'Rádio Santa Rita: moradores relatam celulares "cor-de-rosa". A prefeitura pede calma.'));
  if (n >= 80) marco(e, '80', () => evento(e, 'zap', 'Seu Jurandir: "Instalei uma coisa que a Rosi mandou e agora a TV do bar só passa cassino"', { fala: { quem: 'jurandir', texto: 'Agora a TV do bar só passa propaganda de cassino. Alguém me ajuda?' } }));
  if (n >= 140) marco(e, '140', () => evento(e, 'radio', 'Rádio Santa Rita: vereador pede CPI do celular rosa. A sessão foi adiada porque o computador da Câmara travou.'));
  if (n >= 5 && e.hora % 17 === 0) evento(e, 'zap', escolher(e.rng, BOATOS_ZAP));
  if (n >= 20 && e.hora % 41 === 0) evento(e, 'radio', escolher(e.rng, BOATOS_RADIO));
}

export function progresso(e: Estado): { atual: number; meta: number; texto: string } {
  if (e.tipo === 'sequestro') return { atual: e.dinheiro, meta: META_DINHEIRO, texto: `R$ ${e.dinheiro.toLocaleString('pt-BR')} de R$ ${META_DINHEIRO.toLocaleString('pt-BR')}` };
  if (e.tipo === 'fofoca') return { atual: e.segredos.length, meta: META_SEGREDOS, texto: `${e.segredos.length} de ${META_SEGREDOS} segredos` };
  const meta = Math.ceil(totalAparelhos(e) * META_ENXAME);
  const atual = infectados(e).length;
  return { atual, meta, texto: `${atual} de ${meta} aparelhos` };
}

function checarFim(e: Estado) {
  const p = progresso(e);
  if (p.atual >= p.meta) {
    const textos: Record<TipoVirus, [string, string]> = {
      sequestro: ['Santa Rita pagou', `Você juntou R$ ${e.dinheiro.toLocaleString('pt-BR')} em resgates. A prefeitura vai parcelar o IPTU do ano que vem para cobrir o rombo.`],
      enxame: ['O enxame está pronto', `${p.atual} aparelhos de Santa Rita obedecem você, incluindo ${Object.values(e.aparelhos).filter(a => a.infectado && a.tipo === 'geladeira').length} geladeiras. Ninguém sabe ainda o que você vai fazer com elas.`],
      fofoca: ['Você sabe de tudo', 'Você leu a cidade inteira e ninguém percebeu. Agora sabe do fiado, da balança, da reforma da praça e do perfil falso da Dona Rosimeire.'],
    };
    const [titulo, texto] = textos[e.tipo];
    e.fim = { vitoria: true, titulo, texto };
  } else if (e.tipo === 'fofoca' && e.conhecimento >= LIMITE_FOFOCA) {
    e.fim = { vitoria: false, titulo: 'Descoberto', texto: 'A Dandara juntou as peças: os acessos estranhos, os segredos vazando, o celular do Thalisson. Ela publicou tudo no grupo Santa Rita Notícias. Um espião que todo mundo conhece não é mais espião.' };
  } else if (infectados(e).length === 0) {
    e.fim = { vitoria: false, titulo: 'Formatado', texto: 'A Dandara apagou o último aparelho infectado. A Dona Rosimeire mandou no grupo: "Graças a Deus voltou ao normal". Você virou um boato.' };
  } else if (e.vacina >= 100) {
    e.fim = { vitoria: false, titulo: 'A vacina', texto: 'A Dandara montou uma vacina que entende cada passo seu e espalhou pela cidade inteira em uma noite. Ela não dormiu. Você também não vai mais acordar.' };
  } else if (e.hora >= DIAS * 24) {
    e.fim = { vitoria: false, titulo: 'Esquecido', texto: 'Três semanas depois, a cidade se acostumou com os celulares rosa. Ninguém tem medo de você. Pior: viraram figurinha.' };
  }
  if (e.fim) evento(e, 'sistema', e.fim.titulo);
}

export function relatorio(e: Estado): { nome: string; vezes: number; defesa: string }[] {
  const out: { nome: string; vezes: number; defesa: string }[] = [];
  for (const [v, n] of Object.entries(e.vetoresUsados) as [Vetor, number][]) {
    const h = HABILIDADES.find(x => x.vetor === v);
    out.push({ nome: NOME_VETOR[v], vezes: n, defesa: v === 'pendrive' ? DEFESA_PENDRIVE : h?.defesa ?? '' });
  }
  for (const id of e.habilidades) {
    const h = HABILIDADES.find(x => x.id === id)!;
    if (!h.vetor) out.push({ nome: h.nome, vezes: 0, defesa: h.defesa });
  }
  return out.sort((a, b) => b.vezes - a.vezes);
}
