// a cidade em 3D: desenha o layout, mostra o contagio em rosa e deixa clicar nas casas
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { CasaLayout } from '../sim/layout';
import { Manga, tons } from './manga';

interface CasaMesh { g: THREE.Group; parede: THREE.Mesh; original: THREE.Material; cadeado: THREE.Group; layout: CasaLayout; pulso: number }

const estrada = (x: number) => Math.sin(x * 0.012) * 18 * THREE.MathUtils.smoothstep(x, 60, 160);
function altura(x: number, z: number) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  let f = THREE.MathUtils.smoothstep(d, 70, 210);
  if (x > 20) f *= THREE.MathUtils.smoothstep(Math.abs(z - estrada(x)), 7, 40);
  const n = Math.sin(x * 0.028) * Math.cos(z * 0.024) * 16 + Math.sin(x * 0.011 + z * 0.017) * 26
    + Math.sin(z * 0.06 + 1) * Math.cos(x * 0.05) * 5;
  return (n + 26) * f;
}

export class Mundo {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 4000);
  readonly controls: OrbitControls;
  private manga: Manga;
  private cache: Record<string, THREE.MeshToonMaterial> = {};
  private janela = new THREE.MeshToonMaterial({ color: 0x2b3b4d, gradientMap: tons });
  private rosa = new THREE.MeshToonMaterial({ color: 0xff4f9a, gradientMap: tons, emissive: 0xff2a80, emissiveIntensity: 0.7 });
  private casas = new Map<string, CasaMesh>();
  private gente: { g: THREE.Group; r: number; a: number; v: number; f: number }[] = [];
  private nuvens: THREE.Group[] = [];
  private aneis: { m: THREE.Mesh; t: number; vel: number }[] = [];
  private selecao: THREE.Mesh;
  private dandara: THREE.Group;
  private dandaraAlvo = new THREE.Vector3(25, 0, 3);
  private voo: { p0: THREE.Vector3; a0: THREE.Vector3; p1: THREE.Vector3; a1: THREE.Vector3; t: number; dur: number } | null = null;
  private ray = new THREE.Raycaster();
  private tempo = 0;

  constructor(layout: CasaLayout[]) {
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.7;
    r.outputColorSpace = THREE.SRGBColorSpace;
    document.body.prepend(r.domElement);
    this.camera.position.set(70, 46, 74);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.target.set(0, 3, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 10; this.controls.maxDistance = 200;
    this.controls.autoRotateSpeed = 0.35;
    this.manga = new Manga(r, this.camera);
    this.montarCeu();
    this.montarTerreno();
    this.montarPraca();
    for (const c of layout) this.montarCasa(c);
    this.montarIgreja();
    this.montarRodoviaria();
    this.montarLonge();
    this.montarGente();
    this.selecao = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this.selecao.position.y = 0.15; this.selecao.visible = false; this.scene.add(this.selecao);
    this.dandara = this.montarDandara();
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      r.setSize(innerWidth, innerHeight); this.manga.redimensionar();
    });
  }

  // ---------- construcao ----------
  private mat(c: number, o: THREE.MeshToonMaterialParameters = {}) {
    const k = c + JSON.stringify(o);
    return (this.cache[k] ??= new THREE.MeshToonMaterial({ color: c, gradientMap: tons, ...o }));
  }
  private malha(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, pai: THREE.Object3D = this.scene) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; pai.add(o); return o;
  }
  private box(w: number, h: number, d: number, c: number | THREE.Material, x: number, y: number, z: number, pai?: THREE.Object3D) {
    return this.malha(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? this.mat(c) : c, x, y, z, pai);
  }
  private static telhadoGeo = new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4);
  private telhado(w: number, d: number, alt: number, y: number, cor: number, pai: THREE.Object3D) {
    const t = this.malha(Mundo.telhadoGeo, this.mat(cor), 0, y + alt / 2, 0, pai); t.scale.set(w * 0.8, alt, d * 0.8); return t;
  }
  private placa(txt: string, bg: string, fg: string, w: number, h: number) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
    g.fillStyle = fg; g.font = 'bold 58px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 68, 470);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }

  private montarCeu() {
    const sky = new Sky(); sky.scale.setScalar(3000); this.scene.add(sky);
    const u = sky.material.uniforms;
    u.turbidity.value = 5; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.82;
    const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(140));
    u.sunPosition.value.copy(sol);
    this.scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x6a5532, 1.2));
    const sun = new THREE.DirectionalLight(0xfff6ea, 3.4);
    sun.position.copy(sol).multiplyScalar(150); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 400 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.scene.fog = new THREE.Fog(0xcfe3f5, 140, 620);
  }

  private montarTerreno() {
    const gg = new THREE.PlaneGeometry(1400, 1400, 200, 200); gg.rotateX(-Math.PI / 2);
    const p = gg.attributes.position, cols: number[] = [];
    const c1 = new THREE.Color(0x7aa647), c2 = new THREE.Color(0x4c7a30), c3 = new THREE.Color(0x9a8a4a), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = altura(x, z);
      p.setY(i, h);
      c.copy(c1).lerp(c2, Math.min(h / 40, 1)).lerp(c3, Math.random() * 0.12 + (h > 45 ? 0.2 : 0));
      cols.push(c.r, c.g, c.b);
    }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    gg.computeVertexNormals();
    const chao = new THREE.Mesh(gg, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: tons }));
    chao.receiveShadow = true; this.scene.add(chao);
    // estrada de terra para o leste
    const pts: THREE.Vector3[] = [];
    for (let x = 21; x <= 700; x += 4) pts.push(new THREE.Vector3(x, 0, estrada(x)));
    const pos: number[] = [], idx: number[] = [];
    pts.forEach((pt, i) => {
      const nx = pts[Math.min(i + 1, pts.length - 1)], pv = pts[Math.max(i - 1, 0)];
      const dir = nx.clone().sub(pv).normalize(), lat = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(3.2);
      const a = pt.clone().add(lat), b = pt.clone().sub(lat);
      a.y = altura(a.x, a.z) + 0.08; b.y = altura(b.x, b.z) + 0.08;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, this.mat(0xa4532e, { side: THREE.DoubleSide })); m.receiveShadow = true; this.scene.add(m);
  }

  private montarPraca() {
    this.box(44, 0.1, 44, 0x8d867c, 0, 0.05, 0);
    for (const [w, d, x, z] of [[72, 5, 0, 33], [72, 5, 0, -33], [5, 72, 33, 0], [5, 72, -33, 0], [5, 40, 0, 52], [40, 5, -52, 0]])
      this.box(w, 0.08, d, 0xb0643b, x, 0.04, z);
    this.box(30, 0.35, 30, 0xdcd2c0, 0, 0.17, 0);
    this.box(30, 0.37, 3, 0xc9b9a0, 0, 0.18, 0); this.box(3, 0.37, 30, 0xc9b9a0, 0, 0.18, 0);
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) this.box(10, 0.4, 10, 0x6f9e3d, x, 0.2, z);
    const g = new THREE.Group(); this.scene.add(g);
    this.malha(new THREE.CylinderGeometry(4.2, 4.4, 0.9, 8), this.mat(0xf5f0e6), 0, 0.8, 0, g);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      this.malha(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 8), this.mat(0xffffff), Math.cos(a) * 3.8, 2.9, Math.sin(a) * 3.8, g);
    }
    this.malha(new THREE.ConeGeometry(5, 2.4, 8), this.mat(0x2f7d5b), 0, 5.8, 0, g);
    for (const [x, z, r] of [[-5, -2.5, 0], [5, -2.5, 0], [-5, 2.5, Math.PI], [5, 2.5, Math.PI], [-2.5, 5, Math.PI / 2], [2.5, -5, -Math.PI / 2]]) {
      const b = new THREE.Group(); b.position.set(x, 0.35, z); b.rotation.y = r; this.scene.add(b);
      this.box(2.2, 0.12, 0.6, 0x7a4a2a, 0, 0.5, 0, b); this.box(2.2, 0.5, 0.1, 0x7a4a2a, 0, 0.85, -0.28, b);
    }
    for (const [x, z] of [[15, 15], [15, -15], [-15, 15], [-15, -15], [15, 0], [-15, 0], [0, 15], [0, -15]]) {
      this.malha(new THREE.CylinderGeometry(0.1, 0.14, 4.5, 8), this.mat(0x2d2d33), x, 2.4, z);
      this.malha(new THREE.SphereGeometry(0.35, 12, 10), this.mat(0xfff1cc), x, 4.8, z);
    }
    for (const [x, z] of [[-12.5, -12.5], [12.5, 12.5]]) this.arvore(x, z, 0xf4c21f, 1.25, 0.35);
    for (const [x, z] of [[12.5, -12.5], [-12.5, 12.5]]) this.arvore(x, z, 0xf4f1ea, 1.25, 0.35);
    for (const [x, z] of [[-8, -8], [8, 8], [-8, 8], [8, -8]]) this.arvore(x, z, 0x4f8a37, 0.8, 0.4);
  }

  private static copaGeo = new THREE.IcosahedronGeometry(1, 0);
  private arvore(x: number, z: number, cor: number, s = 1, y = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.random() * 6; this.scene.add(g);
    this.malha(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 2.6 * s, 6), this.mat(0x5b3a24), 0, 1.3 * s, 0, g);
    for (let i = 0; i < 4; i++) {
      const c = this.malha(Mundo.copaGeo, this.mat(cor), (Math.random() - 0.5) * 1.6 * s, (2.9 + Math.random() * 1.1) * s, (Math.random() - 0.5) * 1.6 * s, g);
      c.scale.setScalar((1.1 + Math.random() * 0.6) * s);
    }
    return g;
  }

  private montarCasa(l: CasaLayout) {
    const g = new THREE.Group(); g.position.set(l.x, 0, l.z); g.rotation.y = l.rot; this.scene.add(g);
    g.userData.casa = l.id;
    const parede = this.box(l.w, l.h, l.d, l.cor, 0, l.h / 2, 0, g);
    this.box(l.w + 0.04, 0.7, l.d + 0.04, l.barrado, 0, 0.35, 0, g);
    this.telhado(l.w + 0.8, l.d + 0.8, 1.8, l.h, l.telhado, g);
    this.box(1.1, 2.1, 0.12, 0x6b3e22, 0, 1.05, l.d / 2 + 0.03, g);
    for (const s of [-1, 1]) {
      this.box(1.1, 1.1, 0.1, this.janela, s * l.w * 0.3, 1.85, l.d / 2 + 0.04, g);
      this.box(1.3, 0.12, 0.2, 0xffffff, s * l.w * 0.3, 1.25, l.d / 2 + 0.08, g);
    }
    if (l.placa) {
      const p = this.placa(l.placa.txt, l.placa.bg, l.placa.fg, Math.min(l.w * 0.85, 4.6), 0.75);
      p.position.set(0, l.h - 0.35, l.d / 2 + 0.09); g.add(p);
    }
    // cadeado de sequestro
    const cadeado = new THREE.Group(); cadeado.position.y = l.h + 3.6; cadeado.visible = false; g.add(cadeado);
    this.malha(new THREE.BoxGeometry(1.4, 1.1, 0.5), this.mat(0x111111), 0, 0, 0, cadeado);
    this.malha(new THREE.TorusGeometry(0.45, 0.14, 8, 16, Math.PI), this.mat(0x111111), 0, 0.55, 0, cadeado);
    if (l.anel === 2 && Math.random() < 0.5) this.arvore(l.x * 1.12 + (Math.random() - 0.5) * 3, l.z * 1.12 + (Math.random() - 0.5) * 3, [0x4f8a37, 0x3e7a3a, 0xf4c21f][Math.floor(Math.random() * 3)], 0.9 + Math.random() * 0.4);
    this.casas.set(l.id, { g, parede, original: parede.material as THREE.Material, cadeado, layout: l, pulso: 0 });
  }

  private montarIgreja() {
    const g = new THREE.Group(); g.position.set(0, 0, -32); this.scene.add(g);
    const BR = 0xfbf7ee, AZ = 0x2f5f9e;
    this.box(11, 9, 17, BR, 0, 4.5, 0, g); this.box(11.1, 0.8, 17.1, AZ, 0, 0.4, 0, g);
    this.telhado(12.5, 18.5, 3.2, 9, 0xa9482a, g);
    for (const s of [-1, 1]) {
      this.box(3.4, 15, 3.4, BR, s * 4, 7.5, 7.6, g);
      this.box(3.5, 0.5, 3.5, AZ, s * 4, 9.2, 7.6, g); this.box(3.5, 0.5, 3.5, AZ, s * 4, 15, 7.6, g);
      const t = this.malha(Mundo.telhadoGeo, this.mat(AZ), s * 4, 17, 7.6, g); t.scale.set(2.8, 3.6, 2.8);
      this.box(0.15, 1.4, 0.15, 0xd4a017, s * 4, 19.4, 7.6, g); this.box(0.8, 0.15, 0.15, 0xd4a017, s * 4, 19.6, 7.6, g);
    }
    this.box(4.6, 3.2, 0.5, BR, 0, 10.6, 8.3, g);
    this.box(2.6, 4.4, 0.15, 0x5a3420, 0, 2.2, 8.52, g);
    for (const s of [-1, 1]) this.box(1.1, 2.2, 0.12, this.janela, s * 2, 5.6, 8.52, g);
    this.box(12, 0.5, 4, 0xe5ddcc, 0, 0.25, 10.5, g);
    for (const x of [-9, 9]) {
      const p = new THREE.Group(); p.position.set(x, 0, -19); this.scene.add(p);
      this.malha(new THREE.CylinderGeometry(0.28, 0.38, 13, 8), this.mat(0xb8ad98), 0, 6.5, 0, p);
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Group(); f.position.y = 13; f.rotation.y = i / 7 * Math.PI * 2; p.add(f);
        const fo = this.box(0.5, 0.1, 4.2, this.mat(0x3f7f35), 0, 0, 2, f); f.rotation.x = 0.5; fo.rotation.x = 0.25;
      }
    }
  }

  private montarRodoviaria() {
    const g = new THREE.Group(); g.position.set(48, 0, 10); this.scene.add(g);
    this.box(10, 3.4, 5, 0xf2e6c8, 0, 1.7, 2, g);
    this.telhado(10.6, 5.6, 1.2, 3.4, 0xb4502c, g).position.z = 2;
    this.box(16, 0.3, 6, 0xeeeeee, 0, 4.3, -3.2, g);
    for (const x of [-7, -2.4, 2.4, 7]) this.malha(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8), this.mat(0x3b6fa8), x, 2.1, -5.6, g);
    const p = this.placa('RODOVIÁRIA', '#1d3b6e', '#ffffff', 6, 1); p.position.set(0, 5, -6.21); p.rotation.y = Math.PI; g.add(p);
    const o = new THREE.Group(); o.position.set(48, 0.08, 1.4); o.rotation.y = Math.PI; this.scene.add(o);
    this.box(10, 2.6, 2.6, 0xf7f7f2, 0, 1.75, 0, o); this.box(10.02, 0.5, 2.62, 0x1f8a4c, 0, 1.0, 0, o);
    this.box(8.6, 0.9, 2.64, this.janela, -0.4, 2.35, 0, o);
    for (const x of [-3.3, 3.2]) for (const z of [-1.3, 1.3]) {
      const w = this.malha(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), this.mat(0x1a1a1a), x, 0.55, z, o); w.rotation.x = Math.PI / 2;
    }
  }

  private montarLonge() {
    for (let i = 0; i < 220; i++) {
      const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 300;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (x > 20 && Math.abs(z - estrada(x)) < 9) continue;
      const t = this.arvore(x, z, [0x4f8a37, 0x3e7a3a, 0x5d8f2a, 0xf4c21f][i % 13 === 0 ? 3 : i % 3], 1 + Math.random() * 0.8, altura(x, z) - 0.2);
      if (r > 200) t.traverse(o => o.castShadow = false);
    }
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group(); g.position.set((Math.random() - 0.5) * 900, 90 + Math.random() * 60, (Math.random() - 0.5) * 900);
      for (let k = 0; k < 5; k++) {
        const c = new THREE.Mesh(Mundo.copaGeo, this.mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.2 }));
        c.position.set(k * 6 - 12, Math.random() * 3, (Math.random() - 0.5) * 6);
        c.scale.set(7 + Math.random() * 5, 4 + Math.random() * 2, 6 + Math.random() * 3); g.add(c);
      }
      this.scene.add(g); this.nuvens.push(g);
    }
  }

  private boneco(roupa: number, pele: number, cabelo: number, s = 1) {
    const g = new THREE.Group(); g.scale.setScalar(s);
    this.malha(new THREE.CapsuleGeometry(0.3, 0.75, 4, 10), this.mat(roupa), 0, 1.07, 0, g);
    this.malha(new THREE.SphereGeometry(0.3, 14, 10), this.mat(pele), 0, 1.9, 0, g);
    this.malha(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(cabelo), 0, 1.95, 0, g);
    this.scene.add(g);
    return g;
  }

  private montarGente() {
    const pele = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5c3a21, 0xa86b3c];
    const roupa = [0xf2cf63, 0x86bfe6, 0xa6d49e, 0xf6efe0, 0xe89a5d, 0xc6a2e2, 0x76c9c0, 0xffd7a8];
    for (let i = 0; i < 18; i++) {
      const g = this.boneco(roupa[(i * 5) % roupa.length], pele[i % pele.length], [0x1a120c, 0x3b2414, 0x6b4a2a][i % 3]);
      this.gente.push({ g, r: 10.5 + Math.random() * 3.5, a: Math.random() * 6.28, v: (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.06), f: Math.random() * 10 });
    }
  }

  private montarDandara() {
    const g = this.boneco(0x26222e, 0xf0c9a2, 0x17131c, 1.35);
    this.malha(new THREE.BoxGeometry(0.62, 0.08, 0.5), this.mat(0xffd23e), 0, 1.45, 0, g); // faixa amarela do moletom
    this.malha(new THREE.CapsuleGeometry(0.1, 0.9, 4, 8), this.mat(0x17131c), 0, 1.55, -0.32, g); // rabo de cavalo
    g.position.copy(this.dandaraAlvo);
    return g;
  }

  // ---------- API usada pelo jogo ----------
  frente(id: string, dist = 4): THREE.Vector3 {
    const c = this.casas.get(id)!.layout;
    const d = new THREE.Vector3(-c.x, 0, -c.z).normalize();
    return new THREE.Vector3(c.x, 0, c.z).addScaledVector(d, c.d / 2 + dist);
  }

  atualizarCasa(id: string, infectados: number, total: number, sequestrada: boolean) {
    const c = this.casas.get(id);
    if (!c) return;
    const antes = c.parede.material === this.rosa;
    const agora = infectados > 0;
    if (antes !== agora) { c.parede.material = agora ? this.rosa : c.original; c.pulso = 1; }
    c.cadeado.visible = sequestrada;
    c.g.userData.frac = total ? infectados / total : 0;
  }

  anel(id: string, cor = 0xff4f9a, vel = 22) {
    const c = this.casas.get(id)!.layout;
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(c.x, 0.6, c.z); this.scene.add(m); this.aneis.push({ m, t: 0, vel });
    this.manga.semContorno.push(m);
  }

  selecionar(id: string | null) {
    if (!id) { this.selecao.visible = false; return; }
    const c = this.casas.get(id)!.layout;
    this.selecao.position.set(c.x, 0.15, c.z); this.selecao.visible = true;
  }

  dandaraVai(id: string) { this.dandaraAlvo.copy(this.frente(id, 2.5)); }

  casaEm(x: number, y: number): string | null {
    const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const grupos = [...this.casas.values()].map(c => c.g);
    const hit = this.ray.intersectObjects(grupos, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.casa) o = o.parent;
    return o ? o.userData.casa : null;
  }

  visaoCasa(id: string, dist = 17, alt = 6): [THREE.Vector3, THREE.Vector3] {
    const c = this.casas.get(id)!.layout;
    const d = new THREE.Vector3(-c.x, 0, -c.z).normalize();
    return [new THREE.Vector3(c.x, alt, c.z).addScaledVector(d, dist), new THREE.Vector3(c.x, 2.4, c.z)];
  }

  voar(alvo: [THREE.Vector3, THREE.Vector3], dur = 2) {
    this.voo = { p0: this.camera.position.clone(), a0: this.controls.target.clone(), p1: alvo[0], a1: alvo[1], t: 0, dur };
  }
  get voando() { return !!this.voo; }

  set pretoEBranco(v: boolean) { this.manga.pretoEBranco = v; }

  tremer() {
    this.renderer.domElement.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(7px,-6px)' }, { transform: 'translate(0,0)' }], { duration: 380, iterations: 2 });
  }

  quadro(dt: number) {
    this.tempo += dt;
    const t = this.tempo;
    for (const p of this.gente) {
      p.a += p.v * dt;
      p.g.position.set(Math.cos(p.a) * p.r, 0.35 + Math.abs(Math.sin(t * 7 + p.f)) * 0.07, Math.sin(p.a) * p.r);
    }
    for (const n of this.nuvens) { n.position.x += dt * 2.5; if (n.position.x > 500) n.position.x = -500; }
    for (const c of this.casas.values()) if (c.pulso > 0) { c.pulso = Math.max(0, c.pulso - dt * 2.2); c.g.scale.setScalar(1 + Math.sin(c.pulso * Math.PI) * 0.12); }
    for (let i = this.aneis.length - 1; i >= 0; i--) {
      const a = this.aneis[i]; a.t += dt;
      a.m.scale.setScalar(1 + a.t * a.vel); (a.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - a.t * 0.55);
      if (a.t > 1.7) {
        this.scene.remove(a.m); (a.m.material as THREE.Material).dispose(); a.m.geometry.dispose();
        this.manga.semContorno.splice(this.manga.semContorno.indexOf(a.m), 1); this.aneis.splice(i, 1);
      }
    }
    // a Dandara anda ate a casa que vai limpar
    const d = this.dandara.position, falta = this.dandaraAlvo.clone().sub(d); falta.y = 0;
    const dist = falta.length();
    if (dist > 0.2) {
      d.addScaledVector(falta.normalize(), Math.min(dist, dt * 14));
      d.y = Math.abs(Math.sin(t * 12)) * 0.15;
      this.dandara.rotation.y = Math.atan2(falta.x, falta.z);
    } else d.y = 0;
    this.selecao.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
    this.rosa.emissiveIntensity = 0.75 + Math.sin(t * 4) * 0.2;
    if (this.voo) {
      const v = this.voo; v.t += dt;
      const k0 = Math.min(1, v.t / v.dur), k = k0 < 0.5 ? 4 * k0 ** 3 : 1 - Math.pow(-2 * k0 + 2, 3) / 2;
      this.camera.position.lerpVectors(v.p0, v.p1, k); this.controls.target.lerpVectors(v.a0, v.a1, k);
      if (k0 >= 1) this.voo = null;
    }
    this.controls.update();
    this.manga.render(this.scene, this.camera);
  }
}
