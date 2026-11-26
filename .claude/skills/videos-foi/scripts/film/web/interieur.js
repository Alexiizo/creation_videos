// Intérieurs : une pièce en perspective (murs, plafond, corniche, plinthes, fenêtres qui donnent sur un vrai dehors, rideaux
// plissés, portes) et les meubles. Tout est construit dans la perspective du lieu ; les tissus (matelas, couette, coussins)
// ont des bords arrondis, des coutures et des plis ; le bois a ses moulures. Rien n'est une image toute faite.
(function (G) {
  const B = G.B, f = B.f, MONDE = G.MONDE, GEN = MONDE.GEN;
  const { PERSP, fuite, kSol, piece, boite, arrondi } = MONDE;
  const HUMAIN = 460, CM = HUMAIN / 175, OMBRE = '#2b2140';
  const dq = (q) => 'M' + q.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  const P_ = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
  const R_ = (x, y, w, h, c, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(.1, w))}" height="${f(Math.max(.1, h))}" fill="${c}"${extra}/>`;
  const sombre = (c, k) => B.teinte(c, OMBRE, k);
  const degradeV = (id, y0, y1, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y0)}" x2="0" y2="${f(y1)}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const degradeH = (id, x0, x1, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="0" x2="${f(x1)}" y2="0">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;

  // ------------------------------------------------------------------ les murs
  function motifMur(x0, y0, x1, y1, m, c, seed, cm) {
    const r = B.alea(seed || 3); let s = '';
    const tons = [sombre(c, .1), sombre(c, .05), B.clair(c, .05), B.clair(c, .1)], ton = () => tons[Math.floor(r() * 4)];
    if (m === 'pierre' || m === 'brique') {
      const hb = (m === 'brique' ? 9 : 24) * cm, lb = (m === 'brique' ? 24 : 48) * cm, j = Math.max(1.2, (m === 'brique' ? 1.1 : 1.6) * cm);
      s += R_(x0, y0, x1 - x0, y1 - y0, sombre(c, .22));
      let cl = '', par = new Map();
      for (let y = y0, k = 0; y < y1; k++) {
        const hh = hb * (m === 'brique' ? 1 : .8 + r() * .45);
        for (let x = x0 - (k % 2) * lb * .5 - (m === 'pierre' ? r() * lb : 0); x < x1;) {
          const w = lb * (m === 'brique' ? 1 : .6 + r() * .9), t = ton(), rr = (m === 'brique' ? .6 : 3) * cm;
          par.set(t, (par.get(t) || '') + arrondi([[x + j, y + j], [x + w - j, y + j], [x + w - j, y + hh - j], [x + j, y + hh - j]], rr));
          cl += `M${f(x + j + rr)},${f(y + j + .8)}H${f(x + w - j - rr)}`;
          x += w;
        }
        y += hh;
      }
      return s + [...par].map(([t, d]) => P_(d, t)).join('') + `<path d="${cl}" stroke="${B.clair(c, .25)}" stroke-width="1.2" opacity=".3"/>`;
    }
    if (m === 'bois' || m === 'lambris') {
      const l = 14 * cm;
      for (let x = x0, i = 0; x < x1; x += l, i++) { s += R_(x, y0, l, y1 - y0, ton(), ' opacity=".7"') + R_(x, y0, Math.max(1, .7 * cm), y1 - y0, sombre(c, .4), ' opacity=".6"') + R_(x + .8 * cm, y0, Math.max(.8, .5 * cm), y1 - y0, B.clair(c, .2), ' opacity=".35"'); if (i % 2) s += `<path d="M${f(x + l * .4)},${f(y0)}Q${f(x + l * .7)},${f((y0 + y1) / 2)} ${f(x + l * .45)},${f(y1)}" stroke="${sombre(c, .25)}" stroke-width="1" fill="none" opacity=".3"/>`; }
      return s;
    }
    if (m === 'papier') {
      const l = 22 * cm;
      for (let x = x0; x < x1; x += l) s += R_(x, y0, l * .5, y1 - y0, B.clair(c, .07));
      let d = ''; for (let y = y0 + l * .4, k = 0; y < y1; y += l * .7, k++) for (let x = x0 + (k % 2) * l * .5 + l * .25; x < x1; x += l) d += `M${f(x)},${f(y - l * .12)}q${f(l * .09)},${f(l * .12)} 0,${f(l * .24)}q${f(-l * .09)},${f(-l * .12)} 0,${f(-l * .24)}Z`;
      return s + P_(d, sombre(c, .12), ' opacity=".55"');
    }
    if (m === 'carrelage') {
      const l = 16 * cm; let d = '', t = '';
      for (let x = x0; x < x1; x += l) d += `M${f(x)},${f(y0)}V${f(y1)}`;
      for (let y = y1; y > y0; y -= l) d += `M${f(x0)},${f(y)}H${f(x1)}`;
      for (let i = 0; i < 70; i++) { const x = x0 + Math.floor(r() * (x1 - x0) / l) * l, y = y1 - Math.ceil(r() * (y1 - y0) / l) * l; t += `M${f(x)},${f(y)}h${f(l)}v${f(l)}h${f(-l)}Z`; }
      return P_(t, B.clair(c, .12), ' opacity=".5"') + `<path d="${d}" stroke="${sombre(c, .22)}" stroke-width="${f(Math.max(1, .6 * cm))}" opacity=".5"/>`;
    }
    // enduit : un mur peint, presque uni (deux grandes nappes à peine visibles)
    for (let i = 0; i < 7; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = (90 + r() * 120) * cm, h = (50 + r() * 60) * cm; s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(h)}" fill="${r() < .5 ? B.clair(c, .07) : sombre(c, .07)}" opacity=".35" filter="url(#flou30)"/>`; }
    return s;
  }

  // ce qu'on voit par la fenêtre : un ciel, des nuages ou des étoiles, une ligne de toits ou d'arbres
  const CIELS = { nuit: ['#0d1532', '#31437a'], aube: ['#e99a72', '#ffe1b4'], jour: ['#7fb8ea', '#dcf0fb'], soir: ['#7a5a8a', '#ffb277'] };
  function dehors(fe, id) {
    const { x, y, l, h } = fe, ciel = fe.ciel || 'nuit', [cH, cB] = CIELS[ciel] || [ciel, B.clair(ciel, .35)], nuit = ciel === 'nuit', r = B.alea(Math.round(x) + 7);
    let s = `<defs>${degradeV(id + 'd', y, y + h, [[0, cH], [.85, cB]])}</defs>` + R_(x, y, l, h, `url(#${id}d)`);
    if (nuit) for (let i = 0; i < 26; i++) s += `<circle cx="${f(x + r() * l)}" cy="${f(y + r() * h * .6)}" r="${f(.7 + r() * 1.3)}" fill="#fff" opacity="${f(.4 + r() * .5)}" data-anim='{"type":"scintille","seed":${i}}'/>`;
    else for (let i = 0; i < 3; i++) { const cx = x + r() * l, cy = y + h * (.15 + r() * .3), w = l * (.12 + r() * .12); s += `<g fill="#ffffff" opacity=".5"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(w * .2)}"/><ellipse cx="${f(cx + w * .25)}" cy="${f(cy - w * .14)}" rx="${f(w * .5)}" ry="${f(w * .22)}"/></g>`; }
    if (fe.lune) { const lx = x + l * .72, ly = y + h * .22, rl = Math.min(l, h) * .075; s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(rl * 3.2)}" fill="#fff4d6" opacity=".12"/><circle cx="${f(lx)}" cy="${f(ly)}" r="${f(rl * 1.9)}" fill="#fff4d6" opacity=".14"/><circle cx="${f(lx)}" cy="${f(ly)}" r="${f(rl)}" fill="#fff6de"/><circle cx="${f(lx - rl * .3)}" cy="${f(ly - rl * .15)}" r="${f(rl * .2)}" fill="#e6d8b8" opacity=".6"/><circle cx="${f(lx + rl * .3)}" cy="${f(ly + rl * .35)}" r="${f(rl * .14)}" fill="#e6d8b8" opacity=".6"/>`; }
    const loin = B.mix(cB, nuit ? '#101935' : '#5d6f86', nuit ? .75 : .45), pres = B.mix(cB, nuit ? '#0a1128' : '#4d6a58', nuit ? .88 : .62);
    if (fe.ville) {
      for (const [base, coul, hmax] of [[0, loin, .5], [0, pres, .34]]) { let xx = x - 10; while (xx < x + l) { const w = l * (.1 + r() * .14), hh = h * hmax * (.45 + r() * .6); s += R_(xx, y + h - hh, w, hh + base, coul); for (let k = 0; k < 7; k++) if (r() < .5) s += R_(xx + w * (.14 + .28 * (k % 3)), y + h - hh + hh * (.12 + .22 * Math.floor(k / 2)), w * .13, hh * .07, nuit ? '#ffd48a' : '#eaf2fa', ' opacity=".75"'); xx += w * 1.04; } }
    } else {
      const colline = (yy, a, c, k) => { let d = `M${f(x - 5)},${f(y + h + 5)}`; for (let i = 0; i <= 10; i++) d += `L${f(x - 5 + (l + 10) * i / 10)},${f(yy - Math.sin(i * .62 + k) * a - Math.sin(i * 1.7 + k) * a * .3)}`; return P_(d + `L${f(x + l + 5)},${f(y + h + 5)}Z`, c); };
      s += colline(y + h * .72, h * .05, loin, 1.2) + colline(y + h * .86, h * .06, pres, 3.1);
      for (let i = 0; i < 5; i++) { const ax = x + l * (.06 + .2 * i + r() * .08), ah = h * (.1 + r() * .1), ay = y + h * .9; s += `<path d="M${f(ax)},${f(ay)}v${f(-ah * .5)}" stroke="${B.sombre(pres, .25)}" stroke-width="${f(l * .012)}"/><ellipse cx="${f(ax)}" cy="${f(ay - ah * .75)}" rx="${f(ah * .42)}" ry="${f(ah * .5)}" fill="${B.sombre(pres, .08 + r() * .1)}"/>`; }
    }
    if (fe.pluie) { let d = ''; for (let i = 0; i < 26; i++) d += `M${f(x + (i * 37) % l)},${f(y + (i * 53) % h)}l-2,15`; s += `<path d="${d}" stroke="#c9dcf0" stroke-width="1.5" opacity=".5"/>`; }
    return s;
  }
  function fenetre(fe, id, cm, y1, mur) {
    const { x, y, l, h } = fe, c = fe.cadre || '#f1eadd', cs = sombre(c, .2), cc = B.clair(c, .25), ca = 8 * cm, ep = 5 * cm;
    let s = `<defs><clipPath id="${id}c"><rect x="${f(x)}" y="${f(y)}" width="${f(l)}" height="${f(h)}"/></clipPath></defs>`;
    // le chambranle et son ombre sur le mur
    s += R_(x - ca + 2 * cm, y - ca + 3 * cm, l + 2 * ca, h + 2 * ca, sombre(mur, .5), ' opacity=".28" filter="url(#flou6)"') + R_(x - ca, y - ca, l + 2 * ca, h + 2 * ca, c, ' rx="2"') + P_(dq([[x - ca, y - ca], [x + l + ca, y - ca], [x + l, y], [x, y]]), cc) + P_(dq([[x + l + ca, y - ca], [x + l + ca, y + h + ca], [x + l, y + h], [x + l, y]]), cs);
    s += `<g clip-path="url(#${id}c)">` + dehors(fe, id) +
      // l'ombre de l'épaisseur du mur en haut, et le reflet du verre
      R_(x, y, l, h * .05, sombre(c, .5), ' opacity=".35"') + R_(x, y, l * .03, h, sombre(c, .5), ' opacity=".25"') +
      P_(dq([[x + l * .1, y], [x + l * .24, y], [x + l * .06, y + h], [x - l * .08, y + h]]), '#ffffff', ' opacity=".1"') + P_(dq([[x + l * .62, y], [x + l * .68, y], [x + l * .5, y + h], [x + l * .44, y + h]]), '#ffffff', ' opacity=".08"') + '</g>';
    const barre = (bx, by, bw, bh) => R_(bx, by, bw, bh, c) + R_(bx, by, bw > bh ? bw : Math.max(1, bw * .28), bw > bh ? Math.max(1, bh * .3) : bh, cc) + (bw > bh ? R_(bx, by + bh * .75, bw, bh * .25, cs) : R_(bx + bw * .75, by, bw * .25, bh, cs));
    s += barre(x, y, l, ep * .8) + barre(x, y + h - ep * .8, l, ep * .8) + barre(x, y, ep * .8, h) + barre(x + l - ep * .8, y, ep * .8, h) + barre(x + l / 2 - ep * .55, y, ep * 1.1, h) + barre(x, y + h * .34, l, ep * .55);
    s += `<circle cx="${f(x + l / 2 + ep * .1)}" cy="${f(y + h * .58)}" r="${f(1.6 * cm)}" fill="#b9a06a"/>`;
    // l'appui
    s += R_(x - ca * 1.6, y + h + ca * .6, l + ca * 3.2, ca * 1.5, sombre(mur, .5), ' opacity=".3" filter="url(#flou4)"') + R_(x - ca * 1.6, y + h + ca * .4, l + ca * 3.2, ca * .95, c, ' rx="2"') + R_(x - ca * 1.6, y + h + ca * .4, l + ca * 3.2, ca * .28, cc, ' rx="2"');
    if (fe.rideaux) s += rideaux(fe, id, cm, y1);
    return s;
  }
  // des rideaux : une tringle, des plis qui tombent, un ourlet ondulé
  function rideaux(fe, id, cm, y1) {
    const { x, y, l, h } = fe, c = fe.rideaux, haut = y - 20 * cm, bas = Math.min(y1 - 3 * cm, y + h + 95 * cm), w = Math.max(26 * cm, l * .3), n = 6;
    let s = '';
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? x - w * .72 : x + l - w * .28, pts = (i, k) => x0 + w * (i / n) + Math.sin(i * 2.1 + k * 2.2) * w * .018 * k + sd * w * .04 * k;
      let d = `M${f(x0)},${f(haut)}L${f(x0 + w)},${f(haut)}`, ombres = '', clairs = '';
      d += `C${f(pts(n, .4))},${f(B.lerp(haut, bas, .35))} ${f(pts(n, .8))},${f(B.lerp(haut, bas, .7))} ${f(pts(n, 1))},${f(bas)}`;
      for (let i = n; i > 0; i--) d += `Q${f((pts(i, 1) + pts(i - 1, 1)) / 2)},${f(bas + (i % 2 ? 4.5 : -1.5) * cm)} ${f(pts(i - 1, 1))},${f(bas)}`;
      d += `C${f(pts(0, .8))},${f(B.lerp(haut, bas, .7))} ${f(pts(0, .4))},${f(B.lerp(haut, bas, .35))} ${f(x0)},${f(haut)}Z`;
      for (let i = 0; i < n; i++) {
        const a = pts(i + .55, 0), b = pts(i + 1, 0), a1 = pts(i + .42, 1), b1 = pts(i + 1, 1);
        ombres += `M${f(a)},${f(haut)}C${f(a)},${f(B.lerp(haut, bas, .4))} ${f(a1)},${f(B.lerp(haut, bas, .6))} ${f(a1)},${f(bas + 5 * cm)}L${f(b1)},${f(bas + 5 * cm)}C${f(b1)},${f(B.lerp(haut, bas, .6))} ${f(b)},${f(B.lerp(haut, bas, .4))} ${f(b)},${f(haut)}Z`;
        const m = pts(i + .22, 0), m1 = pts(i + .2, 1);
        clairs += `M${f(m)},${f(haut)}C${f(m)},${f(B.lerp(haut, bas, .4))} ${f(m1)},${f(B.lerp(haut, bas, .6))} ${f(m1)},${f(bas)}`;
      }
      s += `<g data-anim='{"type":"vent","amp":.5,"periode":6,"pivot":[${f(x0 + w / 2)},${f(haut)}],"seed":${sd + 2}}'><clipPath id="${id}r${sd + 1}"><path d="${d}"/></clipPath>${P_(d, c)}<g clip-path="url(#${id}r${sd + 1})">${P_(ombres, sombre(c, .26), ' opacity=".75"')}<path d="${clairs}" stroke="${B.clair(c, .28)}" stroke-width="${f(2.4 * cm)}" fill="none" opacity=".45"/>${R_(x0 - w, haut, w * 3, 9 * cm, sombre(c, .3), ' opacity=".3"')}</g></g>`;
    }
    const tx0 = x - w * .95, tx1 = x + l + w * .95, ty = haut - 2 * cm, ct = fe.tringle || '#5a4636';
    s += R_(tx0, ty - 1.6 * cm, tx1 - tx0, 3.2 * cm, ct, ` rx="${f(1.6 * cm)}"`) + R_(tx0, ty - 1.4 * cm, tx1 - tx0, 1 * cm, B.clair(ct, .3), ' opacity=".6"') + `<circle cx="${f(tx0)}" cy="${f(ty)}" r="${f(3.4 * cm)}" fill="${ct}"/><circle cx="${f(tx1)}" cy="${f(ty)}" r="${f(3.4 * cm)}" fill="${ct}"/>`;
    for (const sd of [-1, 1]) for (let i = 0; i <= n; i++) { const xx = (sd < 0 ? x - w * .72 : x + l - w * .28) + w * i / n; s += `<circle cx="${f(xx)}" cy="${f(ty + .4 * cm)}" r="${f(1.9 * cm)}" fill="none" stroke="${B.clair(ct, .12)}" stroke-width="${f(.8 * cm)}"/>`; }
    return s;
  }
  function porte(po, cm, y1, mur) {
    const l = po.l ?? 88 * cm, h = po.h ?? 208 * cm, { x } = po, c = po.couleur || '#8a6a4c', cs = sombre(c, .28), cc = B.clair(c, .14), ca = 8 * cm, cad = po.cadre || B.clair(mur, .3);
    let s = R_(x - ca + 2 * cm, y1 - h - ca + 2 * cm, l + 2 * ca, h + ca, sombre(mur, .5), ' opacity=".25" filter="url(#flou6)"') + R_(x - ca, y1 - h - ca, l + 2 * ca, h + ca, cad) + R_(x - ca, y1 - h - ca, l + 2 * ca, ca * .25, B.clair(cad, .25)) + R_(x + l + ca * .72, y1 - h - ca, ca * .28, h + ca, sombre(cad, .18)) + R_(x - ca * .25, y1 - h - ca * .25, l + ca * .5, h + ca * .25, sombre(cad, .35));
    if (po.ouverte) { s += R_(x, y1 - h, l, h, po.lumiere || '#fff1c9') + R_(x, y1 - h, l, h * .06, sombre(po.lumiere || '#fff1c9', .25), ' opacity=".5"') + P_(dq([[x, y1 - h], [x + l * .34, y1 - h - 4 * cm], [x + l * .34, y1 + 9 * cm], [x, y1]]), c) + P_(dq([[x + l * .31, y1 - h - 3.6 * cm], [x + l * .34, y1 - h - 4 * cm], [x + l * .34, y1 + 9 * cm], [x + l * .31, y1 + 8.2 * cm]]), cs); return s; }
    s += R_(x, y1 - h, l, h, c);
    const panneau = (px, py, pw, ph) => R_(px, py, pw, ph, cs) + R_(px + 1.2 * cm, py + 1.2 * cm, pw - 1.2 * cm, ph - 1.2 * cm, cc) + R_(px + 1.6 * cm, py + 1.6 * cm, pw - 3.2 * cm, ph - 3.2 * cm, B.mix(c, cs, .2));
    for (const [py, ph] of [[.06, .3], [.4, .2], [.64, .3]]) for (const px of [.12, .54]) s += panneau(x + l * px, y1 - h + h * py, l * .34, h * ph);
    s += R_(x, y1 - h, l, h * .02, cs, ' opacity=".5"') + `<rect x="${f(x + l * .86)}" y="${f(y1 - h * .53)}" width="${f(3 * cm)}" height="${f(14 * cm)}" rx="${f(1.5 * cm)}" fill="#8a7440"/><rect x="${f(x + l * .78)}" y="${f(y1 - h * .5)}" width="${f(11 * cm)}" height="${f(2.6 * cm)}" rx="${f(1.3 * cm)}" fill="#d9bd6a"/>`;
    return s;
  }

  // la lumière d'une fenêtre : chacun de ses deux battants, et la tache qu'il fait au sol
  const lueurDe = (fe) => (fe.ciel || 'nuit') === 'nuit' ? '#b9cfff' : (CIELS[fe.ciel] || [0, '#ffe9c4'])[1];
  function taches(P, y1, fe) {
    const dx = fe.x + fe.l / 2 < P.vx ? 150 : -150, versSol = (x, dy, k) => [P.vx + (x - P.vx) * (y1 + dy - P.h) / (y1 - P.h) + dx * k, y1 + dy];
    return [[.02, .47], [.53, .98]].map(([a, b]) => { const xa = fe.x + fe.l * a, xb = fe.x + fe.l * b; return { vitre: [[xa, fe.y], [xb, fe.y], [xb, fe.y + fe.h], [xa, fe.y + fe.h]], sol: [versSol(xa, 40, .25), versSol(xb, 40, .25), versSol(xb, 210, 1), versSol(xa, 210, 1)] }; });
  }
  // les rais de lumière d'une fenêtre : du verre jusqu'à leur tache au sol, jamais du plafond
  MONDE.rais = (piece, fe, c, opacite, id, t) => {
    const P = PERSP(piece), y1 = (piece.fond || [140, 420, 940, 1260])[3];
    return taches(P, y1, fe).map(({ vitre, sol }, i) => {
      const haut = [(vitre[0][0] + vitre[2][0]) / 2, (vitre[0][1] + vitre[2][1]) / 2], bas = [(sol[0][0] + sol[2][0]) / 2, (sol[0][1] + sol[2][1]) / 2];
      return `<defs><linearGradient id="${id}r${i}" gradientUnits="userSpaceOnUse" x1="${f(haut[0])}" y1="${f(haut[1])}" x2="${f(bas[0])}" y2="${f(bas[1])}"><stop offset="0" stop-color="${c || lueurDe(fe)}" stop-opacity="${f(opacite)}"/><stop offset="1" stop-color="${c || lueurDe(fe)}" stop-opacity="${f(opacite * .25)}"/></linearGradient></defs>` +
        P_(dq(G.FORMES.enveloppe([...vitre, ...sol])), `url(#${id}r${i})`, ` opacity="${f(.8 + .2 * Math.sin(t * .7 + i * 1.9))}" style="mix-blend-mode:screen" filter="url(#flou4)"`);
    }).join('');
  };

  // {gen:"piece", horizon, fuite, fond:[x0,y0,x1,y1] (le mur du fond), mur:{couleur, matiere, soubassement:"#…"}, sol:{couleur, matiere},
  //  plafond:"#…"|false, fenetres:[{x,y,l,h, ciel:"nuit"|"jour"|"aube"|"soir"|"#…", ville, rideaux:"#…", lune, pluie}],
  //  portes:[{x,l,h,couleur,ouverte}], cadres:[{x,y,l,h,couleur, svg}], plinthe:"#…", lumiere:{x,y,r,couleur}}
  GEN.piece = (p, id) => {
    const P = PERSP(p), [x0, y0, x1, y1] = p.fond || [140, 420, 940, 1260];
    const mur = Object.assign({ couleur: '#c9b79c', matiere: 'enduit' }, p.mur || {}), sol = Object.assign({ couleur: '#8a6a4a', matiere: 'parquet' }, p.sol || {});
    const c = mur.couleur, cs = sol.couleur, cm = Math.max(.35, CM * (y1 - P.h) / Math.max(60, (p.y_ref ?? 1060) - P.h));
    const Bb = 2600, T = -2200, vers = (x, y, y2) => [P.vx + (x - P.vx) * (y2 - P.h) / (y - P.h), y2];
    const solG = vers(x0, y1, Bb), solD = vers(x1, y1, Bb), plG = vers(x0, y0, T), plD = vers(x1, y0, T), cPlaf = p.plafond || B.clair(c, .12);
    const pl = p.plinthe || B.mix(c, '#f3ece0', .45), hp = 11 * cm;
    let s = `<defs>${degradeV(id + 'm', y0, y1, [[0, sombre(c, .16)], [.35, c], [1, sombre(c, .07)]])}${degradeV(id + 's', y1, y1 + 700, [[0, sombre(cs, .3)], [.5, cs], [1, B.clair(cs, .05)]])}` +
      degradeH(id + 'g', plG[0], x0, [[0, sombre(c, .42)], [1, sombre(c, .24)]]) + degradeH(id + 'd', x1, plD[0], [[0, sombre(c, .17)], [1, sombre(c, .34)]]) + degradeV(id + 'p', y0 - 500, y0, [[0, B.clair(cPlaf, .06)], [1, sombre(cPlaf, .12)]]) +
      degradeV(id + 'o', y1, y1 + 130 * cm, [[0, '#120c1c', .42], [.4, '#120c1c', .12], [1, '#120c1c', 0]]) + degradeH(id + 'ag', x0, x0 + 90 * cm, [[0, '#120c1c', .2], [1, '#120c1c', 0]]) + degradeH(id + 'ad', x1 - 90 * cm, x1, [[0, '#120c1c', 0], [1, '#120c1c', .16]]) + degradeV(id + 'ah', y0, y0 + 80 * cm, [[0, '#120c1c', .2], [1, '#120c1c', 0]]) +
      `<clipPath id="${id}cm"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></clipPath><clipPath id="${id}cs"><path d="${dq([[x0, y1], [x1, y1], solD, solG])}"/></clipPath></defs>`;
    // murs latéraux, plafond, sol
    s += P_(dq([[x0, y0], [x0, y1], solG, [-4000, Bb], [-4000, T], plG]), `url(#${id}g)`) + P_(dq([[x1, y0], [x1, y1], solD, [5080, Bb], [5080, T], plD]), `url(#${id}d)`);
    if (p.plafond !== false) s += P_(dq([[x0, y0], [x1, y0], plD, plG]), `url(#${id}p)`);
    s += P_(dq([[x0, y1], [x1, y1], solD, solG]), `url(#${id}s)`) + `<g clip-path="url(#${id}cs)">${MONDE.sol(p, y1, x0, x1, sol.matiere, cs, p.seed)}${R_(x0 - 2500, y1, x1 - x0 + 5000, 130 * cm, `url(#${id}o)`)}</g>`;
    // mur du fond
    s += R_(x0, y0, x1 - x0, y1 - y0, `url(#${id}m)`) + `<g clip-path="url(#${id}cm)">${motifMur(x0, y0, x1, y1, mur.matiere, c, p.seed, cm)}`;
    if (mur.soubassement) { const hs = 105 * cm, cb = mur.soubassement; s += R_(x0, y1 - hs, x1 - x0, hs, cb) + R_(x0, y1 - hs - 3 * cm, x1 - x0, 5 * cm, B.clair(cb, .25)) + R_(x0, y1 - hs + 2 * cm, x1 - x0, 1.6 * cm, sombre(cb, .35)); }
    s += R_(x0, y0, 90 * cm, y1 - y0, `url(#${id}ag)`) + R_(x1 - 90 * cm, y0, 90 * cm, y1 - y0, `url(#${id}ad)`) + (p.plafond === false ? '' : R_(x0, y0, x1 - x0, 80 * cm, `url(#${id}ah)`)) + '</g>';
    // corniche et plinthes (sur les trois murs)
    if (p.plafond !== false && mur.matiere !== 'pierre') { const co = B.mix(c, '#f3ece0', .5); s += R_(x0, y0, x1 - x0, 7 * cm, co) + R_(x0, y0 + 4.6 * cm, x1 - x0, 2.4 * cm, sombre(co, .2)); }
    if (mur.matiere !== 'pierre') {
      const cote = (x, sens) => { const a = [x, y1], b = [x, y1 - hp], a2 = vers(x, y1, Bb), b2 = [a2[0], P.h + (y1 - hp - P.h) * (Bb - P.h) / (y1 - P.h)]; return P_(dq([a, b, b2, a2]), sombre(pl, sens < 0 ? .32 : .24)); };
      s += cote(x0, -1) + cote(x1, 1) + R_(x0, y1 - hp, x1 - x0, hp, pl) + R_(x0, y1 - hp, x1 - x0, hp * .22, B.clair(pl, .3)) + R_(x0, y1 - hp * .12, x1 - x0, hp * .12, sombre(pl, .4));
    }
    // ce que la fenêtre fait au sol : sa lumière, coupée par ses montants
    (p.fenetres || []).forEach((fe) => {
      const nuit = (fe.ciel || 'nuit') === 'nuit';
      if (nuit && !fe.lune) return;
      s += `<g clip-path="url(#${id}cs)" opacity="${nuit ? .16 : .26}" style="mix-blend-mode:screen">${P_(taches(P, y1, fe).map(t => dq(t.sol)).join(''), lueurDe(fe), ' filter="url(#flou6)"')}</g>`;
    });
    (p.fenetres || []).forEach((fe, i) => { s += fenetre(fe, `${id}f${i}`, cm, y1, c); });
    for (const po of (p.portes || [])) s += porte(po, cm, y1, c);
    for (const ca of (p.cadres || [])) {
      const cc = ca.couleur || '#3a2c22', e = Math.max(3, ca.l * .06);
      s += R_(ca.x - e + 2, ca.y - e + 4, ca.l + 2 * e, ca.h + 2 * e, '#120c1c', ' opacity=".28" filter="url(#flou4)"') + R_(ca.x - e, ca.y - e, ca.l + 2 * e, ca.h + 2 * e, cc) + R_(ca.x - e, ca.y - e, ca.l + 2 * e, e * .35, B.clair(cc, .25)) + R_(ca.x - e * .3, ca.y - e * .3, ca.l + e * .6, ca.h + e * .6, sombre(cc, .4)) + R_(ca.x, ca.y, ca.l, ca.h, ca.fond || '#efe6d2');
      if (ca.svg) s += `<g transform="translate(${ca.x},${ca.y})">${ca.svg}</g>`;
    }
    if (p.lumiere) { const lu = p.lumiere; s += `<defs><radialGradient id="${id}l"><stop offset="0" stop-color="${lu.couleur || '#ffd48a'}" stop-opacity="${lu.intensite ?? .35}"/><stop offset="1" stop-color="${lu.couleur || '#ffd48a'}" stop-opacity="0"/></radialGradient></defs><circle cx="${lu.x}" cy="${lu.y}" r="${lu.r || 700}" fill="url(#${id}l)" style="mix-blend-mode:screen"/>`; }
    return s;
  };

  // ------------------------------------------------------------------ meubles
  // repère d'un meuble posé en (x, y) : dx le long, dy en hauteur, dz vers le fond (px au premier plan)
  function atelier(P, x, y, ech) {
    const pt = (dx, dy, dz) => { const k = P.D / (P.D + dz), a = fuite(P, [x + dx, y], dz); return [a[0], a[1] - dy * k]; };
    const B_ = (dx, dy, dz, w, h, pr, c, o) => piece(P, x, y, dx, dz, dy, w, h, pr, c, Object.assign({ trait: false }, o));
    // une forme molle (matelas, coussin) : la silhouette d'une boîte aux coins arrondis, son dessus éclairé, son dessous ombré
    function mou(dx, dy, dz, w, h, pr, c, o = {}) {
      const r = (o.r ?? Math.min(h * .45, w * .12)) , c8 = [];
      for (const X of [dx, dx + w]) for (const Y of [dy, dy + h]) for (const Zz of [dz, dz + pr]) c8.push(pt(X, Y, Zz));
      const env = G.FORMES.enveloppe(c8), d = arrondi(env, r), dessus = arrondi([pt(dx, dy + h, dz + pr), pt(dx + w, dy + h, dz + pr), pt(dx + w, dy + h, dz), pt(dx, dy + h, dz)], r * .9);
      let s = P_(d, c) + P_(dessus, B.clair(c, .12));
      const a = pt(dx + r * .6, dy, dz), b = pt(dx + w - r * .6, dy, dz);
      s += `<path d="M${f(a[0])},${f(a[1] - h * .08)}Q${f((a[0] + b[0]) / 2)},${f(a[1] + h * .02)} ${f(b[0])},${f(b[1] - h * .08)}" stroke="${sombre(c, .3)}" stroke-width="${f(Math.max(1.4, h * .07))}" fill="none" stroke-linecap="round" opacity=".5"/>`;
      if (o.couture !== false) { const e = pt(dx + r * .7, dy + h, dz), g = pt(dx + w - r * .7, dy + h, dz); s += `<path d="M${f(e[0])},${f(e[1])}Q${f((e[0] + g[0]) / 2)},${f(e[1] - h * .04)} ${f(g[0])},${f(g[1])}" stroke="${sombre(c, .18)}" stroke-width="${f(Math.max(1, ech * 1.6))}" fill="none" stroke-linecap="round" opacity=".6"/>`; }
      return s;
    }
    // un oreiller : coins pincés, bords bombés, deux plis
    function oreiller(dx, dy, dz, w, ep, pr, c) {
      const C = [pt(dx, dy + ep * .9, dz + pr), pt(dx + w, dy + ep * .35, dz + pr), pt(dx + w, dy + ep * .25, dz), pt(dx, dy + ep * .55, dz)], m = (a, b, k, n) => [(a[0] + b[0]) / 2 + (b[1] - a[1]) * k * n, (a[1] + b[1]) / 2 - (b[0] - a[0]) * k * n];
      const t = [.13, .1, .16, .1];
      let d = `M${f(C[0][0])},${f(C[0][1])}`;
      C.forEach((p0, i) => { const p1 = C[(i + 1) % 4], q = m(p0, p1, t[i], 1); d += `Q${f(q[0])},${f(q[1])} ${f(p1[0])},${f(p1[1])}`; });
      const ce = [(C[0][0] + C[2][0]) / 2, (C[0][1] + C[2][1]) / 2], bas = m(C[3], C[2], .16, -1);
      return P_(d + 'Z', c) + `<path d="M${f(C[3][0])},${f(C[3][1])}Q${f(bas[0])},${f(bas[1])} ${f(C[2][0])},${f(C[2][1])}Q${f(ce[0])},${f(ce[1] + (bas[1] - ce[1]) * .55)} ${f(C[3][0])},${f(C[3][1])}Z" fill="${sombre(c, .16)}"/>` +
        `<path d="M${f(C[3][0] + (ce[0] - C[3][0]) * .12)},${f(C[3][1] + (ce[1] - C[3][1]) * .2)}Q${f(C[3][0] + (ce[0] - C[3][0]) * .4)},${f(C[3][1] + (ce[1] - C[3][1]) * .3)} ${f(ce[0] - (ce[0] - C[3][0]) * .35)},${f(ce[1])}M${f(C[2][0] - (C[2][0] - ce[0]) * .14)},${f(C[2][1] + (ce[1] - C[2][1]) * .25)}Q${f(C[2][0] - (C[2][0] - ce[0]) * .4)},${f(C[2][1] + (ce[1] - C[2][1]) * .35)} ${f(ce[0] + (C[2][0] - ce[0]) * .45)},${f(ce[1])}" stroke="${sombre(c, .22)}" stroke-width="${f(Math.max(1.2, ech * 1.8))}" fill="none" stroke-linecap="round" opacity=".55"/>`;
    }
    // une étoffe posée : son dessus, son pan devant qui ondule, ses plis
    function etoffe(dx0, dx1, dy, dz0, dz1, tombe, c, o = {}) {
      const n = 7, haut = (k, dz) => pt(B.lerp(dx0, dx1, k), dy, dz), bas = (k) => { const q = pt(B.lerp(dx0, dx1, k), dy - tombe * (1 + .07 * Math.sin(k * 9 + 1)), dz0 - ech * 3); return q; };
      let d = `M${haut(0, dz1).map(f)}L${haut(1, dz1).map(f)}L${haut(1, dz0).map(f)}L${bas(1).map(f)}`;
      for (let i = n; i > 0; i--) { const a = bas(i / n), b = bas((i - 1) / n); d += `Q${f((a[0] + b[0]) / 2)},${f((a[1] + b[1]) / 2 + (i % 2 ? 1 : -1) * tombe * .06)} ${f(b[0])},${f(b[1])}`; }
      d += `L${haut(0, dz0).map(f)}Z`;
      const bord = dq([haut(0, dz1), haut(1, dz1), haut(1, dz0), haut(0, dz0)]);
      let s = P_(d, sombre(c, .13)) + P_(bord, B.clair(c, .07));
      let plis = '';
      for (let i = 1; i < n; i++) { const k = i / n + Math.sin(i * 3.3) * .03, a = haut(k, dz0), b = bas(k + .01 * Math.sin(i)); plis += `M${f(a[0])},${f(a[1] + tombe * .06)}Q${f(a[0] + (b[0] - a[0]) * .3 + Math.sin(i * 2) * 6 * ech)},${f((a[1] + b[1]) / 2)} ${f(b[0])},${f(b[1] - tombe * .05)}`; }
      let dessus = '';
      for (const [k, l] of [[.18, .5], [.42, .7], [.7, .45], [.88, .6]]) { const a = haut(k, dz0 + (dz1 - dz0) * .05), b = haut(k + .06, dz0 + (dz1 - dz0) * l); dessus += `M${f(a[0])},${f(a[1])}Q${f((a[0] + b[0]) / 2 + 8 * ech)},${f((a[1] + b[1]) / 2)} ${f(b[0])},${f(b[1])}`; }
      s += `<path d="${plis}" stroke="${sombre(c, .34)}" stroke-width="${f(Math.max(1.3, ech * 2.4))}" fill="none" stroke-linecap="round" opacity=".5"/><path d="${dessus}" stroke="${sombre(c, .2)}" stroke-width="${f(Math.max(1.2, ech * 2))}" fill="none" stroke-linecap="round" opacity=".4"/>`;
      if (o.revers) { const [a, b, e, g] = [haut(0, dz1), haut(.13, dz1), haut(.13, dz0), haut(0, dz0)], b0 = bas(0), b1 = bas(.13); s += P_(`M${a.map(f)}L${b.map(f)}L${e.map(f)}L${b1.map(f)}Q${f((b0[0] + b1[0]) / 2)},${f(b0[1] + tombe * .05)} ${b0.map(f)}L${g.map(f)}Z`, o.revers) + P_(`M${g.map(f)}L${e.map(f)}L${b1.map(f)}Q${f((b0[0] + b1[0]) / 2)},${f(b0[1] + tombe * .05)} ${b0.map(f)}Z`, sombre(o.revers, .12)); }
      return s;
    }
    // un panneau mouluré sur une face avant
    const moulure = (dx, dy, dz, w, h, c, m = .12) => { const q = (e) => [pt(dx + e, dy + e, dz), pt(dx + w - e, dy + e, dz), pt(dx + w - e, dy + h - e, dz), pt(dx + e, dy + h - e, dz)], e = Math.min(w, h) * m; return P_(dq(q(0)), sombre(c, .22)) + P_(dq(q(e * .3)), B.clair(c, .1)) + P_(dq(q(e * .55)), sombre(c, .05)); };
    return { pt, B: B_, mou, oreiller, etoffe, moulure };
  }

  const MEUBLES = {
    lit({ A, l, h, pr, c, c2, p, e }) {
      const hc = h * .46, hm = h * .3, t = l * .045, drap = p.drap || '#f2eee6', yl = hc + hm;
      let s = '';
      // tête de lit (au bout), panneautée
      if (p.tete !== false) { const ht = h * 1.75, q = [A.pt(0, 0, 0), A.pt(0, ht * .86, 0), A.pt(0, ht, pr * .12), A.pt(0, ht, pr * .88), A.pt(0, ht * .86, pr), A.pt(0, 0, pr)]; s += P_(arrondi(q, 14 * e), sombre(c, .18)) + A.B(-t, 0, 0, t, ht * .86, pr * .03, c) + P_(arrondi([A.pt(-t, 0, 0), A.pt(-t, ht * .88, 0), A.pt(0, ht * .88, 0), A.pt(0, 0, 0)], 6 * e), B.clair(c, .06)); }
      for (const dx of [l * .02, l * .95]) s += A.B(dx, 0, pr * .02, l * .03, hc * .4, l * .03, sombre(c, .35));
      s += A.B(0, hc * .3, 0, l, hc * .7, pr, c) + A.moulure(l * .03, hc * .4, 0, l * .94, hc * .5, c, .16);
      s += A.B(l * .985, hc * .3, 0, l * .03, hc * 1.05, pr, c);                             // pied de lit : le matelas et la couette passent devant sa face intérieure
      s += A.mou(l * .005, hc, pr * .015, l * .985, hm, pr * .97, drap, { r: hm * .42 });
      s += A.oreiller(l * .045, yl - h * .02, pr * .52, l * .2, h * .34, pr * .42, sombre(drap, .05));
      s += A.oreiller(l * .05, yl - h * .02, pr * .06, l * .2, h * .34, pr * .42, drap);
      return s + A.etoffe(l * .34, l * 1.006, yl + h * .045, pr * .01, pr * .99, hm * 1.28, c2, { revers: B.mix(drap, c2, .12) }) + A.B(l * .99, hc * .05, -pr * .01, l * .03, hc * 1.35, pr * .03, c) + P_(arrondi([A.pt(l * .99, hc * 1.35, -pr * .01), A.pt(l * .99, hc * 1.46, -pr * .01), A.pt(l * 1.02, hc * 1.46, -pr * .01), A.pt(l * 1.02, hc * 1.35, -pr * .01)], 5 * e), B.clair(c, .1));
    },
    canape({ A, l, h, pr, c, c2, p, e }) {
      const a = l * .1, ha = h * .66, hs = h * .42, hc = h * .13, dz = pr * .7, n = p.places ?? (l / h > 1.7 ? 2 : 1), w = (l - 2 * a) / n;
      let s = '';
      for (const dx of [l * .03, l * .93]) for (const z of [pr * .85, pr * .06]) s += A.B(dx, 0, z, l * .035, h * .1, l * .03, sombre(c, .3));
      s += A.mou(a * .6, h * .1, dz, l - a * 1.2, h * .9, pr - dz, sombre(c2, .16), { r: 20 * e, couture: false });
      for (let i = 0; i < n; i++) s += A.mou(a + i * w + w * .02, hs + hc * .5, dz - pr * .14, w * .96, h * .47, pr * .2, sombre(c2, .03), { r: 18 * e });
      s += A.mou(a * .5, h * .1, 0, l - a, hs - h * .1, dz, sombre(c2, .1), { r: 10 * e, couture: false });
      for (let i = 0; i < n; i++) s += A.mou(a + i * w + w * .008, hs - h * .02, -pr * .02, w * .984, hc + h * .02, dz - pr * .04, c2, { r: hc * .6 });
      for (const dx of [0, l - a]) s += A.mou(dx, h * .08, -pr * .015, a, ha - h * .08, pr * .96, sombre(c2, .06), { r: a * .42 });
      if (p.coussin !== false) { const cc = p.coussin || B.mix(c2, '#f2e6cc', .55), q = [A.pt(a * 1.2, hs + hc, dz * .55), A.pt(a * 1.35, hs + hc + h * .34, dz * .75), A.pt(a * 1.35 + h * .36, hs + hc + h * .3, dz * .8), A.pt(a * 1.2 + h * .36, hs + hc - h * .01, dz * .55)]; s += P_(arrondi(q, 12 * e), cc) + `<path d="M${q[0].map(f)}Q${f((q[0][0] + q[2][0]) / 2)},${f((q[0][1] + q[2][1]) / 2)} ${q[2].map(f)}" stroke="${sombre(cc, .2)}" stroke-width="${f(2 * e)}" fill="none" opacity=".35"/>`; }
      return s;
    },
    table: ({ A, l, h, pr, c, e }) => {
      const ep = h * .07, pd = Math.max(l * .05, 8 * e); let s = '';
      for (const [dx, dz] of [[l * .04, pr * .84], [l * .96 - pd, pr * .84], [l * .04, pr * .06], [l * .96 - pd, pr * .06]]) s += A.B(dx, 0, dz, pd, h - ep, pd, dz > pr * .5 ? sombre(c, .26) : c);
      s += A.B(l * .07, h - ep - h * .12, pr * .07, l * .86, h * .12, pr * .02, sombre(c, .12)) + A.B(0, h - ep, 0, l, ep, pr, c);
      const vein = [.25, .55, .8].map(k => { const a = A.pt(l * .03, h, pr * k), b = A.pt(l * .97, h, pr * (k + .03)); return `M${a.map(f)}Q${f((a[0] + b[0]) / 2)},${f(a[1] - 2 * e)} ${b.map(f)}`; }).join('');
      return s + `<path d="${vein}" stroke="${sombre(c, .25)}" stroke-width="${f(1.4 * e)}" fill="none" opacity=".35"/>` + `<path d="M${A.pt(0, h, 0).map(f)}L${A.pt(l, h, 0).map(f)}" stroke="${B.clair(c, .4)}" stroke-width="${f(1.6 * e)}" opacity=".7"/>`;
    },
    bureau({ A, l, h, pr, c, e }) {
      const ep = h * .06, w = l * .34; let s = '';
      for (const dz of [pr * .85, pr * .04]) s += A.B(l * .03, 0, dz, Math.max(l * .04, 7 * e), h - ep, 8 * e, dz > pr * .5 ? sombre(c, .26) : c);
      s += A.B(l - w - l * .03, h * .08, pr * .04, w, h * .92 - ep, pr * .88, sombre(c, .05));
      for (let k = 0; k < 3; k++) { const hh = (h * .86 - ep) / 3, y0 = h * .1 + k * hh; s += A.moulure(l - w - l * .01, y0, pr * .04, w - l * .04, hh * .88, c, .14); const b = A.pt(l - w * .5 - l * .03, y0 + hh * .45, pr * .03); s += `<rect x="${f(b[0] - 12 * e)}" y="${f(b[1] - 2.5 * e)}" width="${f(24 * e)}" height="${f(5 * e)}" rx="${f(2.5 * e)}" fill="#c9ab62"/>`; }
      return s + A.B(0, h - ep, 0, l, ep, pr, c) + `<path d="M${A.pt(0, h, 0).map(f)}L${A.pt(l, h, 0).map(f)}" stroke="${B.clair(c, .4)}" stroke-width="${f(1.6 * e)}" opacity=".7"/>`;
    },
    chaise({ A, l, h, pr, c, c2, p, e }) {
      const ha = h * .5, ep = h * .045, pd = Math.max(l * .085, 6 * e); let s = '';
      for (const [dx, dz] of [[0, pr - pd], [l - pd, pr - pd]]) s += A.B(dx, 0, dz, pd, h, pd, sombre(c, .16));
      s += A.B(pd, h * .88, pr - pd * .8, l - 2 * pd, h * .1, pd * .6, c) + A.B(pd, h * .62, pr - pd * .8, l - 2 * pd, h * .06, pd * .6, sombre(c, .08));
      for (const k of [.28, .5, .72]) s += A.B(pd + (l - 2 * pd) * k - pd * .25, h * .66, pr - pd * .75, pd * .5, h * .23, pd * .4, sombre(c, .04));
      for (const dx of [0, l - pd]) s += A.B(dx, 0, 0, pd, ha - ep, pd, c);
      s += A.B(pd * .5, h * .2, pd * .3, l - pd, h * .03, pd * .5, sombre(c, .1)) + A.B(-l * .02, ha - ep, -pr * .02, l * 1.04, ep, pr * 1.0, B.clair(c, .04));
      if (p.couleur2) s += A.mou(l * .02, ha, pr * .02, l * .96, h * .035, pr * .86, c2, { r: 8 * e });
      return s;
    },
    banc({ A, l, h, pr, c, p, e }) {
      const ep = h * .1, n = 3, lat = pr / n; let s = '';
      for (const dx of [l * .08, l * .86]) { s += A.B(dx, 0, pr * .75, l * .05, h - ep, pr * .12, sombre(c, .34)) + A.B(dx, 0, pr * .06, l * .05, h - ep, pr * .12, sombre(c, .2)) + A.B(dx, h - ep * 2, pr * .06, l * .05, ep, pr * .8, sombre(c, .26)); if (p.dossier) s += A.B(dx, h - ep, pr * .9, l * .05, h * .95, pr * .08, sombre(c, .25)); }
      if (p.dossier) for (const y of [1.3, 1.62]) s += A.B(0, h * y, pr * .88, l, h * .22, pr * .05, c);
      for (let i = n - 1; i >= 0; i--) s += A.B(0, h - ep, i * lat + lat * .06, l, ep, lat * .88, i % 2 ? sombre(c, .05) : c);
      return s + `<path d="M${A.pt(0, h, lat * .06).map(f)}L${A.pt(l, h, lat * .06).map(f)}" stroke="${B.clair(c, .35)}" stroke-width="${f(1.5 * e)}" opacity=".6"/>`;
    },
    commode({ A, l, h, pr, c, e }) {
      const pi = h * .08; let s = '';
      for (const dx of [l * .03, l * .92]) s += A.B(dx, 0, pr * .05, l * .05, pi, l * .05, sombre(c, .3));
      s += A.B(0, pi, 0, l, h - pi, pr, c) + A.B(-l * .015, h * .96, -pr * .02, l * 1.03, h * .04, pr * 1.02, B.clair(c, .06));
      const ht = (h * .94 - pi) / 3;
      for (let k = 0; k < 3; k++) { const y0 = pi + ht * k + ht * .08; s += A.moulure(l * .05, y0, 0, l * .9, ht * .84, c, .12); for (const bx of [.3, .7]) { const b = A.pt(l * bx, y0 + ht * .42, 0), rr = Math.max(1.4, ht * .075); s += `<circle cx="${f(b[0])}" cy="${f(b[1] + rr * .6)}" r="${f(rr)}" fill="${sombre(c, .5)}" opacity=".6"/><circle cx="${f(b[0])}" cy="${f(b[1])}" r="${f(rr)}" fill="#cfae62"/><circle cx="${f(b[0] - rr * .3)}" cy="${f(b[1] - rr * .3)}" r="${f(rr * .35)}" fill="#f2dfa8"/>`; } }
      return s + `<path d="M${A.pt(-l * .015, h, -pr * .02).map(f)}L${A.pt(l * 1.015, h, -pr * .02).map(f)}" stroke="${B.clair(c, .4)}" stroke-width="${f(1.6 * e)}" opacity=".6"/>`;
    },
    etagere({ A, l, h, pr, c, p, e, x, y }) {
      const r = B.alea(p.seed || 9), m = l * .045, n = 5; let s = A.B(0, 0, 0, l, h, pr, c) + R_(x + m, y - h + m, l - 2 * m, h - 2 * m, sombre(c, .42));
      const hh = (h - 2 * m) / n, coul = ['#b5523a', '#3d6b8a', '#c9a54e', '#5c7a4a', '#7a4e8a', '#e0d6c2', '#8a3f4f', '#46566e'];
      for (let k = 0; k < n; k++) {
        const yb = y - m - k * hh, et = Math.max(1.5, h * .018); let xx = x + m * 1.4; const fin = x + l - m * 1.6;
        s += R_(x + m, yb - hh, l - 2 * m, hh * .12, '#0d0914', ' opacity=".25"');
        while (xx < fin - l * .06) {
          const t = r();
          if (t < .08) { const w = l * .13; s += `<path d="M${f(xx + w * .2)},${f(yb)}l${f(w * .6)},0l${f(w * .08)},${f(-hh * .25)}l${f(-w * .76)},0Z" fill="#b56a44"/>` + [-.25, 0, .25].map(d => `<ellipse cx="${f(xx + w * (.5 + d))}" cy="${f(yb - hh * .42)}" rx="${f(w * .16)}" ry="${f(hh * .2)}" fill="#5f8a4e" transform="rotate(${f(d * 70)},${f(xx + w * .5)},${f(yb - hh * .25)})"/>`).join(''); xx += w * 1.1; continue; }
          if (t < .15) { const w = l * (.1 + r() * .08); for (let j = 0; j < 3; j++) s += R_(xx + j * w * .04, yb - hh * .1 * (j + 1), w - j * w * .1, hh * .09, coul[Math.floor(r() * coul.length)]); xx += w * 1.15; continue; }
          const w = l * (.035 + r() * .04), hl = hh * (.62 + r() * .24), cc = coul[Math.floor(r() * coul.length)];
          const pen = r() < .12 ? ` transform="rotate(${f(-9)},${f(xx + w)},${f(yb)})"` : '';
          s += `<g${pen}>${R_(xx, yb - hl, w, hl, cc)}${R_(xx, yb - hl, w * .28, hl, B.clair(cc, .16), ' opacity=".6"')}${R_(xx + w * .15, yb - hl * .82, w * .7, hl * .05, B.clair(cc, .45), ' opacity=".8"')}</g>`; xx += w + l * .004 + (pen ? w * .3 : 0);
        }
        s += R_(x + m, yb, l - 2 * m, et, B.clair(c, .08));
      }
      void e;
      return s;
    },
    jarre({ l, h, c, x, y }) {
      const d = `M${f(x + l * .3)},${f(y - h)}L${f(x + l * .7)},${f(y - h)}L${f(x + l * .66)},${f(y - h * .88)}C${f(x + l * 1.05)},${f(y - h * .7)} ${f(x + l)},${f(y - h * .1)} ${f(x + l * .62)},${f(y)}L${f(x + l * .38)},${f(y)}C${f(x)},${f(y - h * .1)} ${f(x - l * .05)},${f(y - h * .7)} ${f(x + l * .34)},${f(y - h * .88)}Z`, id = `ja${Math.round(x)}${Math.round(y)}`;
      return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>` + P_(d, c) + `<g clip-path="url(#${id})">${P_(d, sombre(c, .3), ` transform="translate(${f(l * .3)},${f(h * .04)})" opacity=".8"`)}<ellipse cx="${f(x + l * .28)}" cy="${f(y - h * .55)}" rx="${f(l * .07)}" ry="${f(h * .2)}" fill="${B.clair(c, .3)}" opacity=".45"/>${R_(x - l * .1, y - h * .74, l * 1.2, h * .02, sombre(c, .35), ' opacity=".6"')}</g><ellipse cx="${f(x + l / 2)}" cy="${f(y - h)}" rx="${f(l * .2)}" ry="${f(h * .03)}" fill="${sombre(c, .6)}"/>`;
    },
    // une caisse de bois : des lattes écartées sur un dedans sombre, deux montants cloués, un couvercle de planches
    caisse({ A, l, h, pr, c, e }) {
      const n = 3, jeu = h * .05, couv = h * .06, hl = (h - couv - jeu * n) / n, mo = l * .11, ep = Math.max(2 * e, l * .022), clou = Math.max(1.2, l * .014);
      let s = A.B(ep, 0, ep, l - 2 * ep, h - couv, pr - 2 * ep, sombre(c, .66));
      for (let k = 0; k < n; k++) s += A.B(0, k * (hl + jeu), 0, l, hl, pr, k % 2 ? sombre(c, .07) : c);
      for (const dx of [l * .035, l * .965 - mo]) {
        s += A.B(dx, 0, -ep, mo, h - couv, ep, B.clair(c, .06));
        for (let k = 0; k < n; k++) for (const v of [.28, .72]) { const b = A.pt(dx + mo / 2, k * (hl + jeu) + hl * v, -ep); s += `<circle cx="${f(b[0])}" cy="${f(b[1])}" r="${f(clou)}" fill="${sombre(c, .6)}"/>`; }
      }
      s += A.B(-l * .02, h - couv, -ep * 1.6, l * 1.04, couv, pr + ep * 1.6, B.clair(c, .04));
      const joint = (k) => `M${A.pt(-l * .02, h, pr * k).map(f)}L${A.pt(l * 1.02, h, pr * k).map(f)}`;
      return s + `<path d="${joint(.32)}${joint(.66)}" stroke="${sombre(c, .5)}" stroke-width="${f(Math.max(1.2, 1.8 * e))}" opacity=".7"/>`;
    },
  };
  GEN.meuble = (p) => {
    const P = PERSP(p), x = p.x ?? 400, y = p.y ?? 1500, e = kSol(p, y), l = (p.l ?? 300) * e, h = (p.h ?? 140) * e, pr = (p.prof ?? 250) * e, c = p.couleur || '#8a6a4a', c2 = p.couleur2 || '#9aa7c7';
    const fn = MEUBLES[p.type], s = fn ? fn({ A: atelier(P, x, y, e), l, h, pr, c, c2, p, e, x, y }) : boite(P, x, y, l, h, pr, c);
    if (p.ombre_sol === false) return s;
    return `<ellipse cx="${f(x + l / 2)}" cy="${f(y + 4 * e)}" rx="${f(l * .57)}" ry="${f(10 + pr * .05)}" fill="#120c1c" opacity=".34" filter="url(#flou10)"/>` + s;
  };
  MONDE.MEUBLES = Object.keys(MEUBLES); MONDE.atelier = atelier;
})(typeof window !== 'undefined' ? window : globalThis);
