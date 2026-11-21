import { describe, expect, it } from 'vitest';
import { criarJogo, infectados, totalAparelhos } from '../src/sim/motor';
import { gerarLayout } from '../src/sim/layout';
import type { TipoVirus } from '../src/sim/tipos';
import { jogar, type Estrategia } from './robo';

const SEMENTES = Array.from({ length: 16 }, (_, i) => i + 1);
const TIPOS: TipoVirus[] = ['sequestro', 'enxame', 'fofoca'];

function rodada(tipo: TipoVirus, est: Estrategia) {
  const jogos = SEMENTES.map(s => jogar(s, tipo, est));
  const vitorias = jogos.filter(j => j.fim!.vitoria).length;
  const fins: Record<string, number> = {};
  for (const j of jogos) fins[j.fim!.titulo] = (fins[j.fim!.titulo] ?? 0) + 1;
  const horas = jogos.map(j => j.hora);
  console.log(`${tipo}/${est}: ${vitorias}/${jogos.length} vitórias, dias médios ${(horas.reduce((a, b) => a + b, 0) / horas.length / 24).toFixed(1)}`, fins);
  return vitorias / jogos.length;
}

describe('cidade', () => {
  it('tem casas sem sobreposição e os lugares do roteiro', () => {
    const l = gerarLayout();
    for (const esp of ['lan', 'bar', 'dandara', 'rosimeire', 'prefeitura']) expect(l.some(c => c.especial === esp)).toBe(true);
    for (const a of l) for (const b of l) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(5);
  });
  it('começa com a LAN House e o celular do Thalisson', () => {
    const e = criarJogo(1, 'enxame');
    expect(infectados(e).length).toBe(2);
    expect(totalAparelhos(e)).toBeGreaterThan(150);
  });
  it('é determinística', () => {
    expect(jogar(3, 'enxame').hora).toBe(jogar(3, 'enxame').hora);
  });
});

describe('robô no Ato 1', () => {
  for (const t of TIPOS) {
    it(`${t}: quem joga bem vence às vezes`, () => { const v = rodada(t, 'esperta'); expect(v).toBeGreaterThanOrEqual(0.4); expect(v).toBeLessThanOrEqual(0.85); });
    it(`${t}: quem não faz nada perde`, () => { expect(rodada(t, 'parada')).toBe(0); });
  }
  it('sequestro afobado acorda a Dandara e perde mais', () => {
    expect(rodada('sequestro', 'afobada')).toBeLessThan(rodada('sequestro', 'esperta'));
  });
});
