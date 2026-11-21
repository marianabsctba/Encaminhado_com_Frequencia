// planta de Santa Rita do Oeste: onde fica cada casa. Usada pela simulacao e pelo desenho 3D.
import { criarRng, escolher } from './rng';

export type Especial =
  | 'lan' | 'bar' | 'dandara' | 'rosimeire' | 'prefeitura' | 'padaria' | 'farmacia' | 'mercadinho';

export interface Placa { txt: string; bg: string; fg: string }

export interface CasaLayout {
  id: string;
  x: number; z: number; rot: number;
  w: number; d: number; h: number;
  cor: number; barrado: number; telhado: number;
  anel: 1 | 2;
  especial?: Especial;
  placa?: Placa;
}

const CORES = [0xf2cf63, 0x86bfe6, 0xa6d49e, 0xf6efe0, 0xe89a5d, 0xc6a2e2, 0x76c9c0, 0xffd7a8];
const BARRADO = [0x3b6fa8, 0x2f7d5b, 0xb5452f, 0x7a4a2a];

const ESPECIAIS: Record<string, { especial: Especial; placa?: Placa }> = {
  'S-10.5': { especial: 'padaria', placa: { txt: 'PADARIA PÃO QUENTE', bg: '#ffe9b8', fg: '#8a3b12' } },
  'S3.5': { especial: 'farmacia', placa: { txt: 'FARMÁCIA', bg: '#e8fff0', fg: '#137a3a' } },
  'S10.5': { especial: 'rosimeire' },
  'W-10.5': { especial: 'bar', placa: { txt: 'BAR DO JURA', bg: '#ffe2c2', fg: '#a12b1f' } },
  'W10.5': { especial: 'mercadinho', placa: { txt: 'MERCADINHO', bg: '#ffffff', fg: '#1e4f9a' } },
  'E10.5': { especial: 'dandara', placa: { txt: 'DANDARA TEC', bg: '#151526', fg: '#ffd23e' } },
  'E-10.5': { especial: 'lan', placa: { txt: 'LAN HOUSE', bg: '#101820', fg: '#3ef0c0' } },
  'S-3.5': { especial: 'prefeitura', placa: { txt: 'PREFEITURA', bg: '#f4f4f4', fg: '#1d3b6e' } },
};

export function gerarLayout(semente = 7): CasaLayout[] {
  const rng = criarRng(semente);
  const casas: CasaLayout[] = [];
  const nova = (id: string, x: number, z: number, anel: 1 | 2) => {
    const esp = ESPECIAIS[id];
    casas.push({
      id, x, z, rot: Math.atan2(-x, -z), anel,
      w: 5 + rng() * 1.6, d: 5.5 + rng(), h: 3 + rng() * 0.6,
      cor: escolher(rng, CORES), barrado: escolher(rng, BARRADO),
      telhado: rng() < 0.8 ? 0xb4502c : 0x8e3f24,
      ...(esp ?? {}),
    });
  };
  for (const t of [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5]) {
    if (Math.abs(t) > 4) nova('N' + t, t, -25, 1);
    nova('S' + t, t, 25, 1);
    nova('W' + t, -25, t, 1);
    if (Math.abs(t) > 4) nova('E' + t, 25, t, 1);
  }
  let k = 0;
  for (let t = -40; t <= 40; t += 8.5) {
    for (const [x, z] of [[t, -40], [t, 40], [-40, t], [40, t]]) {
      const pula = rng() < 0.25;
      const dx = (rng() - 0.5) * 2, dz = (rng() - 0.5) * 2;
      if (pula) continue;
      if (x > 30 && Math.abs(z) < 9) continue;   // estrada
      if (Math.abs(x) < 5 && z > 30) continue;   // rua sul
      if (x < -30 && Math.abs(z) < 5) continue;  // rua oeste
      if (casas.some(c => Math.hypot(c.x - x - dx, c.z - z - dz) < 6.5)) continue; // esquinas repetidas
      nova('F' + k++, x + dx, z + dz, 2);
    }
  }
  return casas;
}
