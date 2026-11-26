// Générateurs de LIEUX : des outils qui construisent n'importe quel lieu à partir de sa description (rien n'est
// une banque) — une pièce en perspective, des meubles et volumes, des bâtiments (antiques ou modernes), une ville,
// des arbres de toute espèce, de la végétation, des sols, des rochers, une foule de personnages générés.
// Tout est en perspective à un point de fuite cohérent avec l'horizon du lieu (lieu.sol), donc logique.
(function (G) {
  const B = G.B, f = B.f, MONDE = G.MONDE, GEN = MONDE.GEN;

  // ------------------------------------------------------------------ perspective
  // h : ligne d'horizon (y), vx : point de fuite (x), D : distance de vue (plus petit = perspective plus forte)
  const PERSP = (p) => ({ h: p.horizon ?? 900, vx: p.fuite ?? 540, D: p.distance ?? 1500 });
  const fuite = (P, pt, prof) => {                // un point recule de "prof" (px au premier plan) vers le point de fuite
    const k = P.D / (P.D + prof);
    return [P.vx + (pt[0] - P.vx) * k, P.h + (pt[1] - P.h) * k];
  };
  const poly = (pts, fill, extra = '') => `<path d="M${pts.map(p => f(p[0]) + ',' + f(p[1])).join('L')}Z" fill="${fill}"${extra}/>`;
  const tons = (c, ombre = '#2b2140') => ({ face: c, haut: B.clair(c, .16), cote: B.teinte(c, ombre, .3), bas: B.teinte(c, ombre, .45), trait: B.teinte(c, ombre, .55) });

  // une boîte : face avant (x, y = coin bas gauche, w, h) + profondeur → faces visibles, éclairées
  function boite(P, x, y, w, h, prof, c, o = {}) {
    const t = tons(c, o.ombre);
    const A = [x, y], Bp = [x + w, y], Cp = [x + w, y - h], Dp = [x, y - h];
    const A2 = fuite(P, A, prof), B2 = fuite(P, Bp, prof), C2 = fuite(P, Cp, prof), D2 = fuite(P, Dp, prof);
    const tr = o.trait === false ? '' : ` stroke="${t.trait}" stroke-width="${o.trait_l ?? 1.6}" stroke-opacity=".5" stroke-linejoin="round"`;
    let s = '';
    if (y - h > P.h) s += poly([Dp, Cp, C2, D2], o.haut || t.haut, tr);          // dessus (sous l'horizon : on le voit)
    if (y < P.h) s += poly([A, Bp, B2, A2], t.bas, tr);                           // dessous (au-dessus de l'horizon)
    if (x > P.vx) s += poly([A, Dp, D2, A2], t.cote, tr);                         // côté gauche
    if (x + w < P.vx) s += poly([Bp, Cp, C2, B2], t.cote, tr);                    // côté droit
    s += poly([A, Bp, Cp, Dp], o.face || t.face, tr);
    return s;
  }
  // un cylindre vertical (pied de table, colonne, tronc) vu de face
  const cylindre = (x, y, r, h, c, o = {}) => {
    const t = tons(c, o.ombre);
    return `<rect x="${f(x - r)}" y="${f(y - h)}" width="${f(2 * r)}" height="${f(h)}" fill="${c}"/><rect x="${f(x + r * .25)}" y="${f(y - h)}" width="${f(r * .75)}" height="${f(h)}" fill="${t.cote}"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(r)}" ry="${f(r * .3)}" fill="${t.haut}"/>`;
  };
  // la taille d'un humain (px) au pied d'un objet : la perspective du lieu le dit (ou "humain" explicite)
  const HUMAIN = 460;                          // un adulte à l'échelle 1 au y de référence
  const kSol = (p, y) => p.horizon !== undefined && p.y_ref !== undefined ? Math.max(.03, (y - p.horizon) / Math.max(1, p.y_ref - p.horizon)) * (p.echelle_sol ?? 1) : 1;
  // une pièce dans le repère d'un objet posé en (x, y) : dx le long, dz vers le fond, dy en hauteur, w × h × prof — tout
  // en px au premier plan ; elle recule avec la même perspective (largeur, hauteur et profondeur réduites ensemble)
  function piece(P, x, y, dx, dz, dy, w, h, prof, c, o) {
    const k = P.D / (P.D + dz), a = fuite(P, [x + dx, y], dz);
    return boite(P, a[0], a[1] - dy * k, w * k, h * k, prof * k, c, o);
  }
  MONDE.boite = boite; MONDE.fuite = fuite; MONDE.PERSP = PERSP; MONDE.kSol = kSol; MONDE.piece = piece;

  // ------------------------------------------------------------------ volumes
  GEN.volume = (p) => { const P = PERSP(p); return (p.boites || [p]).map(b => boite(P, b.x, b.y, b.l, b.h, b.prof ?? 100, b.couleur || '#9a8a7a')).join(''); };

  // ------------------------------------------------------------------ bâtiments
  // {gen:"batiment", x, y (pied de façade), l, h, style:"antique"|"moderne"|"immeuble"|"maison", toit:"plat"|"pente"|"terrasse"|"dome",
  //  couleur, fenetres:{rangs, colonnes, allumees: 0–1, couleur}, porte:true, escalier:true, cote: profondeur visible, horizon, fuite}
  const poly2 = (d, c) => `<path d="${d}" fill="${c}"/>`;
  function batiment(p, seed) {
    const P = PERSP(p); const r = B.alea(seed || p.seed || 11);
    const x = p.x ?? 300, y = p.y ?? 1300, l = p.l ?? 300, h = p.h ?? 260, c = p.couleur || '#d8c3a0', st = p.style || 'antique';
    const hu = p.humain ?? (p.horizon !== undefined && p.y_ref !== undefined ? HUMAIN * kSol(p, y) : h * .42);
    const t = tons(c, p.ombre);
    let s = '';
    const prof = p.cote ?? (st === 'antique' ? l * .5 : l * .4);
    s += boite(P, x, y, l, h, prof, c, { trait_l: 1.2 });
    const clip = `bt${Math.floor(r() * 1e9)}`;
    s += `<defs><clipPath id="${clip}"><rect x="${f(x)}" y="${f(y - h)}" width="${f(l)}" height="${f(h)}"/></clipPath></defs>`;
    if (st === 'antique' || st === 'maison') {
      // enduit à la chaux sur pierre : la pierre apparaît par endroits (coins, pied, éclats), soubassement, fissures
      const sp = Math.max(6, hu * .085), pierre = (xx, yy) => { const w = sp * (1.3 + r() * .9), hh = sp * (.75 + r() * .2), t = B.mix(c, r() < .5 ? '#8a7a64' : '#f2e8d4', .16 + r() * .2); return poly2(MONDE.arrondi([[xx, yy], [xx + w, yy], [xx + w, yy + hh], [xx, yy + hh]], sp * .2), t) + `<path d="M${f(xx + sp * .15)},${f(yy + hh * .1)}H${f(xx + w - sp * .15)}" stroke="${B.clair(t, .3)}" stroke-width="${f(Math.max(.8, sp * .06))}" opacity=".6"/>`; };
      let m = `<defs><linearGradient id="${clip}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2b2140" stop-opacity=".2"/></linearGradient></defs><rect x="${f(x)}" y="${f(y - h)}" width="${f(l)}" height="${f(h)}" fill="url(#${clip}g)"/>`;
      const zones = Math.max(2, Math.round(l * h / (hu * hu * 1.4)));
      for (let z = 0; z < zones; z++) { const zx = x + r() * l, zy = y - h * (.1 + r() * .8), n = 3 + Math.floor(r() * 3); for (let j = 0; j < n; j++) for (let i = 0; i < 4; i++) if (r() < .62 - Math.abs(i - 1.5) * .12 - Math.abs(j - n / 2) * .06) m += pierre(zx + (i - 2) * sp * 1.9 + (j % 2) * sp * .9, zy + j * sp * 1.0); }
      for (const bord of [x - sp * .2, x + l - sp * 1.6]) for (let j = 0, yy = y - h; yy < y; j++, yy += sp * 1.02) if (r() < .8) m += pierre(bord + (j % 2) * sp * .25, yy);
      for (let i = 0; i < Math.max(1, l / (hu * 1.2)); i++) { let fx = x + r() * l, fy = y - h * (.5 + r() * .5), d = `M${f(fx)},${f(fy)}`; for (let j = 0; j < 4; j++) { fx += (r() - .5) * sp * 1.4; fy += sp * (.5 + r() * .8); d += `L${f(fx)},${f(fy)}`; } m += `<path d="${d}" stroke="${B.teinte(c, '#2b2140', .4)}" stroke-width="${f(Math.max(.8, sp * .05))}" fill="none" opacity=".4"/>`; }
      for (let xx = x - sp; xx < x + l; xx += sp * 2.3) m += pierre(xx + r() * sp * .4, y - sp * 1.05);
      s += `<g clip-path="url(#${clip})">${m}</g>`;
    }
    // toit
    const toit = p.toit || (st === 'antique' ? 'plat' : st === 'maison' ? 'pente' : 'plat');
    if (toit === 'plat' || toit === 'terrasse') {
      if (st === 'antique') {
        // toit en terrasse : parapet irrégulier, poutres qui dépassent sous la ligne du toit
        const pa = hu * .1;
        let d = `M${f(x - 4)},${f(y - h + pa * .4)}`;
        for (let xx = x - 4; xx <= x + l + 4; xx += pa * 1.5) d += ` L${f(xx)},${f(y - h - pa * (.7 + r() * .3))}`;
        d += ` L${f(x + l + 4)},${f(y - h + pa * .4)}Z`;
        s += `<path d="${d}" fill="${t.haut}" stroke="${t.trait}" stroke-width="1.2" stroke-opacity=".4"/>`;
        const n = Math.max(2, Math.round(l / (hu * .45)));
        for (let k = 0; k < n; k++) { const bx = x + (k + .5) * l / n; s += `<ellipse cx="${f(bx)}" cy="${f(y - h + pa * 1.1)}" rx="${f(hu * .028)}" ry="${f(hu * .028)}" fill="#5a4030"/><ellipse cx="${f(bx + hu * .006)}" cy="${f(y - h + pa * 1.1)}" rx="${f(hu * .018)}" ry="${f(hu * .018)}" fill="#7a5a40"/>`; }
      } else s += `<rect x="${x - 6}" y="${y - h - 10}" width="${l + 12}" height="12" fill="${t.haut}"/>`;
    }
    if (toit === 'pente') s += `<path d="M${x - 18},${y - h} L${x + l / 2},${y - h - l * .38} L${x + l + 18},${y - h}Z" fill="${p.couleur_toit || '#a4523a'}"/><path d="M${x + l / 2},${y - h - l * .38} L${x + l + 18},${y - h} L${x + l * .5},${y - h}Z" fill="${B.sombre(p.couleur_toit || '#a4523a', .15)}"/>`;
    if (toit === 'dome') s += `<path d="M${x + l * .15},${y - h} A${l * .35},${l * .35} 0 0 1 ${x + l * .85},${y - h}Z" fill="${p.couleur_toit || '#d9b45a'}"/>`;
    // porte (à l'échelle humaine)
    const pw = Math.min(l * .4, hu * .5), ph = Math.min(h * .8, hu * 1.12), px = B.clamp(x + l * (p.porte_x ?? .5) - pw / 2, x + pw * .4, x + l - pw * 1.4);      // (la porte et son linteau tiennent dans le mur)
    const portes = [];
    if (p.porte !== false) portes.push([px, px + pw]);
    // fenêtres
    if (st === 'antique') {
      const n = p.fenetres?.colonnes ?? Math.max(1, Math.round(l / (hu * 1.1)));
      const rangs = p.fenetres?.rangs ?? (h > hu * 2.2 ? 2 : 1);
      for (let i = 0; i < rangs; i++) for (let j = 0; j < n; j++) {
        if (r() < .3 && n > 1) continue;
        const w = hu * (.16 + r() * .06), hh = hu * (.22 + r() * .08);
        const xx = x + (j + .5) * l / n - w / 2 + (r() - .5) * hu * .2;
        const yy = rangs === 1 ? y - Math.min(h * .75, hu * 1.25) : y - h + hu * .35 + i * (h - hu * 1.2) / Math.max(1, rangs);
        if (portes.some(([a, b]) => xx + w > a - hu * .05 && xx < b + hu * .05) && yy + hh > y - ph - hu * .1) continue;
        const al = r() < (p.fenetres?.allumees ?? 0);
        s += `<rect x="${f(xx - w * .12)}" y="${f(yy - w * .2)}" width="${f(w * 1.24)}" height="${f(hh + w * .32)}" fill="${B.sombre(c, .12)}" opacity=".5"/>`;
        s += `<rect x="${f(xx)}" y="${f(yy)}" width="${f(w)}" height="${f(hh)}" fill="${al ? '#ffd48a' : '#2a1d14'}"/>`;
        s += `<rect x="${f(xx)}" y="${f(yy)}" width="${f(w)}" height="${f(hh * .25)}" fill="#000" opacity=".25"/>`;
        s += `<rect x="${f(xx - w * .2)}" y="${f(yy - w * .22)}" width="${f(w * 1.4)}" height="${f(w * .22)}" fill="#6b4a30"/>`;
        for (let k = 1; k < 3; k++) s += `<line x1="${f(xx + w * k / 3)}" y1="${f(yy)}" x2="${f(xx + w * k / 3)}" y2="${f(yy + hh)}" stroke="#5a4030" stroke-width="${f(w * .07)}"/>`;
      }
    } else {
      const fe = Object.assign({ rangs: Math.max(1, Math.round(h / (st === 'immeuble' ? 90 : 120))), colonnes: Math.max(1, Math.round(l / (st === 'immeuble' ? 70 : 110))), allumees: 0, couleur: '#33405a' }, p.fenetres || {});
      for (let i = 0; i < fe.rangs; i++) for (let j = 0; j < fe.colonnes; j++) {
        const cw = l / fe.colonnes, rh = (h - (p.porte !== false ? 70 : 20)) / fe.rangs;
        const w = cw * .5, hh = rh * .55, xx = x + j * cw + (cw - w) / 2, yy = y - h + 26 + i * rh;
        const al = r() < fe.allumees;
        s += `<rect x="${f(xx)}" y="${f(yy)}" width="${f(w)}" height="${f(hh)}" fill="${al ? '#ffd48a' : fe.couleur}" stroke="${B.clair(c, .25)}" stroke-width="3"/>`;
      }
    }
    if (p.porte !== false) {
      if (st === 'antique') {
        const ouv = p.porte_ouverte;
        s += `<rect x="${f(px - pw * .12)}" y="${f(y - ph - pw * .2)}" width="${f(pw * 1.24)}" height="${f(ph + pw * .2)}" fill="${B.sombre(c, .14)}"/>`;
        s += `<rect x="${f(px)}" y="${f(y - ph)}" width="${f(pw)}" height="${f(ph)}" fill="${ouv ? (p.interieur || '#2a1d14') : (p.couleur_porte || '#6b4a30')}"/>`;
        if (!ouv) { for (let k = 1; k < 4; k++) s += `<line x1="${f(px + pw * k / 4)}" y1="${f(y - ph)}" x2="${f(px + pw * k / 4)}" y2="${f(y)}" stroke="${B.sombre(p.couleur_porte || '#6b4a30', .3)}" stroke-width="${f(pw * .025)}"/>`; s += `<rect x="${f(px)}" y="${f(y - ph * .72)}" width="${f(pw)}" height="${f(pw * .06)}" fill="${B.sombre(p.couleur_porte || '#6b4a30', .25)}"/><circle cx="${f(px + pw * .8)}" cy="${f(y - ph * .5)}" r="${f(pw * .035)}" fill="#3a2a1a"/>`; }
        else s += `<path d="M${f(px)},${f(y - ph)} L${f(px + pw * .28)},${f(y - ph * 1.04)} L${f(px + pw * .28)},${f(y + pw * .04)} L${f(px)},${f(y)}Z" fill="${p.couleur_porte || '#6b4a30'}"/>`;
        s += `<rect x="${f(px - pw * .2)}" y="${f(y - ph - pw * .26)}" width="${f(pw * 1.4)}" height="${f(pw * .2)}" fill="${B.clair(c, .1)}" stroke="${t.trait}" stroke-width="1" stroke-opacity=".4"/>`;
        s += `<rect x="${f(px - pw * .15)}" y="${f(y - pw * .06)}" width="${f(pw * 1.3)}" height="${f(pw * .08)}" fill="${B.sombre(c, .2)}"/>`;
      } else s += `<rect x="${f(px)}" y="${f(y - ph)}" width="${f(pw)}" height="${f(ph)}" fill="${p.couleur_porte || '#5a4030'}"/>`;
    }
    if (p.escalier && st === 'antique') {   // escalier extérieur le long de la façade, vers la terrasse (côté droit)
      const n = 8, run = Math.min(l * .3, hu * 1.1) / n, sh = h / n;
      let d = `M${f(x + l)},${f(y)}`;
      for (let k = 0; k < n; k++) d += ` L${f(x + l - k * run)},${f(y - (k + 1) * sh)} L${f(x + l - (k + 1) * run)},${f(y - (k + 1) * sh)}`;
      d += ` L${f(x + l - n * run)},${f(y)}Z`;
      s += `<path d="${d}" fill="${t.cote}" stroke="${t.trait}" stroke-width="1.2" stroke-opacity=".5"/>`;
    }
    if (p.auvent) s += `<path d="M${f(px - pw * .5)},${f(y - ph - pw * .3)} l${f(pw * 2)},0 l${f(pw * .25)},${f(pw * .45)} l${f(-pw * 2.5)},0Z" fill="${p.auvent}"/>`;
    if (p.plantes !== false && st === 'antique' && hu > 60) {
      for (const xx of [x + l * .05 + r() * l * .1, x + l * (.75 + r() * .2)]) { const seed = Math.floor(r() * 99); if (!portes.some(([a, b]) => xx > a - hu * .18 && xx < b + hu * .18)) s += GEN.accessoire({ type: 'cruche', x: xx, y: y - 2, taille: hu * .2, seed }); }      // (jamais devant la porte)
    }
    return s;
  }
  GEN.batiment = (p) => batiment(p);

  // ville / village : des bâtiments générés en rangées (du fond vers l'avant, perspective atmosphérique)
  // {gen:"ville", style:"antique"|"moderne", rangees:[{y, h:[min,max], echelle}], de:-400, a:1500, nuit:true, couleur, brume:"#…", seed}
  GEN.ville = (p) => {
    const r = B.alea(p.seed || 21);
    const rangs = p.rangees || [{ y: 1000, h: [120, 260], echelle: .5 }, { y: 1080, h: [160, 320], echelle: .75 }];
    const st = p.style || 'antique';
    const pal = p.couleurs || (st === 'antique' ? ['#d8c3a0', '#cdb48c', '#e2d1b2', '#c4a982'] : ['#9aa3b5', '#b7aa98', '#7f8aa0', '#c9bfae', '#8e7f74']);
    let s = '';
    rangs.forEach((rg, k) => {
      let x = p.de ?? -500;
      const brume = p.brume ? B.clamp(.55 - k * .25, 0, .6) : 0;
      while (x < (p.a ?? 1600)) {
        const e = rg.echelle ?? 1, l = (st === 'antique' ? 140 + r() * 160 : 110 + r() * 170) * e;
        const hh = (rg.h[0] + r() * (rg.h[1] - rg.h[0])) * (st === 'antique' ? 1 : 1.6);
        const c = B.mix(pal[Math.floor(r() * pal.length)], p.brume || '#000000', brume);
        s += batiment({ humain: 120 * e, x, y: rg.y, l, h: hh * e, style: st === 'antique' ? 'antique' : (r() < .6 ? 'immeuble' : 'moderne'), couleur: c, horizon: p.horizon, fuite: p.fuite, cote: l * .3, fenetres: { allumees: p.nuit ? .45 : 0, couleur: p.nuit ? '#1b2236' : (st === 'antique' ? '#3a2a1e' : '#4a5a78') }, porte: e > .6 }, Math.floor(r() * 1e6));
        if (st === 'antique' && r() < .25) s += GEN.arbre({ espece: r() < .5 ? 'palmier' : 'olivier', x: x + l + 10, y: rg.y, hauteur: 160 * e + r() * 80 * e, couleur: B.mix('#6f7d4a', p.brume || '#000', brume), seed: Math.floor(r() * 999) });
        x += l + (st === 'antique' ? 6 + r() * 30 : 2 + r() * 12) * e;
      }
    });
    return s;
  };

  // {gen:"chemin", de:[x,y] (au premier plan), a:[x,y] (au loin), largeur, couleur, sinueux}  (une route ou un sentier qui file vers l'horizon)
  GEN.chemin = (p) => {
    let [x0, y0] = p.de || [540, 2000], [x1, y1] = p.a || [600, 1000];
    if (y0 < y1) [x0, y0, x1, y1] = [x1, y1, x0, y0];   // « de » est le bout proche (le plus bas) : donnés à l'envers, on les remet
    const L0 = p.largeur ?? 520, c = p.couleur || '#c9ae7e';
    const L1 = L0 * (p.largeur_loin ?? .04), n = 24, si = p.sinueux ?? 1;
    const g = [], d = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, kk = Math.pow(k, .55);
      const yy = B.lerp(y0, y1, kk), w = B.lerp(L0, L1, kk) / 2;
      const xx = B.lerp(x0, x1, kk) + Math.sin(k * Math.PI * 1.6 + (p.seed || 0)) * 90 * si * (1 - k) * k * 3;
      g.push([xx - w, yy]); d.push([xx + w, yy]);
    }
    const bord = [...g, ...d.reverse()];
    return `<path d="${B.lisse(bord, true, .3)}" fill="${c}"/><path d="${B.lisse(g, false, .3)}" stroke="${B.sombre(c, .15)}" stroke-width="5" fill="none" opacity=".5"/>`;
  };

  // ------------------------------------------------------------------ accessoires (objets tenus ou posés)
  // {gen:"accessoire", type:"pieces"|"bourse"|"coupe"|"pain"|"lampe"|"bougie"|"telephone"|"livre"|"assiette"|"cruche"|"baton"|"carouges"|"panier"|"tasse", x, y, taille, couleur, allume}
  GEN.accessoire = (p, id, t = 0) => {
    const x = p.x ?? 540, y = p.y ?? 1500, T = (p.taille ?? 60) * kSol(p, p.y_sol ?? y), c = p.couleur, r = B.alea(p.seed || 91);
    const ty = p.type || 'pieces';
    const ombre = `<ellipse cx="${f(x)}" cy="${f(y + 2)}" rx="${f(T * .6)}" ry="${f(T * .1)}" fill="#120c1c" opacity=".3"/>`;
    if (ty === 'pieces') { let s = ''; const n = p.n || 7; for (let i = 0; i < n; i++) { const xx = x + (r() - .5) * T * 1.6, yy = y - r() * T * .2 - (i > n * .6 ? T * .12 * (i - n * .6) : 0); s += `<ellipse cx="${f(xx)}" cy="${f(yy)}" rx="${f(T * .16)}" ry="${f(T * .07)}" fill="#b8892e"/><ellipse cx="${f(xx)}" cy="${f(yy - T * .025)}" rx="${f(T * .16)}" ry="${f(T * .07)}" fill="${c || '#e8c25a'}"/><ellipse cx="${f(xx - T * .04)}" cy="${f(yy - T * .035)}" rx="${f(T * .06)}" ry="${f(T * .025)}" fill="#fff3c4" opacity=".7"/>`; } return s; }
    if (ty === 'bourse') { const cc = c || '#8a5a3a'; return ombre + `<path d="M${f(x - T * .45)},${f(y)} Q${f(x - T * .6)},${f(y - T * .55)} ${f(x - T * .15)},${f(y - T * .7)} L${f(x + T * .15)},${f(y - T * .7)} Q${f(x + T * .6)},${f(y - T * .55)} ${f(x + T * .45)},${f(y)}Z" fill="${cc}" stroke="${B.sombre(cc, .4)}" stroke-width="2"/><path d="M${f(x - T * .22)},${f(y - T * .72)} q${f(T * .22)},${f(-T * .2)} ${f(T * .44)},0" stroke="#d9b45a" stroke-width="${f(T * .06)}" fill="none"/><path d="M${f(x - T * .2)},${f(y - T * .5)} q${f(-T * .1)},${f(T * .3)} 0,${f(T * .45)}" stroke="${B.clair(cc, .2)}" stroke-width="${f(T * .05)}" fill="none" opacity=".6"/>`; }
    if (ty === 'coupe') { const cc = c || '#d9b45a'; return ombre + `<path d="M${f(x - T * .35)},${f(y - T)} L${f(x + T * .35)},${f(y - T)} Q${f(x + T * .3)},${f(y - T * .45)} ${f(x + T * .05)},${f(y - T * .4)} L${f(x + T * .05)},${f(y - T * .1)} L${f(x + T * .25)},${f(y)} L${f(x - T * .25)},${f(y)} L${f(x - T * .05)},${f(y - T * .1)} L${f(x - T * .05)},${f(y - T * .4)} Q${f(x - T * .3)},${f(y - T * .45)} ${f(x - T * .35)},${f(y - T)}Z" fill="${cc}" stroke="${B.sombre(cc, .4)}" stroke-width="2"/><ellipse cx="${x}" cy="${f(y - T)}" rx="${f(T * .35)}" ry="${f(T * .08)}" fill="#7a1f2a"/>`; }
    if (ty === 'pain') { const cc = c || '#d39a54'; return ombre + `<ellipse cx="${x}" cy="${f(y - T * .2)}" rx="${f(T * .55)}" ry="${f(T * .25)}" fill="${cc}" stroke="${B.sombre(cc, .35)}" stroke-width="2"/><ellipse cx="${f(x - T * .1)}" cy="${f(y - T * .3)}" rx="${f(T * .35)}" ry="${f(T * .1)}" fill="${B.clair(cc, .25)}"/>` + [-.25, 0, .25].map(k => `<path d="M${f(x + k * T - T * .06)},${f(y - T * .38)} l${f(T * .12)},${f(T * .14)}" stroke="${B.sombre(cc, .3)}" stroke-width="3"/>`).join(''); }
    if (ty === 'lampe' || ty === 'bougie') {
      const fl = `<path d="M${x},${f(y - T * (ty === 'lampe' ? .55 : 1.25) - T * (.32 + .05 * Math.sin(t * 12)))} q${f(T * .1)},${f(T * .2)} 0,${f(T * .3)} q${f(-T * .1)},${f(-T * .1)} 0,${f(-T * .3)}Z" fill="#ffd76b"/><circle cx="${x}" cy="${f(y - T * (ty === 'lampe' ? .7 : 1.4))}" r="${f(T * 1.6)}" fill="#ffc46b" opacity=".18" style="mix-blend-mode:screen" filter="url(#flou18)"/>`;
      if (ty === 'lampe') { const cc = c || '#b5733e'; return ombre + `<path d="M${f(x - T * .5)},${f(y - T * .2)} Q${f(x - T * .5)},${f(y - T * .55)} ${x},${f(y - T * .55)} Q${f(x + T * .55)},${f(y - T * .55)} ${f(x + T * .65)},${f(y - T * .45)} L${f(x + T * .3)},${f(y - T * .2)} Q${x},${y} ${f(x - T * .5)},${f(y - T * .2)}Z" fill="${cc}" stroke="${B.sombre(cc, .4)}" stroke-width="2"/>` + (p.allume !== false ? fl.replace(`M${x},`, `M${f(x + T * .55)},`).replace(`cx="${x}"`, `cx="${f(x + T * .55)}"`) : ''); }
      return ombre + `<rect x="${f(x - T * .15)}" y="${f(y - T * 1.2)}" width="${f(T * .3)}" height="${f(T * 1.2)}" rx="3" fill="${c || '#f2ead8'}"/>` + (p.allume !== false ? fl : '');
    }
    if (ty === 'telephone') { const on = p.allume !== false; return `<rect x="${f(x - T * .28)}" y="${f(y - T)}" width="${f(T * .56)}" height="${f(T)}" rx="${f(T * .08)}" fill="#1d1d24"/><rect x="${f(x - T * .24)}" y="${f(y - T * .95)}" width="${f(T * .48)}" height="${f(T * .9)}" rx="${f(T * .05)}" fill="${on ? '#cfe3ff' : '#2a2a34'}"/>` + (on ? `<circle cx="${x}" cy="${f(y - T * .5)}" r="${f(T * 2)}" fill="#9cc4ff" opacity=".15" style="mix-blend-mode:screen" filter="url(#flou18)"/>` : ''); }
    if (ty === 'livre') { const cc = c || '#6b2a2a'; return ombre + `<path d="M${f(x - T * .6)},${f(y - T * .1)} L${x},${f(y)} L${f(x + T * .6)},${f(y - T * .1)} L${f(x + T * .6)},${f(y - T * .2)} L${x},${f(y - T * .1)} L${f(x - T * .6)},${f(y - T * .2)}Z" fill="${cc}"/><path d="M${f(x - T * .56)},${f(y - T * .2)} Q${f(x - T * .3)},${f(y - T * .3)} ${x},${f(y - T * .12)} Q${f(x + T * .3)},${f(y - T * .3)} ${f(x + T * .56)},${f(y - T * .2)} L${f(x + T * .56)},${f(y - T * .16)} L${x},${f(y - T * .06)} L${f(x - T * .56)},${f(y - T * .16)}Z" fill="#f6efe0"/>`; }
    if (ty === 'cruche') { const cc = c || '#b5673e'; return ombre + `<path d="M${f(x - T * .15)},${f(y - T)} L${f(x + T * .15)},${f(y - T)} L${f(x + T * .12)},${f(y - T * .8)} C${f(x + T * .5)},${f(y - T * .65)} ${f(x + T * .45)},${f(y - T * .1)} ${f(x + T * .2)},${y} L${f(x - T * .2)},${y} C${f(x - T * .45)},${f(y - T * .1)} ${f(x - T * .5)},${f(y - T * .65)} ${f(x - T * .12)},${f(y - T * .8)}Z" fill="${cc}" stroke="${B.sombre(cc, .4)}" stroke-width="2"/><path d="M${f(x + T * .15)},${f(y - T * .85)} q${f(T * .3)},${f(T * .05)} ${f(T * .22)},${f(T * .35)}" stroke="${cc}" stroke-width="${f(T * .07)}" fill="none"/>`; }
    if (ty === 'carouges') { let s = ''; for (let i = 0; i < (p.n || 8); i++) { const xx = x + (r() - .5) * T * 1.4, yy = y - r() * T * .15; s += `<path d="M${f(xx - T * .25)},${f(yy)} q${f(T * .25)},${f(-T * .12)} ${f(T * .5)},${f(-T * .02)}" stroke="${c || '#5a3a22'}" stroke-width="${f(T * .08)}" stroke-linecap="round" fill="none" transform="rotate(${f((r() - .5) * 70)},${f(xx)},${f(yy)})"/>`; } return s; }
    if (ty === 'assiette') return ombre + `<ellipse cx="${x}" cy="${f(y - T * .05)}" rx="${f(T * .6)}" ry="${f(T * .16)}" fill="${c || '#e9dcc4'}" stroke="#9a8a76" stroke-width="2"/><ellipse cx="${x}" cy="${f(y - T * .07)}" rx="${f(T * .38)}" ry="${f(T * .09)}" fill="${B.sombre(c || '#e9dcc4', .08)}"/>`;
    if (ty === 'tasse') return ombre + `<path d="M${f(x - T * .3)},${f(y - T * .7)} L${f(x + T * .3)},${f(y - T * .7)} L${f(x + T * .25)},${y} L${f(x - T * .25)},${y}Z" fill="${c || '#f2f0ea'}" stroke="#9a948a" stroke-width="2"/><path d="M${f(x + T * .28)},${f(y - T * .55)} q${f(T * .25)},${f(T * .1)} 0,${f(T * .35)}" stroke="${c || '#f2f0ea'}" stroke-width="${f(T * .08)}" fill="none"/>`;
    if (ty === 'baton') return `<path d="M${x},${y} L${f(x + T * .05)},${f(y - T * 3)} q${f(T * .05)},${f(-T * .35)} ${f(-T * .3)},${f(-T * .35)}" stroke="${c || '#6b4a2e'}" stroke-width="${f(T * .09)}" fill="none" stroke-linecap="round"/>`;
    if (ty === 'panier') { const cc = c || '#b08a52'; return ombre + `<path d="M${f(x - T * .55)},${f(y - T * .5)} L${f(x + T * .55)},${f(y - T * .5)} L${f(x + T * .42)},${y} L${f(x - T * .42)},${y}Z" fill="${cc}"/>` + [0, 1, 2, 3].map(k => `<path d="M${f(x - T * .5)},${f(y - T * (.42 - k * .11))} L${f(x + T * .5)},${f(y - T * (.42 - k * .11))}" stroke="${B.sombre(cc, .3)}" stroke-width="2.5"/>`).join('') + `<path d="M${f(x - T * .45)},${f(y - T * .5)} Q${x},${f(y - T * 1.2)} ${f(x + T * .45)},${f(y - T * .5)}" stroke="${B.sombre(cc, .15)}" stroke-width="${f(T * .07)}" fill="none"/>`; }
    return '';
  };

  // ------------------------------------------------------------------ foule : des personnages générés (jamais les mêmes)
  // {gen:"foule", n, zone:[x0,y0,x1,y1], horizon, y_ref, epoque:"antique"|"moderne", poses:["debout","ecoute"], vue: angle ou "vers":[x,y], seed}
  GEN.foule = (p, id) => {
    const r = B.alea(p.seed || 61), P = PERSP(p), PERSO = G.PERSO;
    const [x0, y0, x1, y1] = p.zone || [-200, 1250, 1300, 1450];
    const n = p.n || 12, ep = p.epoque || 'antique';
    const peaux = ep === 'antique' ? ['#9c6644', '#b07a52', '#c48a5e', '#a8704a', '#8d5a3b', '#c99872'] : ['#f0c9a6', '#e8b994', '#c48a5e', '#8d5a3b', '#6b4430', '#d9a87e', '#f3d2b5'];
    const tissus = ep === 'antique' ? ['#8a7a5c', '#a4523a', '#5f7f96', '#c9b48a', '#7a5c3e', '#6b7a4a', '#efe6d6', '#7a4e8a', '#b8843a'] : ['#2f3b5a', '#d95f43', '#f2f0ea', '#556b4a', '#e3a33b', '#7b8fc4', '#3a3a40', '#b5523a', '#8e7f74'];
    const ch = ['#1c130d', '#2a1d15', '#3a2418', '#5a3a22', '#141414'];
    const gens = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0);
      const fem = r() < .5, age = r() < .12 ? 'enfant' : r() < .15 ? 'age' : 'adulte';
      const desc = ep === 'antique' ? {
        silhouette: fem ? 'femme' : 'homme', age, peau: peaux[Math.floor(r() * peaux.length)],
        cheveux: { style: fem ? 'long' : (r() < .5 ? 'court' : 'boucles'), couleur: age === 'age' ? '#c4bfb8' : ch[Math.floor(r() * ch.length)] },
        barbe: !fem && age === 'adulte' && r() < .7 ? { style: 'courte' } : (age === 'age' && !fem ? { style: 'longue', couleur: '#d8d2c8' } : null),
        haut: { couleur: tissus[Math.floor(r() * tissus.length)], longueur: 'chevilles', col: 'tunique' }, bas: null,
        manteau: r() < .4 ? { type: 'drape', couleur: tissus[Math.floor(r() * tissus.length)] } : null,
        coiffe: fem ? { type: 'voile', couleur: tissus[Math.floor(r() * tissus.length)] } : (r() < .25 ? { type: 'keffieh', couleur: '#e2d6bf' } : null),
        chaussures: { type: 'sandales', couleur: '#5a3f28' },
      } : {
        silhouette: fem ? 'femme' : 'homme', age, peau: peaux[Math.floor(r() * peaux.length)],
        cheveux: { style: fem ? ['long', 'queue', 'chignon', 'mi_long'][Math.floor(r() * 4)] : ['court', 'rase', 'boucles'][Math.floor(r() * 3)], couleur: ch[Math.floor(r() * ch.length)] },
        haut: { couleur: tissus[Math.floor(r() * tissus.length)], col: ['rond', 'capuche', 'chemise', 'v'][Math.floor(r() * 4)] },
        bas: { type: fem && r() < .3 ? 'jupe' : 'pantalon', couleur: ['#2e3550', '#3a3a40', '#c9b28a', '#4a5a78'][Math.floor(r() * 4)] },
        manteau: r() < .3 ? { type: 'veste', couleur: tissus[Math.floor(r() * tissus.length)] } : null,
        chaussures: { type: r() < .5 ? 'baskets' : 'chaussures', couleur: r() < .5 ? '#f2f0ea' : '#3b2e25' },
      };
      if (p.descriptions) Object.assign(desc, p.descriptions[i % p.descriptions.length]);
      const ech = (p.echelle ?? 1) * (p.echelle_sol ?? 1) * B.clamp((y - P.h) / Math.max(1, (p.y_ref ?? 1500) - P.h), .1, 3);
      const sens = p.vers ? (p.vers[0] > x ? 1 : -1) : (r() < .5 ? 1 : -1);
      // regarder vers un point : de dos s'il est plus loin (plus haut à l'écran), de face s'il est plus près
      const vueVers = p.vers ? B.clamp(Math.atan2(Math.abs(p.vers[0] - x), (y - p.vers[1]) * -3) * 180 / Math.PI, 8, 172) : null;
      const pose = (p.poses || ['debout', 'ecoute', 'debout'])[Math.floor(r() * (p.poses || [1, 2, 3]).length)];
      desc.traits = p.traits || 'simple'; desc.tete = p.tete ?? 1.12;      // le même dessin que les personnages, jamais plus détaillé qu'eux
      gens.push({ desc, x, y, ech, sens, pose, vue: p.vue ?? vueVers ?? (20 + r() * 50) });
    }
    gens.sort((a, b) => a.y - b.y);
    let s = '';
    for (const g of gens) {
      if (p.garde && !p.garde(g.x, g.y, g.ech)) continue;          // à moitié coupé par le bord de l'image (film.js) : il n'est pas là
      const rr = PERSO.poser(g.desc, g.pose, { style: p.style_dessin || 'papier', x: g.x, y: g.y, echelle: g.ech, sens: g.sens, t: 1 + r() * 3, action: { vue: g.vue, visage: p.visage || 'neutre', regard: [g.sens * .3, 0] }, lumiere: p.lumiere ?? -1, ombre: p.ombre });
      const brume = p.brume ? B.clamp((1 - g.ech) * .6, 0, .55) : 0;
      s += `<defs>${rr.defs}</defs><g data-anim='{"type":"flotte","amp":${f(1.2 * g.ech)},"periode":${f(3 + r() * 2)},"seed":${Math.floor(r() * 99)}}'>${rr.svg}${brume ? `<g opacity="${f(brume)}"></g>` : ''}</g>`;
    }
    void id;
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
