// gerador deterministico (mulberry32): mesma semente, mesma cidade e mesma partida
export interface Rng {
  (): number;
  estado: number;
}

export function criarRng(semente: number): Rng {
  const r = (() => {
    r.estado = (r.estado + 0x6d2b79f5) | 0;
    let t = r.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  r.estado = semente | 0;
  return r;
}

export const escolher = <T>(rng: Rng, lista: readonly T[]): T => lista[Math.floor(rng() * lista.length)];
export const entre = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
export function embaralhar<T>(rng: Rng, lista: T[]): T[] {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}
