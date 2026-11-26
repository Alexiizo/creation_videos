// L'état de la vidéo ouverte : le film (video.json), sa version résolue (temps, mots…), la sélection, l'instant ; annuler / refaire ;
// enregistrement automatique. Toute modification passe par modifier() : rien ne se perd, tout s'annule.
import { lire, envoyer, Erreur } from './api.js';
import { avis, confirmer, ecritEnCours } from './ui.js';

const ATTENTE = 450, SURVEILLANCE = 1500, VERIFIER_APRES = 1200, PAS_MAX = 120;      // ms ; nombre de pas d'annulation
const FAIT = 'Enregistré', A_FAIRE = 'À enregistrer';
const VIDE = { nom: null, film: null, resolu: null, resume: null, version: null, v_resolu: null, t: 0, points: [], score: null, bilan: '', erreur: null, enregistre: FAIT, alertes_image: [] };
export const E = Object.assign({ selection: { genre: 'plan', plan: 0 }, passe: [], futur: [] }, VIDE);
const ecoute = {};
export const quand = (evt, fn) => { (ecoute[evt] ||= new Set()).add(fn); return () => ecoute[evt].delete(fn); };
export const dire = (evt, x) => { for (const fn of [...(ecoute[evt] || [])]) fn(x); };
const copie = (x) => x === undefined ? undefined : JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------------ ouvrir, fermer
let minuterie = null, attenteVerif = null, veille = null, enCours = Promise.resolve();
export async function ouvrir(nom) {
  const d = await lire(`video/${nom}`);
  Object.assign(E, VIDE, { nom, film: d.film, version: d.version, resume: d.resume, passe: [], futur: [], points: [], alertes_image: [], selection: { genre: 'plan', plan: 0 } });
}
export async function demarrer() {
  await resoudre();
  veille = setInterval(surveiller, SURVEILLANCE);
  verifierBientot(0);
}
export async function fermer() {
  await enregistrer();
  clearInterval(veille); clearTimeout(minuterie); clearTimeout(attenteVerif);
  E.nom = null;
  for (const k of Object.keys(ecoute)) ecoute[k].clear();
}
async function resoudre() {
  const nom = E.nom, r = await lire(`video/${nom}/resolu`);
  if (nom !== E.nom) return;
  E.v_resolu = r._version;
  E.erreur = r.erreur || null;
  if (r.erreur) dire('erreur', r.erreur); else { E.resolu = r; dire('resolu'); }
}
export const total = () => (E.resolu?.plans || []).reduce((m, p) => Math.max(m, p.debut + p.duree), 0);
export const planA = (t) => Math.max(0, (E.resolu?.plans || []).findIndex(p => t >= p.debut && t < p.debut + p.duree));

// ------------------------------------------------------------------ modifier, annuler, refaire
export function modifier(quoi, fn) {
  const avant = JSON.stringify(E.film), sel = copie(E.selection);
  fn(E.film);
  if (JSON.stringify(E.film) === avant) return;
  E.passe.push({ quoi, film: avant, sel });
  if (E.passe.length > PAS_MAX) E.passe.shift();
  E.futur = [];
  change();
}
function change() {
  E.enregistre = A_FAIRE;
  dire('film');
  clearTimeout(minuterie);
  minuterie = setTimeout(enregistrer, ATTENTE);
}
function saute(de, vers, mot) {
  const pas = de.pop();
  if (!pas) return;
  vers.push({ quoi: pas.quoi, film: JSON.stringify(E.film), sel: copie(E.selection) });
  E.film = JSON.parse(pas.film);
  E.selection = pas.sel;
  change();
  dire('selection');
  avis(`${mot} : ${pas.quoi}`);
}
export const annuler = () => saute(E.passe, E.futur, 'Annulé');
export const refaire = () => saute(E.futur, E.passe, 'Refait');

