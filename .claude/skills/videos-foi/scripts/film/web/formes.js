// Formes : la géométrie du dessin des personnages. Un volume est une PILE DE COUPES (des ellipses dans l'espace, ou des
// sphères) reliées entre elles : la silhouette est toujours continue (une épaule, un coude, une robe ne sont plus des
// pièces collées bout à bout). Un tissu, un pli, une ceinture, une barbe sont des morceaux posés SUR la surface d'un
// volume : ils tournent avec lui, s'amincissent vers le bord et disparaissent derrière, dans toutes les vues.
(function (G) {
  const B = G.B, V = G.RIG.v, f = B.f;
  const { add, sub, mul, dot, cross, len, norm } = V;
  const N_COUPE = 26;                       // points par coupe : lisse même en gros plan
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ silhouettes simples
  // silhouette d'un ellipsoïde (centre c, demi-axes en 3D) en projection orthographique
  function ellipse(pr, c, axes) {
    const p = pr(c);
    let s11 = 0, s12 = 0, s22 = 0;
    for (const ax of axes) { const a = pr.dir(ax); s11 += a[0] * a[0]; s12 += a[0] * a[1]; s22 += a[1] * a[1]; }
    const tr = s11 + s22, dd = Math.sqrt(Math.max(0, tr * tr / 4 - (s11 * s22 - s12 * s12)));
    return { cx: p[0], cy: p[1], z: p[2], rx: Math.sqrt(tr / 2 + dd), ry: Math.sqrt(Math.max(0, tr / 2 - dd)), ang: .5 * Math.atan2(2 * s12, s11 - s22) };
  }
  function ptsEllipse(e, n = N_COUPE, dx = 0, dy = 0) {
    const c = Math.cos(e.ang), s = Math.sin(e.ang), o = [];
    for (let i = 0; i < n; i++) { const t = i / n * TAU, x = Math.cos(t) * e.rx, y = Math.sin(t) * e.ry; o.push([e.cx + dx + x * c - y * s, e.cy + dy + x * s + y * c]); }
    return o;
  }
  const dPts = (pts) => 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  const dEllipse = (e, dx = 0, dy = 0) => B.lisse(ptsEllipse(e, 20, dx, dy), true, .5);
  function enveloppe(pts) {                         // enveloppe convexe (chaîne monotone) : toujours tournée dans le même sens
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const aireSignee = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  // tous les contours tournent dans le même sens : réunis dans un tracé, ils s'ajoutent (jamais un trou entre deux)
  const oriente = (pts) => aireSignee(pts) < 0 ? pts.slice().reverse() : pts;
  const dCercle = (c, r) => dPts(enveloppe(ptsEllipse({ cx: c[0], cy: c[1], rx: r, ry: r, ang: 0 })));
  // membre effilé : deux cercles reliés
  function dCapsule(p1, p2, r1, r2) {
    const c = (p, r) => ptsEllipse({ cx: p[0], cy: p[1], rx: r, ry: r, ang: 0 }, 18);
    return dPts(enveloppe(c(p1, r1).concat(c(p2, r2))));
  }

  // ------------------------------------------------------------------ piles de coupes
  // coupe = { c: centre, a, b: demi-axes } ou { c, r } (sphère) ; d : décalage à l'écran (le tissu qui traîne)
  const coupe = (c, a, b, d) => ({ c, a, b, d });
  const sphere = (c, r) => ({ c, r });
  function ptsCoupe(pr, cp, n = N_COUPE) {
    const c = pr(cp.c), dx = cp.d ? cp.d[0] : 0, dy = cp.d ? cp.d[1] : 0, o = [];
    if (cp.r !== undefined) return ptsEllipse({ cx: c[0] + dx, cy: c[1] + dy, rx: cp.r, ry: cp.r, ang: 0 }, n);
    const a = pr.dir(cp.a), b = pr.dir(cp.b);
    if (cp.demi) {                          // seulement la moitié de l'anneau tournée vers la caméra (le bord de derrière ne dépasse pas)
      const [v0, v1] = visibles({ cam: cp.demi }, cp);
      for (let i = 0; i <= n; i++) { const t = B.lerp(v0, v1, i / n), k = Math.sin(t), s = Math.cos(t); o.push([c[0] + dx + a[0] * k + b[0] * s, c[1] + dy + a[1] * k + b[1] * s]); }
      return o;
    }
    for (let i = 0; i < n; i++) { const t = i / n * TAU, k = Math.cos(t), s = Math.sin(t); o.push([c[0] + dx + a[0] * k + b[0] * s, c[1] + dy + a[1] * k + b[1] * s]); }
    return o;
  }
  const melCoupe = (u, v, k) => ({
    c: V.lerp3(u.c, v.c, k), a: V.lerp3(u.a, v.a, k), b: V.lerp3(u.b, v.b, k),
    d: u.d || v.d ? [B.lerp(u.d?.[0] || 0, v.d?.[0] || 0, k), B.lerp(u.d?.[1] || 0, v.d?.[1] || 0, k)] : undefined,
  });
  // la coupe à l'indice réel t (entre deux coupes : mélangées)
  function coupeA(cps, t) {
    const x = B.clamp(t, 0, cps.length - 1), i = Math.min(cps.length - 2, Math.floor(x));
    return melCoupe(cps[i], cps[i + 1], x - i);
  }
  // Catmull-Rom : m coupes par intervalle (une taille, une hanche, un bas de robe sans angle)
  function adoucir(cps, m = 4) {
    const cr = (p0, p1, p2, p3, t) => p1.map((_, j) => .5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t));
    const out = [];
    for (let i = 0; i < cps.length - 1; i++) {
      const q = [cps[Math.max(0, i - 1)], cps[i], cps[i + 1], cps[Math.min(cps.length - 1, i + 2)]];
      for (let k = 0; k < m; k++) {
        const t = k / m, mix = melCoupe(cps[i], cps[i + 1], t);
        out.push({ c: cr(...q.map(x => x.c), t), a: cr(...q.map(x => x.a), t), b: cr(...q.map(x => x.b), t), d: mix.d });
      }
    }
    out.push(cps[cps.length - 1]);
    return out;
  }
  // silhouette d'une pile : l'union des enveloppes de deux coupes voisines (un seul tracé, aucune couture)
  function dPile(pr, cps, n = N_COUPE) {
    const P = cps.map(c => ptsCoupe(pr, c, n));
    if (P.length === 1) return dPts(enveloppe(P[0]));
    let d = '';
    for (let i = 0; i < P.length - 1; i++) d += dPts(enveloppe(P[i].concat(P[i + 1])));
    return d;
  }
  // un membre (bras, jambe, manche) : trois points, des rayons, une articulation arrondie ; s : 0 = A, 1 = articulation, 2 = C
  const ARRONDI = .34;                      // part de chaque os prise dans la courbe de l'articulation
  function membre(A, M, C, rayon, { s0 = 0, s1 = 2, boule = true } = {}) {
    const m1 = V.lerp3(A, M, 1 - ARRONDI), m2 = V.lerp3(M, C, ARRONDI);
    const pos = (s) => {
      if (s <= 1 - ARRONDI) return V.lerp3(A, M, s);
      if (s >= 1 + ARRONDI) return V.lerp3(M, C, s - 1);
      const k = (s - 1 + ARRONDI) / (2 * ARRONDI);
      return add(add(mul(m1, (1 - k) * (1 - k)), mul(M, 2 * k * (1 - k))), mul(m2, k * k));
    };
    const cps = [];
    const N = Math.max(3, Math.round(9 * (s1 - s0) / 2) * 2);
    let ref = null;
    for (let i = 0; i <= N; i++) {
      const s = B.lerp(s0, s1, i / N), c = pos(s), t = norm(sub(pos(Math.min(2, s + .03)), pos(Math.max(0, s - .03)))), r = rayon(s);
      if (!ref) ref = Math.abs(t[2]) < .8 ? [0, 0, 1] : [1, 0, 0];
      const n1 = norm(sub(ref, mul(t, dot(ref, t)))), n2 = cross(t, n1);
      ref = n1;
      if (i === 0 && boule) cps.push(sphere(c, r));
      cps.push({ c, a: mul(n1, r), b: mul(n2, r), t, s });
    }
    cps.pos = pos;
    return cps;
  }
  // une valeur le long d'un membre : [[s, valeur], …]
  const profil = (pts) => (s) => {
    if (s <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const k = (s - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]), e = k * k * (3 - 2 * k); return B.lerp(pts[i - 1][1], pts[i][1], e); }
    return pts[pts.length - 1][1];
  };

  // ------------------------------------------------------------------ morceaux posés sur une pile de coupes
  // θ : 0 = devant (axe b), +90° = vers +a ; hors : épaisseur au-dessus de la surface
  function ptSurface(cps, t, th, hors = 0) {
    const c = coupeA(cps, t), ka = 1 + hors / Math.max(1e-6, len(c.a)), kb = 1 + hors / Math.max(1e-6, len(c.b));
    return { p: add(c.c, add(mul(c.a, Math.sin(th) * ka), mul(c.b, Math.cos(th) * kb))), d: c.d, c };
  }
  // l'intervalle de θ visible sur une coupe
  function visibles(K, c) {
    const la = len(c.a), lb = len(c.b), al = dot(c.a, K.cam) / Math.max(1e-6, la * la), be = dot(c.b, K.cam) / Math.max(1e-6, lb * lb), th = Math.atan2(al, be);
    return [th - Math.PI / 2, th + Math.PI / 2];
  }
  function borne(g, d, [v0, v1]) {            // [g, d] ∩ visible, en choisissant le bon tour
    let best = null;
    for (const k of [-TAU, 0, TAU]) { const x0 = Math.max(g + k, v0), x1 = Math.min(d + k, v1); if (x1 > x0 && (!best || x1 - x0 > best[1] - best[0])) best = [x0, x1]; }
    return best;
  }
  const RANGS_MIN = 5;                      // un morceau de tissu plus court que ça (il ne fait que dépasser d'un pli) n'est pas dessiné
  const MINCE = .12, EPAIS_PLEIN = .6;      // radians
  const projette = (K, s) => { const p = K.pr(s.p); return s.d ? [p[0] + s.d[0], p[1] + s.d[1]] : p; };
  // rangs : [[t, θ gauche, θ droite], …] en radians → le contour visible (un ou plusieurs morceaux)
  function dTissu(K, cps, rangs, hors = 0, mince = MINCE, largeMin = 0) {
    let d = '', g = [], dr = [];
    const large = () => Math.max(...g.map((p, i) => Math.hypot(p[0] - dr[i][0], p[1] - dr[i][1])));
    const ferme = () => { if (g.length > 1 && (!largeMin || g.length > RANGS_MIN && large() > largeMin)) d += dPts(oriente(g.concat(dr.slice().reverse()))); g = []; dr = []; };
    for (const [t, th0, th1] of rangs) {
      const iv = borne(th0, th1, visibles(K, coupeA(cps, t)));
      if (!iv || (iv[1] - iv[0] < mince && th1 - th0 > 2 * mince)) { ferme(); continue; }      // de tranche : un cheveu de tissu au bord ne se dessine pas
      // l'épaisseur du tissu s'efface quand il n'en reste qu'une tranche au bord (pas de fil coloré le long du corps)
      const e = hors * B.clamp((iv[1] - iv[0]) / EPAIS_PLEIN);
      g.push(projette(K, ptSurface(cps, t, iv[0], e)));
      dr.push(projette(K, ptSurface(cps, t, iv[1], e)));
    }
    ferme();
    return d;
  }
  // une bande qui fait le tour (ceinture, ourlet, revers) entre les indices t0 et t1
  function dBande(K, cps, t0, t1, hors = 0, n = 14) {
    const ligne = (t) => { const [v0, v1] = visibles(K, coupeA(cps, t)), o = []; for (let i = 0; i <= n; i++) o.push(projette(K, ptSurface(cps, t, B.lerp(v0, v1, i / n), hors))); return o; };
    return dPts(oriente(ligne(t0).concat(ligne(t1).reverse())));
  }
  // une ligne posée sur la surface : [[t, θ], …] → morceaux visibles
  function dLigne(K, cps, pts, hors = 0) {
    let d = '', cours = [];
    const ferme = () => { if (cours.length > 1) d += B.lisse(cours, false, .5); cours = []; };
    for (const [t, th] of pts) {
      const c = coupeA(cps, t), iv = borne(th - 1e-4, th + 1e-4, visibles(K, c));
      if (!iv) { ferme(); continue; }
      cours.push(projette(K, ptSurface(cps, t, th, hors)));
    }
    ferme();
    return d;
  }
  // un pli : un fuseau effilé, du haut (t0) vers le bas (t1), large de w radians
  // (ouvert : il s'élargit jusqu'en bas — un pli de robe ; sinon un fuseau, effilé aux deux bouts — un pli de manche)
  function rangsPli(t0, t1, th0, th1, w, { pointe = .6, n = 22, ouvert = false } = {}) {
    const o = [];
    for (let i = 0; i <= n; i++) { const k = i / n, l = w * Math.pow(Math.sin(Math.PI * Math.pow(k, pointe) * (ouvert ? .5 : 1)), 1.15), th = B.lerp(th0, th1, k); o.push([B.lerp(t0, t1, k), th - Math.max(1e-3, l / 2), th + Math.max(1e-3, l / 2)]); }
    return o;
  }

  // ------------------------------------------------------------------ morceaux posés sur un ellipsoïde (la tête)
  // ell = { c, m: [demi-axes en 3D] } ; un point de la surface par azimut (0 = devant, + = côté gauche du personnage) et élévation
  const dirSphere = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  const surEll = (ell, q) => add(ell.c, add(add(mul(ell.m[0], q[0]), mul(ell.m[1], q[1])), mul(ell.m[2], q[2])));
  // direction caméra dans l'espace de la sphère unité : q est visible si q·w > 0
  function regardEll(K, ell) {
    const [a, b, c] = ell.m, det = dot(a, cross(b, c)) || 1e-9;
    // normale du monde ∝ M⁻ᵀ q  ⇒  visible ⇔ q · (M⁻¹ cam) > 0
    return norm([dot(cross(b, c), K.cam) / det, dot(cross(c, a), K.cam) / det, dot(cross(a, b), K.cam) / det]);
  }
  // un contour [(az, el)…], d'abord arrondi sur la surface, puis ramené au bord quand il passe derrière (il épouse la
  // silhouette au lieu de la traverser)
  const DENSITE = 5;
  function arrondi(contour) {
    const n = contour.length, o = [];
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [-1, 0, 1, 2].map(j => contour[(i + j + n) % n]);
      for (let k = 0; k < DENSITE; k++) { const t = k / DENSITE; o.push([0, 1].map(j => .5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t))); }
    }
    return o;
  }
  // la partie visible d'un contour : les points cachés sont remplacés par l'arc du bord entre la sortie et le retour
  const PAS_BORD = .12;                     // radians entre deux points du bord
  function ptsEll(K, ell, contour) {
    const w = regardEll(K, ell), Q = arrondi(contour).map(([az, el]) => dirSphere(az, el)), n = Q.length, D = Q.map(q => dot(q, w));
    const vus = D.filter(d => d >= 0).length / n;
    const P = q => K.pr(surEll(ell, q));
    if (vus === 1) return { pts: Q.map(P), vus };
    if (vus === 0) return { pts: [], vus };
    const bord = (i, j) => { const k = D[i] / (D[i] - D[j]), q = V.lerp3(Q[i], Q[j], k); return norm(sub(q, mul(w, dot(q, w)))); };
    const i0 = D.findIndex((d, i) => d >= 0 && D[(i - 1 + n) % n] < 0), pts = [];
    let sortie = null, caches = [0, 0, 0];
    for (let k = 0; k <= n; k++) {
      const i = (i0 + k) % n, p = (i - 1 + n) % n;
      if (D[i] >= 0 && D[p] < 0) {            // il revient : l'arc du bord depuis la sortie, du côté où le contour est passé derrière
        const e = bord(p, i);
        if (sortie) {
          const court = Math.acos(B.clamp(dot(sortie, e), -1, 1)), axe = len(cross(sortie, e)) > 1e-6 ? norm(cross(sortie, e)) : w, mi = V.rot(sortie, axe, B.deg(court / 2));
          const th = dot(mi, caches) >= 0 ? court : court - TAU, m = Math.ceil(Math.abs(th) / PAS_BORD);
          for (let j = 1; j < m; j++) pts.push(P(V.rot(sortie, axe, B.deg(th * j / m))));
        }
        if (k === n) break;
        pts.push(P(e));
      }
      if (k === n) break;
      if (D[i] >= 0) pts.push(P(Q[i])); else caches = add(caches, Q[i]);
      const s = (i + 1) % n;
      if (D[i] >= 0 && D[s] < 0) { sortie = bord(i, s); caches = [0, 0, 0]; pts.push(P(sortie)); }
    }
    return { pts, vus };
  }
  function dEll(K, ell, contour, { min = .08 } = {}) {
    const { pts, vus } = ptsEll(K, ell, contour);
    return vus <= min ? '' : dPts(oriente(pts));
  }
  // une ligne sur l'ellipsoïde (seulement ses points visibles)
  function dLigneEll(K, ell, pts) {
    const w = regardEll(K, ell);
    let d = '', cours = [];
    const ferme = () => { if (cours.length > 1) d += B.lisse(cours, false, .5); cours = []; };
    for (const [az, el] of pts) { const q = dirSphere(az, el); if (dot(q, w) < .02) ferme(); else cours.push(K.pr(surEll(ell, q))); }
    ferme();
    return d;
  }
  // la région visible d'un ellipsoïde au-delà d'un plan (q·n > d) : cheveux, voile, bonnet. k : l'épaisseur au-dessus de la
  // surface, qui s'annule sur le bord (la ligne des cheveux colle au front ; elle ne dépasse pas en pointe)
  const FONDU_BORD = .3;
  function calotte(K, ell, n, d, { k: gonfle = 1, N = 64 } = {}) {
    const w = regardEll(K, ell), n0 = norm(n), rr = Math.sqrt(Math.max(0, 1 - d * d));
    const base = (axe) => { const e1 = norm(cross(axe, Math.abs(axe[0]) < .9 ? [1, 0, 0] : [0, 1, 0])); return [e1, cross(axe, e1)]; };
    const [g1, g2] = base(w), [h1, h2] = base(n0), S = [], H = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, qs = add(mul(g1, Math.cos(a)), mul(g2, Math.sin(a))), qh = add(mul(n0, d), add(mul(h1, rr * Math.cos(a)), mul(h2, rr * Math.sin(a))));
      S.push({ q: qs, dedans: dot(qs, n0) > d });
      H.push({ q: qh, vis: dot(qh, w) > 0 });
    }
    const P = q => { const e = B.clamp((dot(q, n0) - d) / FONDU_BORD), kk = 1 + (gonfle - 1) * e * (2 - e); return K.pr(add(ell.c, mul(sub(surEll(ell, q), ell.c), kk))); }, nIn = S.filter(s => s.dedans).length, nVis = H.filter(h => h.vis).length;
    if (nIn === 0 && nVis === 0) return '';
    if (nIn === N && nVis === 0) return B.lisse(oriente(S.map(s => P(s.q))), true, .5);
    if (nVis === N) {
      const hp = oriente(H.map(h => P(h.q)));
      if (nIn === 0) return B.lisse(hp, true, .5);
      // un anneau (le voile vu de face) : le trou tourne dans l'autre sens que le contour, sinon il se remplit
      return B.lisse(oriente(S.map(s => P(s.q))), true, .5) + ' ' + B.lisse(hp.reverse(), true, .5);
    }
    const i0 = Math.max(0, S.findIndex((s, i) => s.dedans && !S[(i - 1 + N) % N].dedans)), j0 = Math.max(0, H.findIndex((h, i) => h.vis && !H[(i - 1 + N) % N].vis));
    const arcS = [], arcH = [];
    for (let k = 0; k < N; k++) { const s = S[(i0 + k) % N]; if (!s.dedans) break; arcS.push(P(s.q)); }
    for (let k = 0; k < N; k++) { const h = H[(j0 + k) % N]; if (!h.vis) break; arcH.push(P(h.q)); }
    if (!arcS.length) return arcH.length > 2 ? B.lisse(oriente(arcH), true, .5) : '';
    const fin = arcS[arcS.length - 1], ecart = p => Math.hypot(p[0] - fin[0], p[1] - fin[1]);
    if (arcH.length && ecart(arcH[0]) > ecart(arcH[arcH.length - 1])) arcH.reverse();
    return dPts(oriente(arcS.concat(arcH)));
  }

  // ------------------------------------------------------------------ peinture : aplat + ombre en croissant
  let UID = 0;
  function Peintre(ctx) {
    const defs = [], L = ctx.lumiere;
    const nouveau = (p) => ctx.id + p + (UID++);
    // une forme : sa couleur, et du côté opposé à la lumière un croissant d'ombre. opts.ombre : couleur ou url(#dégradé)
    // (plusieurs tracés : chacun le sien — réunis en un seul, deux contours qui se recoupent pourraient s'annuler)
    function forme(d, couleur, opts = {}) {
      const ds = (Array.isArray(d) ? d : [d]).filter(Boolean);
      if (!ds.length) return '';
      const ombre = opts.ombre ?? B.teinte(couleur, ctx.ombre, opts.k_ombre ?? .2), k = (opts.decal ?? .16) * (opts.taille ?? 20);
      const ic = nouveau('c'), ids = ds.map(() => nouveau('p'));
      defs.push(`<clipPath id="${ic}">${ds.map((x, i) => `<path id="${ids[i]}" d="${x}"/>`).join('')}</clipPath>`);
      return ids.map(id => `<use href="#${id}" fill="${ombre}"/>`).join('') + `<g clip-path="url(#${ic})">${ids.map(id => `<use href="#${id}" transform="translate(${f(L[0] * k)},${f(L[1] * k)})" fill="${couleur}"/>`).join('')}</g>`;
    }
    const decoupe = (d) => { const id = nouveau('k'); defs.push(`<clipPath id="${id}">${(Array.isArray(d) ? d : [d]).filter(Boolean).map(x => `<path d="${x}"/>`).join('')}</clipPath>`); return id; };
    // un dégradé d'un point à l'autre (couleurs : [[position, couleur, opacité], …])
    function degrade(p1, p2, stops) {
      const id = nouveau('g');
      defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}">${stops.map(([o, c, op]) => `<stop offset="${f(o)}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')}</linearGradient>`);
      return `url(#${id})`;
    }
    function rond(c, r, stops) {
      const id = nouveau('r');
      defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}">${stops.map(([o, c2, op]) => `<stop offset="${f(o)}" stop-color="${c2}"${op !== undefined ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')}</radialGradient>`);
      return `url(#${id})`;
    }
    function flou(r) { const id = nouveau('f'); defs.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f(r)}"/></filter>`); return `url(#${id})`; }
    return { forme, decoupe, degrade, rond, flou, defs };
  }
  // distance d'un point projeté à un segment projeté
  function distSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = dx * dx + dy * dy, k = n ? B.clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / n) : 0;
    return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k);
  }
  // repère tangent 3D → matrice SVG (un détail « collé » sur une surface)
  function matrice(pr, o, ex, ey) {
    const p = pr(o), a = pr.dir(ex), b = pr.dir(ey);
    return `matrix(${f(a[0])},${f(a[1])},${f(b[0])},${f(b[1])},${f(p[0])},${f(p[1])})`;
  }

  G.FORMES = { ellipse, ptsEllipse, dEllipse, dPts, dCercle, dCapsule, enveloppe, coupe, sphere, ptsCoupe, coupeA, adoucir, dPile, membre, profil, ptSurface, visibles, projette, dTissu, dBande, dLigne, rangsPli, dirSphere, surEll, regardEll, ptsEll, dEll, dLigneEll, calotte, Peintre, distSegment, matrice };
})(typeof window !== 'undefined' ? window : globalThis);
