// Animaux : des quadrupèdes construits en volume comme les personnages (piles de coupes le long de l'échine, pattes
// articulées, tête, oreilles, cornes dans l'espace), vus sous l'angle qu'on veut. Une espèce = des proportions ; rien n'est
// dessiné d'avance. Oiseaux, coq et poule à part.
(function (G) {
  const B = G.B, RIG = G.RIG, F = G.FORMES, V = RIG.v, f = B.f, MONDE = G.MONDE, GEN = MONDE.GEN;
  const { add, sub, mul, norm, cross, lerp3 } = V;
  const OMBRE = '#2b2140', VUE = 66;

  // corps : [z, y, demi-largeur, demi-hauteur] de la croupe au poitrail ; cou : [z, y, rayon] ; tete : angle (degrés, − = vers
  // le bas) et [t, demi-largeur, demi-hauteur] du crâne au museau ; av / ar : z des pattes, r : rayons de la patte (haut → sabot).
  // Tout est en part de la longueur du corps ; y = hauteur au-dessus du sol.
  const ESPECES = {
    porc: { corps: [[-.5, .37, .04, .06], [-.45, .385, .13, .15], [-.28, .4, .185, .19], [0, .385, .2, .205], [.22, .395, .185, .195], [.36, .4, .155, .165]], cou: [[.34, .4, .155], [.46, .395, .135]], tete: [-16, [[-.02, .13, .135], [.08, .135, .135], [.18, .105, .105], [.27, .078, .074], [.33, .07, .064]]], av: .27, ar: -.31, r: [.085, .062, .044, .04, .045], couleur: '#e2a79b', museau: 'groin', oreille: 'tombante', queue: 'tire' },
    mouton: { corps: [[-.44, .5, .07, .09], [-.36, .52, .16, .18], [-.1, .505, .185, .195], [.18, .52, .17, .18], [.32, .55, .12, .14]], cou: [[.3, .58, .115], [.43, .7, .085]], tete: [-24, [[-.02, .066, .07], [.07, .07, .075], [.16, .05, .056], [.24, .036, .038]]], av: .24, ar: -.28, r: [.06, .042, .03, .026, .03], couleur: '#ece4d4', face: '#6d5342', laine: true, oreille: 'laterale', queue: 'courte' },
    agneau: { corps: [[-.36, .5, .06, .07], [-.28, .52, .125, .14], [-.05, .5, .14, .15], [.16, .52, .125, .135], [.26, .55, .09, .11]], cou: [[.24, .58, .09], [.35, .71, .072]], tete: [-14, [[-.02, .066, .07], [.07, .07, .075], [.15, .05, .054], [.21, .036, .038]]], av: .19, ar: -.22, r: [.05, .036, .027, .024, .028], couleur: '#f7f2e6', face: '#ead9c4', laine: true, oreille: 'laterale', queue: 'courte' },
    chevre: { corps: [[-.44, .56, .05, .065], [-.36, .575, .115, .135], [-.1, .55, .14, .16], [.18, .565, .125, .155], [.32, .59, .09, .13]], cou: [[.3, .64, .088], [.45, .84, .06]], tete: [-28, [[-.02, .055, .062], [.07, .058, .064], [.16, .042, .046], [.25, .03, .032]]], av: .25, ar: -.3, r: [.055, .04, .028, .024, .03], couleur: '#6a5140', oreille: 'laterale', cornes: 'arriere', barbiche: true, queue: 'dressee' },
    ane: { corps: [[-.48, .74, .05, .07], [-.41, .755, .13, .155], [-.14, .715, .155, .17], [.14, .73, .145, .165], [.33, .755, .105, .15]], cou: [[.3, .83, .115], [.52, 1.03, .078]], tete: [-40, [[-.03, .066, .075], [.08, .072, .085], [.2, .054, .06], [.32, .044, .047], [.38, .046, .043]]], av: .27, ar: -.33, r: [.07, .046, .03, .026, .038], couleur: '#8f877d', museau_c: '#dcd5c8', oreille: 'longue', queue: 'touffe', criniere: .6 },
    cheval: { corps: [[-.48, .88, .06, .09], [-.41, .9, .15, .175], [-.14, .85, .17, .185], [.14, .865, .16, .185], [.34, .9, .115, .17]], cou: [[.3, .99, .145], [.46, 1.16, .105], [.58, 1.32, .082]], tete: [-44, [[-.03, .07, .085], [.09, .076, .098], [.23, .058, .07], [.37, .046, .05], [.43, .048, .046]]], av: .28, ar: -.33, r: [.085, .056, .034, .028, .042], couleur: '#7d5136', oreille: 'droite', queue: 'longue', criniere: 1 },
    boeuf: { corps: [[-.52, .67, .08, .1], [-.45, .69, .17, .185], [-.18, .65, .2, .215], [.12, .665, .19, .22], [.33, .7, .15, .2], [.41, .7, .11, .17]], cou: [[.38, .74, .17], [.52, .8, .13]], tete: [-42, [[-.02, .095, .1], [.09, .1, .105], [.21, .08, .08], [.32, .07, .064], [.36, .066, .058]]], av: .28, ar: -.34, r: [.09, .062, .042, .038, .05], couleur: '#8f5f3f', museau_c: '#d8bfa8', oreille: 'laterale', cornes: 'avant', queue: 'touffe', fanon: true },
    chien: { corps: [[-.42, .52, .045, .06], [-.35, .53, .105, .12], [-.1, .5, .11, .125], [.16, .5, .125, .165], [.3, .54, .095, .145]], cou: [[.27, .6, .095], [.42, .78, .074]], tete: [-8, [[-.03, .08, .082], [.06, .085, .086], [.16, .054, .054], [.27, .038, .036]]], av: .22, ar: -.28, r: [.055, .04, .028, .026, .032], couleur: '#b98a56', oreille: 'pliee', queue: 'dressee', patte: true },
    chameau: { corps: [[-.44, 1.0, .06, .08], [-.37, 1.02, .13, .15], [-.1, .985, .155, .18], [.17, 1.0, .14, .18], [.33, 1.03, .1, .15]], cou: [[.28, 1.05, .12], [.5, .99, .088], [.68, 1.2, .07], [.74, 1.42, .06]], tete: [-8, [[-.03, .055, .06], [.06, .06, .066], [.16, .048, .05], [.26, .042, .042]]], av: .26, ar: -.3, r: [.075, .05, .034, .03, .045], couleur: '#c9a570', oreille: 'courte', queue: 'touffe', bosse: true },
  };
  let UIDA = 0;
  const sombre = (c, k, o = OMBRE) => B.teinte(c, o, k);

  GEN.animal = (p) => {
    const esp = p.espece || 'mouton';
    if (esp === 'colombe' || esp === 'oiseau') return oiseau(p);
    if (esp === 'coq' || esp === 'poule') return coq(p);
    const E = Object.assign({}, ESPECES[esp] || ESPECES.mouton, p.forme || {}), kS = MONDE.kSol(p, p.y_sol ?? p.y ?? 1500);      // perché : la taille du sol sous lui
    const x = p.x ?? 540, y = p.y ?? 1500, L = (p.taille ?? 200) * kS, sens = p.sens ?? 1, r = B.alea(p.seed || 71), pose = p.pose || 'debout';
    const c = p.couleur || E.couleur, face = E.face || c, uid = 'an' + (UIDA++) + '_' + (p.seed || 0) + '_';
    const yaw = (p.vue ?? VUE) * sens, a = yaw * Math.PI / 180, pr = RIG.projecteur(yaw, 0, [0, 0, 0]), cam = [-Math.sin(a), 0, Math.cos(a)];
    const ctx = { id: uid, ombre: p.ombre || OMBRE, lumiere: [(p.lumiere ?? -1) * .5, -.86] }, pe = F.Peintre(ctx), K = { pr, cam };
    const couche = pose === 'couche', broute = pose === 'broute';
    const legTop = (z) => { const i = Math.max(1, E.corps.findIndex(q => q[0] >= z)), u = E.corps[i - 1], v = E.corps[i], k = (z - u[0]) / (v[0] - u[0] || 1); return { y: B.lerp(u[1], v[1], k), w: B.lerp(u[2], v[2], k), h: B.lerp(u[3], v[3], k) }; };
    const dy = couche ? -(Math.min(...E.corps.map(q => q[1] - q[3])) - .015) : 0;
    const P3 = (X, Y, Z) => [X * L, (Y + dy) * L, Z * L], Zc = (q) => pr(q)[2], groupes = [], ajoute = (z, svg) => svg && groupes.push([z, svg]);
    const anneau = (z, yy, w, h) => F.coupe(P3(0, yy, z), [w * L, 0, 0], [0, h * L, 0]);
    const corps = F.adoucir(E.corps.map(q => anneau(...q)), 5);
    const chaine = (pts, rs) => { const n = 12, o = [], cr = (p0, p1, p2, p3, t) => p1.map((_, j) => .5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t)); for (let i = 0; i <= n; i++) { const u = i / n * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(u)), t = u - k; o.push(F.sphere(cr(pts[Math.max(0, k - 1)], pts[k], pts[k + 1], pts[Math.min(pts.length - 1, k + 2)], t), B.lerp(rs[k], rs[k + 1], t) * L)); } return o; };
    const anim = (type, o, svg) => `<g data-anim='${JSON.stringify(Object.assign({ type }, o))}'>${svg}</g>`;
    const ecr = (q) => { const s = pr(q); return [x + s[0], y + s[1]]; };

    // --- les pattes
    const patte = (sx, av) => {
      const z = av ? E.av : E.ar, T = legTop(z), X = sx * T.w * .62, loin = Zc([X, 0, 0]) < 0, col0 = E.laine ? face : c, col = loin ? sombre(col0, .22) : col0, haut = T.y - T.h * .1, sabot = E.patte ? col : sombre(c, .62);
      if (couche) {
        const s = av ? chaine([P3(X, T.y * .6 - dy * .4, z), P3(X * 1.1, .05 - dy, z + .16), P3(X * 1.1, .04 - dy, z + .02)], [E.r[0], E.r[2], E.r[3]]) : chaine([P3(X * 1.05, T.y * .7 - dy * .3, z), P3(X * 1.3, .07 - dy, z + .12), P3(X * 1.3, .035 - dy, z + .24)], [E.r[0] * 1.5, E.r[1], E.r[3]]);
        ajoute(Zc([X, 0, z * L]) + (loin ? -L : L) * .02, pe.forme(F.dPile(pr, s, 16), col, { taille: L * .08, decal: .2 }));
        return;
      }
      const pts = av ? [P3(X, haut, z + .01), P3(X, haut * .62, z - .015), P3(X, haut * .36, z + .012), P3(X, haut * .12, z), P3(X, E.r[4], z + .012)] : [P3(X, haut, z + .03), P3(X, haut * .68, z + .055), P3(X, haut * .4, z - .05), P3(X, haut * .13, z - .02), P3(X, E.r[4], z - .005)];
      const R = av ? E.r : [E.r[0] * 1.5, E.r[1] * 1.35, E.r[2], E.r[3], E.r[4]];
      const ch = chaine(pts, R), d = F.dPile(pr, ch, 16);
      // en haut, la patte se fond dans le corps (dégradé) ; en bas, le sabot
      const h0 = pr(pts[0]), h1 = pr(pts[2]), om = pe.degrade(h0, h1, [[.15, col], [1, sombre(col, .24)]]);
      let s = pe.forme(d, col, { taille: L * .07, decal: .24, ombre: om });
      const rs = R[4], bas = (k, w) => F.coupe(add(pts[4], [0, (k - rs) * L, 0]), [rs * w * L, 0, 0], [0, 0, rs * w * 1.1 * L]);
      s += E.patte ? pe.forme(F.dPile(pr, [F.sphere(add(pts[4], [0, -.008 * L, .015 * L]), rs * 1.15 * L)], 16), col, { taille: L * .04 }) : pe.forme(F.dPile(pr, [bas(rs * 1.15, .96), bas(0, 1.12)], 16), sabot, { taille: L * .04, decal: .2 });
      if (pose === 'marche') { const q = ecr(pts[0]); s = anim('balance', { amp: esp === 'porc' ? 13 : 17, periode: +(.8 + L / 900).toFixed(2), phase: (av ? 0 : Math.PI) + (sx > 0 ? Math.PI : 0), pivot: q.map(v => +v.toFixed(1)) }, s); }
      // une patte laineuse sort de SOUS la toison
      ajoute(E.laine ? (loin ? -L : -L * .02) : Zc([X * L, 0, z * L]) + (loin ? -L : L) * .1, s);
    };
    for (const av of [true, false]) for (const sx of [-1, 1]) patte(sx, av);

    // --- la queue
    const cq = E.corps[0], base = P3(0, cq[1] + cq[3] * .8, cq[0] + .015);
    const tube = (pts, rs, coul) => pe.forme(F.dPile(pr, chaine(pts, rs), 12), coul, { taille: L * .03, decal: .2 });
    let queue = '';
    const rel = (Y, Z, X = 0) => add(base, [X * L, Y * L, Z * L]);
    if (E.queue === 'tire') { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(rel(.02 + Math.sin(t * 9) * .035, -.02 - t * .07, Math.cos(t * 9) * .035)); } queue = `<path d="${B.lisse(pts.map(q => pr(q)))}" fill="none" stroke="${sombre(c, .12)}" stroke-width="${f(L * .022)}" stroke-linecap="round"/>`; }
    else if (E.queue === 'courte') queue = pe.forme(F.dPile(pr, [F.sphere(rel(-.01, -.01), .05 * L), F.sphere(rel(-.09, -.03), .045 * L)], 16), c, { taille: L * .06 });
    else if (E.queue === 'dressee') queue = anim('balance', { amp: esp === 'chien' ? 12 : 5, periode: .7, pivot: ecr(base).map(v => +v.toFixed(1)) }, tube([base, rel(.06, -.06), rel(.17, -.05)], [.03, .028, .012], c));
    else if (E.queue === 'longue') queue = anim('balance', { amp: 5, periode: 2.6, pivot: ecr(base).map(v => +v.toFixed(1)) }, pe.forme(F.dPile(pr, chaine([base, rel(-.1, -.09), rel(-.32, -.1), rel(-.52, -.06)], [.035, .05, .055, .008]), 14), sombre(c, .5), { taille: L * .05 }));
    else queue = anim('balance', { amp: 6, periode: 2.4, pivot: ecr(base).map(v => +v.toFixed(1)) }, tube([base, rel(-.12, -.06), rel(-.28, -.05)], [.022, .015, .012], c) + pe.forme(F.dPile(pr, chaine([rel(-.26, -.05), rel(-.33, -.055), rel(-.41, -.05)], [.016, .034, .006]), 14), sombre(c, .5), { taille: L * .03 }));
    ajoute(Zc(base) - .02 * L, queue);

    // --- le corps
    const ds = [F.dPile(pr, corps)];
    if (E.bosse) ds.push(F.dPile(pr, F.adoucir([anneau(-.3, 1.1, .05, .04), anneau(-.2, 1.2, .11, .1), anneau(-.06, 1.26, .115, .13), anneau(.08, 1.18, .09, .09), anneau(.16, 1.1, .04, .04)], 4)));
    if (E.fanon) ds.push(F.dPile(pr, chaine([P3(0, .6, .32), P3(0, .53, .4), P3(0, .64, .48)], [.06, .035, .05]), 14));
    if (E.laine) {
      // la toison : des boucles tout le long de la silhouette
      const bord = F.enveloppe(corps.flatMap(q => F.ptsCoupe(pr, q, 16))), n = 24, total = bord.length;
      let per = 0; const cum = bord.map((q, i) => { const s = bord[(i + 1) % total]; per += Math.hypot(s[0] - q[0], s[1] - q[1]); return per; });
      for (let i = 0; i < n; i++) { const d0 = per * i / n, k = Math.max(0, cum.findIndex(v => v >= d0)), avant = k ? cum[k - 1] : 0, u = (d0 - avant) / Math.max(1e-6, cum[k] - avant), a0 = bord[k], a1 = bord[(k + 1) % total]; ds.push(F.dCercle([B.lerp(a0[0], a1[0], u), B.lerp(a0[1], a1[1], u)], L * (.05 + r() * .016))); }
    }
    let s = pe.forme(ds, c, { taille: L * .42, decal: .26, k_ombre: E.laine ? .2 : .26 });
    const clip = pe.decoupe(ds), dos = pr(P3(0, E.corps[2][1] + E.corps[2][3] * .55, 0)), larg = L * .42;
    let det = `<ellipse cx="${f(dos[0])}" cy="${f(dos[1])}" rx="${f(larg)}" ry="${f(L * E.corps[2][3] * .42)}" fill="${B.clair(c, .2)}" opacity=".3" filter="${pe.flou(L * .03)}"/>`;
    if (E.laine) for (let i = 0; i < 34; i++) { const z = -.4 + r() * .7, T = legTop(z), th = (r() - .5) * 2.4, q = pr(P3(sens > 0 || true ? T.w * Math.cos(th) * -sens : 0, T.y + T.h * Math.sin(th) * .9, z)), w = L * (.02 + r() * .012); det += `<path d="M${f(q[0] - w)},${f(q[1])}q${f(w * .3)},${f(-w * 1.5)} ${f(w)},${f(-w * .2)}q${f(w * .5)},${f(-w * 1.2)} ${f(w)},0" stroke="${sombre(c, .26)}" stroke-width="${f(L * .009)}" fill="none" stroke-linecap="round" opacity=".5"/>`; }
    if (esp === 'porc' && p.boue !== false) for (let i = 0; i < 6; i++) { const q = pr(P3(-sens * .17, .26 + r() * .12, -.34 + r() * .6)); det += `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="${f(L * (.03 + r() * .04))}" ry="${f(L * (.016 + r() * .016))}" fill="#5a4230" opacity=".5"/>`; }
    s += `<g clip-path="url(#${clip})">${det}</g>`;
    ajoute(0, s);

    // --- le cou et la tête
    let cou = E.cou.map(q => [P3(0, q[1], q[0]), q[2]]), ang = E.tete[0];
    if (broute) { const b0 = cou[0][0], bas = esp === 'porc' ? .2 : .17, lg = Math.max(.22, E.cou[E.cou.length - 1][1] - E.cou[0][1] + .25); cou = [cou[0], [add(b0, [0, -(b0[1] / L - dy - bas) * .5 * L, lg * .55 * L]), cou[cou.length - 1][1]], [[0, (bas + dy) * L + L * .06, b0[2] + lg * .85 * L], cou[cou.length - 1][1] * .95]]; ang = esp === 'porc' ? -38 : -58; }
    const fin = cou[cou.length - 1][0], ax = [0, Math.sin(B.rad(ang)), Math.cos(B.rad(ang))], hautT = [0, Math.cos(B.rad(ang)), -Math.sin(B.rad(ang))], T3 = (t, X, Y) => add(fin, add(add(mul(ax, t * L), mul(hautT, Y * L)), [X * L, 0, 0]));
    const profilT = E.tete[1], rayonT = (t) => { for (let i = 1; i < profilT.length; i++) if (t <= profilT[i][0]) { const k = (t - profilT[i - 1][0]) / (profilT[i][0] - profilT[i - 1][0]); return [1, 2].map(j => B.lerp(profilT[i - 1][j], profilT[i][j], k)); } return profilT[profilT.length - 1].slice(1); };
    const tetePile = F.adoucir(profilT.map(([t, w, h]) => F.coupe(T3(t, 0, 0), [w * L, 0, 0], mul(hautT, h * L))), 4), bout = profilT[profilT.length - 1];
    const dCou = F.dPile(pr, chaine(cou.map(q => q[0]), cou.map(q => q[1])), 18), dTete = [F.dPile(pr, tetePile), F.dPile(pr, [F.sphere(T3(profilT[0][0] + .01, 0, 0), profilT[0][2] * L)], 18)];
    let t = '';
    const coteVu = -sens, oreilles = { loin: '', pres: '' };
    // les oreilles : une feuille dans l'espace, son creux
    const oreille = (sd) => {
      const [w, h] = rayonT(.02), b = T3(E.oreille === 'tombante' ? .04 : .005, sd * w * .78, h * .72), forme = { longue: [[.0, .3, -.03], .055], droite: [[.02, .15, .0], .05], laterale: [[.13, .0, -.02], .05], courte: [[.05, .06, 0], .03], tombante: [[.06, -.05, .13], .07], pliee: [[.07, -.1, .05], .055] }[E.oreille] || [[.1, .02, 0], .05];
      const [dx, dyy, dz] = forme[0], pointe = add(b, [sd * dx * L, dyy * L, dz * L]), axe = norm(sub(pointe, b)), lat = norm(cross(axe, Math.abs(axe[0]) > .8 ? [0, 0, 1] : [sd, 0, .4])), m = lerp3(b, pointe, .45), lg = forme[1] * L, pts = (k) => [b, add(m, mul(lat, lg * k)), pointe, add(m, mul(lat, -lg * k))].map(q => pr(q));
      const cO = E.laine ? face : E.oreille === 'tombante' ? sombre(c, .06) : c, d = B.lisse(pts(1), true, .8), d2 = B.lisse(pts(.55), true, .8), devant = sd === coteVu;
      oreilles[devant ? 'pres' : 'loin'] += pe.forme(d, devant ? cO : sombre(cO, .2), { taille: L * .05, decal: .2 }) + `<path d="${d2}" fill="${B.mix(sombre(cO, .3), '#c77a74', .25)}" opacity=".7"/>`;
    };
    oreille(-1); oreille(1);
    const corne = (sd) => {
      if (!E.cornes) return '';
      const [w, h] = rayonT(.0), b = T3(-.005, sd * w * .55, h * .8), pts = E.cornes === 'arriere' ? [b, add(b, [sd * .02 * L, .11 * L, -.04 * L]), add(b, [sd * .05 * L, .16 * L, -.15 * L]), add(b, [sd * .06 * L, .12 * L, -.22 * L])] : [b, add(b, [sd * .1 * L, .02 * L, 0]), add(b, [sd * .17 * L, .07 * L, .03 * L]), add(b, [sd * .18 * L, .17 * L, .06 * L])];
      return pe.forme(F.dPile(pr, chaine(pts, [.03, .027, .02, .005]), 14), E.cornes === 'arriere' ? '#8d7a60' : '#e9dfc8', { taille: L * .03, decal: .25 });
    };
    const loinC = corne(-coteVu), presC = corne(coteVu);
    t += loinC + oreilles.loin;
    t += pe.forme(dCou, c, { taille: L * .16, decal: .22 });
    if (E.laine) t += pe.forme(cou.slice(0, 2).flatMap(([q, rr], i) => [0, .5, 1].map(k => F.dCercle(pr(lerp3(q, fin, k * (i ? .6 : .5))), rr * L * (1.02 - k * .2)))), c, { taille: L * .14, decal: .18, k_ombre: .2 });
    t += pe.forme(dTete, face, { taille: L * .15, decal: .2 });
    const clipT = pe.decoupe(dTete);
    // le bas de la tête plus clair (âne, bœuf), le groin
    let inT = '';
    if (E.museau_c) inT += `<path d="${F.dPile(pr, tetePile.slice(-5))}" fill="${E.museau_c}" opacity=".85"/>`;
    if (inT) t += `<g clip-path="url(#${clipT})">${inT}</g>`;
    if (E.museau === 'groin') {
      const gr = [F.coupe(T3(bout[0] - .015, 0, 0), [bout[1] * 1.02 * L, 0, 0], mul(hautT, bout[2] * 1.02 * L)), F.coupe(T3(bout[0] + .025, 0, 0), [bout[1] * 1.08 * L, 0, 0], mul(hautT, bout[2] * 1.08 * L))];
      t += pe.forme(F.dPile(pr, gr, 18), B.mix(c, '#c97c74', .28), { taille: L * .05, decal: .2 });
      for (const sd of [-1, 1]) t += `<path d="${F.dEllipse(F.ellipse(pr, T3(bout[0] + .028, sd * bout[1] * .42, 0), [[.012 * L, 0, 0], mul(hautT, .024 * L)]))}" fill="${sombre(c, .6)}"/>`;
    } else for (const sd of [coteVu]) t += `<path d="${F.dEllipse(F.ellipse(pr, T3(bout[0] - .012, sd * bout[1] * .85, bout[2] * .25), [[.004 * L, 0, 0], mul(hautT, .011 * L), mul(ax, .016 * L)]))}" fill="${sombre(face, .6)}"/>`;
    // la bouche
    const bo = [[bout[0] + .0, .35], [bout[0] - .06, .62], [bout[0] - .13, .55]].map(([tt, k]) => { const [w, h] = rayonT(tt); return pr(T3(tt, coteVu * w * .8, -h * k)); });
    t += `<path d="${B.lisse(bo)}" fill="none" stroke="${sombre(face, .5)}" stroke-width="${f(L * .009)}" stroke-linecap="round" opacity=".7"/>`;
    // l'œil : posé sur le côté de la tête
    const te = esp === 'porc' ? .12 : E.tete[1][2][0] * .58, [we, he] = rayonT(te), oe = T3(te, coteVu * we * .9, he * .34), e0 = F.ellipse(pr, oe, [[0, 0, 0], mul(hautT, .024 * L), mul(ax, .02 * L)]);
    t += `<path d="${F.dEllipse(e0)}" fill="#1c130f"/><circle cx="${f(e0.cx - L * .005 + sens * L * .006)}" cy="${f(e0.cy - L * .008)}" r="${f(L * .006)}" fill="#fff"/><path d="M${f(e0.cx - e0.rx * 1.4)},${f(e0.cy - e0.ry * .9)}q${f(e0.rx * 1.4)},${f(-e0.ry * 1.1)} ${f(e0.rx * 2.8)},0" stroke="${sombre(face, .4)}" stroke-width="${f(L * .008)}" fill="none" stroke-linecap="round" opacity=".7"/>`;
    if (E.barbiche) t += pe.forme(F.dPile(pr, chaine([T3(bout[0] - .1, 0, -rayonT(bout[0] - .1)[1]), T3(bout[0] - .12, 0, -rayonT(bout[0] - .1)[1] - .1)], [.02, .004]), 12), B.clair(c, .2), { taille: L * .02 });
    // la crinière : des mèches le long du cou
    if (E.criniere) {
      const ch = chaine(cou.map(q => q[0]), cou.map(q => q[1])), m = [];
      ch.forEach((q, i) => { const dir = i < ch.length - 1 ? norm(sub(ch[i + 1].c, q.c)) : ax, up = norm(cross(dir, [1, 0, 0])), b = add(q.c, mul(up, q.r * .9)), lg = (E.criniere * .1 + .02) * L; m.push(F.dPile(pr, [F.sphere(b, L * .03), F.sphere(add(b, add(mul(up, lg * .5), [coteVu * lg * .35 * E.criniere, -lg * E.criniere * .9, -lg * .2])), L * .012)], 12)); });
      t += pe.forme(m, sombre(c, .5), { taille: L * .05, decal: .2 });
      t += pe.forme(F.dPile(pr, [F.sphere(T3(0, 0, rayonT(0)[1] * .9), L * .03), F.sphere(T3(.1, 0, rayonT(.1)[1] * .85), L * .008)], 12), sombre(c, .5), { taille: L * .03 });
    }
    if (E.laine) t += pe.forme([F.dCercle(pr(T3(-.005, 0, rayonT(0)[1] * .75)), L * .05), F.dCercle(pr(T3(.035, coteVu * .02, rayonT(.03)[1] * .8)), L * .04), F.dCercle(pr(T3(-.04, coteVu * .03, rayonT(0)[1] * .5)), L * .05)], c, { taille: L * .07, k_ombre: .2 });
    t += oreilles.pres + presC;
    const piv = ecr(cou[0][0]).map(v => +v.toFixed(1));
    ajoute(Math.max(.02 * L, Zc(fin) * .2 + .03 * L), anim('balance', { amp: broute ? 4 : 2, periode: +(broute ? 1.7 : 3.2 + r()).toFixed(2), pivot: piv, seed: (p.seed || 1) % 50 }, t));

    groupes.sort((u, v) => u[0] - v[0]);
    // le groupe est posé en (x, y) ; les pivots des animations sont en coordonnées du monde
    const svg = groupes.map(g => g[1]).join('').replace(/data-anim='([^']*)'/g, (m0, j) => { const o = JSON.parse(j); if (o.pivot) o.pivot = [+(o.pivot[0] - x).toFixed(1), +(o.pivot[1] - y).toFixed(1)]; return `data-anim='${JSON.stringify(o)}'`; });
    const om = `<ellipse cx="${f(x)}" cy="${f(y + 2)}" rx="${f(L * .56)}" ry="${f(L * .07)}" fill="#120c1c" opacity=".3" filter="url(#flou6)"/>`;
    return om + `<defs>${pe.defs.join('')}</defs><g transform="translate(${f(x)},${f(y)})">${svg}</g>`;
  };

  // ------------------------------------------------------------------ oiseaux
  // {espece:"colombe"|"oiseau", x, y, taille, sens, couleur, pose:"vol"|"pose"} : corps fuselé, queue en éventail, ailes à
  // deux rangs de plumes ; en vol, les ailes battent ; posé, l'aile est repliée et il sautille
  function oiseau(p) {
    const x = p.x ?? 540, y = p.y ?? 600, L = p.taille ?? 90, c = p.couleur || '#fbf8f2', sens = p.sens ?? 1, vol = p.pose !== 'pose', cs = sombre(c, .2), cl = B.clair(c, .16), bec = p.espece === 'oiseau' ? '#4a3a2c' : '#e0a052', q = (a, b) => `${f(a * L)},${f(b * L)}`;
    const corps = `M${q(.52, -.1)}C${q(.48, -.25)} ${q(.3, -.27)} ${q(.18, -.17)}C${q(0, -.12)} ${q(-.25, -.1)} ${q(-.46, -.02)}C${q(-.3, .1)} ${q(-.02, .22)} ${q(.2, .13)}C${q(.38, .06)} ${q(.5, .02)} ${q(.52, -.1)}Z`;
    let queue = '';
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .055; queue += `<path d="M${q(-.36, -.02)}L${q(-.72, -.06 + a * 2.2)}L${q(-.7, .02 + a * 2.2)}Z" fill="${i % 2 ? c : cs}"/>`; }
    const tete = `<path d="M${q(.5, -.15)}L${q(.63, -.1)}L${q(.5, -.06)}Z" fill="${bec}"/><circle cx="${f(L * .4)}" cy="${f(-L * .145)}" r="${f(L * .026)}" fill="#1a1210"/><circle cx="${f(L * .408)}" cy="${f(-L * .153)}" r="${f(L * .008)}" fill="#fff"/>`;
    const id = 'oi' + Math.round(x) + '_' + Math.round(y);
    const ventre = `<clipPath id="${id}"><path d="${corps}"/></clipPath><path d="${corps}" fill="${c}"/><g clip-path="url(#${id})"><path d="${corps}" fill="${cs}" transform="translate(0,${f(L * .1)})" opacity=".8"/><ellipse cx="${f(L * .18)}" cy="${f(L * .1)}" rx="${f(L * .22)}" ry="${f(L * .08)}" fill="${cl}" opacity=".7"/></g>`;
    const plumes = (n, lg, coul, dec) => { let s = ''; for (let i = 0; i < n; i++) { const k = i / (n - 1), a = -2.55 + k * 1.35, l = lg * (1 - Math.abs(k - .35) * .35), bx = .14 - k * .2 + dec, ex = bx + Math.cos(a) * l, ey = -.05 + Math.sin(a) * l, nx = -Math.sin(a), ny = Math.cos(a), w = .062 * (lg / .78 + .35), pt2 = (t, e) => q(bx + Math.cos(a) * l * t + nx * e, -.05 + Math.sin(a) * l * t + ny * e); s += `<path d="M${q(bx, -.05)}C${pt2(.35, w)} ${pt2(.8, w)} ${pt2(.97, w * .5)}Q${q(ex, ey)} ${pt2(.97, -w * .45)}C${pt2(.8, -w)} ${pt2(.35, -w)} ${q(bx, -.05)}Z" fill="${i % 2 ? coul : sombre(coul, .08)}"/>`; } return s; };
    const aile = (k) => { const coul = k ? sombre(c, .22) : sombre(c, .06); return `<g data-anim='{"type":"balance","amp":34,"periode":0.46,"phase":${k ? .35 : 0},"pivot":[${f(L * .08)},${f(-L * .05)}]}'>${plumes(8, .78, coul, k ? .06 : 0)}${plumes(6, .46, B.clair(coul, .08), k ? .06 : 0)}</g>`; };
    const repliee = `<path d="M${q(.24, -.1)}C${q(.1, -.16)} ${q(-.2, -.1)} ${q(-.5, .04)}C${q(-.2, .14)} ${q(.12, .14)} ${q(.24, -.1)}Z" fill="${sombre(c, .1)}"/><path d="M${q(.1, .03)}Q${q(-.12, .08)} ${q(-.38, .05)}M${q(.12, -.03)}Q${q(-.1, .02)} ${q(-.4, .03)}" stroke="${sombre(c, .34)}" stroke-width="${f(L * .014)}" fill="none" stroke-linecap="round"/>`;
    const pattes = `<path d="M${q(.04, .16)}L${q(.05, .3)}M${q(.01, .31)}H${f(L * .11)}M${q(.14, .14)}L${q(.16, .29)}M${q(.12, .3)}H${f(L * .22)}" stroke="${bec}" stroke-width="${f(L * .02)}" stroke-linecap="round" fill="none"/>`;
    const s = vol ? aile(1) + queue + ventre + tete + aile(0) : `<g data-anim='{"type":"flotte","amp":${f(L * .012)},"periode":1.1}'>${pattes}${queue}${ventre}${repliee}${tete}</g>`;
    return `<g transform="translate(${f(x)},${f(y)}) scale(${sens},1)">${s}</g>`;
  }

  // coq (ou poule) : {espece:"coq"|"poule", x, y (pattes : au sol ou sur un muret), taille (hauteur ≈ 80 à y_ref), sens,
  //  couleur, queue, pose:"debout"|"chante" (tête levée, bec ouvert, trois petits arcs : on l'entend sans bruitage)}
  function coq(p) {
    const x = p.x ?? 540, y = p.y ?? 1500, H = (p.taille ?? 80) * MONDE.kSol(p, p.y_sol ?? y), sens = p.sens ?? 1, poule = p.espece === 'poule', c = p.couleur || (poule ? '#b8793e' : '#9a4422'), qc = p.queue || '#1f3a2e', cr = '#d63a2c', jaune = '#e9b23c', chante = p.pose === 'chante', q = (a, b) => `${f(a * H)},${f(b * H)}`;
    const id = 'cq' + Math.round(x) + '_' + Math.round(y);
    let s = '';
    for (const dx of [-.07, .05]) s += `<path d="M${q(dx, -.32)}L${q(dx + .01, -.03)}" stroke="${sombre(jaune, dx < 0 ? .3 : .1)}" stroke-width="${f(H * .034)}" stroke-linecap="round"/><path d="M${q(dx - .06, 0)}L${q(dx + .01, -.035)}L${q(dx + .09, 0)}M${q(dx + .01, -.035)}L${q(dx + .03, .004)}" stroke="${jaune}" stroke-width="${f(H * .026)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    if (!poule) [[0, 1.02, .6, 0], [.06, .94, .66, .1], [.12, .82, .68, .22], [.17, .66, .66, .34], [.2, .5, .6, .42]].forEach(([a, h, l, b], i) => { s += `<path d="M${q(-.16, -.5)}C${q(-.26 - a, -h)} ${q(-l, -h + .08)} ${q(-l + .02, -.4 + b * .6)}C${q(-l + .1, -h + .28)} ${q(-.34 - a, -h + .2)} ${q(-.2, -.42)}Z" fill="${i % 2 ? B.clair(qc, .14) : qc}"/>`; });
    else s += `<path d="M${q(-.18, -.48)}L${q(-.44, -.8)}L${q(-.48, -.66)}L${q(-.44, -.56)}L${q(-.38, -.42)}Z" fill="${sombre(c, .18)}"/><path d="M${q(-.22, -.5)}L${q(-.42, -.72)}L${q(-.4, -.58)}Z" fill="${sombre(c, .05)}"/>`;
    const corps = `M${q(-.34, -.54)}C${q(-.34, -.26)} ${q(-.12, -.18)} ${q(.04, -.2)}C${q(.2, -.22)} ${q(.28, -.38)} ${q(.25, -.5)}C${q(.22, -.66)} ${q(.08, -.68)} ${q(-.04, -.62)}C${q(-.16, -.58)} ${q(-.32, -.68)} ${q(-.34, -.54)}Z`;
    s += `<clipPath id="${id}"><path d="${corps}"/></clipPath><path d="${corps}" fill="${c}"/><g clip-path="url(#${id})"><path d="${corps}" fill="${sombre(c, .34)}" transform="translate(0,${f(H * .17)})" opacity=".8"/><ellipse cx="${f(H * .14)}" cy="${f(-H * .5)}" rx="${f(H * .1)}" ry="${f(H * .12)}" fill="${B.clair(c, .18)}" opacity=".5"/></g>`;
    let aile = ''; for (let i = 0; i < 4; i++) aile += `<path d="M${q(.08 - i * .03, -.52 + i * .05)}C${q(-.02, -.56 + i * .06)} ${q(-.2 - i * .02, -.52 + i * .06)} ${q(-.3 + i * .03, -.4 + i * .04)}C${q(-.16, -.36 + i * .04)} ${q(0, -.36 + i * .03)} ${q(.08 - i * .03, -.52 + i * .05)}Z" fill="${i % 2 ? sombre(c, .14) : sombre(c, .3)}"/>`;
    s += aile;
    const hx = (chante ? .3 : .24) * H, hy = (chante ? -1.0 : -.86) * H, r = .085 * H, camail = poule ? sombre(c, .04) : B.mix(c, jaune, .5);
    s += `<path d="M${q(.0, -.6)}Q${f(.08 * H)},${f(hy + .1 * H)} ${f(hx - r * .7)},${f(hy)}L${f(hx + r * .7)},${f(hy + r * .3)}Q${q(.28, -.6)} ${q(.22, -.46)}Q${q(.18, -.52)} ${q(.14, -.44)}Q${q(.1, -.53)} ${q(.05, -.47)}Q${q(.04, -.56)} ${q(0, -.6)}Z" fill="${camail}"/><circle cx="${f(hx)}" cy="${f(hy)}" r="${f(r)}" fill="${poule ? c : B.mix(c, jaune, .36)}"/>`;
    for (const k of [.2, .5, .8]) s += `<path d="M${f(hx - r * .5 + k * r)},${f(hy + r * .9)}Q${f(B.lerp(.08, .2, k) * H)},${f(-.7 * H)} ${f(B.lerp(.04, .2, k) * H)},${f(-.52 * H)}" stroke="${sombre(camail, .24)}" stroke-width="${f(H * .012)}" fill="none" opacity=".6"/>`;
    const cs = poule ? .55 : 1;
    s += `<path d="M${f(hx - r * .9)},${f(hy - r * .55)}q${f(r * .05)},${f(-r * 1.1 * cs)} ${f(r * .5)},${f(-r * .25)}q${f(r * .2)},${f(-r * 1.2 * cs)} ${f(r * .58)},${f(-r * .1)}q${f(r * .35)},${f(-r * .95 * cs)} ${f(r * .65)},${f(r * .3)}q${f(-r * .7)},${f(r * .3)} ${f(-r * 1.73)},${f(r * .05)}Z" fill="${cr}"/><path d="M${f(hx + r * .45)},${f(hy + r * .65)}q${f(-r * .15)},${f(r * 1.2 * cs)} ${f(r * .25)},${f(r * 1.05 * cs)}q${f(r * .35)},${f(-r * .3)} ${f(r * .1)},${f(-r)}Z" fill="${sombre(cr, .12)}"/>`;
    const bx = hx + r * .85, by = hy + (chante ? -r * .15 : r * .1), bl = r * .8;
    s += `<g transform="rotate(${chante ? -18 : 0},${f(bx)},${f(by)})">` + (chante ? `<path d="M${f(bx)},${f(by - r * .24)}Q${f(bx + bl * .6)},${f(by - r * .6)} ${f(bx + bl)},${f(by - r * .42)}L${f(bx)},${f(by + r * .05)}Z" fill="${jaune}"/><path d="M${f(bx)},${f(by + r * .12)}L${f(bx + bl * .85)},${f(by + r * .42)}L${f(bx)},${f(by + r * .34)}Z" fill="${sombre(jaune, .2)}"/>` : `<path d="M${f(bx)},${f(by - r * .28)}Q${f(bx + bl * .7)},${f(by - r * .3)} ${f(bx + bl)},${f(by + r * .05)}L${f(bx)},${f(by + r * .05)}Z" fill="${jaune}"/><path d="M${f(bx)},${f(by + r * .03)}L${f(bx + bl * .9)},${f(by + r * .05)}L${f(bx)},${f(by + r * .28)}Z" fill="${sombre(jaune, .2)}"/>`) + `</g>`;
    s += `<circle cx="${f(hx + r * .3)}" cy="${f(hy - r * .12)}" r="${f(r * .22)}" fill="#fff3d6"/><circle cx="${f(hx + r * .34)}" cy="${f(hy - r * .12)}" r="${f(r * .13)}" fill="#1a1210"/>`;
    if (chante && p.cri !== false) for (let i = 1; i <= 3; i++) { const R = r * (1.1 + i * .55), cx = bx + bl + R * .5, cy = by - r * .4; s += `<path d="M${f(cx)},${f(cy - R * .6)}A${f(R)},${f(R)} 0 0 1 ${f(cx)},${f(cy + R * .6)}" fill="none" stroke="${p.couleur_cri || '#fff3d6'}" stroke-width="${f(H * .018)}" stroke-linecap="round" opacity="${f(.85 - i * .18)}" transform="rotate(-18,${f(bx)},${f(by)})"/>`; }
    return `<ellipse cx="${f(x)}" cy="${f(y + 1)}" rx="${f(H * .3)}" ry="${f(H * .04)}" fill="#120c1c" opacity=".26" filter="url(#flou4)"/><g transform="translate(${f(x)},${f(y)}) scale(${sens},1)">${s}</g>`;
  }
  MONDE.ANIMAUX = [...Object.keys(ESPECES), 'colombe', 'oiseau', 'coq', 'poule'];
})(typeof window !== 'undefined' ? window : globalThis);
