// La scène : le moteur du rendu dans un cadre, mis à l'échelle ; lecture avec le son ; à l'arrêt, on prend un personnage ou un objet
// à la souris et on le déplace dans le monde (la perspective suit toute seule).
import { E, quand, dire, modifier, choisir, total, planA } from './etat.js';
import { brancher, nomme, joli } from './catalogue.js';
import { h, icone, bouton } from './ui.js';

const VITESSES = [1, .5, .25], MARGE = 20, BOUGE = 3;          // px avant qu'un clic devienne un déplacement
const S = { cadre: null, calque: null, boite: null, W: null, K: 1, joue: false, boucle: false, vitesse: 1, muet: false, reperes: true, dernier: 0, aDessiner: true, vise: null, anime: false, audio: null, versionSon: null };
let frise, temps, alerte, btLecture, tete;

export function construire() {
  Object.assign(S, { W: null, joue: false, boucle: false, vitesse: 1, vise: null, anime: false, audio: null, versionSon: null });
  S.cadre = h('iframe', { src: '/scene.html', title: 'La vidéo', class: 'scene-cadre', tabindex: '-1' });
  S.calque = h('div', { class: 'calque', onpointermove: survol, onpointerdown: prendre, onpointerleave: () => viser(null) });
  S.boite = h('div', { class: 'scene-boite' }, S.cadre, S.calque);
  alerte = h('p', { class: 'scene-alerte', role: 'status', hidden: true });
  btLecture = bouton('', () => lecture(!S.joue), { icone: 'lecture', titre: 'Lecture (Espace)', classe: 'rond or' });
  const btBoucle = bouton('', () => { S.boucle = !S.boucle; btBoucle.setAttribute('aria-pressed', S.boucle); }, { icone: 'boucle', titre: 'Rejouer ce plan en boucle (L)', enfonce: false, classe: 'discret' });
  const btVitesse = bouton('×1', () => { S.vitesse = VITESSES[(VITESSES.indexOf(S.vitesse) + 1) % VITESSES.length]; btVitesse.querySelector('span').textContent = '×' + String(S.vitesse).replace('.', ','); synchro(); }, { titre: 'Vitesse', classe: 'discret' });
  const btSon = bouton('', () => { S.muet = !S.muet; btSon.replaceChildren(icone(S.muet ? 'muet' : 'son')); btSon.setAttribute('aria-pressed', !S.muet); synchro(); }, { icone: S.muet ? 'muet' : 'son', titre: 'Son', enfonce: !S.muet, classe: 'discret' });
  const btReperes = bouton('', () => { S.reperes = !S.reperes; btReperes.setAttribute('aria-pressed', S.reperes); dessinerReperes(); }, { icone: 'reperes', titre: 'Montrer ce qui se déplace', enfonce: S.reperes, classe: 'discret' });
  btBoucle.id = 'bt-boucle';
  temps = h('output', { class: 'temps' });
  tete = h('span', { class: 'tete-lecture' });
  frise = h('div', { class: 'frise', role: 'slider', tabindex: '0', 'aria-label': 'Position dans la vidéo', 'aria-valuemin': '0', onpointerdown: glisserFrise });
  const zone = h('div', { class: 'scene-zone' }, S.boite);
  new ResizeObserver(() => ajuster(zone)).observe(zone);
  S.cadre.addEventListener('load', () => { S.W = S.cadre.contentWindow; brancher(S.W); charger(); dire('moteur'); });
  quand('resolu', charger);
  quand('selection', () => { const s = E.selection; if (s.plan !== undefined && !S.joue && planA(E.t) !== s.plan) allerAuPlan(s.plan); dessinerReperes(); });
  return h('section', { class: 'scene', 'aria-label': 'Scène' }, zone, alerte, h('div', { class: 'transport' }, btLecture, temps, h('span', { class: 'ressort' }), btBoucle, btVitesse, btSon, btReperes), frise);
}
export const joue = () => S.joue;
function ajuster(zone) {
  const r = zone.getBoundingClientRect();
  S.K = Math.max(.1, Math.min((r.height - MARGE) / 1920, (r.width - MARGE) / 1080));
  S.boite.style.width = 1080 * S.K + 'px';
  S.boite.style.height = 1920 * S.K + 'px';
  S.cadre.style.transform = `scale(${S.K})`;
  dessinerReperes();
}
function charger() {
  if (!S.W?.FILM || !E.resolu?.plans.length) return;
  try { S.W.FILM.charger(JSON.parse(JSON.stringify(E.resolu))); } catch (e) { dire('erreur', e.message); return; }
  E.t = Math.min(E.t, Math.max(0, total() - .02));
  if (!S.anime && E.t === 0) E.t = instant(0);             // on arrive sur une image déjà posée, pas sur la toute première
  if (!S.joue && E.selection.plan !== undefined && planA(E.t) !== E.selection.plan) E.t = instant(E.selection.plan);      // les durées ont changé : on reste sur le plan choisi
  dessinerFrise();
  S.aDessiner = true;
  if (!S.anime) { S.anime = true; requestAnimationFrame(image); }
}

