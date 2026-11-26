// Sols : chaque matière est posée sur un vrai plan au sol (repère X, Z en px à y_ref), vue par la même caméra que les
// personnages : lames de parquet, carreaux, dalles et pavés rétrécissent juste ; l'herbe, les cailloux, les rides du sable
// sont semés dans l'espace (plus petits et plus serrés au loin). Sert aux pièces (interieur.js) et aux lieux ouverts (nature.js).
(function (G) {
  const B = G.B, f = B.f, MONDE = G.MONDE;
  const FOCALE = 1100;                      // px à y_ref : la distance de la caméra au plan des personnages
  const Z_PRES = -860, K_LOIN = .16;        // jusqu'où on dessine : sous la caméra, et jusqu'à ce que tout se confonde
  const dq = (q) => 'M' + q.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';

  function plan(p) {
    const h = p.horizon ?? 700, vx = p.fuite ?? 540, yr = p.y_ref ?? 1060, H = Math.max(60, yr - h);
    const k = (Z) => FOCALE / (FOCALE + Z);
    return { h, vx, yr, H, k, pt: (X, Z) => [vx + (X - vx) * k(Z), h + H * k(Z)], zDe: (y) => FOCALE / Math.max(K_LOIN, (y - h) / H) - FOCALE };
  }
  // des tracés regroupés par couleur (un sol de 600 lames = quelques éléments, pas 600)
  function groupes() {
    const par = new Map();
    return {
      ajoute: (coul, d) => par.set(coul, (par.get(coul) || '') + d),
      svg: (extra = '') => [...par].map(([c, d]) => `<path d="${d}" fill="${c}"${extra}/>`).join(''),
    };
  }
  const gamme = (c, n, ecart) => Array.from({ length: n }, (_, i) => { const k = (i / (n - 1) - .5) * 2 * ecart; return k < 0 ? B.teinte(c, '#2b2140', -k) : B.clair(c, k); });

  const MATIERES = {
    parquet(P, o, r, c) {
      const L = 38, lg = 330, tons = gamme(c, 6, .13), g = groupes();
      const i0 = Math.floor((o.X0) / L), i1 = Math.ceil(o.X1 / L);
      let joints = '', veines = '';
      for (let i = i0; i < i1; i++) {
        const dec = (i * 137 % 330 + r() * 60);
        for (let z = Z_PRES - dec; z < o.Z; z += lg) {
          const a = Math.max(Z_PRES, z), b = Math.min(o.Z, z + lg);
          if (b <= a) continue;
          g.ajoute(tons[Math.floor(r() * tons.length)], dq([P.pt(i * L, b), P.pt((i + 1) * L, b), P.pt((i + 1) * L, a), P.pt(i * L, a)]));
          const j = P.pt(i * L, b), j2 = P.pt((i + 1) * L, b);
          if (b < o.Z) joints += `M${f(j[0])},${f(j[1])}L${f(j2[0])},${f(j2[1])}`;
          if (r() < .45) { const x = (i + .2 + r() * .6) * L, v0 = P.pt(x, b - 20), v1 = P.pt(x + (r() - .5) * 8, a + lg * .3); veines += `M${f(v0[0])},${f(v0[1])}L${f(v1[0])},${f(v1[1])}`; }
        }
        const a = P.pt(i * L, o.Z), b = P.pt(i * L, Z_PRES);
        joints += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
      }
      const cj = B.teinte(c, '#1d1626', .42);
      return g.svg() + `<path d="${veines}" stroke="${cj}" stroke-width="1.2" fill="none" opacity=".16"/><path d="${joints}" stroke="${cj}" stroke-width="1.6" fill="none" opacity=".5"/>`;
    },
    carrelage(P, o, r, c) {
      const L = 96, tons = [B.clair(c, .05), B.teinte(c, '#2b2140', .06), B.clair(c, .1)], g = groupes();
      let joints = '', reflets = '';
      for (let i = Math.floor(o.X0 / L); i < o.X1 / L; i++) for (let z = Z_PRES; z < o.Z; z += L) {
        const b = Math.min(o.Z, z + L), q = [P.pt(i * L, b), P.pt((i + 1) * L, b), P.pt((i + 1) * L, z), P.pt(i * L, z)];
        g.ajoute((i + Math.round(z / L)) % 2 ? tons[0] : r() < .8 ? tons[1] : tons[2], dq(q));
        if (r() < .1) reflets += dq([P.pt((i + .12) * L, b - 8), P.pt((i + .5) * L, b - 8), P.pt((i + .3) * L, z + 10), P.pt((i + .12) * L, z + 10)]);
      }
      for (let i = Math.floor(o.X0 / L); i <= o.X1 / L; i++) { const a = P.pt(i * L, o.Z), b = P.pt(i * L, Z_PRES); joints += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`; }
      for (let z = Z_PRES; z < o.Z; z += L) { const a = P.pt(o.X0, z), b = P.pt(o.X1, z); joints += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`; }
      return g.svg() + `<path d="${reflets}" fill="#ffffff" opacity=".12"/><path d="${joints}" stroke="${B.teinte(c, '#2b2140', .3)}" stroke-width="2" fill="none" opacity=".55"/>`;
    },
    dalles: (P, o, r, c) => pierres(P, o, r, c, 168, 120, 7),
    pave: (P, o, r, c) => pierres(P, o, r, c, 62, 44, 4),
    route(P, o, r, c) {
      const g = groupes(); let s = '';
      for (let i = 0; i < 260; i++) { const z = Z_PRES + r() * (o.Z - Z_PRES), X = o.X0 + r() * (o.X1 - o.X0), k = P.k(z), q = P.pt(X, z); g.ajoute(r() < .5 ? B.clair(c, .08) : B.sombre(c, .1), `M${f(q[0] - 3 * k)},${f(q[1])}a${f(3 * k)},${f(1.2 * k)} 0 1 0 ${f(6 * k)},0a${f(3 * k)},${f(1.2 * k)} 0 1 0 ${f(-6 * k)},0Z`); }
      for (let z = Z_PRES; z < o.Z; z += 260) s += dq([P.pt(P.vx - 9, z + 130), P.pt(P.vx + 9, z + 130), P.pt(P.vx + 9, z), P.pt(P.vx - 9, z)]);
      return g.svg(' opacity=".7"') + `<path d="${s}" fill="#efe9d8" opacity=".85"/>`;
    },
    // un sol lisse (bus, hôpital, gymnase) : un revêtement d'un seul ton, ses lés et un reflet
    lisse(P, o, r, c) {
      let j = '', d = '';
      for (let i = Math.floor(o.X0 / 300); i <= o.X1 / 300; i++) { const a = P.pt(i * 300, o.Z), b = P.pt(i * 300, Z_PRES); j += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`; }
      for (const [z, X] of semer(P, o, r, 240)) { const k = P.k(z), q = P.pt(X, z); d += `M${f(q[0] - 2 * k)},${f(q[1])}h${f(4 * k)}`; }
      return `<path d="${d}" stroke="${B.clair(c, .16)}" stroke-width="1.6" opacity=".4"/><path d="${j}" stroke="${B.teinte(c, '#2b2140', .22)}" stroke-width="2" opacity=".5"/>` + nappes(P, o, r, c, 8, .06);
    },
    herbe: (P, o, r, c) => nappes(P, o, r, c, 46, .14) + touffes(P, o, r, c, 900, 17, [B.teinte(c, '#203018', .34), B.teinte(c, '#203018', .16), B.clair(c, .16)]) + fleurs(P, o, r, 46),
    terre: (P, o, r, c) => nappes(P, o, r, c, 40, .13) + cailloux(P, o, r, c, 110) + touffes(P, o, r, B.mix(c, '#7d8450', .55), 70, 14, [B.mix(c, '#5d6a3a', .6), B.mix(c, '#8a8f58', .6)]),
    chemin: (P, o, r, c) => nappes(P, o, r, c, 40, .12) + cailloux(P, o, r, c, 160),
    sable(P, o, r, c) {          // (les rides du sable suivent le sol)
      let d = '';
      for (const [z, X] of semer(P, o, r, 130)) { const k = P.k(z), w = (60 + r() * 130) * k, q = P.pt(X, z); d += `M${f(q[0])},${f(q[1])}q${f(w * .25)},${f(-5 * k)} ${f(w * .5)},0t${f(w * .5)},0`; }
      return nappes(P, o, r, c, 26, .06) + `<path d="${d}" fill="none" stroke="${B.teinte(c, '#4a3040', .2)}" stroke-width="2" stroke-linecap="round" opacity=".35"/><path d="${d}" transform="translate(0,3)" fill="none" stroke="${B.clair(c, .22)}" stroke-width="1.6" stroke-linecap="round" opacity=".4"/>` + cailloux(P, o, r, c, 40);
    },
  };
  // pierres taillées : rangs décalés, largeurs inégales, coins arrondis, arête claire en haut et joint sombre dessous
  const RANG_MIN = 7;                       // px
  function pierres(P, o, r, c, l0, p0, rayon) {
    const g = groupes(), tons = gamme(c, 7, .13); let clairs = '', s = '';
    // au loin, un rang de pierres fait moins de RANG_MIN px : on ne trace plus que le ton du sol (sinon, un fouillis de traits)
    const loin = Math.min(o.Z, FOCALE / Math.sqrt(RANG_MIN * FOCALE / (P.H * p0)) - FOCALE);
    for (let z = Z_PRES; z < loin;) {
      const p = p0 * (.8 + r() * .4), b = Math.min(loin, z + p);
      for (let X = o.X0 - r() * l0; X < o.X1;) {
        const w = l0 * (.65 + r() * .75), j = rayon * .7, q = [P.pt(X + j, b - j), P.pt(X + w - j, b - j), P.pt(X + w - j, z + j), P.pt(X + j, z + j)];
        const e = rayon * P.k((z + b) / 2) * 1.6;
        g.ajoute(tons[Math.floor(r() * tons.length)], arrondi(q, e));
        clairs += `M${f(q[0][0] + e)},${f(q[0][1] + 1)}L${f(q[1][0] - e)},${f(q[1][1] + 1)}`;
        X += w;
      }
      z = b;
    }
    const a = P.pt(o.X0, loin), b = P.pt(o.X1, loin), c2 = P.pt(o.X1, Z_PRES), d2 = P.pt(o.X0, Z_PRES);
    s += `<path d="${dq([a, b, c2, d2])}" fill="${B.teinte(c, '#1d1626', .36)}"/>` + g.svg() + `<path d="${clairs}" stroke="${B.clair(c, .3)}" stroke-width="1.6" fill="none" opacity=".35"/>`;
    return s;
  }
  function arrondi(pts, r) {
    let d = '';
    pts.forEach((p1, i) => {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p2 = pts[(i + 1) % pts.length], v = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = Math.min(.45, r / l); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
      const a = v(p1, p0), b = v(p1, p2);
      d += `${i ? 'L' : 'M'}${f(a[0])},${f(a[1])}Q${f(p1[0])},${f(p1[1])} ${f(b[0])},${f(b[1])}`;
    });
    return d + 'Z';
  }
  // de grandes nappes plus claires et plus sombres : le terrain n'est jamais un aplat
  function nappes(P, o, r, c, n, force) {
    const g = groupes();
    for (const [z, X] of semer(P, o, r, n)) {
      const k = P.k(z), q = P.pt(X, z), w = (120 + r() * 320) * k, e = (18 + r() * 34) * k * (P.H / 360), pts = [];
      for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2, v = .7 + r() * .55; pts.push([q[0] + Math.cos(a) * w * v, q[1] + Math.sin(a) * e * v]); }
      g.ajoute(r() < .5 ? B.clair(c, force) : B.teinte(c, '#2b2430', force * 1.2), B.lisse(pts, true, .5));
    }
    return g.svg(' opacity=".34" filter="url(#flou4)"');
  }
  // des points semés régulièrement À L'IMAGE (autant devant qu'au loin), en repère du sol
  const K_PRES = 2.3;
  function semer(P, o, r, n, kMin = 0, biais = 1) {
    const l = [], k0 = Math.max(P.k(o.Z), kMin);
    for (let i = 0; i < n; i++) { const k = B.lerp(k0, K_PRES, Math.pow(r(), biais)), X = P.vx + (-900 + r() * 2880 - 540) / k; if (X > o.X0 && X < o.X1) l.push([FOCALE / k - FOCALE, X]); }
    return l;
  }
  // des touffes d'herbe : des brins effilés, en bouquets, dans trois tons
  function touffes(P, o, r, c, n, h0, tons) {
    const g = groupes(), liste = semer(P, o, r, n, .18, 1.5);
    liste.sort((a, b) => b[0] - a[0]);
    for (const [z, X] of liste) {
      const k = P.k(z), q = P.pt(X, z), nb = 3 + Math.floor(r() * 4);
      for (let j = 0; j < nb; j++) { const x = q[0] + (j - nb / 2) * 4.5 * k, hh = h0 * k * (.6 + r() * .8), p = (r() - .5) * hh * .8, e = 1.7 * k; g.ajoute(tons[Math.floor(r() * tons.length)], `M${f(x - e)},${f(q[1])}Q${f(x + p * .25 - e * .6)},${f(q[1] - hh * .6)} ${f(x + p)},${f(q[1] - hh)}Q${f(x + p * .25 + e * .8)},${f(q[1] - hh * .55)} ${f(x + e)},${f(q[1])}Z`); }
    }
    void c;
    return g.svg(' opacity=".85"');
  }
  function fleurs(P, o, r, n) {
    let s = '';
    for (const [z, X] of semer(P, o, r, n, .3)) { const k = P.k(z), q = P.pt(X, z), c = ['#f6efdc', '#f0d27a', '#d98f7a', '#b9a3d6'][Math.floor(r() * 4)]; s += `<circle cx="${f(q[0])}" cy="${f(q[1] - 12 * k)}" r="${f(2.6 * k)}" fill="${c}"/>`; }
    return `<g opacity=".8">${s}</g>`;
  }
  function cailloux(P, o, r, c, n) {
    let s = '';
    for (const [z, X] of semer(P, o, r, n, .25)) {
      const k = P.k(z), q = P.pt(X, z), w = (3 + Math.pow(r(), 3) * 16) * k, e = w * (.45 + r() * .2);
      const ton = B.mix(c, r() < .5 ? '#cfc4b0' : '#7a6c5c', .35 + r() * .3);
      s += `<ellipse cx="${f(q[0] + w * .25)}" cy="${f(q[1] + e * .35)}" rx="${f(w * 1.1)}" ry="${f(e * .7)}" fill="#1d1626" opacity=".18"/><path d="M${f(q[0] - w)},${f(q[1] + e * .3)}Q${f(q[0] - w * .9)},${f(q[1] - e)} ${f(q[0] - w * .1)},${f(q[1] - e)}Q${f(q[0] + w)},${f(q[1] - e * .8)} ${f(q[0] + w)},${f(q[1] + e * .3)}Z" fill="${ton}"/>` +
        (w > 5 ? `<path d="M${f(q[0] - w * .6)},${f(q[1] - e * .45)}Q${f(q[0] - w * .1)},${f(q[1] - e * .95)} ${f(q[0] + w * .4)},${f(q[1] - e * .6)}" stroke="${B.clair(ton, .3)}" stroke-width="${f(w * .12)}" fill="none" stroke-linecap="round" opacity=".7"/>` : '');
    }
    return s;
  }

  // le sol entre la ligne y0 (le fond) et le bas, entre xa et xb (à la hauteur y0)
  function sol(p, y0, xa, xb, matiere, c, seed) {
    const P = plan(p), Z = P.zDe(y0), k = P.k(Z), fn = MATIERES[matiere] || MATIERES.terre;
    const larg = (x) => P.vx + (x - P.vx) / k;
    return fn(P, { Z, X0: Math.max(-2600, larg(xa)), X1: Math.min(3700, larg(xb)) }, B.alea(seed || 5), c);
  }
  MONDE.sol = sol; MONDE.planSol = plan; MONDE.arrondi = arrondi; MONDE.MATIERES_SOL = Object.keys(MATIERES);
})(typeof window !== 'undefined' ? window : globalThis);
