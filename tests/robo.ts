// robo que joga o Ato 1 inteiro sem navegador
import { atacar, comprar, criarJogo, CUSTO_ATAQUE, infectadosNaCasa, passarHora, podeSequestrar, sequestrar, valorResgate } from '../src/sim/motor';
import type { Estado, TipoVirus } from '../src/sim/tipos';

export type Estrategia = 'esperta' | 'parada' | 'afobada';

const ORDEM: Record<TipoVirus, string[]> = {
  sequestro: ['corrente', 'wifi', 'cripto', 'senha', 'disfarce', 'persistencia', 'movimento', 'dupla'],
  enxame: ['corrente', 'wifi', 'iot', 'dormente', 'zapgold', 'disfarce', 'persistencia', 'senha'],
  fofoca: ['corrente', 'escuta', 'disfarce', 'wifi', 'rastros', 'zapgold', 'persistencia'],
};

function melhorAlvo(e: Estado): string | undefined {
  let melhor: string | undefined, nota = 0;
  for (const c of Object.values(e.casas)) {
    if (c.especial === 'dandara') continue;
    let n = c.aparelhos.filter(id => !e.aparelhos[id].infectado).length;
    if (e.tipo === 'fofoca') n = c.pessoas.some(p => e.pessoas[p].segredo && !e.segredos.includes(e.pessoas[p].segredo!)) ? n + 10 : 0;
    if (n > nota) { nota = n; melhor = c.id; }
  }
  return melhor;
}

export function jogar(semente: number, tipo: TipoVirus, estrategia: Estrategia = 'esperta', aoDia?: (e: Estado) => void): Estado {
  const e = criarJogo(semente, tipo);
  while (!e.fim) {
    if (estrategia !== 'parada') {
      const prox = ORDEM[tipo].find(h => !e.habilidades.includes(h));
      if (prox) comprar(e, prox);
      const guardar = 0;
      if (e.hora % (estrategia === 'afobada' ? 1 : 4) === 0 && e.acessos >= CUSTO_ATAQUE + guardar && (!prox || e.acessos > 30)) {
        const alvo = melhorAlvo(e);
        if (alvo) atacar(e, alvo);
      }
      if (tipo === 'sequestro') {
        for (const c of Object.values(e.casas)) {
          if (!podeSequestrar(e, c.id)) continue;
          const pronto = estrategia === 'afobada' || valorResgate(e, c.id) >= 2500 || (infectadosNaCasa(e, c.id) >= 2 && e.hora > 300);
          if (pronto) sequestrar(e, c.id);
        }
      }
    }
    passarHora(e);
    if (aoDia && e.hora % 24 === 0) aoDia(e);
  }
  return e;
}
