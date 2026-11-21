// pos-processamento que transforma o 3D em pagina de manga: nanquim nas bordas, reticula nas sombras e P&B que poupa o rosa
import * as THREE from 'three';

export const tons = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
})();

const FRAG = `
uniform sampler2D tCor; uniform sampler2D tNor; uniform sampler2D tDep;
uniform vec2 res; uniform float near; uniform float far; uniform float bw; uniform float esp;
varying vec2 vUv;
float lz(vec2 uv){ float z = texture2D(tDep, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
void main(){
  vec2 px = esp / res;
  vec3 c = texture2D(tCor, vUv).rgb;
  float d0 = lz(vUv);
  vec3 n0 = texture2D(tNor, vUv).rgb;
  float e = 0.0;
  vec2 o[4]; o[0] = vec2(px.x, 0.0); o[1] = vec2(-px.x, 0.0); o[2] = vec2(0.0, px.y); o[3] = vec2(0.0, -px.y);
  for (int i = 0; i < 4; i++) {
    vec2 uv = vUv + o[i];
    float d = lz(uv);
    e = max(e, smoothstep(0.03, 0.07, abs(d - d0) / min(d, d0)));
    e = max(e, smoothstep(0.25, 0.45, distance(texture2D(tNor, uv).rgb, n0)));
  }
  e *= 1.0 - smoothstep(160.0, 520.0, d0);
  c = toneMapping(c);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float rosa = smoothstep(0.08, 0.2, c.r - c.g) * smoothstep(-0.02, 0.06, c.b - c.g);
  vec3 cinza = vec3(min(1.0, floor(pow(lum, 0.4) * 3.0 + 0.6) / 3.0 + 0.08));
  c = mix(c, mix(cinza, c, rosa), bw);
  float obj = 1.0 - step(far * 0.98, d0);
  vec2 g = mod(gl_FragCoord.xy, 5.0 * esp) - 2.5 * esp;
  float raio = (1.0 - smoothstep(0.04, 0.22, lum)) * 2.0 * esp;
  float ponto = (1.0 - step(raio, length(g))) * obj;
  c = mix(c, c * 0.3, ponto);
  c = mix(c, vec3(1.0, 0.975, 0.94), 0.05);
  c = mix(c, vec3(0.07, 0.05, 0.09), e);
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
}`;

export class Manga {
  private tam = new THREE.Vector2();
  private rtCor: THREE.WebGLRenderTarget;
  private rtNor: THREE.WebGLRenderTarget;
  private normMat = new THREE.MeshNormalMaterial();
  private post: THREE.ShaderMaterial;
  private cena = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** objetos que nao entram no passe de contorno (aneis transparentes) */
  semContorno: THREE.Object3D[] = [];

  constructor(private renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    renderer.getDrawingBufferSize(this.tam);
    this.rtCor = new THREE.WebGLRenderTarget(this.tam.x, this.tam.y, { type: THREE.HalfFloatType, samples: 4 });
    this.rtNor = new THREE.WebGLRenderTarget(this.tam.x, this.tam.y, { depthTexture: new THREE.DepthTexture(this.tam.x, this.tam.y) });
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tCor: { value: this.rtCor.texture }, tNor: { value: this.rtNor.texture }, tDep: { value: this.rtNor.depthTexture },
        res: { value: this.tam.clone() }, near: { value: camera.near }, far: { value: camera.far },
        bw: { value: 1 }, esp: { value: renderer.getPixelRatio() },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    quad.frustumCulled = false; this.cena.add(quad);
  }

  set pretoEBranco(v: boolean) { this.post.uniforms.bw.value = v ? 1 : 0; }

  redimensionar() {
    this.renderer.getDrawingBufferSize(this.tam);
    this.rtCor.setSize(this.tam.x, this.tam.y); this.rtNor.setSize(this.tam.x, this.tam.y);
    this.post.uniforms.res.value.copy(this.tam);
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer;
    scene.overrideMaterial = this.normMat;
    for (const o of this.semContorno) o.visible = false;
    r.setRenderTarget(this.rtNor); r.render(scene, camera);
    scene.overrideMaterial = null;
    for (const o of this.semContorno) o.visible = true;
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.rtCor); r.render(scene, camera);
    r.setRenderTarget(null); r.render(this.cena, this.cam);
  }
}
