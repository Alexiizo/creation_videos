// Les modules du moteur, dans l'ordre (Node : tests, atlas). Les pages les chargent par balises <script> dans le même ordre
// (tests/test_moteur.py vérifie que les deux listes sont identiques).
const MODULES = ['base', 'rig', 'formes', 'mains', 'habits', 'tete', 'perso', 'monde', 'eclairage', 'lieux', 'sols', 'interieur', 'nature', 'animaux', 'ouvrages', 'decors', 'enseigner'];
if (typeof module !== 'undefined') {
  global.window = global;
  for (const m of MODULES) require('./' + m + '.js');
  module.exports = MODULES;
}
