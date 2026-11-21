import './estilo.css';
import { Mundo } from './mundo/mundo';
import { gerarLayout } from './sim/layout';
import {
  atacar, comprar, criarJogo, CUSTO_ATAQUE, dia, horaDoDia, infectados, infectadosNaCasa, LIMITE_FOFOCA, passarHora,
  podeComprar, podeSequestrar, progresso, relatorio, sequestrar, valorResgate, vetoresDoAtaque,
} from './sim/motor';
import { HABILIDADES, NOME_VETOR, TIPOS } from './sim/dados';
import type { Estado, Evento, TipoVirus } from './sim/tipos';
import { RETRATOS } from './roteiro/retratos';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const layout = gerarLayout();
const mundo = new Mundo(layout);
mundo.controls.autoRotate = true;
mundo.controls.enabled = false;

let e: Estado | null = null;
let vel = 0, velAntes = 1, acum = 0, visto = 0;
let selecionada: string | null = null;
const SEG_POR_HORA = [Infinity, 1.1, 0.35];

// ---------- modo P&B ----------
document.querySelectorAll<HTMLButtonElement>('#modo button').forEach(b => b.onclick = ev => {
  ev.stopPropagation();
  document.querySelectorAll('#modo button').forEach(x => x.classList.toggle('on', x === b));
  mundo.pretoEBranco = b.dataset.modo === 'pb';
});

// ---------- telas ----------
const tela = (id: string | null) => document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
tela('capa');

// ---------- falas ----------
const filaFalas: { quem: string; nome: string; texto: string }[] = [];
let falaAte = 0;
const NOMES_FALA: Record<string, string> = { dandara: 'Dandara', rosimeire: 'Dona Rosimeire', jurandir: 'Seu Jurandir', voce: 'Você' };
function fala(quem: string, texto: string) { filaFalas.push({ quem, nome: NOMES_FALA[quem] ?? quem, texto }); }
function mostrarProximaFala(agora: number) {
  const el = $('#fala');
  if (agora < falaAte) return;
  const f = filaFalas.shift();
  if (!f) { el.style.display = 'none'; return; }
  el.querySelector('.ret')!.innerHTML = RETRATOS[f.quem] ?? RETRATOS.voce;
  el.querySelector('.nome')!.textContent = f.nome;
  el.querySelector('.txt')!.textContent = f.texto;
  el.classList.toggle('vila', f.quem === 'dandara');
  el.classList.toggle('voce', f.quem === 'voce');
  el.style.display = 'flex';
  el.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 250, easing: 'ease-out' });
  falaAte = agora + 4.5;
}

// ---------- abertura ----------
const ABERTURA = [
  { cam: () => mundo.visaoCasa('E-10.5'), legenda: 'Santa Rita do Oeste. Terça-feira, 14h.<br>Alguém esqueceu um pendrive na LAN House.' },
  { legenda: 'O Thalisson achou, plugou e copiou o "vídeo" pro celular.<br><b>Pronto. Você existe.</b>', acao: () => { mundo.atualizarCasa('E-10.5', 1, 10, false); mundo.anel('E-10.5'); } },
  { fala: 'Oi. Eu sou o video_bom_dia_lindo.mp4.exe. A cidade me chama de Vírus do Bom Dia. Ainda não sei o que eu quero ser.' },
];
let passoAbertura = -1, travado = false;
function avancarAbertura() {
  if (travado || passoAbertura >= ABERTURA.length) return;
  passoAbertura++;
  $('#dica').style.display = 'none';
  $('#legenda').style.display = 'none';
  if (passoAbertura >= ABERTURA.length) { filaFalas.length = 0; falaAte = 0; $('#fala').style.display = 'none'; return mostrarEscolha(); }
  const p = ABERTURA[passoAbertura];
  if (p.cam) mundo.voar(p.cam(), 2.2);
  travado = true;
  const meu = passoAbertura;
  setTimeout(() => {
    if (meu !== passoAbertura) return;
    if (p.legenda) { $('#legenda').innerHTML = p.legenda; $('#legenda').style.display = 'block'; }
    if (p.fala) { falaAte = 0; fala('voce', p.fala); }
    p.acao?.();
    setTimeout(() => { travado = false; $('#dica').style.display = 'block'; }, 600);
  }, p.cam ? 1900 : 150);
}
$('#jogar').onclick = ev => {
  ev.stopPropagation(); tela(null);
  mundo.controls.autoRotate = false;
  passoAbertura = -1; avancarAbertura();
};
addEventListener('pointerdown', ev => {
  if ((ev.target as HTMLElement).closest?.('button, #casa, #placar, #relogio')) return;
  if (passoAbertura >= 0 && passoAbertura < ABERTURA.length) avancarAbertura();
});

