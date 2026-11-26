// L'accueil : toutes les vidéos, chacune dans son arche ; la suivante commence ici.
import { lire, envoyer, media } from './api.js';
import { h, bouton, icone, dialogue, avis, copier, texte, choix, pluriel } from './ui.js';
import { DOSAGES } from './catalogue.js';

const DOSAGE = Object.fromEntries(DOSAGES), ANNONCE = { recit: 'un récit de la Bible', vie: 'une situation de la vie', question: 'une question que les gens se posent' };
export async function accueil(ouvrir) {
  const l = await lire('videos');
  const derniers = l.slice(0, 2).map(v => v.dosage), troisieme = derniers.length === 2 && derniers[0] === derniers[1] ? derniers[0] : null;
  return h('main', { class: 'accueil' },
    h('header', {}, h('h1', {}, "L'atelier"), h('p', {}, l.length ? `${pluriel(l.length, 'vidéo', 'vidéos')}. Clique sur l'une pour la voir et la corriger.` : 'Aucune vidéo encore. Commence la première.')),
    h('ul', { class: 'arches' },
      h('li', {}, h('button', { type: 'button', class: 'arche neuve', onclick: () => nouvelle(l, troisieme, ouvrir) }, h('span', { class: 'fenetre' }, icone('plus')), h('span', { class: 'titre' }, 'Nouvelle vidéo'), h('span', { class: 'aide' }, troisieme ? `Pas encore ${ANNONCE[troisieme]} : varie` : 'Un passage, une situation ou une question'))),
      l.map(v => h('li', {}, h('a', { class: 'arche', href: `#/${v.nom}` }, h('span', { class: 'fenetre' }, v.images.length ? h('img', { src: media(v.nom, 'apercu/' + v.images[Math.min(1, v.images.length - 1)], Math.round(v.modifie)), alt: '', loading: 'lazy' }) : null), h('span', { class: 'titre' }, v.titre), h('span', { class: 'aide' }, v.erreur ? 'À corriger : elle ne se lit pas' : resume(v)), h('span', { class: 'ou-en' }, ouEn(v)))))));
}
const resume = (v) => v.plans ? `${DOSAGE[v.dosage] || 'Récit'}, ${Math.round(v.duree || 0)} secondes${v.passage ? `, ${v.passage}` : ''}` : 'Pas encore écrite';
function ouEn(v) {
  if (!v.plans) return 'À écrire';
  const m = v.videos[0];
  if (m) return m.a_jour ? 'MP4 prêt' : 'MP4 à refaire';
  return v.voix?.a_jour ? 'Voix enregistrée' : 'À mettre en voix';
}
function nouvelle(l, troisieme, ouvrir) {
  const n = Math.max(0, ...l.map(v => Number((v.nom.match(/^v(\d+)/) || [])[1]) || 0)) + 1, etat = { titre: '', passage: '', dosage: ['recit', 'vie', 'question'].find(d => d !== troisieme && d !== l[0]?.dosage) || 'recit' };
  const nom = () => `v${String(n).padStart(2, '0')}` + (slug(etat.titre) ? '-' + slug(etat.titre) : ''), demande = h('p', { class: 'demande' }), maj = () => { demande.textContent = phrase(nom(), etat); };
  const d = dialogue('Nouvelle vidéo', [
    texte('Titre', '', v => { etat.titre = v.trim(); maj(); }, { exemple: 'Quand tu as tout raté' }),
    choix('Dosage', etat.dosage, DOSAGES, v => { etat.dosage = v; maj(); }, { aide: 'Jamais trois fois le même de suite.' }),
    texte('Passage (si tu sais déjà)', '', v => { etat.passage = v.trim(); maj(); }, { exemple: 'Jean 21:1-19' }),
    h('div', { class: 'a-claude' }, h('strong', {}, 'La phrase à donner à Claude'), demande, bouton('Copier la phrase', () => copier(demande.textContent, 'La phrase pour Claude'), { icone: 'copier' })),
    h('div', { class: 'actions' }, bouton('Créer la vidéo', async () => { try { const r = await envoyer('videos', Object.assign({ nom: nom() }, etat)); d.fermer(); ouvrir(r.nom); } catch (e) { avis(e.message, { genre: 'erreur' }); } }, { classe: 'or' })),
  ], { classe: 'petit' });
  maj();
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').filter(m => !['quand', 'tu', 'te', 'de', 'la', 'le', 'les', 'un', 'une', 'et', 'a', 'as', 'est', 'ta', 'ton', 'tes'].includes(m)).slice(0, 3).join('-');
const phrase = (nom, e) => `Écris la vidéo videos/${nom}${e.titre ? ` « ${e.titre} »` : ''} (dosage : ${DOSAGE[e.dosage].toLowerCase()}, ${ANNONCE[e.dosage]})${e.passage ? `, à partir de ${e.passage}` : ''}. Suis le skill videos-foi jusqu'à zéro alerte.`;
