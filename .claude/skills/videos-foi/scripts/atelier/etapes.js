// Les étapes d'une vidéo, dans l'ordre : mettre en scène, voix, contrôler, rendre, publier. Une commande à la fois, son journal en
// direct, un bouton pour l'arrêter. La voix coûte des crédits : elle se confirme toujours.
import { E, quand, dire, modifier, enregistrer, rafraichirResume, verifier, aCorriger, choisir, revenir } from './etat.js';
import { lire, envoyer, media, Erreur } from './api.js';
import { allerAuPlan } from './scene.js';
import { h, bouton, icone, dialogue, confirmer, avis, copier, texte, long, nombre, pluriel, sansDeranger } from './ui.js';

const NOMS = { realiser: 'Mise en scène', voix: 'Voix', apercu: 'Contrôle des images', rendu: 'Rendu du MP4', livrables: 'Textes de publication' };
const SUIVI = 600, DESCRIPTION_MAX = 150;      // ms ; caractères
const DEJA_DIT = /TROP (COURT|LONG)/;          // le vérificateur le dit déjà
let barre, journal, texteJournal, titreJournal, btArreter, travail = null, lignes = 0, horloge = null;

export function construire() {
  barre = h('nav', { class: 'etapes', 'aria-label': 'Étapes de la vidéo' });
  texteJournal = h('pre', { tabindex: '0' });
  titreJournal = h('strong', {});
  btArreter = bouton('Arrêter', async () => { try { await envoyer('travail/arreter'); } catch (e) { avis(e.message, { genre: 'erreur' }); } }, { classe: 'danger' });
  journal = h('section', { class: 'journal', hidden: true, 'aria-label': 'Journal' }, h('header', {}, h('span', { class: 'roue' }), titreJournal, h('span', { class: 'ressort' }), btArreter, bouton('', () => { journal.hidden = true; }, { icone: 'fermer', titre: 'Fermer le journal', classe: 'discret' })), texteJournal);
  const redessine = sansDeranger(barre, dessiner);
  for (const x of ['etat', 'points', 'film', 'resolu']) quand(x, redessine);
  dessiner();
  suivre(true);
  return { barre, journal };
}
const occupe = () => travail && !travail.fini;
function etape(nom, action, etat, detail, o = {}) {
  return h('button', { type: 'button', class: `etape ${etat}`, disabled: !!o.inactif, title: detail, onclick: action }, h('span', { class: 'nom' }, nom), h('span', { class: 'detail' }, detail));
}
function dessiner() {
  const r = E.resume;
  if (!r || !E.film) return;
  const n = E.film.plans.length, pts = aCorriger(), v = r.voix, mp4 = r.videos[0], inactif = occupe() || !n;
  const sans = !n, dit = (fait, quoi) => fait ? 'faite' : quoi;
  barre.replaceChildren(
    etape('Mettre en scène', miseEnScene, dit(false, ''), "Compléter le reste", { inactif }),
    etape('Vérifier', montrerPoints, pts.some(x => x.niveau === 'erreur') ? 'mauvaise' : pts.length ? 'attention' : E.score === null ? '' : 'faite', sans ? 'Rien à vérifier' : E.score === null ? 'En cours' : pts.length ? pluriel(pts.length, 'point à revoir', 'points à revoir') : 'Tout est bon', { inactif: sans }),
    etape('Voix', voix, v.a_dire && v.a_jour === v.a_dire ? 'faite' : v.a_jour ? 'attention' : '', sans ? 'Rien à dire' : v.a_jour === v.a_dire ? 'À jour' : v.a_jour ? pluriel(v.a_dire - v.a_jour, 'plan à refaire', 'plans à refaire') : 'Pas encore enregistrée', { inactif }),
    etape('Contrôler', () => lancer('apercu'), '', E.alertes_image.length ? pluriel(E.alertes_image.length, 'image à revoir', 'images à revoir') : 'Toutes les images', { inactif }),
    etape('Rendre', () => lancer('rendu'), mp4 ? (mp4.a_jour ? 'faite' : 'attention') : '', mp4 ? (mp4.a_jour ? 'MP4 à jour' : 'MP4 à refaire') : 'Pas encore de MP4', { inactif }),
    etape('Publier', publier, r.livrables ? 'faite' : '', 'Vidéo et textes', { inactif: sans }));
}

