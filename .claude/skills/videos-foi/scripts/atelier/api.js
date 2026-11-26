// Les échanges avec le serveur de l'atelier. Une erreur porte le message du serveur (et ses données : un conflit de versions).
const JETON = document.querySelector('meta[name="jeton"]').content;

export class Erreur extends Error {
  constructor(code, donnees) { super(donnees.erreur || `erreur ${code}`); this.code = code; this.donnees = donnees; }
}
async function demande(chemin, options) {
  let r;
  try { r = await fetch('/api/' + chemin, options); } catch { throw new Erreur(0, { erreur: "L'atelier est fermé. Rouvre-le, puis recharge cette page." }); }
  const d = await r.json().catch(() => ({ erreur: "Le serveur de l'atelier n'a pas répondu correctement." }));
  if (!r.ok) throw new Erreur(r.status, d);
  return d;
}
export const lire = (chemin) => demande(chemin);
export const envoyer = (chemin, corps = {}) => demande(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': JETON }, body: JSON.stringify(corps) });
export const media = (nom, rel, version = '') => `/api/video/${encodeURIComponent(nom)}/media/${rel}${version ? '?v=' + version : ''}`;