// ------------------------------------------------------------------ lecture
// l'instant où un plan se regarde le mieux : ses premiers gestes sont posés
const instant = (i) => { const p = E.resolu?.plans[i]; return p ? p.debut + Math.max(Math.min(.4, p.duree * .5), p.duree * .4) : 0; };
export function lecture(v) {
  S.joue = v && total() > 0;
  btLecture.replaceChildren(icone(S.joue ? 'pause' : 'lecture'));
  btLecture.title = S.joue ? 'Pause (Espace)' : 'Lecture (Espace)';
  S.boite.classList.toggle('joue', S.joue);
  if (S.joue) { if (E.t >= total() - .1) E.t = 0; preparerSon(); viser(null); } else { const i = planA(E.t); if (E.selection.plan !== i) choisir({ genre: 'plan', plan: i }); }
  S.dernier = performance.now();
  dessinerReperes();
  synchro();
}
function preparerSon() {
  if (S.audio && S.versionSon === E.v_resolu) return;
  S.audio?.pause();
  S.audio = new Audio(`/api/video/${E.nom}/audio.wav?v=${E.v_resolu}`);
  S.audio.preload = 'auto';
  S.versionSon = E.v_resolu;
  S.audio.addEventListener('canplay', () => { if (S.joue) synchro(); }, { once: true });      // (la musique se compose la première fois : l'image n'attend pas)
}
function synchro() {
  if (!S.audio) return;
  if (S.joue && !S.muet && S.vitesse === 1) { S.audio.currentTime = E.t; S.audio.play().catch(() => { /* le son n'est pas prêt : l'image continue */ }); } else S.audio.pause();
}
export function aller(t) {
  E.t = Math.max(0, Math.min(Math.max(0, total() - .01), t));
  S.aDessiner = true;
  if (S.joue) synchro();
  dire('temps');
}
export const allerAuPlan = (i) => aller(instant(i));
export function voisin(d) { const i = Math.max(0, Math.min((E.resolu?.plans.length || 1) - 1, planA(E.t) + d)); choisir({ genre: 'plan', plan: i }); allerAuPlan(i); }
export const basculerBoucle = () => document.getElementById('bt-boucle')?.click();

