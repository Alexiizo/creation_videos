// Le texte de la vidéo, comme un manuscrit : un paragraphe par plan ; chaque mot s'allume quand la voix le dit (la signature de la
// chaîne), un clic sur un mot mène à cet instant, un point d'or dessous dit qu'un geste ou un signe y est accroché.
import { E, quand, modifier, choisir, planA, aCorriger, planChoisi } from './etat.js';
import { aller, allerAuPlan, joue } from './scene.js';
import { h, bouton, icone, texte, choix, pluriel, confirmer, sansDeranger } from './ui.js';
import { DOSAGES, REGISTRES, joli } from './catalogue.js';

export const normal = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9']/g, '');
const REGISTRE = Object.fromEntries(REGISTRES);
let racine, blocs = [], enEdition = null;

export function construire() {
  racine = h('div', { class: 'manuscrit' });
  const redessine = sansDeranger(racine, dessiner);
  quand('film', redessine); quand('resolu', redessine); quand('points', redessine); quand('selection', marquer); quand('temps', eclairer);
  dessiner();
  return racine;
}
// les mots qui portent quelque chose : un geste, un regard, un signe, un mouvement de caméra
function accroches(p) {
  const out = [];
  for (const a of p.acteurs || []) for (const x of a.actions || []) if (x.mot) out.push(normal(x.mot));
  for (const l of [p.graphiques, p.camera]) for (const x of l || []) if (x.mot) out.push(normal(x.mot));
  return out;
}
export const motsDe = (p) => (p.texte || '').split(/\s+/).filter(Boolean).map(m => m.replace(/\*/g, ''));

function paragraphe(p, i) {
  const r = E.resolu?.plans[i], ecrits = motsDe(p), minutes = r?.mots?.length === ecrits.length ? r.mots : null, acc = accroches(p);
  const mots = ecrits.map((m, k) => {
    const n = normal(m), nu = n.includes("'") ? n.split("'").pop() : n, marque = acc.some(a => n === a || nu === a || (a.length > 3 && nu.startsWith(a)));
    return [h('span', { class: 'mot' + (marque ? ' accroche' : '') + (minutes?.[k].accent ? ' appuye' : ''), 'data-t': minutes ? (r.debut + minutes[k].t).toFixed(3) : undefined, onclick: (e) => { e.stopPropagation(); choisir({ genre: 'plan', plan: i }); if (minutes) aller(r.debut + minutes[k].t + .05); } }, m), ' '];
  });
  const points = aCorriger().filter(x => x.plan === i + 1);
  const el = h('article', { class: 'paragraphe ' + (p.registre || (p.fin ? 'fin' : '')), 'data-plan': i, onclick: () => { choisir({ genre: 'plan', plan: i }); allerAuPlan(i); }, ondblclick: () => editer(i) },
    h('header', {}, h('button', { type: 'button', class: 'numero', 'aria-label': `Plan ${i + 1}` }, String(i + 1)), h('span', { class: 'ou' }, [REGISTRE[p.registre], joli(p.lieu)].filter(Boolean).join(', ')), bouton('', e => { e.stopPropagation(); editer(i); }, { icone: 'crayon', titre: `Modifier le texte du plan ${i + 1}`, classe: 'discret mini' })),
    enEdition === i ? saisie(p, i) : h('p', { class: 'dit' }, mots.length ? mots : h('em', {}, p.fin ? 'Écran de fin' : 'Plan sans texte')),
    points.length ? h('ul', { class: 'points' }, points.map(x => h('li', { class: x.niveau }, icone('alerte'), h('span', {}, x.texte.replace(/^plan \d+ : /, ''))))) : null);
  return el;
}
function editer(i) { enEdition = i; choisir({ genre: 'plan', plan: i }); dessiner(); racine.querySelector('textarea')?.focus(); }
function saisie(p, i) {
  let garde = true;
  const fin = () => { const v = z.value.trim().replace(/\s+/g, ' '); if (enEdition !== i) return; enEdition = null; if (garde) modifier(`le texte du plan ${i + 1}`, f => { if (v) f.plans[i].texte = v; else delete f.plans[i].texte; }); dessiner(); };
  const z = h('textarea', { class: 'saisie', rows: 4, 'aria-label': `Texte du plan ${i + 1}`, value: p.texte || '', onclick: e => e.stopPropagation(), ondblclick: e => e.stopPropagation(), onblur: fin, onkeydown: e => { if (e.key === 'Escape') { garde = false; z.blur(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); z.blur(); } } });
  z.depart = null;                  // (ouverte, elle est toujours « en train de s'écrire »)
  return z;
}
const entre = (i) => h('button', { type: 'button', class: 'entre', 'aria-label': `Ajouter un plan ici (en position ${i + 1})`, onclick: () => inserer(i) }, icone('plus'));
// dans un nouveau plan, chacun est là où le plan d'avant l'a laissé : sa place, sa posture, son visage
function reste(a) {
  const l = a.actions || [], dit = (cle) => [...l].reverse().find(x => x[cle] !== undefined)?.[cle], arrive = [...l].reverse().find(x => x.x !== undefined || x.y !== undefined);
  const action = { t: 0, pose: ['marche', 'court'].includes(dit('pose')) ? 'debout' : dit('pose') || 'debout', visage: dit('visage') || 'neutre' };
  for (const cle of ['angles', 'vue']) { const v = [...l].reverse().find(x => x.pose !== undefined)?.[cle]; if (v !== undefined) action[cle] = v; }
  if (arrive) Object.assign(a, { x: arrive.x ?? a.x, y: arrive.y ?? a.y });
  return Object.assign(a, { actions: [action] });
}
export function inserer(i) {
  const modele = E.film.plans[Math.max(0, i - 1)] || {};
  modifier('ajouter un plan', f => { f.plans.splice(i, 0, { texte: '', registre: modele.registre || 'recit', ...(modele.lieu ? { lieu: modele.lieu } : {}), acteurs: JSON.parse(JSON.stringify(modele.acteurs || [])).map(reste) }); });
  editer(i);
}
export async function supprimer(i) {
  if (E.film.plans[i].texte && !await confirmer(`Supprimer le plan ${i + 1} ?`, `« ${E.film.plans[i].texte} » Tu pourras l'annuler.`, 'Supprimer', { danger: true })) return;
  modifier(`supprimer le plan ${i + 1}`, f => { f.plans.splice(i, 1); });
  choisir({ genre: 'plan', plan: Math.max(0, Math.min(i, E.film.plans.length - 1)) });
}
export function deplacerPlan(i, d) {
  const j = i + d;
  if (j < 0 || j >= E.film.plans.length) return;
  modifier(`déplacer le plan ${i + 1}`, f => { const [p] = f.plans.splice(i, 1); f.plans.splice(j, 0, p); });
  choisir({ genre: 'plan', plan: j });
}

