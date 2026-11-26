// L'inspecteur : ce qui est choisi (un plan, un personnage, un objet, un signe à l'écran) et tout ce qu'on peut en changer. Les gestes,
// les visages, les objets se choisissent sur dessin. Chaque changement se voit aussitôt et s'annule.
import { E, quand, modifier, choisir, plan, planChoisi } from './etat.js';
import { lire } from './api.js';
import { moteur, nomme, joli, trie, REGISTRES, CADRES, TRANSITIONS, REGARDS, GRAPHISMES, A_AJOUTER, CONTENUS, ASSIS, silhouette, portrait, objet, rayons, aPoser } from './catalogue.js';
import { h, dessin, bouton, texte, long, nombre, choix, glisse, coche, couleur, segments, dialogue, avis, sansDeranger, centrer } from './ui.js';
import { motsDe, inserer, supprimer, deplacerPlan } from './texte.js';
import * as fiches from './fiches.js';

let racine;
export function construire() {
  racine = h('div', { class: 'inspecteur' });
  const redessine = sansDeranger(racine, dessiner);
  quand('selection', redessine); quand('film', redessine); quand('moteur', redessine);
  dessiner();
  return racine;
}
// redessine sans perdre le champ où l'on est
function dessiner() {
  if (!E.film) return;
  const focus = () => [...racine.querySelectorAll('input,select,textarea,button')], rang = focus().indexOf(document.activeElement), haut = racine.parentElement?.scrollTop;
  const s = E.selection, vues = { acteur, objet: unObjet, graphique, personnage: fiches.personnage, lieu: fiches.lieu };
  let contenu;
  try { contenu = (vues[s.genre] || unPlan)(s); } catch (e) { contenu = [h('p', { class: 'aide' }, `Impossible d'afficher : ${e.message}`)]; }
  racine.replaceChildren(...[contenu].flat(9).filter(Boolean));
  if (rang >= 0) focus()[rang]?.focus({ preventScroll: true });
  if (haut !== undefined) racine.parentElement.scrollTop = haut;
}
export const poser = (o, cle, v) => { if (v === undefined || v === '' || v === null || Number.isNaN(v)) delete o[cle]; else o[cle] = v; };
export const section = (titre, ...enfants) => h('section', { class: 'groupe' }, h('h3', {}, titre), ...enfants);
const entete = (titre, retour, ...outils) => h('header', { class: 'entete' }, retour ? bouton('', retour, { icone: 'retour', titre: 'Retour au plan', classe: 'discret' }) : null, h('h2', {}, titre), h('span', { class: 'ressort' }), ...outils);
const auPlan = () => choisir({ genre: 'plan', plan: planChoisi() });