function image() {
  if (!E.nom || !document.body.contains(S.cadre)) { S.anime = false; S.audio?.pause(); return; }
  const now = performance.now(), a = S.audio;
  if (S.joue) {
    const sonne = a && !a.paused && S.vitesse === 1 && !S.muet && a.readyState > 2, p = E.resolu.plans[planA(E.t)];
    E.t = sonne ? a.currentTime : E.t + (now - S.dernier) / 1000 * S.vitesse;
    if (S.boucle && p && E.t >= p.debut + p.duree - .03) { E.t = p.debut + .01; synchro(); }
    if (E.t >= total() - .02) { E.t = total() - .02; lecture(false); }
    S.aDessiner = true;
  }
  S.dernier = now;
  if (S.aDessiner) {
    S.aDessiner = false;
    try { S.W.FILM.rendre(E.t); montrer(); } catch (e) { dire('erreur', e.message); }
  }
  requestAnimationFrame(image);
}
function montrer() {
  const tt = total();
  tete.style.left = (tt ? E.t / tt * 100 : 0) + '%';
  temps.textContent = `${E.t.toFixed(1).replace('.', ',')} s sur ${Math.round(tt)} s`;
  frise.setAttribute('aria-valuemax', tt.toFixed(1));
  frise.setAttribute('aria-valuenow', E.t.toFixed(1));
  frise.setAttribute('aria-valuetext', `plan ${planA(E.t) + 1}`);
  const pb = S.W.FILM.cadrage(E.t).filter(c => c.problemes.length).map(c => `${c.id} : ${c.problemes.join(', ')}`);
  alerte.textContent = pb.join(' ; ');
  alerte.hidden = !pb.length;
  if (!S.joue) dessinerReperes();
  dire('temps');
}

// ------------------------------------------------------------------ la frise : un plan = un morceau, sa longueur = sa durée
function dessinerFrise() {
  const tt = total();
  frise.replaceChildren(...E.resolu.plans.map((p, i) => h('span', { class: 'morceau ' + (p.registre || (p.fin ? 'fin' : '')), style: { left: p.debut / tt * 100 + '%', width: p.duree / tt * 100 + '%' }, title: `Plan ${i + 1}` }, String(i + 1))), tete);
}
function glisserFrise(e) {
  const r = frise.getBoundingClientRect(), vers = (ev) => aller((ev.clientX - r.left) / r.width * total());
  vers(e);
  const fin = () => { removeEventListener('pointermove', vers); removeEventListener('pointerup', fin); choisir({ genre: 'plan', plan: planA(E.t) }); };
  addEventListener('pointermove', vers);
  addEventListener('pointerup', fin);
}

