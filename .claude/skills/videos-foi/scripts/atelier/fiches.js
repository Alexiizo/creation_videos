// Les personnages (décrits trait par trait, dessinés en direct), les lieux (l'heure, ce qu'on y trouve) et la Bible.
import { E, quand, modifier, choisir, plan, planChoisi } from './etat.js';
import { lire } from './api.js';
import { moteur, nomme, joli, HEURES, PEAUX, CHEVEUX, TISSUS, AGES, STYLES, silhouette, portrait } from './catalogue.js';
import { h, dessin, bouton, nombre, choix, glisse, couleur, segments, dialogue, confirmer, avis, copier, sansDeranger } from './ui.js';
import { poser, section, choisirObjet, poserObjet, nomObjet } from './inspecteur.js';
import { allerAuPlan } from './scene.js';

const ID = /^[a-z][a-z0-9_]{0,30}$/;
const plansAvec = (test) => E.film.plans.map((p, i) => test(p) ? i : -1).filter(i => i >= 0);
const demanderNom = (titre, deja, action) => {
  const c = h('input', { type: 'text', 'aria-label': 'Nom', placeholder: 'par exemple : lea', spellcheck: 'false' }), erreur = h('p', { class: 'aide alerte' });
  const ok = () => { const v = c.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_'); if (!ID.test(v)) { erreur.textContent = 'Des lettres, des chiffres, et une lettre pour commencer.'; return; } if (deja.includes(v)) { erreur.textContent = 'Ce nom est déjà pris.'; return; } d.fermer(); action(v); };
  c.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  const d = dialogue(titre, [c, erreur, h('div', { class: 'actions' }, bouton('Créer', ok, { classe: 'or' }))], { classe: 'petit' });
  c.focus();
};

// ------------------------------------------------------------------ les personnages
const NEUF = { silhouette: 'femme', age: 'jeune', traits: 'simple', tete: 1.3, peau: '#c99470', cheveux: { style: 'mi_long', couleur: '#3b2a1c' }, haut: { couleur: '#a8645a', col: 'rond', manches: 'longues', longueur: 'hanches' }, bas: { type: 'pantalon', couleur: '#3a3a48' }, chaussures: { type: 'baskets', couleur: '#f2f0ea' } };
export function listePersonnages() {
  const el = h('div', { class: 'fiches' }), dessiner = () => {
    const ids = Object.keys(E.film.personnages || {});
    el.replaceChildren(...ids.map(id => h('button', { type: 'button', class: 'fiche', 'aria-pressed': String(E.selection.genre === 'personnage' && E.selection.id === id), onclick: () => choisir({ genre: 'personnage', id, plan: planChoisi() }) }, moteur()?.PERSO ? dessin(...portrait(E.film.personnages[id], 'neutre'), 'mini-portrait') : null, h('span', { class: 'nom' }, joli(id)), h('span', { class: 'aide' }, quantite(plansAvec(p => (p.acteurs || []).some(a => a.id === id)).length)))),
      bouton('Nouveau personnage', () => demanderNom('Comment s\'appelle ce personnage ?', ids, id => { modifier(`créer ${id}`, f => { f.personnages = f.personnages || {}; f.personnages[id] = JSON.parse(JSON.stringify(NEUF)); }); choisir({ genre: 'personnage', id, plan: planChoisi() }); }), { icone: 'plus', classe: 'ajout' }));
  };
  const redessine = sansDeranger(el, dessiner);
  quand('film', redessine); quand('selection', redessine); quand('moteur', redessine);
  dessiner();
  return el;
}
const quantite = (n) => n ? `dans ${n} plan${n > 1 ? 's' : ''}` : 'dans aucun plan';
let vue = 25, humeur = 'neutre';
export function personnage(s) {
  const d = E.film.personnages?.[s.id];
  if (!d) { queueMicrotask(() => choisir({ genre: 'plan', plan: planChoisi() })); return []; }
  const maj = (quoi, fn) => modifier(`${quoi} de ${s.id}`, f => fn(f.personnages[s.id])), sous = (zone, cle, quoi, base = {}) => v => maj(quoi, q => { q[zone] = Object.assign({}, base, q[zone]); poser(q[zone], cle, v); });
  // une partie qu'on peut ne pas avoir (barbe, coiffe, manteau…) : « sans » la retire
  const partie = (zone, quoi, couleurDe) => v => maj(quoi, q => { if (v === undefined) { if (zone === 'bas') q.bas = null; else delete q[zone]; } else q[zone] = Object.assign({ couleur: couleurDe }, q[zone], { [zone === 'barbe' ? 'style' : 'type']: v }); });
  const scene = h('div', { class: 'essayage' }), montre = () => { if (moteur()?.PERSO) scene.replaceChildren(dessin(...silhouette(E.film.personnages[s.id], 'debout', { vue, visage: humeur }), 'grand')); };
  montre();
  const plans = plansAvec(p => (p.acteurs || []).some(a => a.id === s.id));
  return [
    h('header', { class: 'entete' }, bouton('', () => choisir({ genre: 'plan', plan: planChoisi() }), { icone: 'retour', titre: 'Retour au plan', classe: 'discret' }), h('h2', {}, joli(s.id)), h('span', { class: 'ressort' }), bouton('', async () => { if (plans.length) { avis(`${s.id} est ${quantite(plans.length)} : retire-le d'abord de ces plans`); return; } if (await confirmer(`Supprimer ${s.id} ?`, "Tu pourras l'annuler.", 'Supprimer', { danger: true })) { modifier(`supprimer ${s.id}`, f => { delete f.personnages[s.id]; }); choisir({ genre: 'plan', plan: planChoisi() }); } }, { icone: 'corbeille', titre: 'Supprimer ce personnage', classe: 'discret' })),
    scene,
    h('div', { class: 'deux' }, glisse('Le tourner', vue, v => { vue = v; }, { min: -90, max: 180, pas: 5, montre: () => '', vif: v => { vue = v; montre(); } }), choix('Humeur', humeur, Object.keys(moteur()?.PERSO?.VISAGES || { neutre: 1 }).map(v => [v, nomme(v)]), v => { humeur = v; montre(); })),
    plans.length ? h('p', { class: 'aide' }, `Le changement se voit ${quantite(plans.length)}.`) : null,
    section('Corps', h('div', { class: 'deux' }, segments('Silhouette', d.silhouette || 'homme', [['femme', 'Femme'], ['homme', 'Homme']], v => maj('la silhouette', q => { q.silhouette = v; })), choix('Âge', d.age || 'adulte', AGES, v => maj("l'âge", q => poser(q, 'age', v)))), glisse('Corpulence', d.corpulence ?? .5, v => maj('la corpulence', q => { q.corpulence = v; })), couleur('Peau', d.peau, v => maj('la peau', q => { q.peau = v; }), PEAUX)),
    section('Tête', h('div', { class: 'deux' }, choix('Cheveux', d.cheveux?.style, STYLES.cheveux, sous('cheveux', 'style', 'les cheveux')), choix('Barbe', typeof d.barbe === 'object' ? d.barbe?.style : d.barbe ? 'courte' : '', STYLES.barbe, partie('barbe', 'la barbe', d.cheveux?.couleur || '#2a1a12'))), couleur('Couleur des cheveux', d.cheveux?.couleur, sous('cheveux', 'couleur', 'les cheveux'), CHEVEUX), d.barbe ? couleur('Couleur de la barbe', d.barbe.couleur, sous('barbe', 'couleur', 'la barbe'), CHEVEUX) : null, choix('Sur la tête', d.coiffe?.type, STYLES.coiffe, partie('coiffe', 'la coiffe', '#3d4a6a')), d.coiffe ? couleur('Couleur de la coiffe', d.coiffe.couleur, sous('coiffe', 'couleur', 'la coiffe'), TISSUS) : null),
    section('Vêtements', couleur('Haut', d.haut?.couleur, sous('haut', 'couleur', 'le haut'), TISSUS), h('div', { class: 'deux' }, choix('Col', d.haut?.col || 'rond', STYLES.col, sous('haut', 'col', 'le col')), choix('Longueur', d.haut?.longueur || 'hanches', STYLES.longueur, sous('haut', 'longueur', 'la longueur'))), h('div', { class: 'deux' }, choix('Manches', d.haut?.manches || 'longues', STYLES.manches, sous('haut', 'manches', 'les manches')), choix('Bas', d.bas === null ? '' : d.bas?.type || 'pantalon', STYLES.bas, partie('bas', 'le bas', '#3a3a48'))), d.bas !== null ? couleur('Couleur du bas', d.bas?.couleur, sous('bas', 'couleur', 'le bas', { type: 'pantalon' }), TISSUS) : null, choix('Par-dessus', d.manteau?.type, STYLES.manteau, partie('manteau', 'le manteau', '#9b2a26')), d.manteau ? couleur('Couleur du manteau', d.manteau.couleur, sous('manteau', 'couleur', 'le manteau'), TISSUS) : null, choix('Chaussures', d.chaussures?.type, STYLES.chaussures, sous('chaussures', 'type', 'les chaussures')), d.chaussures?.type !== 'pieds_nus' ? couleur('Couleur des chaussures', d.chaussures?.couleur, sous('chaussures', 'couleur', 'les chaussures'), TISSUS) : null),
  ];
}

// ------------------------------------------------------------------ les lieux
const SOL = { horizon: 700, y_ref: 1060 };
const PIECE = { sol: SOL, heure: 'soir', couches: [{ gen: 'piece', fond: [-150, 220, 1230, 860], mur: { couleur: '#b7a2a8', matiere: 'enduit' }, sol: { couleur: '#8a6f5e', matiere: 'parquet' }, plafond: '#cdbfae', profondeur: .95, fenetres: [{ x: 700, y: 533, l: 260, h: 222, ciel: 'jour' }] }], objets: [] };
const DEHORS = { sol: SOL, heure: 'matin', couches: [{ gen: 'ciel', profondeur: 0 }, { gen: 'relief', y: 700, amplitude: 130, couleur: '#9aa886', profondeur: .15, seed: 6 }, { gen: 'sol', y: 700, matiere: 'herbe', couleur: '#a8a86e', profondeur: 1 }], objets: [] };
export function listeLieux() {
  const el = h('div', { class: 'fiches' }), dessiner = () => {
    const noms = Object.keys(E.film.lieux || {});
    el.replaceChildren(...noms.map(nom => h('button', { type: 'button', class: 'fiche lieu', 'aria-pressed': String(E.selection.genre === 'lieu' && E.selection.nom === nom), onclick: () => ouvrirLieu(nom) }, h('span', { class: 'heure ' + (E.film.lieux[nom].heure || 'libre') }), h('span', { class: 'nom' }, joli(nom)), h('span', { class: 'aide' }, quantite(plansAvec(p => p.lieu === nom).length)))),
      bouton('Une pièce', () => neuf('pièce', PIECE, noms), { icone: 'plus', classe: 'ajout' }), bouton('Un lieu dehors', () => neuf('lieu', DEHORS, noms), { icone: 'plus', classe: 'ajout' }));
  };
  const redessine = sansDeranger(el, dessiner);
  quand('film', redessine); quand('selection', redessine);
  dessiner();
  return el;
}
const neuf = (quoi, modele, noms) => demanderNom(`Comment s'appelle ce ${quoi === 'pièce' ? 'lieu (une pièce)' : 'lieu'} ?`, noms, nom => { modifier(`créer ${nom}`, f => { f.lieux = f.lieux || {}; f.lieux[nom] = JSON.parse(JSON.stringify(modele)); }); choisir({ genre: 'lieu', nom, plan: planChoisi() }); });
function ouvrirLieu(nom) {
  const i = plan()?.lieu === nom ? planChoisi() : plansAvec(p => p.lieu === nom)[0];
  choisir({ genre: 'lieu', nom, plan: i ?? planChoisi() });
  if (i !== undefined) allerAuPlan(i);
}
export function lieu(s) {
  const l = E.film.lieux?.[s.nom];
  if (!l) { queueMicrotask(() => choisir({ genre: 'plan', plan: planChoisi() })); return []; }
  const maj = (quoi, fn) => modifier(`${quoi} (${s.nom})`, f => fn(f.lieux[s.nom])), plans = plansAvec(p => p.lieu === s.nom), i = plans.includes(planChoisi()) ? planChoisi() : plans[0];
  const choses = ['couches', 'objets'].flatMap(liste => (l[liste] || []).map((o, k) => ({ o, liste, k }))), fonds = ['ciel', 'relief', 'nuages', 'sol', 'piece', 'eau', 'ville', 'chemin', 'pluie', 'neige', 'particules', 'rayons', 'brume', 'lumiere'];
  const ouvre = ({ liste, k }) => i === undefined ? avis('Aucun plan ne se passe ici : choisis ce lieu pour un plan') : choisir({ genre: 'objet', plan: i, source: { ou: 'lieu', liste, k } });
  const piece = (l.couches || []).find(c => c.gen === 'piece'), sol = (l.couches || []).find(c => c.gen === 'sol'), M = moteur()?.MONDE;
  const matieres = (M?.MATIERES_SOL || []).map(m => [m, nomme(m)]), murs = ['enduit', 'papier', 'lambris', 'bois', 'pierre', 'brique', 'carrelage'].map(m => [m, nomme(m)]);
  const dans = (c, fn) => (f) => fn(f.couches[(l.couches || []).indexOf(c)]);
  return [
    h('header', { class: 'entete' }, bouton('', () => choisir({ genre: 'plan', plan: planChoisi() }), { icone: 'retour', titre: 'Retour au plan', classe: 'discret' }), h('h2', {}, joli(s.nom)), h('span', { class: 'ressort' }), bouton('', async () => { if (plans.length) { avis(`Ce lieu est ${quantite(plans.length)} : change d'abord le lieu de ces plans`); return; } if (await confirmer(`Supprimer « ${s.nom} » ?`, "Tu pourras l'annuler.", 'Supprimer', { danger: true })) { modifier(`supprimer ${s.nom}`, f => { delete f.lieux[s.nom]; }); choisir({ genre: 'plan', plan: planChoisi() }); } }, { icone: 'corbeille', titre: 'Supprimer ce lieu', classe: 'discret' })),
    h('p', { class: 'aide' }, plans.length ? `Le changement se voit ${quantite(plans.length)}.` : "Aucun plan ne se passe ici pour l'instant."),
    segments('Heure', l.heure || '', HEURES, v => maj("l'heure", q => poser(q, 'heure', v))),
    piece ? section('Pièce', h('div', { class: 'deux' }, couleur('Murs', piece.mur?.couleur, v => maj('les murs', dans(piece, c => { c.mur = Object.assign({}, c.mur, { couleur: v }); }))), choix('Matière', piece.mur?.matiere || 'enduit', murs, v => maj('les murs', dans(piece, c => { c.mur = Object.assign({}, c.mur, { matiere: v }); })))), h('div', { class: 'deux' }, couleur('Sol', piece.sol?.couleur, v => maj('le sol', dans(piece, c => { c.sol = Object.assign({}, c.sol, { couleur: v }); }))), choix('Matière', piece.sol?.matiere || 'parquet', matieres, v => maj('le sol', dans(piece, c => { c.sol = Object.assign({}, c.sol, { matiere: v }); })))), (piece.fenetres || []).map((fe, k) => h('div', { class: 'deux' }, choix(`Par la fenêtre ${k + 1}`, fe.ciel, [['nuit', 'La nuit'], ['aube', "L'aube"], ['jour', 'Le jour'], ['soir', 'Le soir']], v => maj('la fenêtre', dans(piece, c => { c.fenetres[k].ciel = v; }))), couleur('Rideaux', fe.rideaux, v => maj('les rideaux', dans(piece, c => { c.fenetres[k].rideaux = v; })))))) : null,
    sol && !piece ? section('Sol', h('div', { class: 'deux' }, couleur('Couleur', sol.couleur, v => maj('le sol', dans(sol, c => { c.couleur = v; }))), choix('Matière', sol.matiere || 'terre', matieres, v => maj('le sol', dans(sol, c => { c.matiere = v; }))))) : null,
    section('Ce qu\'on y trouve', h('div', { class: 'jetons' }, choses.filter(c => !fonds.includes(c.o.gen)).map(c => h('button', { type: 'button', class: 'jeton', onclick: () => ouvre(c) }, nomObjet(c.o))), bouton('Ajouter', () => i === undefined ? avis('Choisis d\'abord ce lieu pour un plan') : choisirObjet(o => { choisir({ genre: 'plan', plan: i }); poserObjet(i, 'lieu', o); }), { icone: 'plus', classe: 'ajout' }))),
    section('Fond', h('div', { class: 'jetons' }, choses.filter(c => fonds.includes(c.o.gen)).map(c => h('button', { type: 'button', class: 'jeton', onclick: () => ouvre(c) }, nomObjet(c.o))))),
    h('details', { class: 'plus' }, h('summary', {}, 'Perspective'), h('p', { class: 'aide' }, 'La ligne d\'horizon et la hauteur où un adulte est à sa taille : à ne changer que si tout le lieu est à refaire.'), h('div', { class: 'deux' }, nombre('Horizon', l.sol?.horizon, v => maj("l'horizon", q => { q.sol = Object.assign({}, q.sol); poser(q.sol, 'horizon', v); })), nombre('Sol de référence', l.sol?.y_ref, v => maj('le sol', q => { q.sol = Object.assign({}, q.sol); poser(q.sol, 'y_ref', v); })))),
  ];
}

// ------------------------------------------------------------------ la Bible
export function bible() {
  const resultats = h('div', { class: 'versets' }), champ = h('input', { type: 'search', 'aria-label': 'Une référence ou des mots', placeholder: 'Luc 15:20, ou : marcher sur les eaux' });
  let attente = null;
  const cherche = async () => {
    const q = champ.value.trim();
    if (q.length < 3) { resultats.replaceChildren(h('p', { class: 'aide' }, 'Louis Segond 1910, mot pour mot. Cherche une référence ou des mots.')); return; }
    try {
      const r = /\d/.test(q) ? await lire(`bible?ref=${encodeURIComponent(q)}`) : await lire(`bible?mots=${encodeURIComponent(q)}`);
      const l = r.trouves || [r];
      resultats.replaceChildren(...(l.length ? l.map(verset) : [h('p', { class: 'aide' }, 'Rien trouvé. Essaie avec d\'autres mots.')]));
    } catch (e) { resultats.replaceChildren(h('p', { class: 'aide' }, e.message)); }
  };
  champ.addEventListener('input', () => { clearTimeout(attente); attente = setTimeout(cherche, 250); });
  cherche();
  return h('div', { class: 'bible' }, champ, resultats);
}
function verset(v) {
  const jesus = (v.jesus || []).length ? v.jesus : null;
  return h('article', { class: 'verset' }, h('h3', {}, v.ref), h('p', {}, v.texte), jesus ? h('p', { class: 'aide' }, `Jésus y dit : « ${jesus.join(' … ')} »`) : null, h('div', { class: 'actions gauche' }, bouton('Copier', () => copier(`« ${v.texte} » (${v.ref})`, v.ref), { icone: 'copier' }), bouton('Mettre dans le plan', () => citer(v), { icone: 'plus' })));
}
// la citation : dite entre « », déclarée (pour être vérifiée mot pour mot) et montrée sur sa carte
function citer(v) {
  const i = planChoisi(), dit = (v.jesus || []).length === 1 ? v.jesus[0] : v.texte, qui = (v.jesus || []).length === 1 ? 'jesus' : undefined;
  if (!plan(i)) { avis('Choisis d\'abord un plan'); return; }
  modifier(`citer ${v.ref}`, f => { const p = f.plans[i]; p.texte = [p.texte, `« ${dit} »`].filter(Boolean).join(' '); p.cite = [...(p.cite || []), Object.assign({ ref: v.ref }, qui ? { qui } : {})]; p.graphiques = [...(p.graphiques || []), { type: 'citation', ref: v.ref, texte: dit, entete: qui ? 'JÉSUS DIT' : 'LA BIBLE DIT' }]; });
  avis(`${v.ref} est dans le plan ${i + 1} : coupe ce qui n'est pas dit, le vérificateur contrôle mot pour mot`);
}