// ------------------------------------------------------------------ le plan
function unPlan() {
  const i = planChoisi(), p = plan(i);
  if (!p) return [h('p', { class: 'aide' }, "Choisis un plan dans le texte, ou clique sur un personnage dans l'image.")];
  const maj = (quoi, fn) => modifier(`${quoi} (plan ${i + 1})`, f => fn(f.plans[i], f)), champ = (cle, quoi) => v => maj(quoi, q => poser(q, cle, v));
  return [
    entete(`Plan ${i + 1}`, null, bouton('', () => deplacerPlan(i, -1), { icone: 'haut', titre: 'Monter ce plan', classe: 'discret', inactif: !i }), bouton('', () => deplacerPlan(i, 1), { icone: 'bas', titre: 'Descendre ce plan', classe: 'discret', inactif: i === E.film.plans.length - 1 }), bouton('', () => inserer(i + 1), { icone: 'plus', titre: 'Ajouter un plan après', classe: 'discret' }), bouton('', () => supprimer(i), { icone: 'corbeille', titre: 'Supprimer ce plan', classe: 'discret' })),
    long('Ce que dit la voix', p.texte, v => maj('le texte', q => poser(q, 'texte', v.trim().replace(/\s+/g, ' '))), { lignes: 3, aide: 'Entoure un mot d\'étoiles pour que la voix l\'appuie : *Silence*' }),
    h('div', { class: 'deux' }, choix('Moment', p.registre, [['', 'Libre'], ...REGISTRES], champ('registre', 'le moment')), choix('Lieu', p.lieu, [['', 'Aucun'], ...Object.keys(E.film.lieux || {}).map(n => [n, joli(n)])], champ('lieu', 'le lieu'))),
    h('div', { class: 'deux' }, choix('Entrée', p.transition, TRANSITIONS, champ('transition', "l'entrée")), nombre('Pause après (s)', p.pause, champ('pause', 'la pause'), { pas: .1, min: 0, max: 4, exemple: 'auto' })),
    camera(p, i, maj),
    section('Personnages', h('div', { class: 'jetons' }, (p.acteurs || []).map((a, k) => jeton(joli(a.id), () => choisir({ genre: 'acteur', plan: i, k }), vignette(a))), bouton('Ajouter', () => ajouterActeur(i), { icone: 'plus', classe: 'ajout' }))),
    section("Signes à l'écran", h('div', { class: 'jetons' }, (p.graphiques || []).map((g, k) => jeton(nomGraphique(g), () => choisir({ genre: 'graphique', plan: i, k }))), bouton('Ajouter', () => ajouterGraphique(i), { icone: 'plus', classe: 'ajout' }))),
    section('Objets de ce plan', h('div', { class: 'jetons' }, ['objets', 'couches'].flatMap(liste => (p[liste] || []).map((o, k) => jeton(nomObjet(o), () => choisir({ genre: 'objet', plan: i, source: { ou: 'plan', liste, k } })))), bouton('Ajouter', () => choisirObjet(o => poserObjet(i, 'plan', o)), { icone: 'plus', classe: 'ajout' })), h('p', { class: 'aide' }, 'Ce qui est là dans tous les plans du lieu se règle dans l\'onglet Lieux.')),
    citations(p, maj),
  ];
}
const jeton = (nom, action, image) => h('button', { type: 'button', class: 'jeton', onclick: action }, image || null, h('span', {}, nom));
const nomGraphique = (g) => { const n = GRAPHISMES[g.type]?.[0] || nomme(g.type), t = g.ref || g.texte || g.titre || ''; return t ? `${n} : ${t.length > 26 ? t.slice(0, 25) + '…' : t}` : n; };
export const nomObjet = (o) => o.gen ? nomme(o.type || o.espece || o.gen) : 'Dessin libre';
function vignette(a) {
  const desc = E.film.personnages?.[a.id];
  if (!desc || !moteur()?.PERSO) return null;
  return dessin(...portrait(desc, (a.actions || []).find(x => x.visage)?.visage || 'neutre'), 'mini-portrait');
}

// la caméra : qui l'on regarde et de combien près, au début, puis à la fin du plan
function camera(p, i, maj) {
  const cles = p.camera || [], ids = (p.acteurs || []).map(a => a.id), libre = cles.some(k => k.cadre === undefined && (k.x !== undefined || k.zoom !== undefined)), compose = cles.length > 2 || cles.some(k => k.mot);
  if (libre || compose) return section('Caméra', h('p', { class: 'aide' }, libre ? 'Réglée à la main pour ce plan.' : `${cles.length} mouvements, accrochés aux mots.`), bouton('Repartir d\'un cadre simple', () => maj('la caméra', q => { q.camera = [{ t: 0, cadre: ids.slice(0, 1), plan: 'moyen' }]; if (!ids.length) delete q.camera; })));
  if (!ids.length) return section('Caméra', h('p', { class: 'aide' }, 'Ajoute un personnage pour le cadrer.'));
  const qui = (k) => [].concat(k.cadre || []), regle = (k, titre) => h('div', { class: 'cadrage' }, h('p', { class: 'sous-titre' }, titre),
    h('div', { class: 'jetons', role: 'group', 'aria-label': `${titre} : qui` }, ids.map(id => h('button', { type: 'button', class: 'jeton', 'aria-pressed': String(qui(cles[k]).includes(id)), onclick: () => maj('la caméra', q => { const l = qui(q.camera[k]); q.camera[k].cadre = l.includes(id) ? (l.length > 1 ? l.filter(x => x !== id) : l) : [...l, id]; }) }, joli(id)))),
    choix('De combien près', cles[k].plan || 'moyen', CADRES, v => maj('la caméra', q => { q.camera[k].plan = v; })));
  if (!cles.length) return section('Caméra', bouton('Cadrer un personnage', () => maj('la caméra', q => { q.camera = [{ t: 0, cadre: [ids[0]], plan: 'moyen' }]; }), { classe: 'ajout', icone: 'plus' }));
  return section('Caméra', regle(0, 'Au début'), cles[1] ? regle(1, 'À la fin') : null, cles[1] ? bouton('Ne plus bouger', () => maj('la caméra', q => { q.camera.length = 1; })) : bouton('Bouger pendant le plan', () => maj('la caméra', q => { q.camera.push(Object.assign({}, q.camera[0], { t: 'fin', plan: 'serre' })); })));
}
function citations(p, maj) {
  const l = p.cite || [];
  if (!l.length) return null;
  return section('Paroles citées', l.map((c, k) => h('div', { class: 'cite' }, texte('Référence', c.ref, v => maj('la référence', q => { q.cite[k].ref = v; })), choix('Qui parle', c.qui || '', [['', 'La Bible (le récit)'], ['jesus', 'Jésus'], ['autre', 'Quelqu\'un d\'autre']], v => maj('qui parle', q => poser(q.cite[k], 'qui', v))), bouton('', () => maj('la citation', q => { q.cite.splice(k, 1); if (!q.cite.length) delete q.cite; }), { icone: 'corbeille', titre: 'Retirer', classe: 'discret' }))));
}

