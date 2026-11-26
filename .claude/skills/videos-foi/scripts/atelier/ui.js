// Petits outils d'affichage : fabriquer un élément, un champ, une boîte de dialogue, un avis. Aucun texte venu d'une vidéo
// n'est interprété comme du HTML (toujours du texte).
const ECRITS = 'input[type=text],input[type=number],textarea';
const PROPRIETES = ['checked', 'disabled', 'selected', 'open', 'muted', 'controls', 'value', 'hidden'];
export function h(balise, attrs = {}, ...enfants) {
  const el = document.createElement(balise);
  el.append(...enfants.flat(9).filter(x => x !== null && x !== undefined && x !== false).map(x => x instanceof Node ? x : document.createTextNode(String(x))));
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || (v === false && !PROPRIETES.includes(k))) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') for (const [n, x] of Object.entries(v)) el.style.setProperty(n, x);
    else if (PROPRIETES.includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  if (el.matches(ECRITS)) { el.depart = el.value; el.addEventListener('change', () => { el.depart = el.value; }, true); }
  return el;
}
// On ne redessine jamais sous les doigts : ni un champ où l'on écrit (ce qui est tapé serait perdu), ni un bouton pendant qu'on
// l'appuie (le clic tomberait dans le vide). Le dessin attend que le champ soit quitté, que le doigt soit levé.
export const ecritEnCours = () => { const c = document.activeElement; return c?.matches(ECRITS) && c.value !== c.depart ? c : null; };
let appui = false;
const apresAppui = new Set(), relache = () => { if (!appui) return; appui = false; setTimeout(() => { const l = [...apresAppui]; apresAppui.clear(); l.forEach(f => f()); }); };
addEventListener('pointerdown', () => { appui = true; }, true);
for (const e of ['pointerup', 'pointercancel', 'blur']) addEventListener(e, x => { if (e !== 'blur' || x.target === window) relache(); }, true);
addEventListener('pointermove', x => { if (!x.buttons) relache(); }, true);
export function sansDeranger(racine, dessiner) {
  let attend = false;
  const reprend = () => { attend = false; tente(); }, tente = () => {
    const champ = ecritEnCours(), ici = champ && racine.contains(champ), presse = appui && !document.activeElement?.matches('select');
    if (!ici && !presse) { dessiner(); return; }
    if (attend) return;
    attend = true;
    if (ici) champ.addEventListener('blur', () => setTimeout(reprend), { once: true }); else apresAppui.add(reprend);
  };
  return tente;
}
// un dessin fabriqué par le moteur (SVG), jamais un texte saisi
export function dessin(interne, viewBox, classe = 'dessin') {
  const el = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${interne}</svg>`, 'image/svg+xml').documentElement;
  if (el.nodeName !== 'svg') return h('div', { class: classe });
  el.setAttribute('class', classe);
  el.setAttribute('aria-hidden', 'true');
  return document.importNode(el, true);
}
// cadre un dessin déjà affiché sur ce qu'il montre (sans ses ombres floues, ses halos, ni ce qui est découpé dedans)
const MARGE = .1, HORS_CADRE = '[filter],[style*="mix-blend"],[clip-path],defs,clipPath,mask';
export function centrer(svg) {
  const inverse = svg.getCTM()?.inverse();
  if (!inverse) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of svg.querySelectorAll('path,rect,ellipse,circle,polygon,polyline,line')) {
    if (el.closest(HORS_CADRE)) continue;
    const b = el.getBBox(), m = inverse.multiply(el.getCTM());
    if (!b.width && !b.height) continue;
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) { const p = new DOMPoint(x, y).matrixTransform(m); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  }
  if (x0 > x1) return;
  const e = Math.max(x1 - x0, y1 - y0) * MARGE;
  svg.setAttribute('viewBox', [x0 - e, y0 - e, x1 - x0 + 2 * e, y1 - y0 + 2 * e].map(v => v.toFixed(2)).join(' '));
}
const PLEIN = 'fill="currentColor" stroke="none"';
const TRACES = {
  lecture: `<path d="M7 4.5v15l12-7.5Z" ${PLEIN}/>`, pause: `<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" ${PLEIN}/>`,
  boucle: '<path d="M17 3l3.5 3.5L17 10"/><path d="M4 11V9.5a3 3 0 0 1 3-3h13.5M7 21l-3.5-3.5L7 14"/><path d="M20 13v1.5a3 3 0 0 1-3 3H3.5"/>',
  son: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>', muet: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5ZM16 9.5l5 5M21 9.5l-5 5"/>',
  annuler: '<path d="M8 5 3.5 9.5 8 14"/><path d="M4 9.5h10a6 6 0 0 1 0 12h-3"/>', refaire: '<path d="m16 5 4.5 4.5L16 14"/><path d="M20 9.5H10a6 6 0 0 0 0 12h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', fermer: '<path d="m6 6 12 12M18 6 6 18"/>', haut: '<path d="m6 15 6-6 6 6"/>', bas: '<path d="m6 9 6 6 6-6"/>',
  corbeille: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>', copier: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  retour: '<path d="m11 5-7 7 7 7M4.5 12H20"/>', alerte: '<path d="M12 4 2.8 20h18.4Z"/><path d="M12 10v4.5M12 17.2v.3"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  dossier: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z"/>',
  histoire: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>', reperes: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3.5 3"/>', crayon: '<path d="m4 20 1-4.5L16.5 4 20 7.5 8.5 19Z"/>',
};
export const icone = (nom) => dessin(`<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${TRACES[nom] || ''}</g>`, '0 0 24 24', 'icone');
export const bouton = (texte, action, o = {}) => h('button', { type: 'button', class: 'bouton ' + (o.classe || ''), title: o.titre, 'aria-label': texte ? undefined : o.titre, disabled: !!o.inactif, 'aria-pressed': o.enfonce === undefined ? undefined : String(!!o.enfonce), onclick: action }, o.icone ? icone(o.icone) : null, texte ? h('span', {}, texte) : null);