// ------------------------------------------------------------------ lancer une commande et la suivre
export async function lancer(quoi, options = {}) {
  await enregistrer();
  if (E.enregistre !== 'Enregistré') { avis("La vidéo n'est pas enregistrée : je ne lance rien", { genre: 'erreur' }); return; }
  try { travail = await envoyer(`video/${E.nom}/travail`, { quoi, options }); } catch (e) { if (!(e instanceof Erreur)) throw e; avis(e.message, { genre: 'erreur' }); return; }
  lignes = 0;
  texteJournal.textContent = '';
  journal.hidden = false;
  if (quoi === 'apercu') { E.alertes_image = []; dire('points'); }
  dessiner();
  suivre();
}
async function suivre(premier = false) {
  clearTimeout(horloge);
  const nom = E.nom;
  let t;
  try { t = await lire(`travail?depuis=${lignes}`); } catch { return; }                 // (l'atelier s'est fermé : le prochain geste le dira)
  if (!nom || nom !== E.nom) return;
  if (premier && (t.fini || t.nom !== E.nom)) { travail = t.fini ? null : t; if (!t.fini) { titreJournal.textContent = `${NOMS[t.quoi]} en cours sur ${t.nom}`; } return; }
  if (premier) journal.hidden = false;
  travail = t;
  if (t.lignes.length) { const bas = texteJournal.scrollHeight - texteJournal.scrollTop - texteJournal.clientHeight < 40; texteJournal.append(t.lignes.join('\n') + '\n'); if (bas) texteJournal.scrollTop = texteJournal.scrollHeight; alertes(t); }
  lignes = t.total_lignes;
  journal.classList.toggle('tourne', !t.fini);
  btArreter.hidden = t.fini;
  const s = Math.round(t.ecoule || 0), duree = s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}` : `${s} s`;
  titreJournal.textContent = t.fini ? `${NOMS[t.quoi]} : ${t.arrete ? 'arrêté' : t.code ? 'à corriger' : 'fait'} en ${duree}` : `${NOMS[t.quoi]}, depuis ${duree}`;
  if (!t.fini) { horloge = setTimeout(suivre, SUIVI); return; }
  await rafraichirResume();
  await verifier();
  dessiner();
  if (t.arrete) return;
  if (t.code) { avis(`${NOMS[t.quoi]} : quelque chose est à corriger (voir le journal)`, { genre: 'erreur' }); return; }
  if (t.quoi === 'apercu') avis(E.alertes_image.length ? pluriel(E.alertes_image.length, 'point à revoir dans les images', 'points à revoir dans les images') : 'Toutes les images sont bonnes');
  else if (t.quoi === 'rendu') avis('Le MP4 est prêt', { action: ['Le regarder', publier], duree: 9000 });
  else avis(`${NOMS[t.quoi]} : fait`);
}
// les alertes de l'image (« !! CADRAGE plan 4 · léa : … ») rejoignent leurs plans
function alertes(t) {
  if (t.quoi !== 'apercu') return;
  for (const l of t.lignes) { if (DEJA_DIT.test(l)) continue; const m = l.match(/!!\s*([A-ZÉÈ ]+?)\s+plan (\d+)\s*(.*)$/); if (m) E.alertes_image.push({ niveau: 'alerte', plan: Number(m[2]), texte: m[3].replace(/^[·\s]+/, '') }); else if (l.includes('!!')) E.alertes_image.push({ niveau: 'alerte', plan: null, texte: l.replace(/^.*!!\s*/, '') }); }
  dire('points');
}

// ------------------------------------------------------------------ chaque étape
async function miseEnScene() {
  if (await confirmer('Mettre en scène', 'Le réalisateur complète ce qui manque (caméra, gestes, visages, signes) sans toucher à ce que tu as réglé. Tu pourras annuler.', 'Compléter')) lancer('realiser');
}
function montrerPoints() {
  const l = aCorriger();
  if (!l.length) { avis(E.score === null ? 'Vérification en cours…' : `Tout est bon (${E.score} sur 100)`); return; }
  const d = dialogue(pluriel(l.length, 'point à revoir', 'points à revoir'), h('ul', { class: 'points liste' }, l.map(x => h('li', { class: x.niveau }, icone('alerte'), h('span', {}, x.texte), x.plan ? bouton(`Plan ${x.plan}`, () => { d.fermer(); choisir({ genre: 'plan', plan: x.plan - 1 }); allerAuPlan(x.plan - 1); }) : null))), { classe: 'large' });
}
async function voix() {
  const v = E.resume.voix;
  await enregistrer();
  if (!v.caracteres) { avis('La voix est à jour'); return; }
  const n = v.a_dire - v.a_jour;
  if (await confirmer('Enregistrer la voix', `${pluriel(n, 'phrase', 'phrases')} à enregistrer avec ta voix ElevenLabs : ${v.caracteres} caractères de ton forfait. Ce qui est déjà enregistré ne se paie pas deux fois.`, 'Enregistrer la voix')) lancer('voix');
}
async function publier() {
  await enregistrer();
  const nom = E.nom, lv = () => E.film.livrables || {}, corps = h('div', { class: 'publier' });
  const champ = (cle, quoi) => v => { modifier(quoi, f => { f.livrables = Object.assign({}, f.livrables); if (v === '' || v === undefined) delete f.livrables[cle]; else f.livrables[cle] = v; }); enregistrer().then(montre); };
  const montre = async () => {
    let p;
    try { p = await lire(`video/${nom}/publier`); } catch (e) { avis(e.message, { genre: 'erreur' }); return; }
    const r = E.resume, mp4 = r.videos[0], desc = lv().description || '', copie = (cle, quoi) => h('div', { class: 'a-copier' }, h('div', {}, h('strong', {}, quoi), h('p', {}, p.blocs[cle] || '')), bouton('Copier', () => copier(p.blocs[cle] || '', quoi), { icone: 'copier' }));
    const compte = h('span', { class: 'compte' }, `${desc.length} sur ${DESCRIPTION_MAX}`);
    corps.replaceChildren(
      h('div', { class: 'film-fini' }, mp4 ? h('video', { controls: true, preload: 'metadata', src: media(nom, 'rendu/' + mp4.fichier, Math.round(mp4.modifie)) }) : h('div', { class: 'pas-de-film' }, h('p', {}, 'Pas encore de MP4.'), bouton('Rendre la vidéo', () => { d.fermer(); lancer('rendu'); }, { classe: 'or' })),
        mp4 ? h('p', { class: 'aide' }, `${mp4.fichier}, ${(mp4.octets / 1e6).toFixed(1).replace('.', ',')} Mo, ${new Date(mp4.modifie * 1000).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}${mp4.a_jour ? '' : '. La vidéo a changé depuis : à refaire.'}`) : null, bouton('Ouvrir le dossier', async () => { try { await envoyer(`video/${nom}/ouvrir`); } catch (e) { avis(e.message, { genre: 'erreur' }); } }, { icone: 'dossier' })),
      h('div', { class: 'textes' },
        ...(p.erreurs.length ? [h('ul', { class: 'points' }, p.erreurs.map(x => h('li', { class: 'erreur' }, icone('alerte'), h('span', {}, x))))] : []),
        copie('DESCRIPTION', 'Description'), copie('HASHTAGS', 'Hashtags'), copie('COMMENTAIRE À ÉPINGLER', 'Commentaire à épingler'), copie('JOURNAL', 'Ligne de journal'),
        h('p', { class: 'aide' }, 'Sur TikTok : active l\'étiquette « contenu généré par l\'IA ».'),
        h('details', { class: 'plus', open: p.manque.length > 0 }, h('summary', {}, p.manque.length ? `Il manque : ${p.manque.join(', ')}` : 'Modifier ces textes'), long('Description', desc, champ('description', 'la description'), { lignes: 3, vif: v => { compte.textContent = `${v.length} sur ${DESCRIPTION_MAX}`; compte.classList.toggle('trop', v.length > DESCRIPTION_MAX); } }), compte, texte('Hashtag de la situation', lv().hashtag, champ('hashtag', 'le hashtag'), { exemple: '#pardon' }), texte('Situation', lv().situation, champ('situation', 'la situation')), texte('Invitation', lv().invitation, champ('invitation', "l'invitation"), { exemple: 'prière' }), texte('Commentaire à épingler', lv().commentaire, champ('commentaire', 'le commentaire')), nombre('Numéro de la vidéo', lv().numero, champ('numero', 'le numéro'), { min: 1 }))));
  };
  await montre();
  const d = dialogue('Publier', corps, { classe: 'tres-large', ferme: () => lancerSansBruit(nom) });
}
// les textes à copier sont aussi écrits dans livrables.txt, à côté de la vidéo
async function lancerSansBruit(nom) { if (nom === E.nom && !occupe() && E.enregistre === 'Enregistré') { try { await envoyer(`video/${nom}/travail`, { quoi: 'livrables' }); setTimeout(rafraichirResume, 1500); } catch { /* une autre commande tourne : ils seront écrits la prochaine fois */ } } }

// ------------------------------------------------------------------ revenir à une version d'avant
export async function historique() {
  await enregistrer();
  const l = await lire(`video/${E.nom}/versions`);
  const d = dialogue("Versions d'avant", l.length ? h('ul', { class: 'versions' }, l.map(v => h('li', {}, h('span', {}, new Date(v.quand * 1000).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })), h('span', { class: 'aide' }, pluriel(v.plans, 'plan', 'plans')), bouton('Y revenir', async () => { d.fermer(); try { await revenir(v.fichier); avis('La version est revenue'); } catch (e) { avis(e.message, { genre: 'erreur' }); } })))) : h('p', { class: 'aide' }, "Pas encore de version gardée : elles s'ajoutent à mesure que tu modifies la vidéo."), {});
}