// ------------------------------------------------------------------ un personnage dans le plan
function acteur(s) {
  const a = plan(s.plan)?.acteurs?.[s.k];
  if (!a) { queueMicrotask(auPlan); return []; }
  const i = s.plan, maj = (quoi, fn) => modifier(`${quoi} (${a.id})`, f => fn(f.plans[i].acteurs[s.k], f.plans[i]));
  const champ = (cle, quoi) => v => maj(quoi, q => poser(q, cle, v));
  return [
    entete(joli(a.id), auPlan, bouton('', () => choisir({ genre: 'personnage', id: a.id, plan: i }), { icone: 'crayon', titre: 'Modifier son apparence', classe: 'discret' }), bouton('', () => { modifier(`retirer ${a.id}`, f => { const p = f.plans[i]; p.acteurs.splice(s.k, 1); nettoyer(p); }); auPlan(); }, { icone: 'corbeille', titre: 'Retirer de ce plan', classe: 'discret' })),
    h('div', { class: 'deux' }, segments('Tourné vers', a.sens ?? 1, [[-1, 'Gauche'], [1, 'Droite']], v => maj('le sens', q => { q.sens = v; })), h('div', { class: 'deux serre' }, nombre('x', a.x, champ('x', 'la place')), nombre('y', a.y, champ('y', 'la place')))),
    section('Ce qu\'il fait', (a.actions || []).map((x, j) => action(a, x, j, i, maj)), bouton('Ajouter un geste sur un mot', () => maj('un geste', q => { q.actions = q.actions || [{ t: 0, pose: 'debout' }]; q.actions.push({ mot: motsDe(plan(i)).map(m => m.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(m => m.length > 3).pop() || '', visage: 'neutre' }); }), { icone: 'plus', classe: 'ajout' })),
    h('details', { class: 'plus' }, h('summary', {}, 'Autres réglages'), coche('Peut sortir de l\'image', a.hors_champ_ok, champ('hors_champ_ok', 'le hors-champ')), nombre('Échelle', a.echelle, champ('echelle', "l'échelle"), { pas: .05, min: .3, max: 2, exemple: '1' }), texte('Porté par (nom d\'une barque…)', a.porte_par, champ('porte_par', 'ce qui le porte'), { brut: true }), coche('Pas d\'ombre au sol', a.ombre === false, v => maj("l'ombre", q => poser(q, 'ombre', v ? false : undefined)))),
  ];
}
// plus personne à cadrer, un signe sans tête : on ne laisse pas de fil pendant
function nettoyer(p) {
  const ids = (p.acteurs || []).map(a => a.id);
  for (const k of p.camera || []) if (k.cadre) k.cadre = [].concat(k.cadre).filter(id => ids.includes(id));
  if (p.camera) p.camera = p.camera.filter(k => !k.cadre || k.cadre.length);
  if (p.camera && !p.camera.length) delete p.camera;
  if (p.graphiques) p.graphiques = p.graphiques.filter(g => !g.sur || ids.includes(g.sur));
  for (const a of p.acteurs || []) for (const x of a.actions || []) if (x.regarde && !ids.includes(x.regarde) && !REGARDS.some(([r]) => r === x.regarde)) delete x.regarde;
}
function action(a, x, j, i, maj) {
  const p = plan(i), desc = E.film.personnages?.[a.id] || {}, m = (quoi, fn) => maj(quoi, q => fn(q.actions[j])), assis = (x.angles?.assise || 0) >= .5;
  const mots = [...new Set(motsDe(p).map(w => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean))];
  const autres = (p.acteurs || []).map(q => q.id).filter(id => id !== a.id);
  return h('div', { class: 'geste' },
    h('div', { class: 'quand' }, choix('Quand', x.mot || (x.t ? '__t' : ''), [['', 'Dès le début'], ...mots.map(w => [w, `Sur « ${w} »`]), ...(x.t ? [['__t', `À ${x.t} s`]] : [])], v => m('le moment du geste', q => { delete q.mot; delete q.mot_n; if (!v) q.t = 0; else if (v !== '__t') { delete q.t; q.mot = v; } })), j > 0 || (a.actions || []).length > 1 ? bouton('', () => maj('retirer un geste', q => { q.actions.splice(j, 1); if (q.actions.length && q.actions[0].mot === undefined && q.actions[0].t === undefined) q.actions[0].t = 0; }), { icone: 'corbeille', titre: 'Retirer ce geste', classe: 'discret' }) : null),
    h('div', { class: 'deux images' },
      choixImage('Geste', x.pose ? nomme(x.pose) : 'Garde sa posture', moteur()?.PERSO ? dessin(...silhouette(desc, x.pose || 'debout', { vue: x.vue, visage: x.visage, angles: x.angles }), 'mini-silhouette') : null, () => choisirPose(desc, x, v => m('le geste', q => { poser(q, 'pose', v); if (['assis', 'pleure_assis'].includes(v)) delete q.angles; }))),
      choixImage('Visage', x.visage ? nomme(x.visage) : 'Inchangé', moteur()?.PERSO ? dessin(...portrait(desc, x.visage || 'neutre'), 'mini-portrait') : null, () => choisirVisage(desc, v => m('le visage', q => poser(q, 'visage', v))))),
    h('div', { class: 'deux' }, choix('Regarde', x.regarde, [...REGARDS, ...autres.map(id => [id, joli(id)])], v => m('le regard', q => poser(q, 'regarde', v))), glisse('Orientation', x.vue ?? 35, v => m("l'orientation", q => { q.vue = v; }), { min: 0, max: 180, pas: 5, montre: v => ({ 0: 'de face', 35: 'trois-quarts', 90: 'de profil', 180: 'de dos' })[v] || `${v}°` })),
    h('div', { class: 'deux' }, coche('Assis sur un siège', assis, v => m('assis', q => { if (v) q.angles = Object.assign({}, q.angles, ASSIS); else delete q.angles; })), coche('Parle (ses lèvres bougent)', x.parle, v => m('la parole', q => poser(q, 'parle', v || undefined)))),
    choix('Tient', typeof x.tient === 'string' ? x.tient : x.tient === null ? '__rien' : '', [['', 'Comme avant'], ['telephone', 'Un téléphone'], ['__rien', 'Plus rien']], v => m("l'objet tenu", q => { if (v === undefined) delete q.tient; else q.tient = v === '__rien' ? null : v; })));
}
const choixImage = (libelle, nom, image, ouvre) => h('div', { class: 'champ' }, h('span', { class: 'libelle' }, libelle), h('button', { type: 'button', class: 'choix-image', 'aria-label': `${libelle} : ${nom}`, onclick: ouvre }, image, h('span', {}, nom)));
// une planche de dessins où l'on choisit
export function planche(titre, groupes, action, o = {}) {
  const d = dialogue(titre, groupes.map(([nom, cases]) => [nom ? h('h3', {}, nom) : null, h('div', { class: 'planche' }, cases.map(([valeur, libelle, image]) => h('button', { type: 'button', class: 'case', 'aria-pressed': String(valeur === o.choisi), onclick: () => { d.fermer(); action(valeur); } }, image(), h('span', {}, libelle))))]), { classe: 'large' });
  if (o.centre) d.element.querySelectorAll('svg.dessin').forEach(centrer);
}
function choisirPose(desc, x, action_) {
  const noms = Object.keys(moteur().RIG.POSES).filter(n => !['attente', 'attend'].includes(n));
  planche('Quel geste ?', [['', [[undefined, 'Garde sa posture', () => h('span', { class: 'rien' })], ...trie(noms).map(([v, t]) => [v, t, () => dessin(...silhouette(desc, v, { visage: x.visage }))])]]], action_, { choisi: x.pose });
}
function choisirVisage(desc, action_) {
  planche('Quel visage ?', [['', [[undefined, 'Inchangé', () => h('span', { class: 'rien' })], ...trie(Object.keys(moteur().PERSO.VISAGES)).map(([v, t]) => [v, t, () => dessin(...portrait(desc, v))])]]], action_);
}
function ajouterActeur(i) {
  const ids = Object.keys(E.film.personnages || {}), deja = (plan(i).acteurs || []).map(a => a.id), libres = ids.filter(id => !deja.includes(id));
  if (!ids.length) { avis('Crée d\'abord un personnage (onglet Personnages)'); return; }
  planche('Qui est dans ce plan ?', [['', libres.map(id => [id, joli(id), () => dessin(...portrait(E.film.personnages[id], 'neutre'))])]], id => {
    const l = plan(i).acteurs || [], yref = E.film.lieux?.[plan(i).lieu]?.sol?.y_ref ?? 1060, x = l.length ? Math.max(...l.map(a => a.x ?? 540)) + 190 : 540;
    modifier(`ajouter ${id}`, f => { const p = f.plans[i]; p.acteurs = p.acteurs || []; p.acteurs.push({ id, x: Math.min(920, x), y: yref - 10, sens: l.length ? -1 : 1, actions: [{ t: 0, pose: 'debout', visage: 'neutre' }] }); if (!p.camera?.length) p.camera = [{ t: 0, cadre: [id], plan: 'moyen' }]; });
    choisir({ genre: 'acteur', plan: i, k: plan(i).acteurs.length - 1 });
  });
}

// ------------------------------------------------------------------ un signe à l'écran
const CHAMPS = {
  texte: (g, m) => long('Texte', g.texte, v => m('texte', v), { lignes: 2 }), titre: (g, m) => texte('Titre', g.titre, v => m('titre', v)), entete: (g, m) => texte('En-tête', g.entete, v => m('entete', v), { exemple: 'LA BIBLE DIT' }),
  ligne: (g, m) => texte('Ligne du haut', g.ligne, v => m('ligne', v)), sous: (g, m) => texte('Ligne du bas', g.sous, v => m('sous', v)), taille: (g, m) => nombre('Taille', g.taille, v => m('taille', v), { pas: g.type === 'coeur' ? .02 : 2, exemple: 'auto' }), y: (g, m) => nombre('Hauteur à l\'écran', g.y, v => m('y', v), { pas: 10, exemple: 'auto' }),
  bpm: (g, m) => nombre('Battements par minute', g.bpm, v => m('bpm', v), { min: 40, max: 180, exemple: '110' }), dx: (g, m) => nombre('Décalage à droite', g.dx, v => m('dx', v), { pas: .1, exemple: '0' }), dy: (g, m) => nombre('Décalage vers le bas', g.dy, v => m('dy', v), { pas: .1, exemple: '2,6' }), rotation: (g, m) => nombre('Inclinaison', g.rotation, v => m('rotation', v)),
  valeur: (g, m) => nombre('Valeur', g.valeur, v => m('valeur', v)), langue: (g, m) => texte('Langue', g.langue, v => m('langue', v), { exemple: 'grec' }), terme: (g, m) => texte('Mot en français', g.terme, v => m('terme', v)), original: (g, m) => texte("Mot d'origine", g.original, v => m('original', v)), translit: (g, m) => texte('Prononciation', g.translit, v => m('translit', v)), sens: (g, m) => long('Ce qu\'il veut dire', g.sens, v => m('sens', v), { lignes: 2 }),
  sur: (g, m, p) => choix('Sur qui', g.sur, [['', 'Personne'], ...(p.acteurs || []).map(a => a.id)], v => m('sur', v)), contenu: (g, m) => choix('Dedans', g.contenu, CONTENUS, v => m('contenu', v)), de: (g, m) => choix('Venant de', g.de, [['', 'La gauche'], ['droite', 'La droite']], v => m('de', v)),
  icone: (g, m) => h('div', { class: 'champ' }, h('span', { class: 'libelle' }, 'Icône'), bouton(g.icone || 'Choisir une icône', () => choisirIcone(v => m('icone', v)))),
  items: (g, m) => long('Une ligne par point', (g.items || []).map(x => typeof x === 'string' ? x : x.texte).join('\n'), v => m('items', v.split('\n').map(t => t.trim()).filter(Boolean).map((t, k) => { const x = (g.items || [])[k]; return x && typeof x === 'object' ? Object.assign({}, x, { texte: t }) : t; })), { lignes: 4 }),
  ref: (g, m) => h('div', {}, texte('Référence', g.ref, v => m('ref', v), { exemple: 'Jean 3:16' }), ['citation', 'verset'].includes(g.type) ? bouton('Remettre le texte exact', async () => { try { const r = await lire(`bible?ref=${encodeURIComponent(g.ref || '')}`); m('texte', r.texte); } catch (e) { avis(e.message, { genre: 'erreur' }); } }) : null),
  cadre: (g, m) => { const c = h('div', {}); lire('carte').then(k => c.replaceChildren(choix('Région', g.cadre, k.cadres, v => m('cadre', v)))); return c; },
  lieux: (g, m) => { const c = h('div', { class: 'champ' }); lire('carte').then(k => c.replaceChildren(h('span', { class: 'libelle' }, 'Lieux montrés'), h('div', { class: 'jetons defile' }, k.lieux.map(n => { const l = (g.lieux || []).map(x => typeof x === 'string' ? x : x.nom); return h('button', { type: 'button', class: 'jeton', 'aria-pressed': String(l.includes(n)), onclick: () => m('lieux', l.includes(n) ? g.lieux.filter(x => (x.nom || x) !== n) : [...(g.lieux || []), n]) }, n); })))); return c; },
};
function graphique(s) {
  const i = s.plan, p = plan(i), g = p?.graphiques?.[s.k];
  if (!g) { queueMicrotask(auPlan); return []; }
  const [nom, champs] = GRAPHISMES[g.type] || [nomme(g.type), ['texte']], maj = (quoi, fn) => modifier(`${quoi} (${nom.toLowerCase()})`, f => fn(f.plans[i].graphiques[s.k])), m = (cle, v) => maj(cle, q => poser(q, cle, v));
  const mots = [...new Set(motsDe(p).map(w => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean))];
  return [
    entete(nom, auPlan, bouton('', () => { modifier(`retirer ${nom.toLowerCase()}`, f => { f.plans[i].graphiques.splice(s.k, 1); if (!f.plans[i].graphiques.length) delete f.plans[i].graphiques; }); auPlan(); }, { icone: 'corbeille', titre: 'Retirer', classe: 'discret' })),
    champs.map(c => CHAMPS[c](g, m, p)),
    choix('Apparaît', g.mot || '', [['', g.t ? `À ${g.t} s` : 'Dès le début'], ...mots.map(w => [w, `Sur « ${w} »`])], v => maj('le moment', q => { if (v) { q.mot = v; delete q.t; } else { delete q.mot; } })),
    Object.keys(g).some(k => !['type', 'mot', 't', ...champs].includes(k)) ? h('p', { class: 'aide' }, 'Ce signe a d\'autres réglages écrits par Claude : ils sont gardés.') : null,
  ];
}
function ajouterGraphique(i) {
  const p = plan(i), qui = p.acteurs?.[0]?.id, neufs = { citation: { ref: p.cite?.[0]?.ref || E.film.passage || 'Jean 3:16', texte: '' }, texte: { texte: 'Ton texte', y: 330 }, badge: { texte: 'Étiquette', t: .3 }, liste: { items: ['Premier point', 'Deuxième point'], y: 260 }, pensee: { sur: qui, icone: 'heart' }, bulle: { sur: qui, contenu: 'points' }, coeur: { sur: qui }, ondes: { sur: qui }, goutte: { sur: qui }, carte: { cadre: 'palestine', lieux: ['Jérusalem'] }, definition: { langue: 'grec', terme: '', original: '', translit: '', sens: '' }, telephone: { texte: 'Le message', t: .3 }, icone: { icone: 'heart', taille: 200 }, chiffre: { valeur: 3, texte: '' } };
  const d = dialogue('Que montrer ?', h('div', { class: 'jetons grands' }, A_AJOUTER.map(t => bouton(GRAPHISMES[t][0], async () => {
    d.fermer();
    if (neufs[t].sur === undefined && 'sur' in neufs[t]) { avis('Ce signe s\'accroche à quelqu\'un : ajoute d\'abord un personnage'); return; }
    const g = Object.assign({ type: t }, neufs[t]);
    if (t === 'citation') { try { const r = await lire(`bible?ref=${encodeURIComponent(g.ref)}`); g.texte = r.texte; g.ref = r.ref; } catch { delete g.texte; } }
    if (t === 'carte') { const k = await lire('carte'); g.cadre = k.cadres.includes(g.cadre) ? g.cadre : k.cadres[0]; }
    modifier(`ajouter ${GRAPHISMES[t][0].toLowerCase()}`, f => { f.plans[i].graphiques = f.plans[i].graphiques || []; f.plans[i].graphiques.push(g); });
    choisir({ genre: 'graphique', plan: i, k: plan(i).graphiques.length - 1 });
  }))), { classe: 'petit' });
}
function choisirIcone(action_) {
  const grille = h('div', { class: 'planche icones' }), cherche = async (mot) => { const l = await lire(`icones?mot=${encodeURIComponent(mot)}`); grille.replaceChildren(...Object.entries(l).slice(0, 120).map(([n, svg]) => h('button', { type: 'button', class: 'case', onclick: () => { d.fermer(); action_(n); } }, dessin(`<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</g>`, '0 0 24 24'), h('span', {}, n)))); };
  const d = dialogue('Quelle icône ?', [h('input', { type: 'search', placeholder: 'En anglais : heart, sun, phone…', 'aria-label': 'Chercher une icône', oninput: e => cherche(e.target.value) }), grille], { classe: 'large' });
  cherche('');
}

// ------------------------------------------------------------------ un objet (du plan ou du lieu)
const RANGES = { x: 'x', y: 'y', l: 'Largeur', h: 'Hauteur', prof: 'Profondeur', taille: 'Taille', hauteur: 'Hauteur', r: 'Rayon' };
function unObjet(s) {
  const i = s.plan, src = s.source, p = plan(i), lieu = p?.lieu, dans = (f) => (src.ou === 'lieu' ? f.lieux[f.plans[i].lieu] : f.plans[i])?.[src.liste], o = dans(E.film)?.[src.k];
  if (!o) { queueMicrotask(auPlan); return []; }
  return [entete(nomObjet(o), auPlan, bouton('', () => { modifier(`retirer ${nomObjet(o)}`, f => dans(f).splice(src.k, 1)); auPlan(); }, { icone: 'corbeille', titre: 'Retirer', classe: 'discret' })), src.ou === 'lieu' ? h('p', { class: 'aide' }, `Dans le lieu « ${joli(lieu)} » : le changement se voit dans tous ses plans.`) : null, ...champsObjet(o, (quoi, fn) => modifier(`${quoi} (${nomObjet(o)})`, f => fn(dans(f)[src.k])))];
}
export function champsObjet(o, maj) {
  const M = moteur()?.MONDE, champ = (cle) => v => maj(RANGES[cle] || cle, q => poser(q, cle, v));
  const pertinents = { meuble: ['l', 'h', 'prof'], objet: ['l', 'h', 'prof'], animal: ['taille'], accessoire: ['taille'], feu: ['taille'], arbre: ['hauteur'], lampadaire: ['h'], croix: ['h'], tombeau: ['l', 'h'], barque: ['l'], puits: ['r'], temple: ['l', 'h'], batiment: ['l', 'h'], rochers: ['l', 'h'], auge: ['l'] }[o.gen] || [];
  const types = { meuble: ['type', M?.MEUBLES], objet: ['type', M && Object.keys(M.OBJETS)], animal: ['espece', M?.ANIMAUX] }[o.gen];
  return [
    types?.[1] ? choix('Lequel', o[types[0]], trie(types[1]), v => maj('le type', q => { q[types[0]] = v; for (const k of ['l', 'h', 'prof']) if (o.gen === 'objet') delete q[k]; })) : null,
    o.pos ? null : h('div', { class: 'deux' }, nombre('x', o.x, champ('x')), o.sur ? texte('Posé sur', o.sur, champ('sur'), { brut: true }) : nombre('y', o.y, champ('y'))),
    pertinents.length ? h('div', { class: 'deux' }, pertinents.map(c => nombre(RANGES[c], o[c], champ(c), { exemple: 'réelle', min: 1 }))) : null,
    h('div', { class: 'deux' }, couleur('Couleur', o.couleur, champ('couleur')), ['meuble', 'objet'].includes(o.gen) ? couleur('Seconde couleur', o.couleur2, champ('couleur2')) : null),
    ['animal', 'barque', 'lampadaire', 'objet'].includes(o.gen) ? segments('Tourné vers', o.sens ?? 1, [[-1, 'Gauche'], [1, 'Droite']], v => maj('le sens', q => { q.sens = v; })) : null,
    o.gen === 'animal' ? choix('Attitude', o.pose, [['', 'Debout'], ['broute', 'Broute'], ['couche', 'Couché'], ['marche', 'Marche'], ['vol', 'Vole'], ['pose', 'Posé'], ['chante', 'Chante']], champ('pose')) : null,
    M && o.gen === 'objet' && o.type in M.OBJETS_LUMIERE ? coche('Allumé', o.allume !== false, v => maj('la lumière', q => poser(q, 'allume', v ? undefined : false))) : null,
    o.gen === 'lumiere' ? [couleur('Couleur du halo', o.couleur, champ('couleur')), glisse('Force', o.intensite ?? .6, champ('intensite'), { min: 0, max: 1 }), nombre('Rayon', o.rayon, champ('rayon'))] : null,
    o.gen === 'foule' ? [nombre('Combien', o.n, champ('n'), { min: 1, max: 40 }), choix('Époque', o.epoque, [['antique', 'Époque de la Bible'], ['moderne', "Aujourd'hui"]], champ('epoque'))] : null,
  ];
}
export function choisirObjet(action_) {
  planche('Quoi poser ?', rayons().map(([titre, l]) => [titre, l.map(o => [o, nomme(o.type || o.espece || o.gen), () => dessin(...objet(o))])]), action_, { centre: true });
}
const AU_MUR = ['cadre', 'horloge', 'miroir', 'tableau', 'vitrail', 'applique', 'enseigne'];
// poser à sa taille réelle, au sol ; un cadre ou une horloge va au mur, à hauteur d'homme
export function poserObjet(i, ou, neuf) {
  const p = plan(i), l = E.film.lieux?.[p?.lieu], sol = l?.sol || {}, yr = sol.y_ref ?? 1060, hz = sol.horizon ?? 700, o = aPoser(neuf), M = moteur().MONDE, mur = (l?.couches || []).find(c => c.gen === 'piece')?.fond?.[3];
  Object.assign(o, { x: 480, y: yr - 40 });
  if (o.gen === 'objet' && AU_MUR.includes(o.type) && mur) { const k = M.OBJETS_CM * (mur - hz) / Math.max(1, yr - hz), haut = M.OBJETS[o.type].d[1]; Object.assign(o, { y_sol: mur, y: Math.round(mur - Math.max(70, 165 - haut / 2) * k) }); }
  if (ou === 'lieu' && !l) { avis('Ce plan n\'a pas de lieu : choisis-en un, ou ajoute l\'objet au plan'); return; }
  modifier(`poser ${nomObjet(o)}`, f => { const d = ou === 'lieu' ? f.lieux[f.plans[i].lieu] : f.plans[i]; d.objets = d.objets || []; d.objets.push(o); });
  const d = ou === 'lieu' ? E.film.lieux[p.lieu] : plan(i);
  choisir({ genre: 'objet', plan: i, source: { ou, liste: 'objets', k: d.objets.length - 1 } });
}
