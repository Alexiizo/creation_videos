// Ouvrages des récits bibliques et de la rue : barque de pêche, puits, tombeau taillé dans le roc, croix (avec retenue),
// Temple, lampadaire, clôture, auge, feu. Des OUTILS paramétrés (taille, couleurs, état), posés au sol en perspective comme
// les autres générateurs : la taille s'écrit au y de référence du sol, la perspective du lieu la réduit au loin.
(function (G) {
  const B = G.B, f = B.f, MONDE = G.MONDE, GEN = MONDE.GEN, { kSol, bois, arrondi } = MONDE;
  const OMBRE = '#2b2140';
  const sombre = (c, k) => B.teinte(c, OMBRE, k);
  const P_ = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
  const dq = (q) => 'M' + q.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  const ombrePied = (x, y, rx) => `<ellipse cx="${f(x)}" cy="${f(y + 3)}" rx="${f(rx)}" ry="${f(rx * .1)}" fill="#120c1c" opacity=".3" filter="url(#flou6)"/>`;
  const tons = (c) => ({ c, clair: B.clair(c, .16), ombre: sombre(c, .3), fonce: sombre(c, .55) });

  // une poutre : sa face, sa face à l'ombre, l'arête claire, les veines du bois
  function poutre(x0, y0, x1, y1, w, c, o = {}) {
    const l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l, ny = (x1 - x0) / l, q = (k, e) => [B.lerp(x0, x1, k) + nx * w * e, B.lerp(y0, y1, k) + ny * w * e], r = B.alea(o.seed || 5), v = o.vertical !== false;
    let s = P_(dq([q(0, -.5), q(1, -.5), q(1, .5), q(0, .5)]), c) + P_(dq([q(0, v ? -.5 : .12), q(1, v ? -.5 : .12), q(1, v ? -.12 : .5), q(0, v ? -.12 : .5)]), o.plat ? c : sombre(c, .32));
    if (o.plat) return s;
    s += P_(dq([q(0, v ? .5 : -.5), q(1, v ? .5 : -.5), q(1, v ? .4 : -.4), q(0, v ? .4 : -.4)]), B.clair(c, .2), ' opacity=".7"');
    let d = '';
    for (let i = 0; i < 7; i++) { const e = -.4 + r() * .8, k = r() * .6, b = k + .12 + r() * .28, m = q((k + b) / 2, e + (r() - .5) * .14); d += `M${q(k, e).map(f)}Q${m.map(f)} ${q(b, e).map(f)}`; }
    s += `<path d="${d}" fill="none" stroke="${sombre(c, .45)}" stroke-width="${f(w * .035)}" stroke-linecap="round" opacity=".5"/>`;
    for (let i = 0; i < 2; i++) { const p = q(.2 + r() * .6, -.2 + r() * .5); s += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(w * .07)}" ry="${f(w * .1)}" fill="${sombre(c, .4)}" opacity=".6"/>`; }
    return s;
  }
  // un mur de pierres taillées dans un rectangle
  function appareil(x0, y0, w, h, c, r, hb) {
    let s = `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="${sombre(c, .34)}"/>`, cl = '';
    for (let y = y0, k = 0; y < y0 + h - 1; k++) { const hh = Math.min(hb * (.85 + r() * .35), y0 + h - y); for (let x = x0 - (k % 2) * hb * .7; x < x0 + w;) { const l = hb * (1.2 + r() * 1.2), a = Math.max(x0, x + hb * .05), b = Math.min(x0 + w, x + l - hb * .05); if (b - a > hb * .15) { const t = B.mix(c, r() < .5 ? '#ffffff' : OMBRE, r() * .1); s += P_(arrondi([[a, y + hb * .05], [b, y + hb * .05], [b, y + hh - hb * .05], [a, y + hh - hb * .05]], hb * .13), t); cl += `M${f(a + hb * .12)},${f(y + hb * .09)}H${f(b - hb * .12)}`; } x += l; } y += hh; }
    return s + `<path d="${cl}" stroke="${B.clair(c, .3)}" stroke-width="${f(Math.max(1, hb * .05))}" opacity=".4"/>`;
  }

  // {gen:"barque", x, y (ligne de flottaison, au milieu), l (longueur à y_ref, ≈ 520 = 6 personnes), sens, couleur,
  //  voile: true|false, tangue: amplitude (degrés, 0 = immobile)} — la barque de pêche de Galilée (coque en bois, un mât)
  const QUILLE = .6;                       // H : profondeur de la coque sous l'eau
  GEN.barque = (p, id = 'barque') => {
    const x = p.x ?? 540, y = p.y ?? 1300, k = kSol(p, y), L = (p.l ?? 520) * k, H = L * .2, s0 = p.sens ?? 1, t = tons(p.couleur || '#85593a'), pr = p.proue ?? .1, xa = x - L / 2, xb = x + L / 2, h0 = H * (1 + pr * 1.6);
    const bord = (dy, e = 0) => `M${f(xa + e)},${f(y - h0 + dy)}Q${f(x)},${f(y - H * .78 + dy)} ${f(xb - e)},${f(y - h0 + dy)}`;
    const flanc = (kb, e) => `Q${f(xb - e - L * .04)},${f(y - H * .2)} ${f(xb - L * .14)},${f(y + H * kb)}L${f(xb - L * .325)},${f(y + H * QUILLE)}L${f(xa + L * .325)},${f(y + H * QUILLE)}L${f(xa + L * .14)},${f(y + H * kb)}Q${f(xa + e + L * .04)},${f(y - H * .2)} ${f(xa + e)},${f(y - h0)}Z`;      // (la quille descend sous l'eau : en tanguant, elle n'en sort jamais)
    const coque = bord(0) + flanc(.08, 0), dedans = `M${f(xa + L * .02)},${f(y - h0 + H * .02)}Q${f(x)},${f(y - H * .7)} ${f(xb - L * .02)},${f(y - h0 + H * .02)}Q${f(x)},${f(y - H * 1.18)} ${f(xa + L * .02)},${f(y - h0 + H * .02)}Z`;
    // ce qui est DERRIÈRE les passagers (mât, voile, intérieur) et ce qui est DEVANT (la coque) : le moteur pose les passagers
    // entre les deux (film.js)
    let s = P_(dedans, t.fonce) + `<clipPath id="${id}d"><path d="${dedans}"/></clipPath><g clip-path="url(#${id}d)">${[.2, .36, .5, .64, .8].map(q => P_(dq([[xa + L * (q - .015), y - H * 1.2], [xa + L * (q + .015), y - H * 1.2], [xa + L * (q + .015), y - H * .5], [xa + L * (q - .015), y - H * .5]]), t.ombre)).join('')}<path d="M${f(xa)},${f(y - H * 1.03)}Q${f(x)},${f(y - H * .96)} ${f(xb)},${f(y - H * 1.03)}" stroke="${t.ombre}" stroke-width="${f(H * .06)}" fill="none"/></g>`;
    const bordages = [.22, .4, .58, .76].map(q => `M${f(xa + L * (.015 + q * .1))},${f(B.lerp(y - h0, y, q))}Q${f(x)},${f(B.lerp(y - H * .78, y + H * .06, q))} ${f(xb - L * (.015 + q * .1))},${f(B.lerp(y - h0, y, q))}`);
    const r = B.alea(p.seed || 4);
    let clous = '', veines = '';
    for (let i = 0; i < 18; i++) { const q = .12 + Math.floor(r() * 4) * .18, u = .08 + r() * .84, yy = B.lerp(B.lerp(y - h0, y - H * .86, Math.sin(u * Math.PI)), y, q) + H * .02, l = L * (.04 + r() * .09); veines += `M${f(xa + L * u)},${f(yy)}q${f(l * .5)},${f(H * .02)} ${f(l)},0`; if (i < 9) clous += `<circle cx="${f(xa + L * (.1 + i * .1))}" cy="${f(B.lerp(y - h0, y - H * .86, Math.sin((.1 + i * .1) * Math.PI)) + H * .16)}" r="${f(H * .016)}" fill="${t.fonce}"/>`; }
    const devant = P_(coque, t.c) + `<clipPath id="${id}c"><path d="${coque}"/></clipPath><g clip-path="url(#${id}c)">` +
      P_(`M${f(xa)},${f(y - H * .34)}Q${f(x)},${f(y - H * .06)} ${f(xb)},${f(y - H * .34)}L${f(xb)},${f(y + H)}L${f(xa)},${f(y + H)}Z`, t.ombre) + P_(`M${f(s0 > 0 ? xa : x + L * .1)},${f(y - h0)}h${f(L * .4)}v${f(H * 2)}h${f(-L * .4)}Z`, t.fonce, ' opacity=".12"') +
      `<path d="${bordages.join('')}" stroke="${t.fonce}" stroke-width="${f(H * .025)}" fill="none" opacity=".55"/><path d="${bordages.map(d => d).join('')}" transform="translate(0,${f(H * .03)})" stroke="${t.clair}" stroke-width="${f(H * .016)}" fill="none" opacity=".4"/><path d="${veines}" stroke="${t.fonce}" stroke-width="${f(H * .012)}" fill="none" stroke-linecap="round" opacity=".4"/>${clous}</g>` +
      `<path d="${bord(0)}" stroke="${t.ombre}" stroke-width="${f(H * .16)}" fill="none" stroke-linecap="round"/><path d="${bord(-H * .025)}" stroke="${t.clair}" stroke-width="${f(H * .1)}" fill="none" stroke-linecap="round"/><path d="${bord(-H * .055)}" stroke="${B.clair(t.clair, .25)}" stroke-width="${f(H * .02)}" fill="none" stroke-linecap="round" opacity=".7"/>` +
      P_(dq([[xa - L * .005, y - h0 - H * .16], [xa + L * .018, y - h0 - H * .16], [xa + L * .03, y - h0 + H * .12], [xa + L * .008, y - h0 + H * .12]]), t.ombre) + P_(dq([[xb + L * .005, y - h0 - H * .16], [xb - L * .018, y - h0 - H * .16], [xb - L * .03, y - h0 + H * .12], [xb - L * .008, y - h0 + H * .12]]), t.ombre);
    if (p.voile !== false) {                                    // le mât, la vergue et la voile gonflée
      const xm = x + s0 * L * .04, ym = y - H * .85, hm = L * .95, cv = p.couleur_voile || '#ece0c6', haut = [xm - s0 * L * .02, ym - hm * .95], bout = [xm + s0 * L * .44, ym - hm * .2], bas = [xm + s0 * L * .015, ym - hm * .13];
      const voile = `M${haut.map(f)}Q${f(xm + s0 * L * .34)},${f(ym - hm * .66)} ${bout.map(f)}Q${f(xm + s0 * L * .22)},${f(ym - hm * .06)} ${bas.map(f)}Q${f(xm + s0 * L * .1)},${f(ym - hm * .5)} ${haut.map(f)}Z`;
      const plis = [.3, .55, .8].map(q => { const a = [B.lerp(haut[0], bout[0], q) + s0 * L * .035 * Math.sin(q * 3), B.lerp(haut[1], bout[1], q)], b = [B.lerp(haut[0], bas[0], q) + s0 * L * .03 * Math.sin(q * 3), B.lerp(haut[1], bas[1], q)]; return `M${a.map(f)}Q${f((a[0] + b[0]) / 2)},${f((a[1] + b[1]) / 2 + hm * .04)} ${b.map(f)}`; }).join('');
      s = `<clipPath id="${id}v"><path d="${voile}"/></clipPath>` + P_(voile, cv) + `<g clip-path="url(#${id}v)">${P_(voile, sombre(cv, .2), ` transform="translate(${f(s0 * L * .16)},${f(hm * .12)})"`)}<path d="${plis}" stroke="${sombre(cv, .26)}" stroke-width="${f(L * .006)}" fill="none" opacity=".6"/></g>` +
        bois([[xm, ym + H * .1], [xm, ym - hm * .5], [xm, ym - hm]], L * .026, L * .014, t.ombre) + bois([[haut[0] - s0 * L * .03, haut[1] - hm * .03], [xm + s0 * L * .2, ym - hm * .6], [bout[0] + s0 * L * .02, bout[1] + hm * .02]], L * .011, L * .008, t.ombre) +
        `<path d="M${f(xm)},${f(ym - hm)}L${f(xa + L * .05)},${f(y - h0)}M${f(xm)},${f(ym - hm)}L${f(xb - L * .05)},${f(y - h0)}" stroke="${t.fonce}" stroke-width="${f(L * .004)}" opacity=".6"/>` + s;
    }
    // la barque est DANS l'eau : tout ce qui passe sous la ligne d'eau est coupé net par elle (une crête qui ondule et reste à
    // niveau quand la barque tangue) ; dessous, l'ombre de la coque et un peu d'écume
    const ye = y + H * .02, he = H * .5, xe0 = xa + L * .06, xe1 = xb - L * .06, ce = H * .07;
    const horsEau = `<clipPath id="${id}he"><path d="M${f(xa - L)},${f(y - L * 5)}H${f(xb + L)}V${f(ye)}L${f(xe1)},${f(ye)}Q${f(2 * x - xe0 - L * .22)},${f(ye + ce)} ${f(x)},${f(ye)}Q${f(xe0 + L * .22)},${f(ye - ce)} ${f(xe0)},${f(ye)}L${f(xa - L)},${f(ye)}Z"/></clipPath>`;
    const ligne = `<ellipse cx="${f(x)}" cy="${f(ye + H * .14)}" rx="${f(L * .4)}" ry="${f(H * .13)}" fill="${B.sombre(p.eau || '#2f6f86', .5)}" opacity=".42" filter="url(#flou10)"/>` +
      `<path d="M${f(xe0 + L * .04)},${f(ye - ce * .2)}Q${f(xe0 + L * .22)},${f(ye - ce)} ${f(x)},${f(ye)}T${f(xe1 - L * .04)},${f(ye + ce * .1)}" fill="none" stroke="#ffffff" stroke-width="${f(H * .03)}" stroke-linecap="round" opacity=".5"/><path d="M${f(xe0 + L * .2)},${f(ye + he * .4)}q${f(L * .1)},${f(-ce * .6)} ${f(L * .2)},0M${f(x + L * .08)},${f(ye + he * .55)}q${f(L * .08)},${f(-ce * .5)} ${f(L * .17)},0" fill="none" stroke="#ffffff" stroke-width="${f(H * .018)}" stroke-linecap="round" opacity=".28"/>`;
    const amp = p.tangue ?? 2.5, part = p.partie === 'arriere' ? s : p.partie === 'avant' ? devant : s + devant;
    const bouge = amp ? `<g data-anim='{"type":"tangue","amp":${amp},"periode":${p.periode ?? 3.4},"pivot":[${f(x)},${f(y)}],"houle":${f(H * .12)}}'>${part}</g>` : part;
    return p.partie === 'arriere' ? bouge : `${horsEau}<g clip-path="url(#${id}he)">${bouge}</g>${ligne}`;
  };

  // {gen:"lampadaire", x, y (pied), h (hauteur à y_ref ≈ 430 : 2,4 fois un homme), sens (côté de la crosse), couleur,
  //  allume: true, lumiere: "#ffd9a0"} — un lampadaire de rue : mât, crosse, lanterne ; allumé, un cône de lumière et
  //  une flaque au sol (c'est aussi une SOURCE : il éclaire le côté des personnages tourné vers lui)
  GEN.lampadaire = (p, id = 'lamp') => {
    const x = p.x ?? 540, y = p.y ?? 1500, k = kSol(p, y), h = (p.h ?? 430) * k, s0 = p.sens ?? 1, w = h * .022, c = p.couleur || '#3f4652', t = tons(c), lum = p.lumiere || '#ffd9a0', allume = p.allume !== false, xl = x + s0 * h * .16, yl = y - h * .955;
    let s = ombrePied(x, y, w * 3);
    if (allume) s += `<defs><linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lum}" stop-opacity=".34"/><stop offset="1" stop-color="${lum}" stop-opacity="0"/></linearGradient></defs><ellipse cx="${f(xl)}" cy="${f(y)}" rx="${f(h * .34)}" ry="${f(h * .05)}" fill="${lum}" opacity=".2" filter="url(#flou10)" style="mix-blend-mode:screen"/><path d="M${f(xl - w * 2)},${f(yl)}L${f(xl + w * 2)},${f(yl)}L${f(xl + h * .26)},${f(y)}L${f(xl - h * .26)},${f(y)}Z" fill="url(#${id}c)" style="mix-blend-mode:screen" filter="url(#flou6)"/>`;
    s += P_(dq([[x - w * 1.7, y], [x - w * 1.3, y - h * .05], [x + w * 1.3, y - h * .05], [x + w * 1.7, y]]), t.ombre) + bois([[x, y - h * .04], [x, y - h * .5], [x, y - h * .9]], w * 2, w * 1.3, c) + `<rect x="${f(x - w * 1.25)}" y="${f(y - h * .1)}" width="${f(w * 2.5)}" height="${f(h * .012)}" fill="${t.clair}"/>`;
    s += `<path d="M${f(x)},${f(y - h * .89)}Q${f(x)},${f(y - h * .99)} ${f(x + s0 * h * .08)},${f(y - h * .99)}L${f(xl)},${f(y - h * .985)}" fill="none" stroke="${c}" stroke-width="${f(w * 1.15)}" stroke-linecap="round"/>` + P_(`M${f(xl - w * 2.4)},${f(yl)}Q${f(xl - w * 1.8)},${f(yl - w * 2.2)} ${f(xl)},${f(yl - w * 2.3)}Q${f(xl + w * 1.8)},${f(yl - w * 2.2)} ${f(xl + w * 2.4)},${f(yl)}Z`, t.ombre);
    if (allume) s += `<ellipse cx="${f(xl)}" cy="${f(yl)}" rx="${f(w * 2)}" ry="${f(w * .75)}" fill="#fff6e0"/><circle cx="${f(xl)}" cy="${f(yl)}" r="${f(h * .07)}" fill="${lum}" opacity=".5" filter="url(#flou10)" style="mix-blend-mode:screen"/>`;
    return s;
  };

  // {gen:"puits", x, y (pied, au centre), r (rayon à y_ref ≈ 95), couleur, seau: true} — margelle de pierres, poutre, corde, seau
  GEN.puits = (p) => {
    const x = p.x ?? 540, y = p.y ?? 1500, k = kSol(p, y), R = (p.r ?? 95) * k, H = R * .95, c = p.couleur || '#b8a58a', t = tons(c), ry = R * .28, r = B.alea(p.seed || 3), id = `pu${Math.round(x)}${Math.round(y)}`;
    const mur = `M${f(x - R)},${f(y - H)}L${f(x - R)},${f(y)}A${f(R)},${f(ry)} 0 0 0 ${f(x + R)},${f(y)}L${f(x + R)},${f(y - H)}Z`;
    let s = ombrePied(x, y + ry, R * 1.3) + `<defs><clipPath id="${id}"><path d="${mur}"/></clipPath></defs><g clip-path="url(#${id})">${appareil(x - R, y - H, R * 2, H + ry * 1.2, c, r, R * .26)}<rect x="${f(x + R * .3)}" y="${f(y - H)}" width="${f(R)}" height="${f(H * 2)}" fill="${OMBRE}" opacity=".24"/><rect x="${f(x - R)}" y="${f(y - H)}" width="${f(R * .25)}" height="${f(H * 2)}" fill="#fff" opacity=".1"/></g>`;
    s += `<ellipse cx="${f(x)}" cy="${f(y - H)}" rx="${f(R * 1.06)}" ry="${f(ry * 1.06)}" fill="${t.ombre}"/><ellipse cx="${f(x)}" cy="${f(y - H - R * .05)}" rx="${f(R * 1.06)}" ry="${f(ry * 1.06)}" fill="${t.clair}"/><ellipse cx="${f(x)}" cy="${f(y - H - R * .05)}" rx="${f(R * .76)}" ry="${f(ry * .72)}" fill="#1c1410"/><path d="M${f(x - R * .76)},${f(y - H - R * .05)}A${f(R * .76)},${f(ry * .72)} 0 0 1 ${f(x + R * .76)},${f(y - H - R * .05)}A${f(R * .72)},${f(ry * .5)} 0 0 0 ${f(x - R * .76)},${f(y - H - R * .05)}Z" fill="${t.ombre}"/>`;
    if (p.seau !== false) {
      const hp = H * 1.9, cb = '#7a5533';
      for (const sd of [-1, 1]) s += poutre(x + sd * R * .95, y - H * .95, x + sd * R * .95, y - H - hp, R * .13, cb, { seed: 3 + sd });
      s += poutre(x - R * 1.12, y - H - hp, x + R * 1.12, y - H - hp, R * .15, B.clair(cb, .06), { vertical: false, seed: 9 }) + `<path d="M${f(x)},${f(y - H - hp)}v${f(hp * .55)}" stroke="#d9c7a0" stroke-width="${f(R * .035)}"/>` + P_(dq([[x - R * .17, y - H - hp * .45], [x + R * .17, y - H - hp * .45], [x + R * .13, y - H - hp * .45 + R * .3], [x - R * .13, y - H - hp * .45 + R * .3]]), '#8a6a48') + `<ellipse cx="${f(x)}" cy="${f(y - H - hp * .45)}" rx="${f(R * .17)}" ry="${f(R * .05)}" fill="#4a3626"/><path d="M${f(x - R * .16)},${f(y - H - hp * .45 + R * .12)}h${f(R * .32)}" stroke="#4a3a2a" stroke-width="${f(R * .02)}"/>`;
    }
    return s;
  };

  // {gen:"tombeau", x, y (pied de la paroi), l, h (à y_ref), ouvert: 0 (fermé) → 1 (pierre roulée), lumiere: 0–1 (la
  //  lumière qui sort du tombeau vide), couleur} — tombeau taillé dans le roc, fermé par une pierre ronde (Jean 11, 20)
  GEN.tombeau = (p) => {
    const x = p.x ?? 540, y = p.y ?? 1500, k = kSol(p, y), L = (p.l ?? 620) * k, H = (p.h ?? 420) * k, c = p.couleur || '#b9a888', t = tons(c), r = B.alea(p.seed || 7), id = `tb${Math.round(x)}_${Math.round(y)}`;
    const pts = [[x - L * .52, y]]; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([x - L / 2 + u * L, y - H * (Math.pow(Math.sin(u * Math.PI), .45) * .88 + .08) - H * .07 * r()]); } pts.push([x + L * .52, y]);
    const roc = dq(pts), hautR = pts.slice(1, -1);
    let s = ombrePied(x, y, L * .56) + P_(roc, c) + `<defs><clipPath id="${id}r"><path d="${roc}"/></clipPath><linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="0"><stop offset=".1" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="${OMBRE}" stop-opacity="0"/><stop offset="1" stop-color="${OMBRE}" stop-opacity=".42"/></linearGradient></defs><g clip-path="url(#${id}r)">`;
    // des facettes de roche, des strates, des fissures
    for (let i = 1; i < hautR.length - 1; i += 1) { const a = hautR[i], b = hautR[i + 1], m = [(a[0] + b[0]) / 2 + (r() - .5) * L * .06, a[1] + H * (.14 + r() * .26)]; s += P_(dq([a, b, m]), i < hautR.length * .5 ? B.clair(c, .06 + r() * .08) : sombre(c, .08 + r() * .12), ' opacity=".4"'); }
    for (let j = 0; j < 5; j++) { const yy = y - H * (.12 + j * .16); let d = `M${f(x - L * .55)},${f(yy)}`; for (let i = 1; i <= 9; i++) d += `Q${f(x - L * .55 + L * 1.1 * (i - .5) / 9)},${f(yy + (r() - .5) * H * .05)} ${f(x - L * .55 + L * 1.1 * i / 9)},${f(yy + (r() - .5) * H * .03)}`; s += `<path d="${d}" stroke="${sombre(c, .3)}" stroke-width="${f(H * .006)}" fill="none" opacity=".35"/><path d="${d}" transform="translate(0,${f(H * .01)})" stroke="${B.clair(c, .22)}" stroke-width="${f(H * .005)}" fill="none" opacity=".35"/>`; }
    for (let i = 0; i < 6; i++) { let fx = x + (r() - .5) * L * .9, fy = y - H * (.4 + r() * .45), d = `M${f(fx)},${f(fy)}`; for (let j = 0; j < 4; j++) { fx += (r() - .5) * H * .08; fy += H * (.03 + r() * .05); d += `L${f(fx)},${f(fy)}`; } s += `<path d="${d}" stroke="${sombre(c, .5)}" stroke-width="${f(H * .007)}" fill="none" stroke-linejoin="round" opacity=".5"/>`; }
    s += `<rect x="${f(x - L)}" y="${f(y - H * 1.2)}" width="${f(L * 2)}" height="${f(H * 1.3)}" fill="url(#${id}o)"/></g>`;
    // l'entrée, basse (il faut se baisser), cintrée, taillée : un encadrement en retrait
    const pw = H * .36, ph = H * .5, px = x - L * .08, arc = (e) => `M${f(px - pw / 2 - e)},${f(y)}V${f(y - ph * .68)}A${f(pw / 2 + e)},${f(ph * .32 + e)} 0 0 1 ${f(px + pw / 2 + e)},${f(y - ph * .68)}V${f(y)}Z`;
    s += P_(arc(H * .045), t.ombre) + P_(arc(H * .03), B.clair(c, .1)) + P_(arc(0), '#130d0a') + `<defs><clipPath id="${id}p"><path d="${arc(0)}"/></clipPath></defs><g clip-path="url(#${id}p)">` + P_(dq([[px - pw / 2, y], [px - pw / 2, y - ph * 1.1], [px - pw * .3, y - ph * .9], [px - pw * .3, y]]), '#2a2018') + P_(dq([[px - pw / 2, y], [px + pw / 2, y], [px + pw * .3, y - ph * .06], [px - pw * .3, y - ph * .06]]), '#382b20') + '</g>';
    const lum = p.lumiere ?? 0;
    if (lum) s += `<defs><radialGradient id="${id}l" cx="${f(px)}" cy="${f(y - ph * .35)}" r="${f(pw * .85)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe8" stop-opacity="${f(lum)}"/><stop offset=".45" stop-color="#ffe09a" stop-opacity="${f(.85 * lum)}"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="${f(.2 * lum)}"/></radialGradient></defs>` + P_(arc(0), `url(#${id}l)`) + `<ellipse cx="${f(px)}" cy="${f(y - ph * .35)}" rx="${f(pw * 1.7)}" ry="${f(ph * .95)}" fill="#ffd98a" opacity="${f(.28 * lum)}" style="mix-blend-mode:screen" filter="url(#flou18)"/>` + P_(dq([[px - pw * .45, y], [px + pw * .45, y], [px + pw * 1.0, y + H * .12], [px - pw * 1.0, y + H * .12]]), '#ffe3a0', ` opacity="${f(.3 * lum)}" filter="url(#flou6)" style="mix-blend-mode:screen"`);
    // la pierre ronde, taillée, qui roule dans sa rainure
    const ouv = B.clamp(p.ouvert ?? 0), rp = ph * .62, cx = px + ouv * pw * 1.5, cy = y - rp * .96, cp = B.mix(c, '#8f8068', .45), rot = ouv * 140;
    s += `<path d="M${f(px - pw * .75)},${f(y + H * .004)}L${f(Math.max(cx + rp * .55, px + pw * .75))},${f(y + H * .004)}" stroke="${t.fonce}" stroke-width="${f(H * .016)}" stroke-linecap="round" opacity=".4"/>`;
    s += `<ellipse cx="${f(cx)}" cy="${f(y + H * .01)}" rx="${f(rp * .9)}" ry="${f(rp * .09)}" fill="#120c1c" opacity=".35" filter="url(#flou4)"/><circle cx="${f(cx + rp * .1)}" cy="${f(cy)}" r="${f(rp)}" fill="${sombre(cp, .4)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp)}" fill="${cp}"/><defs><clipPath id="${id}s"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp)}"/></clipPath></defs><g clip-path="url(#${id}s)"><circle cx="${f(cx - rp * .12)}" cy="${f(cy - rp * .16)}" r="${f(rp * .98)}" fill="${B.clair(cp, .1)}"/><g transform="rotate(${f(rot)},${f(cx)},${f(cy)})"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp * .8)}" fill="none" stroke="${sombre(cp, .3)}" stroke-width="${f(rp * .035)}" opacity=".6"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp * .16)}" fill="none" stroke="${sombre(cp, .3)}" stroke-width="${f(rp * .03)}" opacity=".5"/>${[[-.4, -.5, .3, -.1], [.2, .3, .5, .55], [-.6, .2, -.35, .5]].map(([a, b, d, e]) => `<path d="M${f(cx + a * rp)},${f(cy + b * rp)}L${f(cx + (a + d) / 2 * rp)},${f(cy + (b + e) / 2 * rp + rp * .05)}L${f(cx + d * rp)},${f(cy + e * rp)}" stroke="${sombre(cp, .4)}" stroke-width="${f(rp * .02)}" fill="none" opacity=".5"/>`).join('')}</g></g>`;
    // des cailloux et de l'herbe au pied
    for (let i = 0; i < 5; i++) s += MONDE.rocher(x + (r() - .5) * L * 1.1, y + H * .03 + r() * H * .03, H * (.02 + r() * .035), H * (.02 + r() * .02), c, r);
    return s;
  };

  // {gen:"croix", x, y (pied), h (à y_ref), n: 1 | 3, ecart, couleur, silhouette: true (contre-jour)} — la croix AVEC
  // RETENUE : du bois nu, jamais de corps ni de détail de souffrance (charte) ; de loin, souvent en contre-jour
  GEN.croix = (p) => {
    const y = p.y ?? 1300, k = kSol(p, y), Hc = (p.h ?? 560) * k, n = p.n === 3 ? 3 : 1, e = (p.ecart ?? 300) * k, plat = !!p.silhouette, c = p.couleur || (plat ? '#2a2030' : '#7a5533');
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = (p.x ?? 540) + (n === 3 ? (i - 1) * e : 0), h = Hc * (n === 3 && i !== 1 ? .86 : 1), w = h * .07, yt = y - h * .76, r = B.alea(i + 3);
      s += (plat ? '' : ombrePied(x, y, w * 2.4)) + poutre(x, y + w * .1, x, y - h, w, c, { plat, seed: 4 + i });
      if (!plat) s += P_(dq([[x - w * .5, y - h], [x + w * .5, y - h], [x + w * .34, y - h - w * .14], [x - w * .34, y - h - w * .14]]), B.clair(c, .2));
      s += poutre(x - h * .27, yt, x + h * .27, yt, w * .92, plat ? c : B.clair(c, .03), { plat, vertical: false, seed: 11 + i });
      if (!plat) { s += P_(dq([[x + h * .27, yt - w * .46], [x + h * .27 + w * .12, yt - w * .34], [x + h * .27 + w * .12, yt + w * .34], [x + h * .27, yt + w * .46]]), sombre(c, .45)); for (const d of [-1, 1]) s += `<path d="M${f(x - d * w * .62)},${f(yt - w * .6)}L${f(x + d * w * .62)},${f(yt + w * .6)}" stroke="#d3bf95" stroke-width="${f(w * .15)}" stroke-linecap="round"/><path d="M${f(x - d * w * .52)},${f(yt - w * .64)}L${f(x + d * w * .72)},${f(yt + w * .56)}" stroke="#a8946a" stroke-width="${f(w * .05)}" stroke-linecap="round"/>`; }
      // la terre et les pierres qui calent le pied
      if (!plat) for (let j = 0; j < 4; j++) s += MONDE.rocher(x + (j - 1.5) * w * .75, y + w * .12, w * (.32 + r() * .2), w * (.28 + r() * .2), '#8f8270', r);

    }
    return s;
  };

  // {gen:"temple", x, y (pied du parvis), l, h (à y_ref), couleur, or} — le Temple de Jérusalem (stylisé) : le sanctuaire
  // haut et blanc, sa façade dorée, les portiques à colonnes de part et d'autre, les marches
  GEN.temple = (p) => {
    const x = p.x ?? 540, y = p.y ?? 1300, k = kSol(p, y), L = (p.l ?? 900) * k, H = (p.h ?? 640) * k, t = tons(p.couleur || '#efe6d4'), or = p.or || '#e2b45a', r = B.alea(6), R_ = (a, b, w, h, c, e = '') => `<rect x="${f(a)}" y="${f(b)}" width="${f(w)}" height="${f(h)}" fill="${c}"${e}/>`;
    let s = ombrePied(x, y, L * .55);
    for (let i = 0; i < 5; i++) s += R_(x - L * (.5 - i * .018), y - H * .017 * (i + 1), L * (1 - i * .036), H * .017, i % 2 ? t.c : sombre(t.c, .12)) + R_(x - L * (.5 - i * .018), y - H * .017 * (i + 1), L * (1 - i * .036), H * .004, B.clair(t.c, .3));
    const yb = y - H * .085, colonne = (cx, w, h) => R_(cx - w / 2, yb - h, w, h, t.c) + R_(cx + w * .14, yb - h, w * .36, h, t.ombre, ' opacity=".6"') + R_(cx - w * .38, yb - h, w * .14, h, B.clair(t.c, .35), ' opacity=".7"') + R_(cx - w * .72, yb - h - w * .5, w * 1.44, w * .55, t.clair) + R_(cx - w * .72, yb - w * .4, w * 1.44, w * .4, sombre(t.c, .1));
    for (const sd of [-1, 1]) { const x0 = sd < 0 ? x - L * .5 : x + L * .2, w = L * .3, h = H * .34; s += R_(x0, yb - h, w, h, t.fonce) + Array.from({ length: 6 }, (_, i) => colonne(x0 + w * (i + .5) / 6, w * .075, h)).join('') + R_(x0 - L * .01, yb - h - H * .05, w + L * .02, H * .05, t.c) + R_(x0 - L * .01, yb - h - H * .05, w + L * .02, H * .014, t.clair) + R_(x0 - L * .01, yb - h - H * .004, w + L * .02, H * .008, t.ombre); }
    const w = L * .4, x0 = x - w / 2, id = `te${Math.round(x)}${Math.round(y)}`;
    s += `<defs><clipPath id="${id}"><rect x="${f(x0)}" y="${f(yb - H)}" width="${f(w)}" height="${f(H)}"/></clipPath></defs><g clip-path="url(#${id})">${appareil(x0, yb - H, w, H, t.c, r, H * .05)}${R_(x0, yb - H, w, H, t.c, ' opacity=".62"')}${R_(x0 + w * .72, yb - H, w * .28, H, OMBRE, ' opacity=".2"')}</g>`;
    for (const q of [.06, .2, .8, .94]) s += R_(x0 + w * q - w * .022, yb - H * .96, w * .044, H * .96, t.clair) + R_(x0 + w * q + w * .006, yb - H * .96, w * .016, H * .96, t.ombre, ' opacity=".5"') + R_(x0 + w * q - w * .034, yb - H * .99, w * .068, H * .03, or);
    s += R_(x0 - w * .03, yb - H * 1.05, w * 1.06, H * .06, or) + R_(x0 - w * .03, yb - H * 1.05, w * 1.06, H * .014, B.clair(or, .4)) + R_(x0 - w * .03, yb - H * 1.0, w * 1.06, H * .012, sombre(or, .3));
    for (let i = 0; i < 11; i++) s += P_(dq([[x0 + w * (i + .35) / 11, yb - H * 1.05], [x0 + w * (i + .5) / 11, yb - H * 1.1], [x0 + w * (i + .65) / 11, yb - H * 1.05]]), or);
    s += R_(x - w * .22, yb - H * .64, w * .44, H * .64, or) + R_(x - w * .22, yb - H * .64, w * .44, H * .02, B.clair(or, .4)) + R_(x - w * .17, yb - H * .58, w * .34, H * .58, sombre(or, .28)) + R_(x - w * .13, yb - H * .53, w * .26, H * .53, '#2e2116') + R_(x - w * .13, yb - H * .53, w * .128, H * .53, '#4a3522', ' opacity=".7"');
    return s;
  };

  // ------------------------------------------------------------------ clôture, auge, feu
  // {gen:"cloture", de:[x,y], a:[x,y], hauteur, couleur, poteaux: n}
  GEN.cloture = (p) => {
    const [x0, y0] = p.de || [-100, 1300], [x1, y1] = p.a || [1200, 1360], h = p.hauteur ?? 110, c = p.couleur || '#8a6a4a', n = p.poteaux || 8, r = B.alea(p.seed || 81), hor = p.horizon, kh = (yy) => hor !== undefined ? (yy - hor) / Math.max(1, (p.y_ref ?? 1500) - hor) : 1, pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n, x = B.lerp(x0, x1, k), y = B.lerp(y0, y1, k); pts.push([x, y, h * kh(y), (r() - .5) * 5]); }
    let s = '';
    for (const fr of [.36, .74]) for (let i = 0; i < n; i++) { const a = pts[i], b = pts[i + 1], w = a[2] * .085, d = (r() - .5) * a[2] * .05; s += poutre(a[0] - w, a[1] - a[2] * fr + d, b[0] + w, b[1] - b[2] * fr - d, w, sombre(c, .06), { vertical: false, seed: i + 2 }); }
    for (const [x, y, hh, a] of pts) { const w = hh * .13; s += `<ellipse cx="${f(x + w * .6)}" cy="${f(y)}" rx="${f(w * 1.5)}" ry="${f(w * .22)}" fill="#120c1c" opacity=".26"/><g transform="rotate(${f(a)},${f(x)},${f(y)})">${poutre(x, y + w * .1, x, y - hh, w, c, { seed: Math.round(x) % 50 + 2 })}${P_(dq([[x - w / 2, y - hh + .5], [x, y - hh - w * .7], [x + w / 2, y - hh + .5]]), B.clair(c, .1))}</g>`; }
    return s;
  };
  // {gen:"auge", x, y, l, couleur, contenu:"#…"}  (une auge taillée dans la pierre ou le bois)
  GEN.auge = (p) => {
    const x = p.x ?? 500, y = p.y ?? 1500, l = (p.l ?? 220) * kSol(p, y), h = l * .3, c = p.couleur || '#94897a', ry = h * .3, id = `au${Math.round(x)}${Math.round(y)}`, r = B.alea(p.seed || 8);
    const corps = `M${f(x)},${f(y - h)}Q${f(x + l * .02)},${f(y - h * .2)} ${f(x + l * .1)},${f(y - h * .04)}Q${f(x + l / 2)},${f(y + h * .12)} ${f(x + l * .9)},${f(y - h * .04)}Q${f(x + l * .98)},${f(y - h * .2)} ${f(x + l)},${f(y - h)}Z`;
    let s = `<ellipse cx="${f(x + l / 2)}" cy="${f(y + 3)}" rx="${f(l * .56)}" ry="${f(l * .06)}" fill="#120c1c" opacity=".34" filter="url(#flou6)"/>` + P_(corps, c) + `<defs><clipPath id="${id}"><path d="${corps}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="${OMBRE}" stop-opacity=".45"/></linearGradient></defs><g clip-path="url(#${id})"><rect x="${f(x)}" y="${f(y - h * 1.1)}" width="${f(l)}" height="${f(h * 1.4)}" fill="url(#${id}g)"/>`;
    for (let i = 0; i < 22; i++) s += `<path d="M${f(x + r() * l)},${f(y - r() * h * .8)}l${f(l * .03)},${f(-h * .02 + r() * h * .04)}" stroke="${r() < .5 ? sombre(c, .35) : B.clair(c, .25)}" stroke-width="${f(h * .03)}" stroke-linecap="round" opacity=".45"/>`;
    s += `</g><ellipse cx="${f(x + l / 2)}" cy="${f(y - h)}" rx="${f(l / 2)}" ry="${f(ry)}" fill="${B.clair(c, .14)}"/><ellipse cx="${f(x + l / 2)}" cy="${f(y - h + ry * .08)}" rx="${f(l * .435)}" ry="${f(ry * .76)}" fill="${sombre(c, .52)}"/><ellipse cx="${f(x + l / 2)}" cy="${f(y - h + ry * .26)}" rx="${f(l * .41)}" ry="${f(ry * .58)}" fill="${p.contenu || '#6b4a2a'}"/>`;
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * .85; s += `<ellipse cx="${f(x + l / 2 + Math.cos(a) * l * .38 * d)}" cy="${f(y - h + ry * .26 + Math.sin(a) * ry * .5 * d)}" rx="${f(l * .03)}" ry="${f(ry * .1)}" fill="${B.clair(p.contenu || '#6b4a2a', .12 + r() * .15)}" opacity=".8"/>`; }
    return s;
  };
  const FLAMME_BRAISE = .38;           // un feu de braises : des flammes basses
  // {gen:"feu", x, y, taille, braise: true, poissons: n, pains: n}  (feu de camp animé : flammes qui dansent ; un feu de
  //  BRAISES — charbons qui rougeoient, petites flammes — et le repas posé dessus : « des charbons allumés, du poisson
  //  dessus, et du pain », Jean 21:9)
  GEN.feu = (p, id, t) => {
    const x = p.x ?? 540, y = p.y ?? 1500, T = (p.taille ?? 80) * kSol(p, y), braise = !!p.braise, kf = braise ? FLAMME_BRAISE : 1, r = B.alea(p.seed || 5);
    let s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(T * 1.5)}" ry="${f(T * .3)}" fill="#ff9a4a" opacity="${f(.2 + .04 * Math.sin(t * 9))}" style="mix-blend-mode:screen" filter="url(#flou18)"/><circle cx="${x}" cy="${f(y - T * .4 * kf)}" r="${f(T * (braise ? 2.2 : 3))}" fill="${braise ? '#ff8a4a' : '#ffb347'}" opacity="${f(.12 + .03 * Math.sin(t * 11))}" style="mix-blend-mode:screen" filter="url(#flou30)"/>`;
    // le cercle de pierres (derrière), les bûches ou les charbons
    const pierre = (a) => { const cx = x + Math.cos(a) * T * .92, cy = y + Math.sin(a) * T * .2, w = T * (.15 + .03 * Math.sin(a * 7)); return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(w * .62)}" fill="#4a423e"/><ellipse cx="${f(cx - Math.cos(a) * w * .25)}" cy="${f(cy - w * .18)}" rx="${f(w * .72)}" ry="${f(w * .4)}" fill="${B.mix('#75695f', '#ff9a5a', .32)}"/>`; };
    for (let i = 0; i < 6; i++) s += pierre(Math.PI + i * Math.PI / 5);
    if (braise) {
      s += `<ellipse cx="${f(x)}" cy="${f(y - T * .04)}" rx="${f(T * .78)}" ry="${f(T * .17)}" fill="#2a1a14"/>`;
      for (let i = 0; i < 20; i++) { const a = r() * 6.28, d = Math.sqrt(r()), cx = x + Math.cos(a) * T * .66 * d, cy = y - T * .05 + Math.sin(a) * T * .12 * d, vif = .5 + .5 * Math.sin(t * (1.4 + r() * 2) + i * 1.7), w = T * (.07 + r() * .06); s += P_(arrondi([[cx - w, cy], [cx - w * .4, cy - w * .6], [cx + w * .7, cy - w * .5], [cx + w, cy + w * .1], [cx, cy + w * .5]], w * .2), B.mix('#3a2018', '#ff5a2a', .3 + .5 * vif)) + `<ellipse cx="${f(cx)}" cy="${f(cy - w * .1)}" rx="${f(w * .45)}" ry="${f(w * .2)}" fill="#ffc46b" opacity="${f(.25 + .5 * vif)}"/>`; }
    } else for (let i = 0; i < 5; i++) { const a = B.rad(-34 + i * 17), dx = Math.sin(a) * T * .72, c = i % 2 ? '#5f4028' : '#6e4a2e'; s += bois([[x - dx, y + T * (.06 - Math.abs(i - 2) * .02)], [x, y - T * .12], [x + dx * .5, y - T * .42]], T * .17, T * .12, c) + `<ellipse cx="${f(x - dx)}" cy="${f(y + T * (.06 - Math.abs(i - 2) * .02))}" rx="${f(T * .085)}" ry="${f(T * .07)}" fill="#b98a5a"/><ellipse cx="${f(x - dx)}" cy="${f(y + T * (.06 - Math.abs(i - 2) * .02))}" rx="${f(T * .045)}" ry="${f(T * .035)}" fill="none" stroke="#7a5533" stroke-width="${f(T * .012)}"/>`; }
    // les flammes : trois couches, chacune une langue qui ondule
    const langue = (cx, w, h, ph, c, o) => { const a = Math.sin(ph) * w * .35, b = Math.sin(ph * 1.3 + 1) * w * .45, yb = y - T * .05; return P_(`M${f(cx - w)},${f(yb)}C${f(cx - w * 1.15)},${f(yb - h * .38)} ${f(cx - w * .25 + a)},${f(yb - h * .5)} ${f(cx + b)},${f(yb - h)}C${f(cx + w * .25 + b * .4)},${f(yb - h * .62)} ${f(cx + w * 1.2 + a * .4)},${f(yb - h * .42)} ${f(cx + w)},${f(yb)}Q${f(cx)},${f(yb + T * .07)} ${f(cx - w)},${f(yb)}Z`, c, ` opacity="${o}"`); };
    for (const [c, kw, kh, o, n] of [['#f2622a', 1, 1, .9, 5], ['#ff9a36', .72, .78, .95, 4], ['#ffc957', .46, .56, .95, 3], ['#fff0b8', .24, .34, .95, 2]]) for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : (i / (n - 1) - .5) * 2, ph = t * (5 + i * .7) + i * 2.1 + kw * 4, hh = kf * T * 1.25 * kh * (.86 + .2 * Math.sin(ph)) * (1 - Math.abs(u) * .42); s += langue(x + u * T * .42 * kw + Math.sin(ph * .6) * T * .03, T * .27 * (kw * .6 + .4) * (1 - Math.abs(u) * .2), hh, ph, c, o); }
    if (!braise) for (let i = 0; i < 9; i++) { const u = ((t * (.5 + r() * .4) + r()) % 1); s += `<circle cx="${f(x + (r() - .5) * T * .8 + Math.sin(t * 3 + i) * T * .1)}" cy="${f(y - T * (.5 + u * 1.9))}" r="${f(T * .022 * (1 - u * .6))}" fill="#ffc46b" opacity="${f((1 - u) * .9)}"/>`; }
    for (let i = 0; i < 6; i++) s += pierre(i * Math.PI / 5);
    for (let i = 0; i < (p.poissons || 0); i++) {        // les poissons sur les braises
      const fx = x + (i - ((p.poissons || 1) - 1) / 2) * T * .5, fy = y - T * .2, a = (i % 2 ? 6 : -5), q = (u, v) => `${f(fx + u * T)},${f(fy + v * T)}`;
      s += `<g transform="rotate(${a},${f(fx)},${f(fy)})">${P_(`M${q(.24, 0)}C${q(.14, -.1)} ${q(-.06, -.09)} ${q(-.17, -.01)}L${q(-.28, -.08)}Q${q(-.24, 0)} ${q(-.28, .08)}L${q(-.17, .01)}C${q(-.06, .1)} ${q(.14, .09)} ${q(.24, 0)}Z`, '#9aa5aa')}${P_(`M${q(.24, 0)}C${q(.14, -.1)} ${q(-.06, -.09)} ${q(-.17, -.01)}Q${q(.04, -.02)} ${q(.24, 0)}Z`, '#c3ccd0')}<circle cx="${f(fx + T * .16)}" cy="${f(fy - T * .018)}" r="${f(T * .014)}" fill="#1a1210"/><path d="M${q(.1, -.05)}Q${q(.07, 0)} ${q(.1, .05)}M${q(.0, -.06)}l${f(T * .03)},${f(T * .11)}M${q(-.07, -.05)}l${f(T * .03)},${f(T * .09)}" stroke="#4a3a30" stroke-width="${f(T * .016)}" fill="none" opacity=".6"/></g>`;
    }
    for (let i = 0; i < (p.pains || 0); i++) {           // les pains, posés à côté, dans un linge
      const px = x + T * (1.36 + i * .34), py = y - T * .02;
      s += `<ellipse cx="${f(px)}" cy="${f(py + T * .06)}" rx="${f(T * .2)}" ry="${f(T * .05)}" fill="#120c1c" opacity=".28"/><path d="M${f(px - T * .18)},${f(py + T * .03)}C${f(px - T * .18)},${f(py - T * .14)} ${f(px + T * .18)},${f(py - T * .14)} ${f(px + T * .18)},${f(py + T * .03)}Q${f(px)},${f(py + T * .1)} ${f(px - T * .18)},${f(py + T * .03)}Z" fill="#c48a48"/><path d="M${f(px - T * .13)},${f(py - T * .02)}Q${f(px - T * .02)},${f(py - T * .12)} ${f(px + T * .1)},${f(py - T * .06)}" stroke="#ecc98e" stroke-width="${f(T * .03)}" fill="none" stroke-linecap="round"/><path d="M${f(px - T * .06)},${f(py - T * .07)}l${f(T * .04)},${f(T * .08)}M${f(px + T * .04)},${f(py - T * .08)}l${f(T * .04)},${f(T * .08)}" stroke="#8a5a2a" stroke-width="${f(T * .018)}" stroke-linecap="round"/>`;
    }
    return s;
  };
  MONDE.poutre = poutre; MONDE.appareil = appareil;
})(typeof window !== 'undefined' ? window : globalThis);