// ------------------------------------------------------------------ enregistrer
export function enregistrer() { enCours = enCours.then(ecrire, ecrire); return enCours; }
async function ecrire() {
  clearTimeout(minuterie);
  if (!E.nom || E.enregistre === FAIT) return;
  const nom = E.nom, envoye = JSON.stringify(E.film);
  E.enregistre = 'Enregistrement…';
  dire('etat');
  try {
    const r = await envoyer(`video/${nom}`, { film: E.film, version: E.version });
    if (nom !== E.nom) return;
    E.version = r.version;
    E.enregistre = JSON.stringify(E.film) === envoye ? FAIT : A_FAIRE;
    dire('etat');
    await resoudre();
    await rafraichirResume();
    verifierBientot();
  } catch (e) {
    if (!(e instanceof Erreur)) throw e;
    if (e.code !== 409) { E.enregistre = 'Non enregistré'; dire('etat'); avis(e.message, { genre: 'erreur', action: ['Réessayer', enregistrer] }); return; }
    await conflit(e.donnees);
  }
}
// quelqu'un d'autre (Claude, un éditeur) a écrit entre-temps : on choisit, rien n'est écrasé en silence
async function conflit(autre) {
  const garder = await confirmer('Deux versions de cette vidéo', "Elle a été modifiée ailleurs (par Claude ou dans un éditeur) pendant tes retouches. Si tu gardes l'autre version, tes retouches se retrouvent avec « Annuler ».", "Garder l'autre version", { non: 'Garder la mienne' });
  E.version = autre.version;
  if (!garder) { E.enregistre = A_FAIRE; return ecrire(); }
  E.passe.push({ quoi: "l'autre version", film: JSON.stringify(E.film), sel: copie(E.selection) });
  await remplacer(autre);
}
async function remplacer(d) {
  Object.assign(E, { film: d.film, version: d.version, resume: d.resume, enregistre: FAIT });
  dire('film');
  await resoudre();
  verifierBientot();
}
let regarde = false;
async function surveiller() {
  if (regarde || !E.nom || E.enregistre !== FAIT || document.hidden || ecritEnCours()) return;      // (une phrase en train de s'écrire se finit d'abord)
  regarde = true;
  try { await comparer(); } catch { /* l'atelier s'est fermé : le prochain geste le dira */ } finally { regarde = false; }
}
async function comparer() {
  const nom = E.nom, stable = () => nom === E.nom && E.enregistre === FAIT && !ecritEnCours(), v = await lire(`video/${nom}/version`);
  if (!stable()) return;
  if (v.json !== E.version) {
    const d = await lire(`video/${nom}`);
    if (!stable()) return;
    E.passe.push({ quoi: 'la modification faite ailleurs', film: JSON.stringify(E.film), sel: copie(E.selection) });
    await remplacer(d);
    avis('La vidéo a été modifiée ailleurs : elle est à jour');
  } else if (v.resolu !== E.v_resolu) { await resoudre(); await rafraichirResume(); }
}
export async function rafraichirResume() {
  const nom = E.nom, r = await lire(`video/${nom}/resume`);
  if (nom === E.nom) { E.resume = r; dire('etat'); }
}
export async function revenir(fichier) {
  await enregistrer();
  const avant = JSON.stringify(E.film), d = await envoyer(`video/${E.nom}/revenir`, { fichier });
  E.passe.push({ quoi: "le retour à une version d'avant", film: avant, sel: copie(E.selection) });
  await remplacer(d);
}

// ------------------------------------------------------------------ vérifier (tout seul, après chaque retouche)
function verifierBientot(attente = VERIFIER_APRES) { clearTimeout(attenteVerif); attenteVerif = setTimeout(verifier, attente); }
export async function verifier() {
  const nom = E.nom;
  if (!nom) return;
  const r = await lire(`video/${nom}/verifier`);
  if (nom !== E.nom) return;
  Object.assign(E, { points: r.points, score: r.score, bilan: r.bilan });
  dire('points');
}
// tout ce qui est à corriger : le vérificateur (le texte, la structure) et les contrôles de l'image (aperçu)
export const aCorriger = () => [...E.points, ...E.alertes_image];

// ------------------------------------------------------------------ sélection
export function choisir(sel) { E.selection = sel; dire('selection'); }
export const planChoisi = () => Math.max(0, Math.min(E.selection.plan ?? 0, (E.film?.plans.length || 1) - 1));
export const plan = (i = planChoisi()) => E.film?.plans[i];