// ------------------------------------------------------------------ prendre à la souris
const point = (e) => { const r = S.calque.getBoundingClientRect(); return [(e.clientX - r.left) / S.K, (e.clientY - r.top) / S.K]; };
const aire = (b) => (b[2] - b[0]) * (b[3] - b[1]);
// ce qui est sous la souris : un personnage d'abord, puis le plus petit (le verre avant la table)
const sous = ([x, y]) => S.W.FILM.elements(E.t).filter(q => x >= q.boite[0] && x <= q.boite[2] && y >= q.boite[1] && y <= q.boite[3]).sort((a, b) => (b.genre === 'acteur') - (a.genre === 'acteur') || aire(a.boite) - aire(b.boite))[0];
const memeSource = (a, b) => a && b && a.ou === b.ou && a.liste === b.liste && a.k === b.k;
const choisie = (x, s, i) => s.plan === i && x.genre === s.genre && (x.genre === 'acteur' ? x.k === s.k : memeSource(x.source, s.source));
const etiquette = (x) => x.genre === 'acteur' ? joli(x.id) : nomme(x.type || x.gen);
function repere(x, classe) {
  const [x0, y0, x1, y1] = x.boite;
  return h('div', { class: 'repere ' + classe, style: { left: x0 * S.K + 'px', top: y0 * S.K + 'px', width: (x1 - x0) * S.K + 'px', height: (y1 - y0) * S.K + 'px' } }, h('span', {}, etiquette(x)));
}
export function dessinerReperes() {
  if (!S.calque) return;
  if (!S.W?.FILM || S.joue || !E.resolu?.plans.length) { S.calque.replaceChildren(); return; }
  const i = planA(E.t), choisi = S.W.FILM.elements(E.t).find(x => choisie(x, E.selection, i));
  S.calque.replaceChildren(...(S.reperes && S.vise ? [repere(S.vise, 'vise')] : []), ...(choisi ? [repere(choisi, 'choisi')] : []));
}
function viser(x) {
  S.vise = x;
  S.calque.style.cursor = x ? 'grab' : '';
  dessinerReperes();
}
function survol(e) {
  if (S.joue || e.buttons || !S.W?.FILM || !E.resolu) return;
  const x = sous(point(e)) || null, v = S.vise;
  if (x?.genre !== v?.genre || x?.id !== v?.id || !!x !== !!v || (x && x.genre === 'objet' && !memeSource(x.source, v.source))) viser(x);
}
// le personnage ou l'objet dans un film (le JSON ou sa version résolue)
export const trouver = (film, i, x) => x.genre === 'acteur' ? film.plans[i]?.acteurs?.[x.k] : (x.source.ou === 'lieu' ? film.lieux[film.plans[i].lieu] : film.plans[i])?.[x.source.liste]?.[x.source.k];
const placeDe = (o, x) => JSON.parse(JSON.stringify({ x: o.x ?? x.x ?? 540, y: o.y ?? x.y ?? 1060, pos: o.pos, actions: o.actions || [] }));      // (sans place écrite : celle que le moteur lui donne)
function deplacer(film, i, x, dx, dy, de) {
  const o = trouver(film, i, x), r = Math.round;
  if (o.pos) { o.pos = [r(de.pos[0] + dx), r(de.pos[1] + dy)]; return; }
  o.x = r(de.x + dx);
  if (!o.sur) o.y = r(de.y + dy);
  if (x.genre === 'acteur') (o.actions || []).forEach((a, j) => { if (de.actions[j]?.x !== undefined) a.x = r(de.actions[j].x + dx); if (de.actions[j]?.y !== undefined) a.y = r(de.actions[j].y + dy); });      // sa marche le suit
}
function prendre(e) {
  if (S.joue || e.button !== 0 || !S.W?.FILM || !E.resolu) return;
  const p0 = point(e), x = sous(p0), i = planA(E.t);
  if (!x) { choisir({ genre: 'plan', plan: i }); return; }
  e.preventDefault();
  choisir(x.genre === 'acteur' ? { genre: 'acteur', plan: i, k: x.k } : { genre: 'objet', plan: i, source: x.source });
  const D = S.W.FILM.film(), de = placeDe(trouver(E.film, i, x), x), m0 = S.W.FILM.versMonde(E.t, p0, x.d);
  let bouge = false, dx = 0, dy = 0;
  S.calque.setPointerCapture(e.pointerId);
  S.calque.style.cursor = 'grabbing';
  const mouv = (ev) => {
    const q = point(ev), m = S.W.FILM.versMonde(E.t, q, x.d);
    if (!bouge && Math.hypot(q[0] - p0[0], q[1] - p0[1]) * S.K < BOUGE) return;
    bouge = true;
    dx = m[0] - m0[0];
    dy = ev.shiftKey ? 0 : m[1] - m0[1];
    deplacer(D, i, x, dx, dy, de);
    S.W.FILM.rafraichir(i);
    S.aDessiner = true;
  };
  const fin = () => {
    for (const [n, fn] of [['pointermove', mouv], ['pointerup', fin], ['pointercancel', fin]]) S.calque.removeEventListener(n, fn);
    S.calque.style.cursor = '';
    if (bouge) modifier(`déplacer ${etiquette(x)}`, film => deplacer(film, i, x, dx, dy, de));
  };
  for (const [n, fn] of [['pointermove', mouv], ['pointerup', fin], ['pointercancel', fin]]) S.calque.addEventListener(n, fn);
}
// une petite poussée au clavier
export function pousser(dx, dy) {
  const s = E.selection;
  if (S.joue || !['acteur', 'objet'].includes(s.genre)) return false;
  const x = s.genre === 'acteur' ? { genre: 'acteur', k: s.k } : { genre: 'objet', source: s.source }, o = trouver(E.film, s.plan, x);
  if (!o) return false;
  const de = placeDe(o, x);
  modifier('déplacer', film => deplacer(film, s.plan, x, dx, dy, de));
  return true;
}
