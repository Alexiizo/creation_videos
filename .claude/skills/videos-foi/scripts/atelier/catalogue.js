// Les mots de l'interface pour ce que le moteur sait faire. Les listes viennent du moteur lui-même (RIG, MONDE…) : un geste ou
// un objet ajouté au moteur apparaît ici tout seul.
let W = null;                                // la fenêtre de la scène
export const moteur = () => W;
export const brancher = (w) => { W = w; };

const NOMS = {
  a_genoux: 'À genoux', allonge: 'Allongé', appel: 'Appelle', assis_sol: 'Assis par terre', assis_sol_jambes: 'Par terre, jambes tendues', assis_sol_tete: 'Par terre, tête basse',
  benit: 'Bénit', blotti: 'Se blottit', bras_croises: 'Bras croisés', dos: 'De dos', ecoute: 'Écoute', enlace: 'Serre dans ses bras', face: 'De face', leve_tete: 'Lève la tête',
  lit: 'Lit', mains_levees: 'Mains levées', mains_visage: 'Mains sur le visage', montre_haut: 'Montre le ciel', pense: 'Réfléchit', peur: 'A peur', pleure_assis: 'Pleure, assis',
  pointe: 'Montre du doigt', prie_genoux: 'Prie à genoux', profil: 'De profil', prosterne: 'Prosterné', regarde_haut: 'Regarde en haut', telephone: 'Téléphone', tend_main: 'Tend la main',
  tend_main_bas: 'Tend la main vers le bas', tete_baissee: 'Tête baissée', attente: 'Attend', attend: 'Attend', choc: 'Choqué', colere: 'En colère', determine: 'Déterminé', emerveille: 'Émerveillé',
  fatigue: 'Fatigué', honte: 'Honteux', joie: 'Joyeux', paix: 'En paix', pleure: 'Pleure', rire: 'Rit', soulage: 'Soulagé', surprise: 'Surpris', terreur: 'Terrifié', yeux_fermes: 'Yeux fermés',
  boeuf: 'Bœuf', ane: 'Âne', chevre: 'Chèvre', canape: 'Canapé', etagere: 'Étagère', banc_eglise: "Banc d'église", lit_hopital: "Lit d'hôpital", siege_bus: 'Siège de bus', barre_bus: 'Barre de bus',
  fenetre_bus: 'Fenêtre de bus', feu_tricolore: 'Feu tricolore', lampe_pied: 'Lampe sur pied', plan_travail: 'Plan de travail', table_repas: 'Table de repas', etal: 'Étal', chene: 'Chêne', cypres: 'Cyprès',
  tv: 'Télévision', batiment: 'Bâtiment', premier_plan: 'Premier plan', eclair: 'Éclair', lumiere: 'Halo de lumière', cloture: 'Clôture', vegetation: 'Végétation', accessoire: 'Petit objet',
  carouges: 'Caroubes', pieces: 'Pièces', baton: 'Bâton', piece: 'Pièce', relief: 'Collines', nuages: 'Nuages', nu: 'Arbre nu',
};
export const nomme = (id) => NOMS[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ') : '');
export const joli = (id) => (id || '').replace(/_/g, ' ');      // un nom choisi par l'auteur (un personnage, un lieu)
export const trie = (ids) => [...ids].sort((a, b) => nomme(a).localeCompare(nomme(b), 'fr')).map(x => [x, nomme(x)]);

export const REGISTRES = [['recit', 'Le récit'], ['explication', "L'explication"], ['aujourdhui', 'La vie'], ['invitation', "L'invitation"]];
export const DOSAGES = [['recit', 'Récit'], ['vie', 'Vie'], ['question', 'Question']];
export const CADRES = [['ensemble', "Vue d'ensemble"], ['large', 'En pied'], ['moyen', 'À mi-corps'], ['americain', 'Américain'], ['serre', 'Serré'], ['visage', 'Gros plan']];
export const TRANSITIONS = [['', 'Coupe'], ['fondu', 'Fondu'], ['noir', 'Par le noir'], ['blanc', 'Par le blanc']];
export const HEURES = [['', 'Libre'], ['aube', 'Aube'], ['matin', 'Matin'], ['midi', 'Midi'], ['soir', 'Soir'], ['nuit', 'Nuit'], ['or', 'Or']];
export const REGARDS = [['', 'Devant soi'], ['camera', 'Nous'], ['ciel', 'Le ciel'], ['sol', 'Le sol']];
export const GRAPHISMES = {
  badge: ['Étiquette', ['texte', 'taille']], citation: ['Parole de la Bible', ['ref', 'entete', 'texte', 'y']], texte: ['Grand texte', ['texte', 'taille', 'y']], liste: ['Liste', ['items', 'y']],
  bulle: ['Bulle', ['sur', 'contenu', 'icone', 'texte']], pensee: ['Pensée', ['sur', 'icone', 'contenu']], ondes: ['Angoisse (ondes)', ['sur']], goutte: ['Goutte de sueur', ['sur']],
  coeur: ['Cœur qui bat', ['sur', 'bpm', 'taille', 'dx', 'dy']], traits: ['Pression (traits)', ['sur', 'de']], carte: ['Carte', ['cadre', 'titre', 'lieux']], telephone: ['Écran de téléphone', ['texte', 'taille']],
  definition: ['Mot expliqué', ['langue', 'terme', 'original', 'translit', 'sens', 'ref']], chiffre: ['Chiffre', ['valeur', 'texte', 'y']], icone: ['Icône', ['icone', 'taille', 'texte']], fin: ['Écran de fin', ['texte', 'ligne', 'sous']],
  compare: ['Comparaison', ['y']], frise: ['Frise', []], note: ['Note manuscrite', ['texte', 'taille', 'rotation']], verset: ['Verset', ['ref', 'texte', 'y']], etiquette: ['Repère', ['texte']], mot: ['Mot-clé', ['texte', 'y']],
  titre: ['Titre', ['texte']], lieu: ['Nom de lieu', ['texte']], cercle: ['Cercle', ['texte']], fleche: ['Flèche', ['texte']], ruban: ['Étiquette', ['texte', 'taille']], html: ['Dessin libre', []],
};
export const A_AJOUTER = ['citation', 'texte', 'badge', 'liste', 'pensee', 'bulle', 'coeur', 'ondes', 'goutte', 'carte', 'definition', 'telephone', 'icone', 'chiffre'];
export const CONTENUS = [['', 'Rien'], ['sourire', 'Sourire'], ['triste', 'Triste'], ['gribouillis', 'Gribouillis'], ['points', 'Trois points'], ['coeur', 'Cœur'], ['question', 'Point d\'interrogation'], ['exclamation', 'Point d\'exclamation']];
export const PEAUX = ['#f3d2b5', '#e2b48c', '#c99470', '#b98258', '#ad7650', '#8a5a3c', '#6b4430'];
export const CHEVEUX = ['#1c130d', '#2a1a12', '#3b2a1c', '#5a3322', '#8a5a32', '#c9a24e', '#d8d2c8'];
export const TISSUS = ['#efe6d6', '#d9c7a8', '#b8864a', '#9b2a26', '#a8645a', '#e0a83e', '#5a6b4a', '#3f7a6a', '#3f5a8a', '#6a7a9a', '#6b4a7a', '#3a3a48'];
export const AGES = [['bebe', 'Bébé'], ['enfant', 'Enfant'], ['ado', 'Ado'], ['jeune', 'Jeune'], ['adulte', 'Adulte'], ['age', 'Âgé']];
export const STYLES = {
  cheveux: [['court', 'Courts'], ['boucles', 'Bouclés'], ['mi_long', 'Mi-longs'], ['long', 'Longs'], ['boucles_longues', 'Longs bouclés'], ['queue', 'Queue de cheval'], ['chignon', 'Chignon'], ['tresse', 'Tresse'], ['afro', 'Afro'], ['rase', 'Rasés'], ['degarni', 'Dégarni'], ['chauve', 'Chauve']],
  barbe: [['', 'Sans'], ['naissante', 'Naissante'], ['courte', 'Courte'], ['collier', 'Collier'], ['longue', 'Longue'], ['moustache', 'Moustache']],
  coiffe: [['', 'Sans'], ['voile', 'Voile'], ['keffieh', 'Keffieh'], ['turban', 'Turban'], ['bonnet', 'Bonnet'], ['casquette', 'Casquette'], ['couronne', 'Couronne'], ['casque', 'Casque']],
  col: [['rond', 'Rond'], ['v', 'En V'], ['tunique', 'Tunique'], ['chemise', 'Chemise'], ['capuche', 'Sweat à capuche']], longueur: [['taille', 'À la taille'], ['hanches', 'Aux hanches'], ['genoux', 'Aux genoux'], ['chevilles', 'Aux chevilles']],
  manches: [['longues', 'Longues'], ['trois_quarts', 'Trois-quarts'], ['courtes', 'Courtes']], bas: [['', 'Sans (robe)'], ['pantalon', 'Pantalon'], ['short', 'Short'], ['jupe', 'Jupe']],
  manteau: [['', 'Sans'], ['drape', 'Manteau drapé'], ['veste', 'Veste'], ['cape', 'Cape']], chaussures: [['baskets', 'Baskets'], ['chaussures', 'Chaussures'], ['bottes', 'Bottes'], ['sandales', 'Sandales'], ['pieds_nus', 'Pieds nus']],
};
export const ASSIS = { assise: 1, hanche_av: 86, genou_av: 86, hanche_ar: 82, genou_ar: 80 };      // les angles d'une personne assise sur un siège

// ------------------------------------------------------------------ les dessins du moteur, pour choisir avec les yeux
const FILTRES = [2, 4, 6, 10, 18, 30].map(s => `<filter id="flou${s}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`).join('') + '<radialGradient id="gloire"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>';
const FORMAT = { silhouette: '-150 -490 300 520', objet: '0 -10 250 250' };
export function silhouette(desc, pose, action = {}) {
  const r = W.PERSO.poser(desc, pose, { x: 0, y: 0, style: 'papier', action });
  return [`<defs>${FILTRES}${r.defs}</defs>${r.svg}`, FORMAT.silhouette];
}
export function portrait(desc, visage, vue = 25) {
  const r = W.PERSO.poser(desc, 'debout', { x: 0, y: 0, style: 'papier', action: { vue, visage } }), [x, y] = r.tete;
  return [`<defs>${FILTRES}${r.defs}</defs>${r.svg}`, `${Math.round(x - 78)} ${Math.round(y - 82)} 156 170`];
}
const TAILLES = { animal: { taille: 170 }, arbre: { hauteur: 190 }, accessoire: { taille: 110 }, feu: { taille: 80 }, meuble: { l: 180, h: 110, prof: 90 }, rochers: { l: 160, h: 110 }, croix: { h: 190 }, tombeau: { l: 230, h: 170 }, puits: { r: 60 }, temple: { l: 230, h: 180 }, lampadaire: { h: 210 }, batiment: { l: 170, h: 170 }, auge: { l: 170 }, barque: { l: 220, tangue: 0 } };
const A_GAUCHE = ['meuble', 'auge', 'batiment'];           // ceux dont x est le coin gauche
export function objet(o) {
  const M = W.MONDE;
  let p = Object.assign({ x: A_GAUCHE.includes(o.gen) ? 35 : 125, y: 215, horizon: 20, y_ref: 215, fuite: 125 }, TAILLES[o.gen]);
  if (o.gen === 'meuble') { const r = REELLES.meuble[o.type], k = 185 / Math.max(r.l, r.h * 1.1); Object.assign(p, { x: 125 - r.l * k / 2, l: r.l * k, h: r.h * k, prof: r.prof * k }); }
  if (o.gen === 'objet') { const d = M.OBJETS[o.type].d, k = 190 / (Math.max(d[0], d[1] * .9, 12) * M.OBJETS_CM); p = { x: 30, y: 215, horizon: 20, y_ref: 20 + 195 / k, fuite: 125 }; }
  return [`<defs>${FILTRES}</defs>${M.GEN[o.gen](Object.assign(p, o), 'cat' + Math.random().toString(36).slice(2, 8), 1)}`, FORMAT.objet];
}
// tout ce qui se pose dans un lieu : [titre, [{gen, type…}]]
const RAYONS = { Maison: ['frigo', 'plan_travail', 'table_repas', 'tv', 'ordinateur', 'lampe_pied', 'suspension', 'applique', 'plante', 'tapis', 'cadre', 'horloge', 'miroir', 'lavabo'], École: ['tableau', 'pupitre', 'casiers', 'sac'], Hôpital: ['lit_hopital', 'perfusion', 'moniteur'], Église: ['banc_eglise', 'autel', 'vitrail', 'cierge'], 'Rue et transports': ['voiture', 'abribus', 'feu_tricolore', 'poubelle', 'haie', 'siege_bus', 'barre_bus', 'fenetre_bus', 'enseigne', 'guirlande'], 'Époque de la Bible': ['etal', 'colonne', 'arcade', 'rouleau', 'filet'] };
const ACCESSOIRES = ['pieces', 'bourse', 'coupe', 'pain', 'lampe', 'bougie', 'telephone', 'livre', 'assiette', 'cruche', 'baton', 'carouges', 'panier', 'tasse'];
const ARBRES = ['olivier', 'palmier', 'cypres', 'chene', 'figuier', 'pin', 'sapin', 'saule', 'acacia', 'nu', 'buisson'];
export function rayons() {
  const M = W.MONDE, ranges = new Set(Object.values(RAYONS).flat()), objets = (l) => l.filter(t => M.OBJETS[t]).map(type => ({ gen: 'objet', type })), reste = Object.keys(M.OBJETS).filter(t => !ranges.has(t));
  return [['Meubles', M.MEUBLES.map(type => ({ gen: 'meuble', type }))], ...Object.entries(RAYONS).map(([n, l]) => [n, objets(l)]), ...(reste.length ? [['Autres objets', objets(reste)]] : []),
    ['Petits objets', ACCESSOIRES.map(type => ({ gen: 'accessoire', type }))], ['Arbres', ARBRES.map(espece => ({ gen: 'arbre', espece }))], ['Animaux', M.ANIMAUX.map(espece => ({ gen: 'animal', espece }))],
    ['Ouvrages', [{ gen: 'barque' }, { gen: 'puits' }, { gen: 'tombeau', ouvert: 1 }, { gen: 'croix' }, { gen: 'temple' }, { gen: 'lampadaire' }, { gen: 'feu' }, { gen: 'auge' }, { gen: 'rochers' }, { gen: 'batiment' }]]];
}
// la taille réelle (px à y_ref) de ce qu'on pose : un adulte ≈ 460 px
const REELLES = { meuble: { canape: { l: 470, h: 224, prof: 150 }, chaise: { l: 120, h: 237, prof: 110 }, banc: { l: 380, h: 118, prof: 90 }, lit: { l: 700, h: 178, prof: 300 }, table: { l: 420, h: 197, prof: 200 }, bureau: { l: 360, h: 197, prof: 160 }, commode: { l: 260, h: 237, prof: 130 }, etagere: { l: 230, h: 500, prof: 90 }, jarre: { l: 80, h: 130, prof: 60 }, caisse: { l: 130, h: 110, prof: 110 } }, animal: { coq: 80, poule: 65, porc: 300, mouton: 300, agneau: 180, chevre: 280, ane: 400, cheval: 560, chien: 200, boeuf: 560, chameau: 700, colombe: 60, oiseau: 46 }, accessoire: { coupe: 38, pieces: 44, lampe: 40, bougie: 34, pain: 46, cruche: 110, bourse: 50, assiette: 50, tasse: 28, livre: 60, telephone: 42, panier: 100 } };
const REELLE_GEN = { arbre: { hauteur: 480 }, feu: { taille: 105 }, barque: { l: 660 }, puits: { r: 95 }, tombeau: { l: 760, h: 520 }, croix: { h: 620 }, temple: { l: 900, h: 640 }, lampadaire: { h: 620 }, auge: { l: 220 }, rochers: { l: 260, h: 150 }, batiment: { l: 700, h: 480, style: 'antique', couleur: '#d9c3a0', cote: 0 } };
export function aPoser(o) {
  if (o.gen === 'meuble') return Object.assign({}, o, REELLES.meuble[o.type]);
  if (o.gen === 'animal' || o.gen === 'accessoire') return Object.assign({}, o, { taille: REELLES[o.gen][o.espece || o.type] || 60 });
  return Object.assign({}, o, REELLE_GEN[o.gen]);
}
