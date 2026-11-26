// Nature : ciel, nuages, collines, sols ouverts, arbres, végétation, rochers. Chaque matière a ses ombres, ses lumières et
// son détail (feuilles, touffes, arêtes, terrasses) ; rien n'est un aplat, rien n'est une image toute faite.
(function (G) {
  const B = G.B, f = B.f, MONDE = G.MONDE, GEN = MONDE.GEN, H = B.H;
  const { PERSP } = MONDE;
  const OMBRE = '#22243a', TAU = Math.PI * 2;
  const sombre = (c, k, o = OMBRE) => B.teinte(c, o, k);
  const P_ = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

  // ------------------------------------------------------------------ ciel
  GEN.ciel = (p, id) => {
    const haut = p.haut || '#2a3b6b', bas = p.bas || '#f2b46b', milieu = p.milieu || B.mix(haut, bas, .5), y0 = p.y0 ?? -900, y1 = p.y1 ?? (p.horizon ?? 1250), ac = p.astre_couleur || '#fff3d6';
    let s = `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="${haut}"/><stop offset=".55" stop-color="${B.mix(haut, milieu, .75)}"/><stop offset=".85" stop-color="${milieu}"/><stop offset="1" stop-color="${bas}"/></linearGradient>` +
      `<radialGradient id="${id}h"><stop offset="0" stop-color="${ac}" stop-opacity=".8"/><stop offset=".16" stop-color="${ac}" stop-opacity=".42"/><stop offset=".45" stop-color="${ac}" stop-opacity=".13"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${id}s"><stop offset="0" stop-color="${B.mix(ac, '#ffffff', .45)}"/><stop offset=".7" stop-color="${B.mix(ac, '#ffffff', .25)}"/><stop offset="1" stop-color="${ac}"/></radialGradient></defs><rect x="-3000" y="${y0 - 2000}" width="7080" height="${y1 - y0 + 4000}" fill="url(#${id}g)"/>`;
    if (p.etoiles) {
      const r = B.alea(p.seed || 3);
      for (let i = 0; i < (p.etoiles === true ? 190 : p.etoiles); i++) { const x = -1000 + r() * 3080, y = y0 + r() * (y1 - y0) * .85, t = Math.pow(r(), 2.4); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.7 + t * 1.9)}" fill="${r() < .2 ? '#ffe9c4' : '#f4f7ff'}" opacity="${f(.3 + t * .6)}" data-anim='{"type":"scintille","seed":${i}}'/>`; }
      for (let i = 0; i < 9; i++) { const x = -300 + r() * 1680, y = B.lerp(y0, y1, .45 + r() * .4), t = 5 + r() * 5; s += `<path d="M${f(x)},${f(y - t)}Q${f(x)},${f(y)} ${f(x + t)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y + t)}Q${f(x)},${f(y)} ${f(x - t)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y - t)}Z" fill="#ffffff" opacity=".85" data-anim='{"type":"scintille","seed":${i + 3}}'/>`; }
    } else if (p.voiles !== false && B.lum(milieu) > .35) {
      // quelques voiles d'altitude, à peine visibles : le ciel de jour n'est pas un dégradé vide
      const r = B.alea(p.seed || 4);
      for (let i = 0; i < 6; i++) { const x = -200 + r() * 1480, y = y1 - 120 - r() * 520, w = 220 + r() * 300; s += `<path d="M${f(x - w)},${f(y)}Q${f(x - w * .3)},${f(y - 16 - r() * 18)} ${f(x + w * .2)},${f(y - 5)}T${f(x + w)},${f(y - 10)}Q${f(x + w * .4)},${f(y + 8)} ${f(x)},${f(y + 5)}T${f(x - w)},${f(y)}Z" fill="#ffffff" opacity="${f(.1 + r() * .1)}" filter="url(#flou6)"/>`; }
    }
    if (p.astre) {
      const [x, y, r] = p.astre;
      s += `<circle cx="${x}" cy="${y}" r="${f(r * 8)}" fill="url(#${id}h)"/>`;
      if (p.lune) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${B.mix(ac, '#ffffff', .5)}"/><circle cx="${f(x + r * .12)}" cy="${f(y + r * .1)}" r="${f(r * .86)}" fill="${sombre(ac, .05)}" opacity=".5"/>` + [[-.34, -.28, .2], [.3, .06, .15], [-.1, .42, .12], [.22, -.44, .09], [-.5, .2, .09]].map(([dx, dy, k]) => `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" r="${f(k * r)}" fill="${sombre(ac, .16)}" opacity=".55"/>`).join('');
      else s += `<circle cx="${x}" cy="${y}" r="${f(r * 1.06)}" fill="${ac}" opacity=".5" filter="url(#flou4)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}s)"/>`;
    }
    return s;
  };

  // nuages : des volutes au-dessus d'une base plate, éclairées d'un côté
  GEN.nuages = (p, id = 'nu') => {
    const r = B.alea(p.seed || 5), n = p.n || 6, c = p.couleur || '#ffffff', op = p.opacite ?? .55, om = p.ombre || sombre(c, .2, '#5a6488');
    let s = '';
    for (let i = 0; i < n; i++) {
      const cx = -900 + r() * 2900, cy = (p.y ?? 500) + (r() - .5) * (p.hauteur || 400), w = 260 + r() * 420, h = w * (.2 + r() * .1), nb = 7, d = [];
      for (let k = 0; k < nb; k++) { const t = k / (nb - 1), x = cx - w * .46 + w * .92 * t, rr = h * (.26 + .34 * Math.sin(Math.PI * t) * (.75 + r() * .5)), y = cy - rr * .55 - Math.sin(Math.PI * t) * h * .22; d.push(`M${f(x - rr)},${f(y)}a${f(rr)},${f(rr)} 0 1 1 ${f(rr * 2)},0a${f(rr)},${f(rr)} 0 1 1 ${f(-rr * 2)},0Z`); }
      d.push(`M${f(cx - w * .55)},${f(cy)}q0,${f(-h * .28)} ${f(w * .1)},${f(-h * .28)}h${f(w * .9)}q${f(w * .1)},0 ${f(w * .1)},${f(h * .28)}q0,${f(h * .14)} ${f(-w * .1)},${f(h * .14)}h${f(-w * .9)}q${f(-w * .1)},0 ${f(-w * .1)},${f(-h * .14)}Z`);
      const D = d.join(''), cl = `${id}n${i}`;
      s += `<g opacity="${f(op * (.65 + r() * .35))}" data-anim='{"type":"derive","vx":${f((p.vent ?? 6) * (.6 + r() * .8))}}'><clipPath id="${cl}"><path d="${D}"/></clipPath>${P_(D, om)}<g clip-path="url(#${cl})">${P_(D, c, ` transform="translate(${f(-w * .015)},${f(-h * .13)})"`)}</g></g>`;
    }
    return s;
  };

  // ------------------------------------------------------------------ collines
  // {gen:"relief", y, amplitude, couleur, frequence, plateau, details (nombre de bosquets), lumiere (±1), terrasses, seed}
  GEN.relief = (p, id = 're') => {
    const r = B.alea(p.seed || 7), y = p.y ?? 1200, a = p.amplitude ?? 160, c = p.couleur || '#6c7f6a', x0 = -1500, x1 = 2600, pas = 60, n = Math.ceil((x1 - x0) / pas), ph = [r() * 6, r() * 6, r() * 6], pts = [];
    for (let i = 0; i <= n; i++) { const x = x0 + i * pas, u = x / 1080; let v = Math.sin(u * (p.frequence || 2.2) + ph[0]) * .55 + Math.sin(u * 5.1 + ph[1]) * .3 + Math.sin(u * 11.7 + ph[2]) * .15; if (p.plateau) v = Math.min(v, .35); pts.push([x, y - a * (v * .5 + .5)]); }
    const crete = B.lisse(pts), bas = y + a * 1.3, sens = (p.lumiere ?? -1) < 0 ? 1 : -1, nuit = B.lum(c) < .22;
    let s = `<defs><linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y - a)}" x2="0" y2="${f(bas)}"><stop offset="0" stop-color="${B.clair(c, nuit ? .04 : .1)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${nuit ? sombre(c, .2) : B.mix(c, '#efe6d2', .16)}"/></linearGradient><clipPath id="${id}k"><path d="${crete}L${x1},${H + 2000}L${x0},${H + 2000}Z"/></clipPath></defs>` + P_(`${crete}L${x1},${H + 2000}L${x0},${H + 2000}Z`, `url(#${id}r)`);
    let pans = '', clairs = '', lignes = '';
    // les versants à l'ombre : des pans qui descendent des crêtes
    for (let i = 1; i < pts.length; i++) {
      const d = pts[i][1] - pts[i - 1][1];
      if (d * sens < 4) continue;
      const i0 = i - 1; while (i < pts.length && (pts[i][1] - pts[i - 1][1]) * sens > 1.5) i++;
      const seg = pts.slice(i0, i), l = seg.length; if (l < 2) continue;
      const retour = seg.map(([x, yy], k) => { const t = k / (l - 1), prof = a * (.16 + .42 * Math.sin(Math.PI * (sens > 0 ? t : 1 - t) * .9 + .25)); return [x - sens * prof * .35, yy + prof + (r() - .5) * a * .07]; }).reverse();
      pans += B.lisse(seg) + 'L' + B.lisse(retour).slice(1) + 'Z';
      const [cx, cy] = sens > 0 ? seg[0] : seg[l - 1];
      clairs += `M${f(cx)},${f(cy)}Q${f(cx - sens * a * .2)},${f(cy + a * .12)} ${f(cx - sens * a * .5)},${f(cy + a * .42)}Q${f(cx - sens * a * .12)},${f(cy + a * .3)} ${f(cx)},${f(cy)}Z`;
    }
    for (const k of p.terrasses === false ? [] : [.2, .38, .58, .8]) lignes += B.lisse(pts.map(([x, yy], i) => [x, yy + a * k + Math.sin(i * .9 + k * 9) * a * .04]));
    s += `<g clip-path="url(#${id}k)">${P_(pans, sombre(c, nuit ? .35 : .26), ' opacity=".55"')}${P_(clairs, B.clair(c, nuit ? .06 : .2), ' opacity=".5"')}<path d="${lignes}" fill="none" stroke="${sombre(c, .22)}" stroke-width="2" opacity=".2"/>`;
    // des bosquets, plus petits vers la crête
    const g = [sombre(c, .34, '#1d2a22'), sombre(c, .22, '#1d2a22'), B.clair(c, nuit ? .05 : .12)], d = ['', '', ''];
    for (let i = 0; i < (p.details ?? 64); i++) {
      const x = x0 + r() * (x1 - x0), j = Math.min(pts.length - 2, Math.floor((x - x0) / pas)), k = (x - pts[j][0]) / pas, t = Math.pow(r(), 1.3), yy = B.lerp(pts[j][1], pts[j + 1][1], k) + 3 + t * a * .75, w = (4 + r() * 5) * (.7 + t * 1.2) * B.clamp(a / 120, .5, 1.3), hh = w * (.75 + r() * .5);
      const boule = (dx, dy, rr) => `M${f(x + dx - rr)},${f(yy + dy)}a${f(rr)},${f(rr * .85)} 0 1 1 ${f(rr * 2)},0a${f(rr)},${f(rr * .85)} 0 1 1 ${f(-rr * 2)},0Z`;
      d[0] += boule(w * .25, -hh * .3, w * .95); d[1] += boule(0, -hh * .5, w * .9) + boule(w * .8, -hh * .25, w * .6); d[2] += boule(-w * .25, -hh * .75, w * .42);
    }
    d.forEach((x, i) => { s += P_(x, g[i], ` opacity="${[.45, .8, .55][i]}"`); });
    return s + '</g>';
  };

  // ------------------------------------------------------------------ sol ouvert
  // {gen:"sol", y (ligne du fond), horizon, fuite, matiere:"herbe"|"sable"|"terre"|"chemin"|"pave"|"dalles"|"route"|"parquet"|"carrelage", couleur}
  // (devant une eau, "rivage": true — le moteur le met tout seul — : bord sinueux, sable mouillé, écume)
  GEN.sol = (p, id) => {
    const P = PERSP(p), y0 = p.y ?? P.h + 10, c = p.couleur || '#b59a6a';
    let bord = `M-3000,${y0}L4000,${y0}`, rive = '';
    if (p.rivage) {
      const pts = []; for (let x = -3000; x <= 4000; x += 70) pts.push([x, y0 + Math.sin(x * .0052 + (p.seed || 1)) * 9 + Math.sin(x * .017) * 3.5]);
      bord = B.lisse(pts);
      rive = `<path d="${B.lisse(pts.map(([x, y]) => [x, y + 11 + Math.sin(x * .009) * 5]))}L4000,${y0 - 30}L-3000,${y0 - 30}Z" fill="${sombre(c, .26)}" opacity=".55"/><path d="${B.lisse(pts.map(([x, y]) => [x, y + 2]))}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".75"/><path d="${B.lisse(pts.map(([x, y]) => [x, y + 9 + Math.sin(x * .013) * 4]))}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".4"/>`;
    }
    return `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y0 + 900}"><stop offset="0" stop-color="${p.loin || B.mix(c, p.brume || '#e2d8c4', B.lum(c) < .25 ? .08 : .3)}"/><stop offset=".16" stop-color="${B.mix(c, p.brume || '#e2d8c4', B.lum(c) < .25 ? .03 : .1)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${sombre(c, .22)}"/></linearGradient><clipPath id="${id}c"><path d="${bord}L4000,${y0 + 3000}L-3000,${y0 + 3000}Z"/></clipPath></defs>` +
      `<g clip-path="url(#${id}c)"><rect x="-3000" y="${y0 - 40}" width="7000" height="3040" fill="url(#${id}g)"/>${rive}${MONDE.sol(p, y0 + 2, -1400, 2480, p.matiere || 'terre', c, p.seed)}</g>${p.rivage ? '' : lointain(p, P, y0, c)}`;
  };
  // ce qui vit à mi-distance, là où le sol rejoint l'horizon : des buissons et de petits arbres, jamais un désert de couleur
  const LOINTAIN = { herbe: 30, terre: 16 };
  function lointain(p, P, y0, c) {
    const n = p.lointain === false ? 0 : p.lointain ?? LOINTAIN[p.matiere || 'terre'] ?? 0, r = B.alea((p.seed || 5) + 3), H0 = Math.max(60, (p.y_ref ?? 1060) - P.h), l = [];
    if (y0 - P.h > H0 * .12) return '';                  // le sol commence déjà près de nous (une pièce, un quai)
    for (let i = 0; i < n; i++) { const k = .05 + Math.pow(r(), 2) * .13; l.push([k, -700 + r() * 2480]); }
    const vert = B.mix(c, '#4a5f3f', B.lum(c) < .3 ? .3 : .42);
    return l.sort((a, b) => a[0] - b[0]).map(([k, x]) => { const y = P.h + H0 * k, h = (150 + r() * 260) * k, cc = B.mix(vert, p.brume || '#dfd6c4', B.lum(c) < .25 ? .05 : .34 - k), m = r() < .22; return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(h * .5)}" ry="${f(h * .06)}" fill="#120c1c" opacity=".14"/>` + (m ? bois([[x, y], [x, y - h * .5]], h * .09, h * .06, sombre(cc, .4)) + masse(x, y - h * .8, h * .42, h * .36, cc, r, { n: 9, feuilles: 5, feuille: h * .04 }) : masse(x, y - h * .16, h * .4, h * .2, cc, r, { n: 9, feuilles: 5, feuille: h * .04 })); }).join('');
  }

  // ------------------------------------------------------------------ feuillages
  // un bord festonné (des feuilles, pas un ovale)
  function feston(cx, cy, rx, ry, r, n = 11, bombe = .2) {
    const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * .12, k = .82 + r() * .3; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; d += `Q${f(mx + (mx - cx) * bombe * 1.6)},${f(my + (my - cy) * bombe * 1.6)} ${f(b[0])},${f(b[1])}`; }
    return d + 'Z';
  }
  // une feuille : un fuseau posé à un angle
  const feuille = (x, y, l, w, a) => { const c = Math.cos(a), s = Math.sin(a), q = (u, v) => `${f(x + u * c - v * s)},${f(y + u * s + v * c)}`; return `M${q(-l, 0)}Q${q(0, -w)} ${q(l, 0)}Q${q(0, w)} ${q(-l, 0)}Z`; };
  // une masse de feuillage : ombre, corps, lumière, feuilles qui dépassent
  function masse(cx, cy, rx, ry, c, r, o = {}) {
    const co = sombre(c, o.ombre ?? .36, o.teinte || '#16241f'), cl = B.clair(c, .16), n = o.n ?? 11;
    let s = P_(feston(cx + rx * .05, cy + ry * .14, rx * 1.02, ry, r, n), co) + P_(feston(cx, cy, rx * .95, ry * .92, r, n), c) + P_(feston(cx - rx * .2, cy - ry * .26, rx * .56, ry * .46, r, 9), cl, ' opacity=".75"');
    let sombres = '', claires = '', bords = '';
    const lf = o.feuille ?? Math.min(rx, ry) * .13, wf = lf * (o.finesse ?? .5);
    for (let i = 0; i < (o.feuilles ?? 14); i++) { const a = r() * TAU, k = Math.sqrt(r()) * .85; sombres += feuille(cx + Math.cos(a) * rx * k + rx * .06, cy + Math.sin(a) * ry * k + ry * .1, lf, wf, r() * 3); }
    for (let i = 0; i < (o.feuilles ?? 14); i++) { const a = Math.PI * (.9 + r() * .9), k = Math.sqrt(r()) * .8; claires += feuille(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, lf * .9, wf * .9, r() * 3); }
    for (let i = 0; i < n + 4; i++) { const a = r() * TAU; bords += feuille(cx + Math.cos(a) * rx * .98, cy + Math.sin(a) * ry * .95, lf * 1.1, wf, a + (r() - .5)); }
    return s + P_(bords, c) + P_(sombres, co, ' opacity=".5"') + P_(claires, B.clair(c, .3), ' opacity=".7"');
  }
  // un tronc ou une branche : un ruban effilé, son côté ombre, son filet de lumière
  function bois(pts, w0, w1, c) {
    const n = 12, P = [], lis = (k) => { const x = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)), t = x - i, p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; return [0, 1].map(j => .5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t)); };
    for (let i = 0; i <= n; i++) P.push(lis(i / n));
    const cote = (e0, e1) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = B.lerp(w0, w1, Math.pow(i / n, .75)) / 2, e = B.lerp(e0, e1, i / n); return [p[0] - (b[1] - a[1]) / l * w * e, p[1] + (b[0] - a[0]) / l * w * e]; });
    const ruban = (g, d) => B.lisse(g) + 'L' + B.lisse(d.slice().reverse()).slice(1) + 'Z';
    const G1 = cote(1, 1), D1 = cote(-1, -1), m = cote(-.15, -.15), l1 = cote(.75, .75), l2 = cote(.4, .4);
    return P_(ruban(G1, D1), c) + P_(ruban(m, D1), sombre(c, .34)) + P_(ruban(l1, l2), B.clair(c, .22), ' opacity=".5"');
  }
  const balance = (svg, amp, periode, px, py, seed) => `<g data-anim='{"type":"balance","amp":${f(amp)},"periode":${f(periode)},"pivot":[${f(px)},${f(py)}],"seed":${seed}}'>${svg}</g>`;

  // {gen:"arbre", espece:"olivier"|"palmier"|"chene"|"pin"|"cypres"|"figuier"|"saule"|"nu"|"buisson"|"acacia"|"sapin", x, y, hauteur, couleur, tronc, vent: 0–1, seed}
  const COULEURS = { olivier: '#84946a', palmier: '#5f7d3a', pin: '#46683f', cypres: '#34502f', sapin: '#2f4f3a', saule: '#7a9a4a', acacia: '#7a8a4a', figuier: '#4f7a3a' };
  const ESPECES = {
    palmier({ x, y, H, cf, ct, r, vent, p }) {
      const pen = p.penche ?? (r() - .5) * .3, pts = []; for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push([x + Math.sin(k * 1.6) * H * pen * .5 + pen * H * k * .3, y - H * .8 * k]); }
      let s = bois(pts, H * .07, H * .04, ct), an = '';
      for (let i = 1; i < 15; i++) { const k = i / 15, q = [x + Math.sin(k * 1.6) * H * pen * .5 + pen * H * k * .3, y - H * .8 * k], w = B.lerp(H * .033, H * .019, k); an += `M${f(q[0] - w)},${f(q[1])}Q${f(q[0])},${f(q[1] + w * .7)} ${f(q[0] + w)},${f(q[1] - w * .2)}`; }
      s += `<path d="${an}" fill="none" stroke="${sombre(ct, .4)}" stroke-width="${f(H * .007)}" opacity=".7"/>`;
      const t = pts[6], palmes = [];
      for (let i = 0; i < 13; i++) {
        const a = -200 + i * 18.5 + (r() - .5) * 10, L = H * (.36 + r() * .08), ax = Math.cos(B.rad(a)), ay = Math.sin(B.rad(a)), m = [t[0] + ax * L * .55, t[1] + ay * L * .5 - L * .16], e = [t[0] + ax * L, t[1] + ay * L * .55 + L * .34];
        const pos = (k) => [0, 1].map(j => (1 - k) * (1 - k) * t[j] + 2 * k * (1 - k) * m[j] + k * k * e[j]);
        let fol = '';
        for (let j = 2; j < 22; j++) { const k = j / 22, q = pos(k), q2 = pos(Math.min(1, k + .03)), dir = Math.atan2(q2[1] - q[1], q2[0] - q[0]), l = L * .17 * Math.sin(Math.PI * Math.pow(k, .7)) + L * .03; for (const sd of [-1, 1]) { const an2 = dir + sd * (.75 - k * .25), ex = q[0] + Math.cos(an2) * l, ey = q[1] + Math.sin(an2) * l + l * .22, w = L * .012; fol += `M${f(q[0])},${f(q[1])}Q${f((q[0] + ex) / 2 - Math.sin(an2) * w * 2)},${f((q[1] + ey) / 2 + Math.cos(an2) * w * 2)} ${f(ex)},${f(ey)}Q${f((q[0] + ex) / 2 + Math.sin(an2) * w)},${f((q[1] + ey) / 2 - Math.cos(an2) * w)} ${f(q[0])},${f(q[1])}Z`; } }
        const c = ay < -.2 ? sombre(cf, .3) : i % 3 ? cf : B.clair(cf, .12);
        palmes.push([ay < -.2 ? 0 : 1, balance(P_(fol, c) + `<path d="M${t.map(f)}Q${m.map(f)} ${e.map(f)}" stroke="${B.clair(c, .2)}" stroke-width="${f(H * .006)}" fill="none"/>`, vent * 3, 3.4 + r(), t[0], t[1], i)]);
      }
      s += palmes.filter(q => !q[0]).map(q => q[1]).join('');
      for (let i = 0; i < 9; i++) s += `<circle cx="${f(t[0] + (r() - .5) * H * .06)}" cy="${f(t[1] + H * (.015 + r() * .05))}" r="${f(H * .011)}" fill="${i % 2 ? '#a8682e' : '#c98a3e'}"/>`;
      return s + palmes.filter(q => q[0]).map(q => q[1]).join('');
    },
    cypres({ x, y, H, cf, ct, r, vent }) {
      const bord = (sd, k) => x + sd * H * .105 * Math.pow(Math.sin(Math.PI * Math.pow(k, .62)), .8), flamme = (dx, e, n) => { let d = `M${f(x + dx)},${f(y - H)}`; for (const sd of [1, -1]) for (let i = 1; i <= n; i++) { const k = sd > 0 ? i / n : 1 - i / n, k0 = sd > 0 ? (i - 1) / n : 1 - (i - 1) / n, yy = y - H * .06 - H * .94 * (1 - k), ym = y - H * .06 - H * .94 * (1 - (k + k0) / 2); d += `Q${f(x + dx + (bord(sd, (k + k0) / 2) - x) * e * (1.16 + r() * .12))},${f(ym)} ${f(x + dx + (bord(sd, k) - x) * e)},${f(yy)}`; } return d + 'Z'; };
      let g = P_(flamme(0, 1, 14), sombre(cf, .32)) + P_(flamme(-H * .012, .78, 13), cf) + P_(flamme(-H * .03, .36, 11), B.clair(cf, .14), ' opacity=".7"'), traits = '';
      for (let i = 0; i < 26; i++) { const k = .12 + r() * .8, xx = x + (r() - .5) * 2 * (bord(1, k) - x) * .8, yy = y - H * .06 - H * .94 * (1 - k); traits += `M${f(xx)},${f(yy)}q${f((x - xx) * .2)},${f(-H * .03)} ${f((x - xx) * .3)},${f(-H * .07)}`; }
      g += `<path d="${traits}" stroke="${sombre(cf, .4)}" stroke-width="${f(H * .006)}" fill="none" stroke-linecap="round" opacity=".5"/>`;
      return bois([[x, y], [x, y - H * .1]], H * .035, H * .03, ct) + balance(g, vent * 1.2, 4.5, x, y, 3);
    },
    sapin({ x, y, H, cf, ct, r, vent }) {
      let g = '';
      for (let k = 4; k >= 0; k--) {
        const yt = y - H * (1 - k * .16) , yb = y - H * (.72 - k * .155), w = H * (.11 + k * .05), n = 8, bord = []; for (let i = 0; i <= n; i++) bord.push([x - w + 2 * w * i / n, yb + (i % 2 ? -H * .035 : 0) + Math.abs(i / n - .5) * -H * .02]);
        const d = `M${f(x)},${f(yt)}Q${f(x - w * .4)},${f(B.lerp(yt, yb, .65))} ${bord[0].map(f)}` + bord.slice(1).map(q => `L${q.map(f)}`).join('') + `Q${f(x + w * .4)},${f(B.lerp(yt, yb, .65))} ${f(x)},${f(yt)}Z`;
        g += P_(d, sombre(cf, .26), ` transform="translate(0,${f(H * .02)})"`) + P_(d, k % 2 ? cf : B.clair(cf, .05)) + P_(`M${f(x)},${f(yt)}Q${f(x - w * .4)},${f(B.lerp(yt, yb, .65))} ${bord[0].map(f)}L${bord[2].map(f)}Q${f(x - w * .1)},${f(B.lerp(yt, yb, .5))} ${f(x)},${f(yt)}Z`, B.clair(cf, .16), ' opacity=".6"');
      }
      void r;
      return bois([[x, y], [x, y - H * .16]], H * .05, H * .04, ct) + balance(g, vent, 4.5, x, y, 5);
    },
    olivier({ x, y, H, cf, ct, r, vent }) {
      const brins = 3, tetes = []; let s = '';
      for (let i = 0; i < brins; i++) {
        const u = i - (brins - 1) / 2, bx = x + u * H * .045, ex = x + u * H * .2 + (r() - .5) * H * .05, ey = y - H * (.4 + r() * .07), tors = (r() - .5) * H * .12;
        s += bois([[bx + u * H * .03, y + 2], [bx + tors * .7, y - H * .12], [bx - tors + u * H * .04, y - H * .24], [ex, ey]], H * (.085 - Math.abs(u) * .012), H * .03, i % 2 ? B.clair(ct, .05) : ct);
        tetes.push([ex, ey]);
      }
      // les racines, un nœud dans le bois
      for (const sd of [-1, 1]) s += bois([[x + sd * H * .02, y - H * .05], [x + sd * H * .07, y - H * .008], [x + sd * H * .12, y + H * .004]], H * .04, H * .008, sombre(ct, .08));
      s += `<ellipse cx="${f(x - H * .01)}" cy="${f(y - H * .15)}" rx="${f(H * .014)}" ry="${f(H * .022)}" fill="${sombre(ct, .6)}"/><ellipse cx="${f(x - H * .013)}" cy="${f(y - H * .152)}" rx="${f(H * .018)}" ry="${f(H * .027)}" fill="none" stroke="${B.clair(ct, .2)}" stroke-width="${f(H * .005)}" opacity=".6"/>`;
      const cy0 = y - H * .68, m = [];
      for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + r() * .4, k = .55 + r() * .42; m.push([x + Math.cos(a) * H * .37 * k, cy0 + Math.sin(a) * H * .2 * k, H * (.105 + r() * .05)]); }
      m.push([x - H * .05, cy0 - H * .05, H * .17], [x + H * .12, cy0 - H * .02, H * .15]);
      for (const [mx, my] of m) { const t = tetes[Math.floor(r() * tetes.length)]; s += bois([t, [(t[0] + mx) / 2 + (r() - .5) * H * .06, (t[1] + my) / 2], [mx, my]], H * .022, H * .006, sombre(ct, .1)); }
      m.sort((a, b) => a[1] - b[1]);
      m.forEach(([mx, my, rr], i) => { const c = i < m.length * .35 ? sombre(cf, .2, '#16241f') : cf; s += balance(masse(mx, my, rr * 1.25, rr * .82, c, r, { feuille: rr * .2, finesse: .28, feuilles: 20, ombre: .32 }), vent * 1.4, 3 + r() * 2, mx, my + rr, Math.floor(r() * 99)); });
      return s;
    },
    buisson({ x, y, H, cf, r, vent }) { let s = ''; for (let i = 0; i < 4; i++) { const bx = x + (i - 1.5) * H * .28, by = y - H * .26 - r() * H * .1, rr = H * (.26 + r() * .08); s += balance(masse(bx, by, rr * 1.15, rr, cf, r), vent, 3.5, bx, y, i); } return s; },
    nu({ x, y, H, ct, r }) {
      let s = '';
      const br = (x0, y0, a, L, w, n) => { const x1 = x0 + Math.sin(B.rad(a)) * L, y1 = y0 - Math.cos(B.rad(a)) * L, c = [(x0 + x1) / 2 + (r() - .5) * L * .25, (y0 + y1) / 2]; s += bois([[x0, y0], c, [x1, y1]], w, w * .55, ct); if (n <= 0) return; const k = n > 2 ? 2 : 2 + (r() < .4 ? 1 : 0); for (let i = 0; i < k; i++) br(x1, y1, a + (i - (k - 1) / 2) * 40 + (r() - .5) * 22, L * (.64 + r() * .12), w * .56, n - 1); };
      br(x, y, (r() - .5) * 8, H * .36, H * .07, 4);
      return s;
    },
    saule({ x, y, H, cf, ct, r, vent }) {
      let s = bois([[x, y], [x - H * .02, y - H * .25], [x + H * .02, y - H * .5]], H * .09, H * .05, ct);
      for (const [dx, dy] of [[-.2, .72], [0, .78], [.2, .72], [-.1, .66], [.12, .65]]) s += masse(x + dx * H, y - dy * H, H * .2, H * .13, cf, r);
      for (let i = 0; i < 34; i++) { const bx = x + (r() - .5) * H * .8, by = y - H * (.6 + r() * .18), l = H * (.28 + r() * .2); let d = ''; for (let k = 0; k < 9; k++) { const t = k / 8; d += feuille(bx + Math.sin(t * 2) * 8, by + l * t, l * .055, l * .016, 1.2 + (k % 2 ? .5 : -.5)); } s += balance(`<path d="M${f(bx)},${f(by)}q${f(10)},${f(l * .5)} 0,${f(l)}" stroke="${sombre(cf, .3)}" stroke-width="1.6" fill="none"/>` + P_(d, i % 3 ? cf : B.clair(cf, .15)), vent * 4, 4, bx, by, i); }
      return s;
    },
    acacia({ x, y, H, cf, ct, r, vent }) {
      let s = bois([[x, y], [x + H * .03, y - H * .3], [x - H * .02, y - H * .48]], H * .06, H * .035, ct);
      for (const dx of [-.34, -.16, .12, .34]) s += bois([[x - H * .01, y - H * .44], [x + dx * H * .6, y - H * .6], [x + dx * H, y - H * .74]], H * .026, H * .008, ct);
      for (const [dx, dy, k] of [[-.32, .78, .16], [.32, .77, .16], [-.12, .83, .2], [.14, .82, .19], [0, .78, .2]]) s += balance(masse(x + dx * H, y - dy * H, H * k * 1.35, H * k * .42, cf, r, { feuilles: 18, feuille: H * .014 }), vent, 4, x, y - H * .7, Math.round(dx * 50 + 20));
      return s;
    },
    defaut({ x, y, H, cf, ct, r, vent, esp }) {
      const larg = esp === 'pin' ? .34 : .4, gf = esp === 'figuier' ? H * .035 : H * .016;
      let s = bois([[x - H * .01, y], [x + H * .012, y - H * .2], [x, y - H * .46]], H * .085, H * .045, ct);
      for (const sd of [-1, 1]) s += bois([[x + sd * H * .02, y - H * .035], [x + sd * H * .06, y - H * .006], [x + sd * H * .1, y + H * .003]], H * .035, H * .008, sombre(ct, .1));
      for (const [dx, dy] of [[-.2, .62], [.2, .6], [-.06, .7], [.1, .72]]) s += bois([[x, y - H * .38], [x + dx * H * .5, y - H * (dy - .12)], [x + dx * H, y - H * dy]], H * .034, H * .01, ct);
      const m = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + r() * .4, k = .6 + r() * .4; m.push([x + Math.cos(a) * H * larg * .8 * k, y - H * .7 + Math.sin(a) * H * .2 * k, H * (.12 + r() * .05)]); }
      m.push([x - H * .06, y - H * .76, H * .19], [x + H * .09, y - H * .72, H * .17]);
      m.sort((a, b) => a[1] - b[1]);
      m.forEach(([mx, my, rr], i) => { s += balance(masse(mx, my, rr * 1.12, rr * .92, i < m.length * .4 ? sombre(cf, .18, '#16241f') : cf, r, { feuille: gf, feuilles: 16 }), vent * 1.3, 3 + r() * 2, mx, my + rr, Math.floor(r() * 99)); });
      return s;
    },
  };
  GEN.arbre = (p) => {
    const esp = p.espece || 'chene', H_ = p.hauteur ?? 420, x = p.x ?? 500, y = p.y ?? 1300, r = B.alea(p.seed || 31);
    const a = { x, y, H: H_, esp, r, p, vent: p.vent ?? .3, cf: p.couleur || COULEURS[esp] || '#5a8a42', ct: p.tronc || ({ olivier: '#7a6850', palmier: '#8a6e4e', nu: '#5f4c3c' }[esp] || '#6a4e3a') };
    return `<ellipse cx="${f(x + H_ * .03)}" cy="${f(y + H_ * .008)}" rx="${f(H_ * (esp === 'cypres' || esp === 'palmier' ? .12 : .3))}" ry="${f(H_ * .03)}" fill="#120c1c" opacity=".26" filter="url(#flou6)"/>` + (ESPECES[esp] || ESPECES.defaut)(a);
  };

  // ------------------------------------------------------------------ végétation, rochers
  // {gen:"vegetation", zone:[x0,y0,x1,y1], horizon, types:["herbe","fleurs","roseaux","buissons","cailloux"], densite, couleur, fleurs:["#…"]}
  GEN.vegetation = (p) => {
    const r = B.alea(p.seed || 41), P = PERSP(p), [x0, y0, x1, y1] = p.zone || [-400, 1300, 1500, 1920], ty = p.types || ['herbe'], c = p.couleur || '#6f8a3e', items = [], n = Math.floor((x1 - x0) * (y1 - y0) / 1800 * (p.densite ?? 1));
    for (let i = 0; i < n; i++) { const y = y0 + Math.pow(r(), .7) * (y1 - y0); items.push({ y, x: x0 + r() * (x1 - x0), k: B.clamp((y - P.h) / Math.max(1, (p.y_ref ?? 1500) - P.h), .15, 3), t: ty[Math.floor(r() * ty.length)] }); }
    items.sort((a, b) => a.y - b.y);
    const brin = (x, y, hh, pen, w) => `M${f(x - w)},${f(y)}Q${f(x + pen * .2 - w * .5)},${f(y - hh * .6)} ${f(x + pen)},${f(y - hh)}Q${f(x + pen * .25 + w)},${f(y - hh * .55)} ${f(x + w)},${f(y)}Z`;
    let s = '';
    for (const { x, y, k, t } of items) {
      if (t === 'herbe') { let a = '', b = ''; for (let j = 0; j < 6; j++) { const d = brin(x + (j - 2.5) * 4 * k, y, (16 + r() * 18) * k, (r() - .5) * 16 * k, 1.7 * k); if (j % 2) a += d; else b += d; } s += `<g data-anim='{"type":"vent","amp":${f(3 + r() * 3)},"periode":${f(2.5 + r() * 2)},"pivot":[${f(x)},${f(y)}],"seed":${Math.floor(r() * 99)}}'>${P_(a, sombre(c, .2))}${P_(b, B.clair(c, .1))}</g>`; }
      else if (t === 'fleurs') { const fc = (p.fleurs || ['#f2e6c9', '#e8a0b4', '#f5d26b', '#ffffff'])[Math.floor(r() * 4)], yy = y - 16 * k; let pet = ''; for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; pet += `<circle cx="${f(x + Math.cos(a) * 2.6 * k)}" cy="${f(yy + Math.sin(a) * 2.4 * k)}" r="${f(2.1 * k)}" fill="${fc}"/>`; } s += `<path d="M${f(x)},${f(y)}q${f(2 * k)},${f(-8 * k)} 0,${f(-16 * k)}" stroke="${sombre(c, .15)}" stroke-width="${f(1.5 * k)}" fill="none"/>${P_(feuille(x + 3 * k, y - 6 * k, 4 * k, 1.5 * k, -.6), c)}${pet}<circle cx="${f(x)}" cy="${f(yy)}" r="${f(1.5 * k)}" fill="#e0a83a"/>`; }
      else if (t === 'roseaux') { let g = ''; for (let j = 0; j < 5; j++) { const hh = (60 + r() * 60) * k, pen = (r() - .3) * 18 * k, xx = x + (j - 2) * 5 * k; g += P_(brin(xx, y, hh, pen, 1.8 * k), j % 2 ? B.mix(c, '#a59a5a', .4) : sombre(c, .15)); if (j % 3 === 0) g += `<ellipse cx="${f(xx + pen * .9)}" cy="${f(y - hh * .96)}" rx="${f(2.6 * k)}" ry="${f(9 * k)}" fill="#7a5636" transform="rotate(${f(pen)},${f(xx + pen)},${f(y - hh)})"/>`; } s += `<g data-anim='{"type":"vent","amp":4,"periode":3.4,"pivot":[${f(x)},${f(y)}],"seed":${Math.floor(r() * 9)}}'>${g}</g>`; }
      else if (t === 'buissons') s += GEN.arbre({ espece: 'buisson', x, y, hauteur: 80 * k, couleur: c, seed: Math.floor(r() * 999), vent: .2 });
      else if (t === 'cailloux') s += rocher(x, y, (8 + r() * 14) * k, (6 + r() * 8) * k, B.mix('#9a8f80', c, .1), r);
    }
    return s;
  };
  // un rocher : une silhouette anguleuse, une face éclairée, une face à l'ombre, des arêtes
  function rocher(x, y, w, h, c, r) {
    const n = 7, haut = []; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; haut.push([x + Math.cos(a) * w * (.85 + r() * .2), y + Math.sin(a) * h * (.75 + r() * .35)]); }
    haut[0][1] = haut[n][1] = y;
    const q = (a) => a.map(p => f(p[0]) + ',' + f(p[1])).join('L'), m = haut[3 + Math.floor(r() * 2)], pied = [x + w * (.05 + r() * .25), y], g = haut[2], d2 = haut[5];
    return `<ellipse cx="${f(x + w * .1)}" cy="${f(y + h * .03)}" rx="${f(w * 1.12)}" ry="${f(h * .12)}" fill="#120c1c" opacity=".26"/>` + P_('M' + q(haut) + 'Z', c) + P_('M' + q([m, ...haut.slice(haut.indexOf(m) + 1), pied]) + 'Z', sombre(c, .3)) + P_('M' + q([g, m, [B.lerp(m[0], pied[0], .55), B.lerp(m[1], y, .5)], [B.lerp(g[0], x - w * .4, .5), B.lerp(g[1], y, .55)]]) + 'Z', B.clair(c, .17), ' opacity=".8"') + P_('M' + q([d2, haut[6], [B.lerp(haut[6][0], pied[0], .3), B.lerp(haut[6][1], y, .6)], [B.lerp(d2[0], pied[0], .35), B.lerp(d2[1], y, .45)]]) + 'Z', sombre(c, .42), ' opacity=".6"') +
      `<path d="M${q([g, m, pied])}M${f(x - w * .55)},${f(y - h * .12)}l${f(w * .2)},${f(-h * .16)}l${f(w * .06)},${f(h * .1)}" stroke="${sombre(c, .48)}" stroke-width="${f(Math.max(1, w * .012))}" fill="none" stroke-linejoin="round" opacity=".45"/>`;
  }
  // {gen:"rochers", x, y, l, h, couleur, n, seed}
  GEN.rochers = (p) => {
    const r = B.alea(p.seed || 51), c = p.couleur || '#9a8a76', l = []; for (let i = 0; i < (p.n || 3); i++) l.push({ x: (p.x ?? 500) + (r() - .5) * (p.l || 260), y: (p.y ?? 1400) + (r() - .5) * 8, w: (p.l || 260) * (.4 + r() * .35) * .6, h: (p.h || 160) * (.6 + r() * .5) });
    l.sort((a, b) => b.h - a.h);
    let s = l.map(q => rocher(q.x, q.y, q.w, q.h, c, r)).join(''), d = '';
    for (let i = 0; i < 16; i++) { const q = l[i % l.length], xx = q.x + (r() - .5) * 2.2 * q.w, hh = (8 + r() * 12); d += `M${f(xx - 1.6)},${f(q.y + 3)}q${f(r() * 4 - 2)},${f(-hh * .6)} ${f((r() - .5) * 12)},${f(-hh)}q1,${f(hh * .5)} 3,${f(hh)}Z`; }
    return s + P_(d, B.mix(c, '#5d6a3a', .6));
  };
  MONDE.masse = masse; MONDE.bois = bois; MONDE.feuille = feuille; MONDE.rocher = rocher;
})(typeof window !== 'undefined' ? window : globalThis);
