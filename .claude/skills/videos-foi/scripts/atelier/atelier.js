// L'atelier : l'accueil, puis une vidéo (le texte à gauche, la scène au milieu, ce qu'on a choisi à droite, les étapes en haut).
import * as etat from './etat.js';
import * as scene from './scene.js';
import * as texte from './texte.js';
import * as inspecteur from './inspecteur.js';
import * as fiches from './fiches.js';
import * as etapes from './etapes.js';
import { accueil } from './accueil.js';
import { h, bouton, avis, ecritEnCours } from './ui.js';

const { E } = etat, app = document.getElementById('app');
const ONGLETS = [['texte', 'Texte', texte.construire], ['personnages', 'Personnages', fiches.listePersonnages], ['lieux', 'Lieux', fiches.listeLieux], ['bible', 'Bible', fiches.bible]];

async function naviguer() {
  const nom = decodeURIComponent(location.hash.replace(/^#\//, ''));
  if (E.nom) await etat.fermer();
  try {
    if (!nom) { document.title = "L'atelier"; app.replaceChildren(await accueil(v => { location.hash = '#/' + v; })); return; }
    await etat.ouvrir(nom);
    document.title = `${E.film.titre || nom} (atelier)`;
    app.replaceChildren(...video());
    await etat.demarrer();
  } catch (e) {
    app.replaceChildren(h('main', { class: 'accueil' }, h('header', {}, h('h1', {}, 'Impossible d\'ouvrir'), h('p', {}, e.message)), h('a', { class: 'bouton', href: '#/' }, 'Toutes les vidéos')));
  }
}
function video() {
  const { barre, journal } = etapes.construire(), vue = scene.construire(), enregistre = h('span', { class: 'enregistre', role: 'status' });
  const btA = bouton('', etat.annuler, { icone: 'annuler', titre: 'Annuler (Ctrl Z)', classe: 'discret' }), btR = bouton('', etat.refaire, { icone: 'refaire', titre: 'Refaire (Ctrl Y)', classe: 'discret' });
  const titre = h('input', { type: 'text', class: 'titre-film', 'aria-label': 'Titre de la vidéo', value: E.film.titre || '', placeholder: 'Sans titre', onchange: e => etat.modifier('le titre', f => { f.titre = e.target.value.trim(); }) });
  const suivi = () => { enregistre.textContent = E.enregistre; enregistre.classList.toggle('mal', E.enregistre === 'Non enregistré'); btA.disabled = !E.passe.length; btR.disabled = !E.futur.length; if (document.activeElement !== titre) titre.value = titre.depart = E.film.titre || ''; };
  for (const x of ['etat', 'film', 'resolu']) etat.quand(x, suivi);
  let derniereErreur = null;
  etat.quand('erreur', m => { if (m !== derniereErreur) { derniereErreur = m; avis(m, { genre: 'erreur' }); } });
  etat.quand('resolu', () => { derniereErreur = null; });
  suivi();
  return [
    h('header', { class: 'barre' }, h('a', { class: 'bouton discret', href: '#/', title: 'Toutes les vidéos', 'aria-label': 'Toutes les vidéos' }, ...bouton('', null, { icone: 'retour' }).childNodes), titre, barre, h('span', { class: 'ressort' }), enregistre, btA, btR, bouton('', etapes.historique, { icone: 'histoire', titre: "Versions d'avant", classe: 'discret' })),
    h('main', { class: 'atelier' }, colonne(), vue, h('aside', { class: 'colonne droite', 'aria-label': 'Réglages' }, h('div', { class: 'defile' }, inspecteur.construire()))),
    journal,
  ];
}
function colonne() {
  const panneaux = ONGLETS.map(([id, , fait]) => h('div', { class: 'defile', role: 'tabpanel', id: 'p-' + id, 'aria-labelledby': 'o-' + id, hidden: id !== 'texte' }, fait()));
  const montre = (k) => { onglets.forEach((o, j) => { o.setAttribute('aria-selected', j === k); o.tabIndex = j === k ? 0 : -1; }); panneaux.forEach((p, j) => { p.hidden = j !== k; }); };
  const onglets = ONGLETS.map(([id, nom], k) => h('button', { type: 'button', role: 'tab', id: 'o-' + id, 'aria-controls': 'p-' + id, 'aria-selected': String(k === 0), tabindex: k ? '-1' : '0', onclick: () => montre(k), onkeydown: e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.stopPropagation(); const j = (k + d + ONGLETS.length) % ONGLETS.length; montre(j); onglets[j].focus(); } } }, nom));
  return h('aside', { class: 'colonne gauche', 'aria-label': 'Texte et éléments' }, h('div', { class: 'onglets', role: 'tablist' }, onglets), panneaux);
}
// le clavier : jamais quand on écrit dans un champ ou dans une boîte de dialogue
addEventListener('keydown', e => {
  if (!E.nom || document.querySelector('dialog[open]')) return;
  const champ = e.target.closest?.('input,textarea,select,[contenteditable]'), bt = e.target.closest?.('button,a,summary');
  if ((e.ctrlKey || e.metaKey) && !champ && ['z', 'y'].includes(e.key.toLowerCase())) { e.preventDefault(); if (e.key.toLowerCase() === 'y' || e.shiftKey) etat.refaire(); else etat.annuler(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ecritEnCours()?.blur(); etat.enregistrer(); return; }
  if (champ || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' && !bt) { e.preventDefault(); scene.lecture(!scene.joue()); }
  if (e.key === 'l') scene.basculerBoucle();
  const fleche = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (fleche) { const pas = e.shiftKey ? 10 : 2; if (scene.pousser(fleche[0] * pas, fleche[1] * pas)) e.preventDefault(); else if (fleche[0]) { e.preventDefault(); scene.voisin(fleche[0]); } }
  if (e.key === 'Escape') etat.choisir({ genre: 'plan', plan: etat.planChoisi() });
});
addEventListener('beforeunload', e => { ecritEnCours()?.blur(); if (E.nom && E.enregistre !== 'Enregistré') { etat.enregistrer(); e.preventDefault(); } });
addEventListener('hashchange', naviguer);
naviguer();