// ------------------------------------------------------------------ champs : un libellé, un contrôle, une aide ; l'action reçoit la valeur
let numero = 0;
function enrobe(libelle, controle, o = {}) {
  controle.id = 'c' + (++numero);
  return h('div', { class: 'champ ' + (o.classe || '') }, h('label', { for: controle.id }, libelle), controle, o.aide ? h('p', { class: 'aide' }, o.aide) : null);
}
export const texte = (libelle, valeur, action, o = {}) => enrobe(libelle, h('input', { type: 'text', value: valeur ?? '', placeholder: o.exemple, maxlength: o.max, spellcheck: o.brut ? 'false' : undefined, onchange: e => action(e.target.value) }), o);
export const long = (libelle, valeur, action, o = {}) => enrobe(libelle, h('textarea', { rows: o.lignes || 3, placeholder: o.exemple, value: valeur ?? '', oninput: e => o.vif?.(e.target.value), onchange: e => action(e.target.value) }), o);
export const nombre = (libelle, valeur, action, o = {}) => enrobe(libelle, h('input', { type: 'number', value: valeur ?? '', step: o.pas ?? 1, min: o.min, max: o.max, placeholder: o.exemple, onchange: e => action(e.target.value === '' ? undefined : Number(e.target.value)) }), o);
export const choix = (libelle, valeur, options, action, o = {}) => {
  const liste = options.map(x => Array.isArray(x) ? x : [x, x]);
  if (valeur !== undefined && valeur !== null && valeur !== '' && !liste.some(([v]) => String(v) === String(valeur))) liste.push([valeur, String(valeur)]);      // une valeur écrite à la main reste choisissable
  return enrobe(libelle, h('select', { onchange: e => action(e.target.value === '' ? undefined : e.target.value) }, liste.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valeur ?? '') }, t))), o);
};
export function glisse(libelle, valeur, action, o = {}) {
  const montre = o.montre || (v => String(v).replace('.', ',')), sortie = h('output', {}, montre(valeur));
  const el = enrobe(libelle, h('input', { type: 'range', min: o.min ?? 0, max: o.max ?? 1, step: o.pas ?? .05, value: valeur, oninput: e => { sortie.textContent = montre(Number(e.target.value)); o.vif?.(Number(e.target.value)); }, onchange: e => action(Number(e.target.value)) }), o);
  el.querySelector('label').append(' ', sortie);
  return el;
}
export function coche(libelle, valeur, action, o = {}) {
  const id = 'c' + (++numero);
  return h('div', { class: 'champ coche' }, h('input', { type: 'checkbox', id, checked: !!valeur, onchange: e => action(e.target.checked) }), h('label', { for: id }, libelle), o.aide ? h('p', { class: 'aide' }, o.aide) : null);
}
export function couleur(libelle, valeur, action, palette = []) {
  const choisie = /^#[0-9a-f]{6}$/i.test(valeur || '');
  const el = enrobe(libelle, h('input', { type: 'color', value: choisie ? valeur : '#888888', title: choisie ? valeur : "Sa couleur d'origine", onchange: e => action(e.target.value) }), { classe: choisie ? 'couleur' : 'couleur dorigine' });
  if (palette.length) el.append(h('div', { class: 'palette' }, palette.map(p => h('button', { type: 'button', class: p === valeur ? 'pastille choisie' : 'pastille', style: { '--c': p }, 'aria-label': `${libelle} : ${p}`, 'aria-pressed': String(p === valeur), onclick: () => action(p) }))));
  return el;
}
export const segments = (libelle, valeur, options, action) => h('fieldset', { class: 'champ segments' }, h('legend', {}, libelle), h('div', {}, options.map(([v, t]) => h('button', { type: 'button', class: 'segment', 'aria-pressed': String(v === valeur), onclick: () => action(v) }, t))));