function dessiner() {
  if (!E.film) return;
  const haut = racine.parentElement?.scrollTop, f = E.film, n = f.plans.reduce((s, p) => s + motsDe(p).length, 0), generaux = aCorriger().filter(x => !x.plan);
  const champ = (cle, quoi) => v => modifier(quoi, film => { film[cle] = v || ''; });
  racine.replaceChildren(
    h('div', { class: 'entete-film' }, texte('Passage', f.passage, champ('passage', 'le passage'), { exemple: 'Luc 15:11-32' }), choix('Dosage', f.dosage || 'recit', DOSAGES, champ('dosage', 'le dosage'))),
    h('p', { class: 'compte' }, `${pluriel(f.plans.length, 'plan', 'plans')}, ${pluriel(n, 'mot', 'mots')}, ${Math.round(E.resolu?._total || 0)} secondes`),
    ...(E.erreur ? [h('p', { class: 'erreur-film' }, icone('alerte'), h('span', {}, E.erreur))] : []),
    ...(generaux.length ? [h('ul', { class: 'points generaux' }, generaux.map(x => h('li', { class: x.niveau }, icone('alerte'), h('span', {}, x.texte))))] : []),
    ...(E.bilan ? [h('pre', { class: 'erreur-film' }, E.bilan)] : []),
    ...(f.plans.length ? f.plans.flatMap((p, i) => [entre(i), paragraphe(p, i)]).concat(entre(f.plans.length)) : [vide()]));
  blocs = [...racine.querySelectorAll('.paragraphe')];
  if (haut) racine.parentElement.scrollTop = haut;
  marquer();
  eclairer();
}
const vide = () => h('div', { class: 'vide' }, h('p', {}, "Rien n'est encore écrit."), h('p', {}, "Le plus simple : demande la vidéo à Claude, elle apparaîtra ici toute seule. Ou écris le premier plan toi-même."), bouton('Écrire le premier plan', () => inserer(0), { classe: 'or' }));
function marquer() {
  const i = planChoisi();
  for (const b of blocs) b.classList.toggle('choisi', Number(b.dataset.plan) === i);
}
let dernierPlan = -1;
function eclairer() {
  const i = planA(E.t);
  blocs.forEach((b, k) => {
    if (k !== i && k !== dernierPlan) return;
    let actif = null;
    for (const m of b.querySelectorAll('.mot[data-t]')) { const dit = k === i && Number(m.dataset.t) <= E.t + .02; m.classList.toggle('dite', dit); m.classList.remove('actif'); if (dit) actif = m; }
    if (actif && joue()) actif.classList.add('actif');
  });
  if (i !== dernierPlan && joue()) blocs[i]?.scrollIntoView({ block: 'nearest' });
  dernierPlan = i;
}