// ---------- escolha do tipo ----------
const DIFICULDADE: Record<TipoVirus, string> = { sequestro: 'Dificuldade: média', enxame: 'Dificuldade: média', fofoca: 'Dificuldade: difícil' };
function mostrarEscolha() {
  passoAbertura = ABERTURA.length;
  mundo.voar([mundo.camera.position.clone().set(62, 40, 66), mundo.controls.target.clone().set(0, 3, 0)], 2);
  $('#tipos').innerHTML = (Object.keys(TIPOS) as TipoVirus[]).map(t => `
    <div class="tipo"><h3>${TIPOS[t].nome}</h3><p>${TIPOS[t].desc}</p><p class="metatipo">${TIPOS[t].meta}</p><span class="dif">${DIFICULDADE[t]}</span>
    <button class="grande" data-tipo="${t}">Ser ${TIPOS[t].nome}</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('#tipos button').forEach(b => b.onclick = ev => { ev.stopPropagation(); comecar(b.dataset.tipo as TipoVirus); });
  tela('escolha');
}

// ---------- jogo ----------
const TUTORIAL = [
  'Clique numa casa para ver quem mora lá, quais aparelhos tem e para <b>atacar</b>. Arraste para girar a câmera e use a rodinha para aproximar.',
  'Cada aparelho infectado te dá <b>acessos</b>. Gaste em <b>🧬 Evoluir</b> para aprender truques novos, como se espalhar pelos grupos do ZapZap.',
  'Todo contágio faz <b>barulho</b>. Barulho acorda a Dandara: ela limpa casas, dá palestra e, furiosa, monta uma <b>vacina</b>. Se esconder também é estratégia.',
];
let passoTutorial = 0;
function mostrarTutorial() {
  const el = $('#tutorial');
  if (passoTutorial >= TUTORIAL.length) { el.style.display = 'none'; setVel(1); return; }
  el.querySelector('p')!.innerHTML = TUTORIAL[passoTutorial];
  el.style.display = 'flex';
}
$('#tutorial button').onclick = ev => { ev.stopPropagation(); passoTutorial++; mostrarTutorial(); };

function comecar(tipo: TipoVirus) {
  passoAbertura = ABERTURA.length; travado = false;
  $('#legenda').style.display = 'none'; $('#dica').style.display = 'none';
  e = criarJogo(Math.floor(Math.random() * 1e9), tipo, layout);
  visto = 0; acum = 0; selecionada = null;
  filaFalas.length = 0; falaAte = 0;
  $('#feed').innerHTML = '';
  $('#casa').style.display = 'none'; mundo.selecionar(null);
  tela(null);
  $('#hud').classList.add('ativo');
  mundo.controls.enabled = true; mundo.controls.autoRotate = false;
  $('#vacinalinha').style.display = 'none';
  sincronizar(); atualizarHud();
  setVel(0);
  const falaInicio: Record<TipoVirus, string> = {
    sequestro: 'Decidido: vou trancar os arquivos dessa cidade e cobrar caro. Primeiro preciso crescer sem fazer barulho.',
    enxame: 'Decidido: quero todo mundo. Celular, TV, câmera, geladeira. Quanto mais, melhor.',
    fofoca: 'Decidido: vou ler tudo e não mexer em nada. Se a Dandara entender o que eu sou, acabou.',
  };
  fala('voce', falaInicio[tipo]);
  if (passoTutorial < TUTORIAL.length) mostrarTutorial(); else setVel(1);
}

function setVel(v: number) {
  vel = v;
  document.querySelectorAll<HTMLButtonElement>('#relogio button').forEach(b => b.classList.toggle('on', Number(b.dataset.vel) === v));
}
document.querySelectorAll<HTMLButtonElement>('#relogio button').forEach(b => b.onclick = ev => { ev.stopPropagation(); setVel(Number(b.dataset.vel)); });
addEventListener('keydown', ev => {
  if (ev.key === ' ' || ev.key === 'Enter') {
    if (passoAbertura >= 0 && passoAbertura < ABERTURA.length) { ev.preventDefault(); avancarAbertura(); return; }
    if (e && !e.fim && ev.key === ' ') { ev.preventDefault(); setVel(vel ? 0 : velAntes); }
  }
});

function sincronizar() {
  if (!e) return;
  for (const c of Object.values(e.casas)) mundo.atualizarCasa(c.id, infectadosNaCasa(e, c.id), c.aparelhos.length, c.sequestrada);
}

const ICONE: Record<string, string> = { radio: '📻', zap: '💬', dandara: '⚠️', voce: '🦠', sistema: '★' };
function processarEventos() {
  if (!e) return;
  while (visto < e.log.length) {
    const ev: Evento = e.log[visto++];
    const div = document.createElement('div');
    div.className = ev.canal;
    div.textContent = `${ICONE[ev.canal] ?? ''} ${ev.texto}`;
    const feed = $('#feed');
    feed.prepend(div);
    while (feed.children.length > 5) feed.lastChild!.remove();
    if (ev.fala) fala(ev.fala.quem, ev.fala.texto);
    if (ev.canal === 'dandara' && ev.casa) { mundo.dandaraVai(ev.casa); mundo.anel(ev.casa, 0x111111, 14); }
    if (ev.canal === 'dandara' && ev.fala && ev.texto.includes('furiosa')) mundo.tremer();
    if (ev.canal === 'voce' && ev.casa) mundo.anel(ev.casa);
    if (ev.canal === 'radio' && ev.casa) mundo.anel(ev.casa, 0x111111, 30);
  }
}

const HUMOR_TXT = { distraida: 'distraída', desconfiada: 'desconfiada', cacando: 'caçando você', furiosa: 'FURIOSA' };
function atualizarHud() {
  if (!e) return;
  const h = horaDoDia(e);
  $('#hora').textContent = `Dia ${Math.min(21, dia(e))} de 21 · ${String(h).padStart(2, '0')}h`;
  const p = progresso(e);
  $('#metatxt').textContent = `Meta: ${p.texto}`;
  $('#metabar').style.width = `${Math.min(100, (p.atual / p.meta) * 100)}%`;
  $('#inf').textContent = String(infectados(e).length);
  $('#acessos').textContent = String(Math.floor(e.acessos));
  const hu = $('#humor'); hu.textContent = HUMOR_TXT[e.humor]; hu.className = e.humor;
  $('#alertabar').style.width = `${e.alerta}%`;
  const limite = e.tipo === 'fofoca' ? LIMITE_FOFOCA : 100;
  $('#conhbar').style.width = `${Math.min(100, (e.conhecimento / limite) * 100)}%`;
  if (e.vacina > 0) { $('#vacinalinha').style.display = 'block'; $('#vacbar').style.width = `${e.vacina}%`; }
  $('#evoluir').classList.toggle('pode', HABILIDADES.some(x => podeComprar(e!, x.id)));
  if (selecionada) desenharCasa();
}

// ---------- painel da casa ----------
const NOME_AP: Record<string, string> = { pc: '💻 PC', celular: '📱 celular', roteador: '📡 roteador', tv: '📺 TV', camera: '📷 câmera', geladeira: '🧊 geladeira' };
function desenharCasa() {
  if (!e || !selecionada) return;
  const c = e.casas[selecionada];
  const el = $('#casa');
  const inf = infectadosNaCasa(e, c.id);
  const moradores = c.pessoas.map(id => e!.pessoas[id]).map(p => {
    const tags: string[] = [];
    if (p.clica > 0.7) tags.push('clica em tudo');
    else if (p.clica < 0.35) tags.push('cuidadosa');
    if (p.senhaFraca) tags.push('senha fraca');
    if (p.desconfianca > 0.3) tags.push('desconfiada');
    return `<li>${p.nome}, ${p.idade} anos <span class="tags">${tags.join(' · ')}</span></li>`;
  }).join('');
  const aps = c.aparelhos.map(id => e!.aparelhos[id]).map(a =>
    `<span class="ap ${a.infectado ? 'inf' : a.protegido.length ? 'prot' : ''}" title="${a.protegido.length ? 'protegido contra: ' + a.protegido.map(v => NOME_VETOR[v]).join(', ') : ''}">${NOME_AP[a.tipo]}</span>`).join('');
  const temSegredo = e.tipo === 'fofoca' && c.pessoas.some(id => { const s = e!.pessoas[id].segredo; return s && !e!.segredos.includes(s); });
  let acoes = '';
  if (c.especial === 'dandara') acoes = '<p><b>A casa da Dandara.</b> Tudo atualizado, senha de 24 caracteres e um gato que morde. Nem tente.</p>';
  else {
    const vs = vetoresDoAtaque(e, c.id);
    acoes = `<div class="acoes">
      <button id="btatacar" class="forte" ${e.acessos < CUSTO_ATAQUE || !vs.length || e.fim ? 'disabled' : ''}>Atacar esta casa (${CUSTO_ATAQUE} acessos)<br><small>por: ${vs.map(v => NOME_VETOR[v]).join(', ') || 'nada ainda'}</small></button>
      ${e.tipo === 'sequestro' ? `<button id="btsequestrar" ${podeSequestrar(e, c.id) ? '' : 'disabled'}>${c.sequestrada ? 'Já sequestrada' : `Sequestrar: R$ ${valorResgate(e, c.id).toLocaleString('pt-BR')}`}<br><small>${e.habilidades.includes('cripto') ? 'muito barulho, a Dandara vem correndo' : 'precisa de Sequestro de arquivos'}</small></button>` : ''}
    </div>`;
  }
  el.innerHTML = `<button class="fechar">✕</button><h3>${c.nome}</h3>
    <div>${inf} de ${c.aparelhos.length} aparelhos infectados · Wi-Fi ${c.wifiFraco ? '<b>fraco</b>' : 'protegido'}</div>
    ${temSegredo ? '<div class="segredo">🤫 alguém aqui guarda um segredo</div>' : ''}
    <ul>${moradores || '<li>ninguém mora aqui</li>'}</ul>
    <div class="aparelhos">${aps}</div>${acoes}`;
  el.style.display = 'block';
  el.querySelector<HTMLButtonElement>('.fechar')!.onclick = () => { selecionada = null; el.style.display = 'none'; mundo.selecionar(null); };
  const ba = el.querySelector<HTMLButtonElement>('#btatacar');
  if (ba) ba.onclick = () => { atacar(e!, c.id); sincronizar(); processarEventos(); atualizarHud(); };
  const bs = el.querySelector<HTMLButtonElement>('#btsequestrar');
  if (bs) bs.onclick = () => { sequestrar(e!, c.id); sincronizar(); processarEventos(); atualizarHud(); };
}

let baixo: { x: number; y: number } | null = null;
mundo.renderer.domElement.addEventListener('pointerdown', ev => { baixo = { x: ev.clientX, y: ev.clientY }; });
mundo.renderer.domElement.addEventListener('pointerup', ev => {
  if (!e || !baixo || Math.hypot(ev.clientX - baixo.x, ev.clientY - baixo.y) > 6) return;
  const id = mundo.casaEm(ev.clientX, ev.clientY);
  selecionada = id; mundo.selecionar(id);
  if (id) desenharCasa(); else $('#casa').style.display = 'none';
});

// ---------- evoluir ----------
function desenharArvore() {
  if (!e) return;
  const lista = HABILIDADES.filter(h => !h.tipo || h.tipo === e!.tipo);
  $('#habs').innerHTML = lista.map(h => {
    const tem = e!.habilidades.includes(h.id);
    const falta = (h.requer ?? []).filter(r => !e!.habilidades.includes(r)).map(r => HABILIDADES.find(x => x.id === r)!.nome);
    const botao = tem ? '<button disabled>Aprendido</button>'
      : falta.length ? `<button disabled>Precisa de: ${falta.join(', ')}</button>`
      : `<button class="comprar" data-h="${h.id}" ${podeComprar(e!, h.id) ? '' : 'disabled'}>Aprender (${h.custo} acessos)</button>`;
    return `<div class="hab ${tem ? 'tem' : ''}"><h4><span>${h.nome}</span><span>${h.custo}🔑</span></h4><div>${h.desc}</div>
      <details><summary>Como funciona de verdade</summary>${h.como}</details>
      <details><summary>Como se defender</summary>${h.defesa}</details>${botao}</div>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('#habs button.comprar').forEach(b => b.onclick = ev => {
    ev.stopPropagation(); comprar(e!, b.dataset.h!); processarEventos(); atualizarHud(); desenharArvore();
  });
}
$('#evoluir').onclick = ev => { ev.stopPropagation(); if (!e) return; velAntes = vel || velAntes; setVel(0); desenharArvore(); tela('arvore'); };
$('#fechararvore').onclick = ev => { ev.stopPropagation(); tela(null); setVel(velAntes || 1); };

// ---------- fim ----------
function mostrarFim() {
  if (!e?.fim) return;
  setVel(0);
  $('#fimtitulo').textContent = e.fim.vitoria ? `Vitória: ${e.fim.titulo}` : e.fim.titulo;
  $('#fimtexto').textContent = e.fim.texto;
  const stats = [`${Math.min(21, dia(e))} dias`, `${infectados(e).length} aparelhos no fim`, `${e.habilidades.length} truques`];
  if (e.tipo === 'sequestro') stats.push(`R$ ${e.dinheiro.toLocaleString('pt-BR')}`);
  if (e.tipo === 'fofoca') stats.push(`${e.segredos.length} segredos`);
  $('#fimstats').innerHTML = stats.map(s => `<span>${s}</span>`).join('');
  $('#relatorio').innerHTML = relatorio(e).map(r => `<div><b>${r.nome}${r.vezes ? ` · usado ${r.vezes} vez${r.vezes > 1 ? 'es' : ''}` : ''}</b>${r.defesa}</div>`).join('');
  tela('fim');
  filaFalas.length = 0; falaAte = 0;
  fala(e.fim.vitoria ? 'voce' : 'dandara', e.fim.vitoria ? 'Santa Rita foi só o começo. Ouvi dizer que tem um ônibus saindo da rodoviária...' : 'Pronto. Volta pro pendrive de onde você saiu.');
}
$('#denovo').onclick = ev => { ev.stopPropagation(); $('#hud').classList.remove('ativo'); mostrarEscolha(); };
$('#olhar').onclick = ev => { ev.stopPropagation(); tela(null); };

// ---------- laco principal ----------
let ultimo = performance.now();
let ultimoHud = 0;
function quadro(agora: number) {
  const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
  const t = agora / 1000;
  if (e && !e.fim && vel > 0) {
    acum += dt;
    let passou = false;
    while (acum >= SEG_POR_HORA[vel] && !e.fim) { acum -= SEG_POR_HORA[vel]; passarHora(e); passou = true; }
    if (passou) { sincronizar(); processarEventos(); }
    if (e.fim) { atualizarHud(); mostrarFim(); }
  }
  if (e && t - ultimoHud > 0.25) { ultimoHud = t; atualizarHud(); }
  mostrarProximaFala(t);
  mundo.quadro(dt);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);

// ajudante para testes no navegador
function avancar(horas: number, quadros = 30) {
  if (!e) return;
  for (let i = 0; i < horas && !e.fim; i++) passarHora(e);
  sincronizar(); processarEventos(); atualizarHud();
  if (e.fim) mostrarFim();
  for (let i = 0; i < quadros; i++) mundo.quadro(0.05);
  mostrarProximaFala(performance.now() / 1000);
}
(window as unknown as { __jogo: unknown }).__jogo = { get e() { return e; }, comecar, setVel, mundo, avancar, comprar: (h: string) => e && comprar(e, h), atacar: (c: string) => e && atacar(e, c), sequestrar: (c: string) => e && sequestrar(e, c) };