// ------------------------------------------------------------------ dialogues et avis
export function dialogue(titre, contenu, o = {}) {
  const d = h('dialog', { class: 'dialogue ' + (o.classe || ''), 'aria-label': titre }), ferme = () => d.close();
  d.append(h('header', {}, h('h2', {}, titre), bouton('', ferme, { icone: 'fermer', titre: 'Fermer', classe: 'discret' })), h('div', { class: 'contenu' }, typeof contenu === 'function' ? contenu(ferme) : contenu));
  d.addEventListener('close', () => { d.remove(); o.ferme?.(); });
  d.addEventListener('click', e => { if (e.target === d) ferme(); });
  document.body.append(d);
  d.showModal();
  return { fermer: ferme, element: d };
}
export function confirmer(titre, message, oui, o = {}) {
  return new Promise(res => {
    let reponse = false;
    const d = dialogue(titre, [h('p', {}, message), h('div', { class: 'actions' }, bouton(o.non || 'Annuler', () => d.fermer()), bouton(oui, () => { reponse = true; d.fermer(); }, { classe: o.danger ? 'danger' : 'or' }))], { classe: 'petit', ferme: () => res(reponse) });
  });
}
export function avis(message, o = {}) {
  const el = h('div', { class: 'avis ' + (o.genre || '') }, o.genre === 'erreur' ? icone('alerte') : null, h('span', {}, message), o.action ? bouton(o.action[0], () => { o.action[1](); el.remove(); }, { classe: 'discret' }) : null, bouton('', () => el.remove(), { icone: 'fermer', titre: 'Fermer cet avis', classe: 'discret' }));
  document.getElementById('avis').append(el);
  if (o.genre !== 'erreur') setTimeout(() => el.remove(), o.duree || 4500);
}
export async function copier(t, quoi) {
  try { await navigator.clipboard.writeText(t); avis(`${quoi} : copié`); } catch { avis('Copie impossible : sélectionne le texte et fais Ctrl+C', { genre: 'erreur' }); }
}
export const pluriel = (n, un, des) => `${n} ${n > 1 ? des : un}`;
