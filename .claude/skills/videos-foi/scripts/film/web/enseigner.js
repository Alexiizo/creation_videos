// Les graphismes qui ENSEIGNENT, animés au rythme de la voix, dans notre DA (la fenêtre en arche, l'or qui s'allume) :
// la carte exacte de la Palestine du 1er siècle (assets/geographie, coordonnées sourcées), la frise chronologique,
// la définition d'un mot (avec prudence : le sens établi, la langue d'origine). Rien n'est une image toute faite.
(function (G) {
  const B = G.B, f = B.f;
  const COUL = { mer: '#9fc2d4', terre: '#ead9b6', relief: '#dcc89f', trait: '#6f8fa3', texte: '#3a2c1e', halo: '#f6ecd4', region: '#8a7458', or: '#e0a83a', lueur: '#ffd36b' };
  const APPARITION = .5, ALLUMAGE = .35, TRACE = 1.2;

  // ------------------------------------------------------------------ la carte
  // projection : équirectangulaire corrigée de la latitude, ajustée au cadre (lat0, lat1, lon0, lon1) dans la boîte
  function projection(cadre, boite) {
    const [la0, la1, lo0, lo1] = cadre, [x0, y0, x1, y1] = boite;
    const kx = Math.cos(B.rad((la0 + la1) / 2));
    const w = (lo1 - lo0) * kx, h = la1 - la0, s = Math.min((x1 - x0) / w, (y1 - y0) / h);
    const ox = x0 + ((x1 - x0) - w * s) / 2, oy = y0 + ((y1 - y0) - h * s) / 2;
    return (lat, lon) => [ox + (lon - lo0) * kx * s, oy + (la1 - lat) * s];
  }
  const chemin = (pts, P, ferme) => B.lisse(pts.map(([la, lo]) => P(la, lo)), ferme, .5);
  function dansPolygone([x, y], poly) {
    let dedans = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
  }
  const DEFINITION_Y = 800;         // à cheval sur le bas de l'arche, comme une citation : jamais sur les personnages
  const TAILLE_NOM = 42, LARGEUR_LETTRE = .6;
  const boiteTexte = (x, y, n, gauche, taille = TAILLE_NOM) => { const w = n * taille * LARGEUR_LETTRE; return gauche ? [x - w, y - taille, x, y + 8] : [x, y - taille, x + w, y + 8]; };
  const chevauche = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  // l'étiquette d'un lieu : du côté où il n'y a pas d'eau, et sans chevaucher les étiquettes déjà posées
  function placer(px, py, nom, eaux, posees, centre) {
    const essais = [];
    for (const gauche of px > centre + 120 ? [true, false] : [false, true]) for (const dy of [0, 48, -48, 96, -96]) essais.push([gauche, dy]);
    for (const [gauche, dy] of essais) {
      const x = px + (gauche ? -24 : 24), y = py + 13 + dy, b = boiteTexte(x, y, nom.length, gauche);
      const mouille = eaux.some(poly => dansPolygone([(b[0] + b[2]) / 2, y - 12], poly) || dansPolygone([gauche ? b[0] + 10 : b[2] - 10, y - 12], poly));
      if (!mouille && !posees.some(q => chevauche(q, b))) { posees.push(b); return { x, y, gauche }; }
    }
    const b = boiteTexte(px + 24, py + 13, nom.length, false); posees.push(b);
    return { x: px + 24, y: py + 13, gauche: false };
  }

  // le pays n'est pas une table vide : de petites collines à la plume, sur la terre seulement (décor, pas topographie)
  function collines(geo, cadre, P, fen) {
    const r = B.alea(11), eaux = [geo.lac_galilee, geo.mer_morte].map(e => e.map(([la, lo]) => P(la, lo)));
    const lit = geo.littoral.map(([la, lo]) => P(la, lo)), mer = [...lit, [lit[lit.length - 1][0] - 3000, lit[lit.length - 1][1]], [lit[0][0] - 3000, lit[0][1]]];
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = fen.x0 + 30 + r() * (fen.x1 - fen.x0 - 60), y = fen.haut + 60 + r() * (fen.bas - fen.haut - 90), w = 15 + r() * 17;
      if ([...eaux, mer].some(e => [[x, y], [x + w, y], [x - w, y]].some(q => dansPolygone(q, e)))) continue;
      s += `<path d="M${f(x - w)},${f(y)} Q${f(x - w * .3)},${f(y - w * 1.05)} ${f(x + w * .1)},${f(y - w * .62)} Q${f(x + w * .55)},${f(y - w * .95)} ${f(x + w)},${f(y)}" fill="${COUL.relief}" fill-opacity=".55" stroke="${COUL.region}" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>`;
    }
    return s;
  }
  // l'échelle : une longueur ronde en kilomètres, mesurée sur la projection
  const KM_DEGRE = 111.2;
  function echelle(P, cadre, fen, k) {
    const px = (P(cadre[0], cadre[2])[1] - P(cadre[0] + .1, cadre[2])[1]) / (KM_DEGRE * .1);
    const km = [1, 2, 5, 10, 20, 50, 100].find(n => n * px >= 110) || 100, L = km * px, x = fen.x0 + 70, y = fen.bas - 44;
    return `<g opacity="${f(k * .85)}" stroke="${COUL.texte}" stroke-width="4" stroke-linecap="round"><path d="M${f(x)},${f(y)} h${f(L)} M${f(x)},${f(y - 9)} v18 M${f(x + L)},${f(y - 9)} v18" fill="none"/></g>` +
      `<text x="${f(x + L / 2)}" y="${f(y - 18)}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="26" fill="${COUL.texte}" opacity="${f(k * .85)}">${km} km</text>`;
  }

  // {type:"carte", cadre:"tout"|"galilee"|"judee"|"samarie"|[lat0,lat1,lon0,lon1], lieux:["Nazareth", {nom, mot}],
  //  trajet:["Nazareth","Bethléem"], mot_trajet, regions:true, titre} — les lieux s'allument en or quand on les dit
  function carte(g, tp, fen) {
    const geo = g._geo, d0 = g.t ?? 0;
    const cadre = Array.isArray(g.cadre) ? g.cadre : geo.cadres[g.cadre || 'tout'];
    const boite = [fen.x0 + 40, fen.haut + (fen.x1 - fen.x0) * .32, fen.x1 - 40, fen.bas - 30];
    const P = projection(cadre, boite), k = B.ease('sortie', B.clamp((tp - d0) / APPARITION));
    const id = 'carte' + Math.round(d0 * 100);
    let s = `<defs><clipPath id="${id}"><rect x="${fen.x0}" y="${fen.haut}" width="${fen.x1 - fen.x0}" height="${fen.bas - fen.haut}"/></clipPath>` +
      `<filter id="${id}l" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>`;
    s += `<g clip-path="url(#${id})" opacity="${f(k)}" transform="translate(540,600) scale(${f(1.04 - .04 * k)}) translate(-540,-600)">`;
    s += `<rect x="${fen.x0}" y="${fen.haut}" width="${fen.x1 - fen.x0}" height="${fen.bas - fen.haut}" fill="${COUL.mer}"/>`;
    // la terre : tout ce qui est à l'est du littoral, refermé loin à l'est
    const lit = geo.littoral.map(([la, lo]) => P(la, lo));
    const est = P(cadre[0] - 1, cadre[3] + 2)[0];
    s += `<path d="M${f(lit[0][0])},${f(P(cadre[1] + 1, 0)[1])} ${lit.map(q => 'L' + f(q[0]) + ',' + f(q[1])).join(' ')} L${f(lit[lit.length - 1][0])},${f(P(cadre[0] - 1, 0)[1])} L${f(est)},${f(P(cadre[0] - 1, 0)[1])} L${f(est)},${f(P(cadre[1] + 1, 0)[1])}Z" fill="${COUL.terre}"/>`;
    s += `<path d="${B.lisse(lit, false, .5)}" fill="none" stroke="${COUL.trait}" stroke-width="2.5" opacity=".6"/>`;
    s += collines(geo, cadre, P, fen) ;
    s += `<path d="${chemin(geo.jourdain, P, false)}" fill="none" stroke="${COUL.mer}" stroke-width="5" stroke-linecap="round"/>`;
    for (const eau of [geo.lac_galilee, geo.mer_morte]) s += `<path d="${chemin(eau, P, true)}" fill="${COUL.mer}" stroke="${COUL.trait}" stroke-width="2" stroke-opacity=".5"/>`;
    const eaux = [geo.lac_galilee, geo.mer_morte].map(e => e.map(([la, lo]) => P(la, lo)));
    eaux.push([...lit, [lit[lit.length - 1][0] - 3000, lit[lit.length - 1][1]], [lit[0][0] - 3000, lit[0][1]]]);     // la mer, à l'ouest du littoral
    const posees = [];
    // le trajet : une ligne d'or qui se dessine
    const lieu = (nom) => geo.lieux.find(l => l.nom === nom);
    if (g.trajet && g.trajet.length > 1) {
      const pts = g.trajet.map(n => lieu(n)).filter(Boolean).map(l => P(l.lat, l.lon));
      const kt = B.clamp((tp - (g.t_trajet ?? d0 + APPARITION)) / TRACE);
      s += `<path d="${B.lisse(pts, false, .4)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1 - kt)}" fill="none" stroke="${COUL.or}" stroke-width="7" stroke-linecap="round" opacity=".95"/>`;
    }
    // les lieux : un point d'or qui s'allume quand la voix le dit, puis reste ; leurs étiquettes passent avant le reste
    let noms = '';
    const centre = (boite[0] + boite[2]) / 2;
    (g.lieux || []).forEach((x, j) => {
      const l = lieu(typeof x === 'string' ? x : x.nom);
      if (!l) return;
      const t0 = (typeof x === 'object' && x.t !== undefined) ? x.t : d0 + APPARITION + j * .25;
      const ka = B.clamp((tp - t0) / ALLUMAGE);
      if (ka <= 0) return;
      const [px, py] = P(l.lat, l.lon), vif = Math.max(0, 1 - (tp - t0) / 1.6);
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(30 * B.ease('sortie', ka))}" fill="${COUL.lueur}" opacity="${f(.55 * vif)}" filter="url(#${id}l)"/>`;
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(13 * B.ease('rebond', ka))}" fill="${COUL.or}" stroke="#fffaf0" stroke-width="4"/>`;
      const nom = l.nom + (l.incertain ? ' ?' : ''), e = placer(px, py, nom, eaux, posees, centre);
      noms += `<text x="${f(e.x)}" y="${f(e.y)}" text-anchor="${e.gauche ? 'end' : 'start'}" font-family="Inter" font-weight="900" font-size="${TAILLE_NOM}" fill="${COUL.texte}" opacity="${f(ka)}" stroke="${COUL.halo}" stroke-width="7" paint-order="stroke">${nom}</text>`;
    });
    // régions et eaux : seulement là où elles ne gênent pas les noms des lieux
    const libre = (x, y, n, taille) => { const b = boiteTexte(x - n * taille * LARGEUR_LETTRE / 2, y, n, false, taille); if (posees.some(q => chevauche(q, b))) return false; posees.push(b); return true; };
    if (g.regions !== false) for (const r of geo.regions) { const [x, y] = P(r.lat, r.lon); if (libre(x, y, r.nom.length + 2, 26)) s += `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="26" letter-spacing="5" fill="${COUL.region}" opacity=".55">${r.nom}</text>`; }
    for (const e of geo.eaux) { const [x, y] = P(e.lat, e.lon); if (libre(x, y, e.nom.length, 22)) s += `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Fraunces" font-style="italic" font-weight="500" font-size="22" fill="#4f7385" opacity=".8">${e.nom}</text>`; }
    s += noms + '</g>';
    s += echelle(P, cadre, fen, k);
    if (g.titre) s += `<text x="540" y="${f(fen.haut + (fen.x1 - fen.x0) * .24)}" text-anchor="middle" font-family="Fraunces" font-weight="700" font-size="46" fill="${COUL.texte}" opacity="${f(k)}" stroke="${COUL.halo}" stroke-width="9" paint-order="stroke">${g.titre}</text>`;
    return `<svg class="et" width="1080" height="1920" style="overflow:visible">${s}</svg>`;
  }

  // ------------------------------------------------------------------ la frise chronologique
  // {type:"frise", points:[{annee:-1000, texte:"David", mot}, {annee:30, texte:"…"}, {annee:2026, texte:"toi", ici:true}],
  //  de, a, titre} — une ligne d'or qui se dessine ; chaque date arrive avec la voix
  const annee = (p) => p.ici ? 'aujourd\'hui' : p.annee < 0 ? `${-p.annee} av. J.-C.` : `${p.annee} apr. J.-C.`;
  function frise(g, tp, fen) {
    const pts = g.points || [], d0 = g.t ?? 0;
    const de = g.de ?? Math.min(...pts.map(p => p.annee)) - 100, a = g.a ?? Math.max(...pts.map(p => p.annee)) + 100;
    const x0 = fen.x0 + 90, x1 = fen.x1 - 90, y = (fen.haut + fen.bas) / 2 + 120;
    const X = (an) => x0 + (an - de) / (a - de) * (x1 - x0);
    const kl = B.ease('sortie', B.clamp((tp - d0) / .8));
    let s = `<rect x="${fen.x0}" y="${fen.haut}" width="${fen.x1 - fen.x0}" height="${fen.bas - fen.haut}" fill="#13203d" opacity="${f(.72 * B.clamp((tp - d0) / .4))}"/>`;
    s += `<path d="M${x0},${y} L${f(B.lerp(x0, x1, kl))},${y}" stroke="${COUL.or}" stroke-width="6" stroke-linecap="round"/>`;
    if (kl >= 1) s += `<path d="M${x1 - 4},${y - 14} L${x1 + 18},${y} L${x1 - 4},${y + 14}" fill="${COUL.or}"/>`;
    pts.forEach((p, j) => {
      const t0 = p.t ?? d0 + .6 + j * .45, kk = B.clamp((tp - t0) / ALLUMAGE);
      if (kk <= 0) return;
      const x = X(p.annee), haut = j % 2 === 0, dy = haut ? -1 : 1;
      s += `<circle cx="${f(x)}" cy="${y}" r="${f((p.ici ? 15 : 11) * B.ease('rebond', kk))}" fill="${p.ici ? COUL.lueur : COUL.or}" stroke="#fffaf0" stroke-width="3"/>`;
      s += `<path d="M${f(x)},${y + dy * 18} l0,${dy * 40}" stroke="#fffaf0" stroke-width="2" opacity="${f(.6 * kk)}"/>`;
      s += `<text x="${f(x)}" y="${f(y + dy * (haut ? 74 : 96))}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="30" fill="${COUL.lueur}" opacity="${f(kk)}">${p.date || annee(p)}</text>`;
      s += `<text x="${f(x)}" y="${f(y + dy * (haut ? 112 : 134))}" text-anchor="middle" font-family="Fraunces" font-weight="600" font-size="32" fill="#fffaf0" opacity="${f(kk)}">${p.texte || ''}</text>`;
    });
    if (g.titre) s += `<text x="540" y="${f(y - 230)}" text-anchor="middle" font-family="Fraunces" font-weight="700" font-size="46" fill="#fffaf0" opacity="${f(kl)}">${g.titre}</text>`;
    return `<svg class="et" width="1080" height="1920" style="overflow:visible">${s}</svg>`;
  }

  // ------------------------------------------------------------------ la définition d'un mot (avec prudence)
  // {type:"definition", terme:"la grâce", langue:"grec", original:"χάρις", translit:"kharis", sens:"un cadeau qu'on ne
  //  mérite pas", ref:"Éphésiens 2:8", y} — le mot, sa langue d'origine, son sens établi (jamais une étymologie douteuse)
  function definition(g, tp, k, ks) {
    const d0 = g.t ?? 0, e = B.ease('sortie', k), ks2 = B.clamp((tp - d0 - .5) / .4), ks3 = B.clamp((tp - d0 - 1.0) / .4);
    return `<div class="citation definition" style="top:${g.y ?? DEFINITION_Y}px;opacity:${f(Math.min(k * 1.5, ks))};transform:translateX(-50%) translateY(${f((1 - e) * 40)}px)">` +
      `<div class="en">${(g.langue ? `EN ${g.langue.toUpperCase()}` : 'LE MOT')}</div>` +
      `<div class="terme">${g.terme || ''}</div>` +
      (g.original ? `<div class="original" style="opacity:${f(ks2)}">${g.original}${g.translit ? ` · <i>${g.translit}</i>` : ''}</div>` : '') +
      `<div class="sens" style="opacity:${f(ks3)}">${g.sens || ''}</div>` +
      (g.ref ? `<div class="rf" style="opacity:${f(ks3)}">${g.ref}</div>` : '') + `</div>`;
  }

  G.ENSEIGNER = { carte, frise, definition, projection };
})(typeof window !== 'undefined' ? window : globalThis);
