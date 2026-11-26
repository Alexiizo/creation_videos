// Habits : le corps vêtu (buste, jambes, chaussures, bras, manches), la robe, le manteau, la ceinture, les cols. Chaque
// partie est une pile de coupes (formes.js) ; tout ce qui est « sur » le tissu (plis, ourlet, manteau, encolure) est posé
// sur la surface de la pile : il suit le corps dans toutes les poses et toutes les vues.
(function (G) {
  const B = G.B, RIG = G.RIG, F = G.FORMES, V = RIG.v, f = B.f;
  const { add, sub, mul, dot, cross, norm, rot, app } = V;
  const R = B.rad;
  const M_COUPES = 4;                                  // coupes intermédiaires par intervalle (F.adoucir)
  const I = { cou: 0, trapeze: 1, epaule: 2, aisselle: 3, poitrine: 4, cotes: 5, taille: 6, hanches: 7, bas: 8 };
  const i4 = (n) => I[n] * M_COUPES;                   // indice d'une coupe nommée dans la pile adoucie
  const LOINTAIN = .09;                                // le bras et la jambe du fond sont un peu plus sombres (ils se détachent)
  const OURLET = 1.93, OURLET_GENOUX = 1.42;           // où finit la robe le long de la jambe (1 = genou, 2 = cheville)
  const TENSION = 10;                                    // passes : le bord du tissu devient la corde entre ses appuis
  const TRAVERSE = 9, AISANCE = 1.6;                    // u : jusqu'où l'anneau suit une jambe hors de son plan ; jeu entre la jambe et le tissu
  const ENJAMBEE = 13, OURLET_COURSE = 1.45;           // u : au-delà de cet écart (demi), l'ourlet remonte un peu (jamais au-dessus du mollet) au lieu de s'ouvrir en voile
  const TENTE = 8;                                     // u : genoux plus hauts que ça (assis par terre) : le tissu fait une tente
  const CUISSE_DEVANT = 7, GENOU_HAUT = 6;            // u : un genou aussi loin devant ET plus haut que le bassin = la cuisse passe devant le vêtement
  const CONTACT_MAIN = 2.2;                            // u : une main à moins de (rayon de la cuisse + ça) y est posée
  const BRAS_DEVANT = 2.2;                             // u : vu de face, le bras qui pend est devant le flanc, pas derrière

  const CACHE_DOS = 4;                                 // u
  const COUDE = .96;                                   // l'avant-bras repeint sur son calque commence au coude

  // ------------------------------------------------------------------ le buste
  function coupesBuste(K) {
    const { M, P, T, Pf, L, u } = K, sw = L.sw, hw = L.hw, gr = .9 + M.corp * .25, g = K.vetu ? .75 * u : 0;
    const t = (c, y, z, rx, rz) => F.coupe(add(c, app(T, [0, y * u, z * u])), mul(T.x, rx + g), mul(T.z, rz + g));
    // assis, le bas du vêtement se pose sur les cuisses : ses coupes basculent (l'avant remonte)
    const flex = R(B.clamp((K.flex - 20) / 70) * 90);
    const releve = 3 * B.clamp((K.flex - 95) / 40);                   // genoux relevés : le bas du vêtement remonte sous les cuisses
    const serre = 1 - .1 * B.clamp((K.flex - 20) / 70);               // assis, le bas du vêtement se pose, il ne s'évase pas
    const p = (c, y0, z, rx0, rz, k) => { const an = flex * k, y = y0 + releve, rx = rx0 * serre, az = add(mul(Pf.z, Math.cos(an)), mul(Pf.y, Math.sin(an))); return F.coupe(add(c, app(Pf, [0, (y + 5.6 * Math.sin(an)) * u, (z - .6 * Math.sin(an)) * u])), mul(Pf.x, rx + g), mul(az, rz + g)); };
    const zp = M.fem ? .55 : .15, rzP = (M.fem ? 5.5 : 5.0) * u * gr, rxT = sw * (M.fem ? .7 : .8);
    return [
      t(P.cou, 1.0, .25, 2.35 * u, 2.2 * u), t(P.cou, -.8, -.3, 4.0 * u, 2.7 * u), t(P.cou, -3.2, -.45, sw + .5 * u, 3.4 * u),
      t(P.cou, -6.6, .05, sw + .25 * u, 4.4 * u), t(P.poitrine, -.6, zp, sw * .95, rzP), t(P.ventre, 5.4, .25, B.lerp(sw * .95, rxT, .62), rzP * .95),
      t(P.ventre, .2, .15, rxT, (4.3 + M.corp * 2.1) * u),
      p(P.O, 1.2, -.1, hw + (M.fem ? 4.0 : 3.3) * u, (4.6 + M.corp * 1.2) * u, .16), p(P.O, -3.0, -.2, hw + (M.fem ? 4.3 : 3.5) * u, 4.9 * u, .34),
    ];
  }

  // ------------------------------------------------------------------ la robe : taille → hanches → le long des jambes → ourlet
  function coupesRobe(K, base, longueur = K.M.haut.longueur) {
    const { M, S, P, Pf, L, u, q } = K;
    const mid = (n) => V.lerp3(P[n + '_av'], P[n + '_ar'], .5), ec = (n) => sub(P[n + '_av'], P[n + '_ar']);
    const H = mid('hanche'), Kn = mid('genou'), A = mid('cheville'), eH = ec('hanche'), eK = ec('genou'), eA = ec('cheville');
    const dH = norm(sub(Kn, H)), dB = norm(sub(A, Kn)), ax = norm(add(S.jambes.av.ax, S.jambes.ar.ax));
    const phi = Math.acos(B.clamp(dot(dH, dB), -1, 1)) * 180 / Math.PI, sg = dot(cross(dH, dB), ax) < 0 ? -1 : 1;
    const axe = (s) => rot(dH, ax, sg * phi * B.ease('sinus', B.clamp((s - .4) / 1.2)));
    const pos = F.membre(H, Kn, A, () => u).pos;
    const ecart = (s) => s <= 1 ? V.lerp3(eH, eK, s) : V.lerp3(eK, eA, s - 1);
    const reperes = (s) => { const a = axe(s), e1 = norm(sub(Pf.x, mul(a, dot(Pf.x, a)))); return [e1, norm(cross(a, e1))]; };
    const demi = (s) => Math.abs(dot(ecart(s), reperes(s)[1])) / 2;
    // l'ourlet a une circonférence finie : en grande enjambée il remonte, les mollets sortent dessous
    let fin = longueur === 'chevilles' ? OURLET : OURLET_GENOUX;
    while (fin > OURLET_COURSE && demi(fin) > ENJAMBEE * u) fin -= .02;
    // à genoux, les mollets couchés : l'ourlet laisse voir les pieds
    const couches = B.clamp((.35 + dB[1]) / .5);
    fin = Math.min(fin, B.lerp(OURLET, 1.66, couches));
    const rayon = F.profil([[0, 4.5], [.5, 4.55], [1, 4.7], [1.5, 5.3], [2, 6.0]].map(([s, r]) => [s, r * u * (.92 + M.corp * .16)]));
    const oB = K.sec?.bassin || [0, 0];
    // où chaque jambe traverse le plan de l'anneau : le tissu passe toujours devant le genou qui monte et derrière le talon
    const traverse = (k, s, c, a) => {
      const Hj = P['hanche_' + k], Gj = P['genou_' + k], Cj = P['cheville_' + k], p = s <= 1 ? V.lerp3(Hj, Gj, s) : V.lerp3(Gj, Cj, s - 1);
      const t = norm(V.lerp3(norm(sub(Gj, Hj)), norm(sub(Cj, Gj)), B.ease('sinus', B.clamp((s - .85) / .3))));
      return add(p, mul(t, B.clamp(-dot(sub(p, c), a) / Math.max(.5, dot(t, a)), -TRAVERSE * u, TRAVERSE * u)));
    };
    const etendue = (s) => {
      const [e1, e2] = reperes(s), d = ecart(s), dz = Math.abs(dot(d, e2)) / 2, r = rayon(s), c = pos(s), a = axe(s), large = dz + Math.max(3.4 * u, r * .95 - dz * .3);
      let devant = large, derriere = large;
      for (const j of ['av', 'ar']) { const z = dot(sub(traverse(j, s, c, a), c), e2), rj = L.r_tibia[0] + AISANCE * u; devant = Math.max(devant, z + rj); derriere = Math.max(derriere, rj - z); }
      return { s, c, e1, e2, cote: Math.abs(dot(d, e1)) / 2 + r, devant, derriere };
    };
    const coupeDe = ({ s, c, e1, e2, cote, devant, derriere }) => { const k = B.clamp((s - .3) / 1.6); return F.coupe(add(c, mul(e2, (devant - derriere) / 2)), mul(e1, cote), mul(e2, (devant + derriere) / 2), [oB[0] * k * k, oB[1] * k * k]); };
    const anneau = (s) => coupeDe(etendue(s));
    // un tissu se tend d'un appui à l'autre : il ne rentre pas entre le mollet levé et la hanche
    const tendu = (l) => { for (let n = 0; n < TENSION; n++) l = l.map((x, i) => !i || i === l.length - 1 ? x : Object.assign({}, x, { devant: Math.max(x.devant, (l[i - 1].devant + l[i + 1].devant) / 2), derriere: Math.max(x.derriere, (l[i - 1].derriere + l[i + 1].derriere) / 2) })); return l; };
    const bassin = () => {
      const a = norm(add([0, -1, 0], mul(dH, .9))), e1 = norm(sub(Pf.x, mul(a, dot(Pf.x, a)))), e2 = norm(cross(a, e1));
      return F.coupe(add(P.O, app(Pf, [0, -1.2 * u, -.35 * u])), mul(e1, L.hw + (M.fem ? 5.0 : 4.5) * u), mul(e2, 5.7 * u));
    };
    const ss = [.3, .6, .85, 1, 1.15, 1.4, 1.65, 1.8].filter(s => s < fin - .05).concat([fin]);
    const cps = [base, bassin(), ...tendu(ss.map(etendue)).map(coupeDe)];
    // assis par terre, accroupi : entre la cuisse et le mollet, le tissu fait une tente
    const k = B.clamp((Kn[1] - Math.max(H[1], A[1]) - 3 * u) / (TENTE * u));
    const tente = k > 0 ? [anneau(B.lerp(1, .15, k)), anneau(1), anneau(B.lerp(1, fin, k))] : null;
    return { cps, fin, anneau, tente, iGenou: 2 + ss.indexOf(1) };
  }

  // ------------------------------------------------------------------ jambes, chaussures
  const PIED = [[-2.15, 1.0, 2.3], [-1.2, 1.65, 3.5], [.5, 1.85, 3.75], [2.3, 2.0, 2.95], [4.1, 2.1, 2.1], [5.4, 1.6, 1.5], [6.0, .8, .9]];      // le long du pied : position, demi-largeur, hauteur (u)
  function chaussure(K, k) {
    const { M, P, S, L, u, pe, pr, peau, tint } = K, j = S.jambes[k], A = P['cheville_' + k], ft = j.ft, bas = rot(ft, j.ax, 90), cote = norm(cross(ft, bas)), ch = M.chaussures;
    const nu = ch.type === 'pieds_nus' || ch.type === 'sandales', c = nu ? peau : tint(ch.couleur);
    const sol = L.cheville, ep = ch.type === 'baskets' ? .95 : ch.type === 'sandales' ? .55 : nu ? 0 : .6;
    const kp = nu ? .9 : 1;
    const pt = (x, y) => add(A, add(mul(ft, x * u), mul(bas, sol - y * u)));
    const anneaux = (hMax, bas0, larg) => PIED.map(([x, w, h]) => { const hh = Math.min(h * kp, hMax); return F.coupe(pt(x * (nu ? .95 : 1), bas0 + hh / 2), mul(cote, w * larg * u), mul(bas, hh / 2 * u)); });
    let s = '';
    const dessus = F.dPile(pr, anneaux(9, ep, 1), 18);
    if (ch.type === 'bottes') s += pe.forme(F.dPile(pr, F.membre(add(A, mul(j.s, -9 * u)), add(A, mul(j.s, -4 * u)), A, () => L.r_tibia[1] * 1.55, { boule: false })), c, { taille: 3 * u });
    s += pe.forme(dessus, c, { taille: 3 * u, decal: .2 });
    if (ep) s += pe.forme(F.dPile(pr, anneaux(ep, 0, 1.06), 18), ch.type === 'baskets' ? '#f4f1ea' : ch.type === 'sandales' ? tint(B.sombre(ch.couleur, .12)) : B.sombre(c, .35), { taille: 1.2 * u, decal: .3 });
    const ligne = (pts, coul, l) => `<path d="${B.lisse(pts.map(([x, y, z]) => pr(add(pt(x, y), mul(cote, z * u)))), false, .5)}" fill="none" stroke="${coul}" stroke-width="${f(l * u)}" stroke-linecap="round"/>`;
    if (ch.type === 'sandales') {
      const cl = tint(ch.couleur), arc = (x, h, w) => [[x, .7, -w], [x, h * .8, -w * .8], [x, h, 0], [x, h * .8, w * .8], [x, .7, w]];
      s += ligne(arc(3.3, 2.65, 1.95), cl, .62) + ligne(arc(1.4, 3.55, 1.75), cl, .55) + ligne([[-1.9, 2.4, 0], [-.6, 3.4, 1.2], [.5, 3.9, 0], [-.6, 3.4, -1.2], [-1.9, 2.4, 0]], cl, .5);
    } else if (ch.type === 'baskets') {
      const cl = B.lum(c) > .6 ? B.sombre(c, .25) : '#f4f1ea';
      for (const [x, h] of [[1.5, 4.45], [2.3, 3.85], [3.1, 3.3]]) s += ligne([[x, h - .25, -.75], [x + .1, h, 0], [x, h - .25, .75]], cl, .28);
    }
    return s;
  }
  function jambes(K, robe) {
    const { M, S, P, L, u, pe, pr, Z, peau, tint, ctx } = K;
    const bas = M.bas, type = bas ? bas.type || 'pantalon' : null, couvre = bas && type !== 'short' && type !== 'jupe';
    const cBas = bas ? tint(bas.couleur) : peau;
    const un = (k) => {
      const j = S.jambes[k], H = P['hanche_' + k], Kn = P['genou_' + k], A = P['cheville_' + k], loin = Z(H) < Z(P.O) - .01;
      const teinte = c => loin ? B.teinte(c, ctx.ombre, LOINTAIN) : c;
      const g = couvre ? .85 * u : 0, rC = L.r_cuisse, rT = L.r_tibia;
      const r = F.profil([[0, rC[0] + g], [.55, B.lerp(rC[0], rC[1], .5) + g * .9], [1, Math.max(rC[1], rT[0]) + g * .75], [1.35, rT[0] + g * .9], [2, rT[1] + g * (couvre ? 1.15 : 0)]]);
      const H2 = add(H, mul(j.d, (2.2 + 1.6 * B.clamp((K.flex - 20) / 70)) * u));
      const peauJ = couvre ? '' : F.dPile(pr, F.membre(H2, Kn, A, r, robe ? { s0: Math.max(.9, robe.fin - .35) } : {}));
      let s = '', pied = chaussure(K, k), piedFond = Z(add(A, mul(j.ft, 3 * u))) < Z(A) - .6 * u;
      if (piedFond) s += pied;
      if (couvre) {
        const fin = 1.93, cps = F.membre(H2, Kn, A, r, { s1: fin }), d = F.dPile(pr, cps), dernier = cps[cps.length - 1];
        s += pe.forme(d, teinte(cBas), { taille: rC[1] * 2, decal: .22 });
        // le revers et le pli du genou, seulement quand ils se voient
        const cr = pe.decoupe(d), plie = Math.acos(B.clamp(dot(j.d, j.s), -1, 1)) * 180 / Math.PI;
        const bande = F.dPile(pr, [F.coupe(cps.pos(fin - .07), mul(dernier.a, 1.04), mul(dernier.b, 1.04)), dernier], 18);
        s += `<path d="${bande}" fill="${B.teinte(teinte(cBas), ctx.ombre, .16)}"/>`;
        if (plie > 30) { const pl = add(Kn, mul(norm(sub(j.s, j.d)), rT[0] * .55)), dir = norm(add(j.d, j.s)), p0 = pr(add(pl, mul(dir, -1.8 * u))), p1 = pr(pl), p2 = pr(add(pl, mul(dir, 1.8 * u))); s += `<g clip-path="url(#${cr})"><path d="${B.lisse([p0, p1, p2], false, .5)}" fill="none" stroke="${B.teinte(cBas, ctx.ombre, .5)}" stroke-width="${f(.4 * u)}" stroke-linecap="round" opacity="${f(.4 * B.clamp((plie - 30) / 40))}"/></g>`; }
      } else {
        s += pe.forme(peauJ, teinte(peau), { taille: rT[0] * 2, decal: .2 });
        if (type === 'short') { const cps = F.membre(H2, Kn, A, s0 => r(s0) + 1.1 * u, { s1: .62 }); s += pe.forme(F.dPile(pr, cps), teinte(cBas), { taille: rC[0] * 2 }); }
      }
      if (!piedFond) s += pied;
      const z = Z(Kn) * .6 + Z(H) * .4;
      // genoux relevés devant le ventre (assis par terre, accroupi) : la cuisse passe devant le buste ; assis sur un siège,
      // elle sort de SOUS le vêtement
      const devant = Z(Kn) > Z(P.O) + CUISSE_DEVANT * u && Kn[1] > P.O[1] + GENOU_HAUT * u;
      return { z: devant ? Math.max(z, K.zT + .03) : Math.min(z, K.zT - .01 * (k === 'ar' ? 2 : 1)), svg: s };
    };
    const jav = un('av'), jar = un('ar');
    let bassin = '';
    if (!robe && bas && type !== 'jupe') {
      const e = F.ellipse(pr, add(P.O, app(K.Pf, [0, .2 * u, -.4 * u])), [mul(K.Pf.x, L.hw + (M.fem ? 3.6 : 3.0) * u), mul(K.Pf.y, 4.6 * u), mul(K.Pf.z, 4.9 * u)]);
      bassin = pe.forme(F.dEllipse(e), cBas, { taille: e.ry * 1.2 });
    }
    let jupe = '';
    if (!robe && type === 'jupe') {
      const r = coupesRobe(K, F.coupe(add(P.ventre, app(K.T, [0, .1 * u, .1 * u])), mul(K.T.x, L.sw * (M.fem ? .72 : .82) + .8 * u), mul(K.T.z, 5.2 * u)), 'genoux'), pile = F.adoucir(r.cps, 4), cj = B.teinte(cBas, ctx.ombre, .24), d = [F.dPile(pr, pile), r.tente ? F.dPile(pr, r.tente) : ''].filter(Boolean), n = pile.length - 1;
      jupe = pe.forme(d, cBas, { taille: L.sw * 1.5 }) + `<g clip-path="url(#${pe.decoupe(d)})">${[[-52, -60, 9], [-14, -18, 10], [26, 30, 10], [62, 70, 8], [150, 150, 10], [210, 212, 10]].map(([a, b, w]) => `<path d="${F.dTissu(K, pile, F.rangsPli(4, n, R(a), R(b), R(w), { pointe: .85, ouvert: true }), .05 * u)}" fill="${cj}" opacity=".45"/>`).join('')}<path d="${F.dBande(K, pile, 0, 1.1, .12 * u)}" fill="${B.teinte(cBas, ctx.ombre, .14)}"/></g>`;
    }
    return { av: jav, ar: jar, bassin, jupe };
  }

  // ------------------------------------------------------------------ bras et manches
  function bras(K, k, b, opts) {
    const { M, S, P, L, u, pe, pr, Z, face, peau, tint, ctx } = K;
    const Sh = add(P['epaule_' + k], app(S.T, [0, -.9 * u, .1 * u])), E = P['coude_' + k], W = P['poignet_' + k];
    // (lointain par rapport à l'autre épaule : se pencher n'éloigne pas les deux)
    const loin = Z(P['epaule_' + k]) < Z(P['epaule_' + (k === 'av' ? 'ar' : 'av')]) - 3 * u, teinte = c => loin ? B.teinte(c, ctx.ombre, LOINTAIN) : c;
    const veste = K.veste, m = veste ? 'longues' : M.haut.manches, larges = M.haut.larges ?? M.haut.col === 'tunique';
    const rB = L.r_bras, rA = L.r_avbras, g = .7 * u;
    const peauR = F.profil([[0, rB[0]], [.5, rB[0] * .94], [1, rB[1]], [1.3, rA[0] * 1.02], [2, rA[1] * .92]]);
    const fin = m === 'aucune' || !K.vetu ? 0 : m === 'courtes' ? .56 : m === 'trois_quarts' ? 1.45 : larges ? 1.84 : 1.9;
    const manche = larges
      ? F.profil([[0, rB[0] + g * .75], [.6, rB[0] + g * .9], [1, rB[1] + g * 1.35], [1.5, rA[0] + g * 1.35], [fin, rA[1] + g * 1.75]])
      : F.profil([[0, rB[0] + g * .75], [.6, rB[0] + g * .7], [1, rB[1] + g], [1.5, rA[0] + g * .7], [2, rA[1] + g * .55]]);
    const dMembre = (rayon, s0, s1) => { const cps = F.membre(Sh, E, W, rayon, { s0, s1, boule: s0 === 0 }); return { cps, d: F.dPile(pr, cps), fin: cps[cps.length - 1] }; };
    const cM = teinte(veste ? tint(M.manteau.couleur) : K.cHaut), cP = teinte(peau);
    const versNous = face(b.f) > .04;                        // l'avant-bras vient vers nous : on voit l'ouverture de la manche, la main devant
    const mainG = G.MAINS.dessiner(K, k, b, W, opts);
    const objet = opts.objet ? opts.objet(K, k, b, W, mainG.g) : { avant: '', apres: '' };
    const mainSvg = objet.avant + mainG.svg + objet.apres;
    // le bras est peint d'un seul tenant ; l'avant-bras est repeint sur un calque à part (il passe devant une cuisse, une
    // robe, une joue — ou DERRIÈRE le buste, vu de dos), découpé DANS la même peinture : aucune couture au coude
    const calque = (s0, s1) => {
      let s = '';
      const clip = (d, svg) => s0 > 0 || s1 < 2 ? `<g clip-path="url(#${pe.decoupe(d)})">${svg}</g>` : svg;
      if (s1 < 2) {                        // le haut du bras seul
        const r0 = fin ? manche : peauR, tout = dMembre(r0, 0, Math.min(2, fin || 2)), part = dMembre(x => r0(x) + .4 * u, 0, s1);
        return clip(part.d, pe.forme(tout.d, fin ? cM : cP, { taille: rB[1] * 2, decal: .22, ombre: fin ? pe.degrade(pr(Sh), pr(V.lerp3(Sh, E, .62)), [[.1, cM], [1, B.teinte(cM, ctx.ombre, .2)]]) : undefined }));
      }
      const nu = dMembre(peauR, 0, 2), nuP = s0 > 0 ? dMembre(x => peauR(x) + .4 * u, s0, 2) : nu;
      const poignetVisible = fin < 2;
      let peauS = poignetVisible ? clip(nuP.d, pe.forme(nu.d, cP, { taille: rB[1] * 2, decal: .2 })) : '';
      if (!fin) return peauS + mainSvg;
      const ma = dMembre(manche, 0, fin);
      const om = s0 === 0 ? pe.degrade(pr(Sh), pr(V.lerp3(Sh, E, .62)), [[.1, cM], [1, B.teinte(cM, ctx.ombre, .2)]]) : B.teinte(cM, ctx.ombre, .2);
      const maP = s0 > 0 && fin > s0 ? dMembre(x => manche(x) + .3 * u, s0, fin) : ma;
      let mancheS = fin > s0 ? clip(maP.d, pe.forme(ma.d, cM, { taille: rB[1] * 2, decal: .22, ombre: om })) : '';
      if (fin > s0) {
        // l'ourlet de la manche et son ouverture
        const av = F.coupe(ma.cps.pos(fin - .06), mul(ma.fin.a, 1.02), mul(ma.fin.b, 1.02));
        mancheS += `<path d="${F.dPile(pr, [av, ma.fin], 18)}" fill="${B.teinte(cM, ctx.ombre, .13)}"/>`;

        // l'ouverture vue de face : un creux dans l'ombre du tissu, plus sombre au fond (pas un disque gris uni)
        if (versNous) { const pts = F.enveloppe(F.ptsCoupe(pr, ma.fin, 20)), c0 = pr(ma.fin.c), r0 = Math.max(...pts.map(p => Math.hypot(p[0] - c0[0], p[1] - c0[1]))); mancheS += `<path d="${F.dPts(pts)}" fill="${pe.rond(c0, r0, [[0, B.teinte(cM, ctx.ombre, .62)], [.7, B.teinte(cM, ctx.ombre, .42)], [1, B.teinte(cM, ctx.ombre, .22)]])}"/>`; }
      }
      if (fin < 1.5) return peauS + mancheS + mainSvg;                       // manches courtes : le bras nu sort de la manche
      if (!versNous) return peauS + mainSvg + mancheS;
      const poignet = dMembre(peauR, Math.max(s0, fin - .015), 2);            // la main et le poignet sortent de l'ouverture
      return mancheS + pe.forme(poignet.d, cP, { taille: rA[1] * 2, decal: .2 }) + mainSvg;
    };
    const zMain = Z(W), z3 = Z(E) * .3 + zMain * .7;
    // l'ombre de contact du bras sur le vêtement : floue, absente à l'épaule (le bras y tient au buste)
    let ombre = '';
    if (K.idBuste && (zMain + Z(E)) / 2 > K.zT) {
      const ma = dMembre(x => (fin ? manche(x) : peauR(x)), 0, 2), dg = pe.degrade(pr(Sh), pr(E), [[.25, ctx.ombre, 0], [.9, ctx.ombre, .34], [1, ctx.ombre, .34]]);
      ombre = `<g clip-path="url(#${K.idBuste})"><path d="${ma.d}" fill="${dg}" filter="${pe.flou(.55 * u)}" transform="translate(${f(-ctx.lumiere[0] * 2.4 * u)},${f(1.0 * u)})"/></g>`;
    }
    const cu = cuisseTouchee(K, W);
    const zz = Math.max(Z(E), zMain) * .55 + Z(Sh) * .45;
    // un bras du côté de la caméra passe devant la robe et le manteau (penché, la robe couvrait la manche)
    const zBras = (Z(Sh) + Z(E)) / 2 + BRAS_DEVANT * u, zHaut = !loin && zBras > K.zT - 4 * u && Number.isFinite(K.zRobe) ? Math.max(zBras, K.zRobe + .06) : zBras, cache = face(S.T.z) < .1 && zMain < K.zT - CACHE_DOS * u && zHaut > K.zT;      // vu de dos, les mains devant la poitrine : l'avant-bras passe derrière le buste
    if (cache) return { z: zHaut, svg: calque(0, COUDE + .1), z2: Math.min(z3, K.zT - u), arriere: () => calque(COUDE - .1, 2), main: mainG };
    // un bras levé le long de la tête passe à côté d'elle : devant si c'est le bras proche, derrière si c'est le lointain
    const zT0 = Z(P.tete), leve = dot(b.d, S.T.y) > .45 && Math.abs(dot(b.d, S.T.x)) < .5;
    const autre = Z(P['epaule_' + (k === 'av' ? 'ar' : 'av')]);
    if (leve && Z(P['epaule_' + k]) < autre - 4 * u) return { z: Math.min(zHaut, zT0 - K.L.tz), svg: calque(0, 2), z2: -Infinity, main: mainG };
    if (leve && Z(P['epaule_' + k]) > autre + 4 * u) return { z: Math.max(zHaut, zT0 + .1 * u), svg: ombre + calque(0, 2), z2: -Infinity, devantTete: true, main: mainG };
    return { z: zHaut, svg: ombre + calque(0, 2), z2: cu === null ? z3 : Math.max(zz, cu + .01, (K.zRobe ?? -Infinity) + .01), avant: () => calque(COUDE, 2), main: mainG };
  }
  // la main est-elle posée sur une cuisse ? → la profondeur de cette jambe, sinon null
  function cuisseTouchee(K, W) {
    const { P, L, u } = K;
    let best = null, dmin = Infinity;
    for (const k of ['av', 'ar']) {
      const H = P['hanche_' + k], Kn = P['genou_' + k], hk = sub(Kn, H), t = B.clamp(dot(sub(W, H), hk) / Math.max(1e-6, dot(hk, hk))), d = V.len(sub(W, add(H, mul(hk, t))));
      if (t > .15 && d < L.r_cuisse[1] + CONTACT_MAIN * u && d < dmin) { dmin = d; best = K.zJambe[k]; }
    }
    return best;
  }

  // ------------------------------------------------------------------ détails du haut
  function cou(K) {
    const { P, S, M, L, u, pe, pr, peau, peauO, H } = K;
    const bas = add(P.cou, app(S.T, [0, -.6 * u, .1 * u])), haut = add(P.tete, app(H, [0, -L.ty * .5, -L.tz * .22]));
    const r = L.r_cou, ax = norm(sub(haut, bas)), n1 = norm(sub(S.T.x, mul(ax, dot(S.T.x, ax)))), n2 = cross(n1, ax);
    const cps = [F.coupe(bas, mul(n1, r * 1.25), mul(n2, r * 1.1)), F.coupe(V.lerp3(bas, haut, .35), mul(n1, r), mul(n2, r)), F.coupe(haut, mul(n1, r * .98), mul(n2, r))];
    const d = F.dPile(pr, F.adoucir(cps, 3));
    // l'ombre du menton sur le cou
    const o = F.ellipse(pr, add(P.tete, app(H, [0, -L.ty * .86, L.tz * .1])), [mul(H.x, L.tx * .8), mul(H.y, L.ty * .42), mul(H.z, L.tz * .8)]);
    return pe.forme(d, peau, { taille: r * 2 }) + `<g clip-path="url(#${pe.decoupe(d)})"><path d="${F.dEllipse(o, 0, 1.0 * u)}" fill="${peauO}" opacity=".55"/></g>`;
  }
  // l'encolure : la peau visible sous le cou et le bord du vêtement, posés sur le buste
  const ENCOLURES = { rond: [5.6, 52], tunique: [6.2, 50], v: [11, 46], chemise: [8.5, 38], capuche: [5.2, 46] };      // profondeur (indice de coupe), demi-ouverture (degrés)
  function encolure(K, cps) {
    const { M, pe, u, peau, peauO, ctx, cTorse } = K, col = M.haut.col, [prof, ouv] = ENCOLURES[col] || ENCOLURES.rond;
    const n = 10, tBas = prof, pointe = col === 'v' || col === 'chemise', bord = [];
    for (let i = 0; i <= n; i++) { const k = i / n; bord.push([B.lerp(1.3, tBas, k), R(ouv) * (pointe ? 1 - k : Math.sqrt(1 - k * k * .999))]); }
    const peauD = F.dTissu(K, cps, [[0, -R(ouv) * 1.15, R(ouv) * 1.15], ...bord.map(([t, th]) => [t, -th, th])], .12 * u);
    if (!peauD) return '';
    const cs = B.teinte(cTorse, ctx.ombre, .24);
    const ligne = F.dLigne(K, cps, [...bord.map(([t, th]) => [t, -th]), ...bord.slice().reverse().map(([t, th]) => [t, th])], .2 * u);
    let s = `<path d="${peauD}" fill="${B.mix(peau, peauO, .35)}"/><path d="${ligne}" fill="none" stroke="${cs}" stroke-width="${f((col === 'capuche' ? .5 : .85) * u)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (col === 'tunique') s += `<path d="${F.dTissu(K, cps, F.rangsPli(tBas * .9, 12.5, 0, 0, R(5.5), { pointe: .35 }), .15 * u)}" fill="${B.teinte(cTorse, ctx.ombre, .34)}"/>`;
    if (col === 'chemise') {
      for (const sd of [-1, 1]) s += `<path d="${F.dTissu(K, cps, [[.2, sd > 0 ? R(8) : -R(52), sd > 0 ? R(52) : -R(8)], [3, sd > 0 ? R(6) : -R(40), sd > 0 ? R(40) : -R(6)], [6.2, sd > 0 ? R(9) : -R(26), sd > 0 ? R(26) : -R(9)], [8.2, sd > 0 ? R(15) : -R(17), sd > 0 ? R(17) : -R(15)]], .35 * u)}" fill="${B.clair(cTorse, .22)}" stroke="${cs}" stroke-width="${f(.22 * u)}"/>`;
      s += `<path d="${F.dLigne(K, cps, [[5, 0], [12, 0], [20, 0], [27, 0]], .2 * u)}" fill="none" stroke="${cs}" stroke-width="${f(.3 * u)}"/>`;
      for (const t of [9, 13, 17, 21]) { const p = F.projette(K, F.ptSurface(cps, t, R(3), .3 * u)); if (K.face(K.T.z) > .1) s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(.34 * u)}" fill="${cs}"/>`; }
    }
    if (col === 'capuche') {
      for (const th of [-9, 9]) s += `<path d="${F.dLigne(K, cps, [[2.4, R(th * 1.3)], [6, R(th)], [11, R(th * .9)]], .4 * u)}" fill="none" stroke="${B.clair(cTorse, .5)}" stroke-width="${f(.42 * u)}" stroke-linecap="round"/>`;
      s += `<path d="${F.dTissu(K, cps, [[21, -R(30), R(30)], [24, -R(38), R(38)], [28.5, -R(42), R(42)]], .1 * u)}" fill="${B.teinte(cTorse, ctx.ombre, .1)}" stroke="${B.teinte(cTorse, ctx.ombre, .28)}" stroke-width="${f(.28 * u)}"/>`;
    }
    return s;
  }
  // la capuche baissée : un bourrelet autour du cou (le dos derrière la nuque, les bords sur la poitrine)
  function capuche(K) {
    const { P, T, u, pe, pr, cTorse, ctx } = K, morceau = (a0, a1) => {
      const cps = [];
      for (let i = 0; i <= 10; i++) {
        const an = B.lerp(a0, a1, i / 10), dos = (1 - Math.cos(an)) / 2, c = add(P.cou, app(T, [Math.sin(an) * B.lerp(3.1, 4.4, dos) * u, B.lerp(-1.7, .1, Math.sqrt(dos)) * u, (Math.cos(an) * B.lerp(2.9, 3.8, dos) - .3) * u])), r = B.lerp(.32, 2.0, dos) * u;
        cps.push(F.sphere(c, r));
      }
      return F.dPile(pr, cps, 16);
    };
    const c = B.teinte(cTorse, ctx.ombre, .06);
    return { dos: pe.forme([morceau(Math.PI * .55, Math.PI), morceau(Math.PI, Math.PI * 1.45)], c, { taille: 4 * u, decal: .2 }), devant: pe.forme([morceau(0, Math.PI * .55), morceau(-Math.PI * .55, 0)], c, { taille: 3 * u, decal: .16 }) };
  }

  // ------------------------------------------------------------------ le buste, la robe, le manteau : les calques
  function corps(K) {
    const { M, S, P, T, Pf, L, u, pe, pr, Z, face, tint, ctx } = K, longueur = M.haut.longueur;
    const robeLongue = longueur === 'genoux' || longueur === 'chevilles';
    const cb = coupesBuste(K), calques = [];
    const enJupe = !robeLongue && M.bas && M.bas.type === 'jupe';                 // le haut rentre dans la jupe
    const bustePile = robeLongue || longueur === 'taille' || enJupe ? cb.slice(0, I.taille + 1) : cb;
    if (longueur === 'taille') bustePile[bustePile.length - 1] = F.coupe(add(P.ventre, app(T, [0, -.6 * u, .1 * u])), cb[I.taille].a, cb[I.taille].b);
    K.flexTaille = cb[I.hanches];
    const buste = F.adoucir(bustePile, M_COUPES);
    const robe = robeLongue ? coupesRobe(K, cb[I.taille]) : null;
    const jupe = robe ? F.adoucir(robe.cps, M_COUPES) : null;
    K.piles = { buste, jupe, entier: jupe ? buste.concat(jupe.slice(1)) : buste, iTaille: buste.length - 1 };
    // sous la robe, le buste descend un peu plus bas, plus étroit qu'elle : aucun bord à la taille
    const dBuste = [F.dPile(pr, robe || enJupe ? F.adoucir([...cb.slice(0, I.taille + 1), F.coupe(V.lerp3(cb[I.taille].c, cb[I.hanches].c, .6), mul(cb[I.taille].a, .86), mul(cb[I.taille].b, .86))], M_COUPES) : buste)];
    // l'épaule et le bras partagent leur arrondi : du cou à l'épaule, une seule pente
    const bc = pr(add(P.cou, app(T, [0, -1.3 * u, -.3 * u])));
    for (const k of ['av', 'ar']) dBuste.push(F.dCapsule(bc, pr(add(P['epaule_' + k], app(T, [0, -.9 * u, .1 * u]))), 1.5 * u, L.r_bras[0] + (K.vetu ? .52 * u : 0)));
    // le haut de la robe : seulement sa moitié tournée vers nous (entière, quand on se penche, son bord de derrière remonterait
    // par-dessus le buste)
    const dJupe = jupe ? [F.dPile(pr, jupe.map((c, i) => i < 4 ? Object.assign({}, c, { demi: K.cam }) : c)), robe.tente ? F.dPile(pr, robe.tente) : ''].filter(Boolean) : [];
    K.idBuste = pe.decoupe([...dBuste, ...dJupe]);
    K.robe = robe;
    const jb = jambes(K, robe);
    K.zJambe = { av: jb.av.z, ar: jb.ar.z };
    K.zRobe = robe || jb.jupe ? Math.max(K.zT, jb.av.z, jb.ar.z) + .5 * u : -Infinity;
    calques.push({ z: jb.ar.z, svg: jb.ar.svg }, { z: jb.av.z, svg: jb.av.svg });

    // --- le buste
    const cT = K.vetu ? K.cTorse : K.peau, cs = B.teinte(cT, ctx.ombre, .2);
    let s = jb.bassin + pe.forme(dBuste, cT, { taille: L.sw * 1.5, decal: .13 });
    if (K.vetu) {
      // les plis doux du tissu : sous l'aisselle et à la taille
      for (const [t0, t1, a0, a1, w] of [[11, 19, 62, 30, 7], [11, 19, -62, -30, 7], [19, 25, 40, 64, 6], [19, 25, -40, -64, 6]]) s += `<path d="${F.dTissu(K, buste, F.rangsPli(t0, t1, R(a0), R(a1), R(w)), .05 * u)}" fill="${cs}" opacity=".4"/>`;
      if (!robe && longueur !== 'taille' && !enJupe) s += `<path d="${F.dBande(K, buste, (buste.length - 1) - 1.7, buste.length - 1, .06 * u)}" fill="${B.teinte(cT, ctx.ombre, .1)}"/>`;
      if (K.veste) {
        const ci = K.cHaut;
        s += `<path d="${F.dTissu(K, buste, [[0, -R(40), R(40)], [4, -R(26), R(26)], [10, -R(17), R(17)], [20, -R(13), R(13)], [buste.length - 1, -R(15), R(15)]], .08 * u)}" fill="${ci}"/>`;
        for (const sd of [-1, 1]) s += `<path d="${F.dTissu(K, buste, [[.5, ...(sd > 0 ? [R(30), R(64)] : [-R(64), -R(30)])], [5, ...(sd > 0 ? [R(20), R(44)] : [-R(44), -R(20)])], [13, ...(sd > 0 ? [R(14), R(22)] : [-R(22), -R(14)])]], .5 * u)}" fill="${B.teinte(cT, ctx.ombre, .14)}"/>`;
      }
      s += encolure(K, buste);
      if (M.haut.motif && face(T.z) > 0) s += `<g transform="${F.matrice(pr, F.ptSurface(buste, i4('poitrine'), 0, .2 * u).p, T.x, mul(T.y, -1))}"><g transform="scale(${f(u / 4.7)})">${M.haut.motif}</g></g>`;
    }
    if (M.bandes) s += bandes(K, buste, pe.decoupe(dBuste));
    calques.push({ z: K.zT, svg: s });
    if (M.haut.col === 'capuche' && K.vetu) { const c = capuche(K); calques.push({ z: Math.max(K.zT + .01, Math.min(Z(add(P.cou, app(T, [0, 0, -4.4 * u]))), Z(P.tete) - .01)), svg: c.dos }, { z: K.zT + .02, svg: c.devant }); }      // (de dos, la capuche passe sous la tête et les cheveux qui tombent dessus)

    // --- la robe
    if (robe) {
      const cr = K.cHaut, n = jupe.length - 1, cp = B.teinte(cr, ctx.ombre, .24), cl = B.clair(cr, .16);
      let r = pe.forme(dJupe, cr, { taille: L.sw * 1.7, decal: .15 });
      const clip = pe.decoupe(dJupe);
      let plis = '';
      for (const [t0, a0, a1, w, c] of [[3, -64, -70, 9, cp], [5, -34, -40, 12, cp], [2, -6, -10, 10, cp], [6, 22, 27, 13, cp], [4, 52, 62, 10, cp], [3, -48, -54, 5, cl], [4, 8, 9, 5, cl], [3, 38, 45, 5, cl], [4, 120, 112, 12, cp], [4, 180, 180, 13, cp], [4, 240, 250, 12, cp]])
        plis += `<path d="${F.dTissu(K, jupe, F.rangsPli(t0 + (K.flex > 45 ? 5 : 0), n - .05, R(a0), R(a1), R(w), { pointe: .85, ouvert: true }), .05 * u)}" fill="${c}" opacity="${c === cl ? .4 : .5}"/>`;
      plis += `<path d="${F.dBande(K, jupe, n - .9, n, .05 * u)}" fill="${B.teinte(cr, ctx.ombre, .12)}" opacity=".55"/>`;
      r += `<g clip-path="url(#${clip})">${plis}</g>`;


      if (M.ceinture !== false) r += ceinture(K, jupe);
      if (M.bandes) r += bandes(K, jupe, clip);
      calques.push({ z: K.zRobe, svg: r });
    } else if (jb.jupe) calques.push({ z: K.zRobe, svg: jb.jupe });
    else if (M.ceinture) calques.push({ z: K.zT + .01, svg: `<path d="${F.dBande(K, buste, i4('taille') - .6, i4('taille') + .6, .3 * u)}" fill="${tint(M.ceinture)}"/>` });
    if (M.manteau && M.manteau.type === 'drape') calques.push(...manteau(K));
    if (M.manteau && M.manteau.type === 'cape') calques.push(...cape(K));
    return calques;
  }
  // des bandes de linge enroulées autour du corps (le Lazare qui sort du tombeau : « lié de bandes », Jean 11:44)
  function bandes(K, pile, clip) {
    const { M, u, ctx } = K, n = pile.length - 1, c = B.teinte(M.bandes, ctx.ombre, .3), pas = Math.max(1.6, n / 9);
    let d = '';
    for (let t = .6; t < n; t += pas) { const pts = []; for (let k = 0; k <= 10; k++) { const th = -Math.PI / 2 + k / 10 * Math.PI + R(K.S.yaw) * -1; pts.push([B.clamp(t + Math.sin(k / 10 * Math.PI * 1.1 + t) * pas * .42, 0, n), th]); } d += F.dLigne(K, pile, pts, .05 * u); }
    return `<g clip-path="url(#${clip})"><path d="${d}" fill="none" stroke="${c}" stroke-width="${f(.42 * u)}" stroke-linecap="round" opacity=".6"/></g>`;
  }
  // une ceinture d'étoffe nouée : une bande qui fait le tour, un nœud, deux pans qui tombent
  function ceinture(K, jupe) {
    const { M, u, pe, ctx, tint, face, pr } = K, c = tint(M.ceinture || B.teinte(M.haut.couleur, '#5a3f28', .55)), cs = B.teinte(c, ctx.ombre, .3);
    const { entier, iTaille } = K.piles;
    let s = `<path d="${F.dBande(K, entier, iTaille - .55, iTaille + .6, .42 * u)}" fill="${c}"/><path d="${F.dBande(K, entier, iTaille + .28, iTaille + .6, .42 * u)}" fill="${cs}" opacity=".5"/>`;
    const th = -R(20), nd = F.ptSurface(entier, iTaille + .05, th, .9 * u);
    const n = norm(add(mul(K.T.x, Math.sin(th)), mul(K.T.z, Math.cos(th))));
    if (face(n) > .05) {
      for (const [da, t1, w] of [[-3, 7.2, 5], [5, 6.2, 5]]) s += `<path d="${F.dTissu(K, jupe, [[.6, th - R(2), th + R(2)], [3, th + R(da - w * .5), th + R(da + w * .5)], [t1, th + R(da * 1.4 - w * .75), th + R(da * 1.4 + w * .75)]], .4 * u)}" fill="${da < 0 ? cs : c}"/>`;
      const p = pr(nd.p);
      s += pe.forme(F.dCercle(p, 1.15 * u), c, { taille: 2 * u, decal: .3 });
    }
    return s;
  }
  // le manteau : une étoffe jetée sur l'épaule GAUCHE (toujours la même, quel que soit le sens où il regarde) ; elle tombe
  // droit devant jusqu'au mollet et couvre le dos, posée sur la surface du corps
  const PAN = { devant: [[1, 30, 96], [8, 22, 80], [16, 10, 64], [24, 3, 60]], dos: [[1, 96, 150], [8, 104, 176], [16, 106, 206], [24, 106, 222]] };
  const MANTEAU_FIL = 2.4;             // u : un pan qui n'est jamais plus large que ça n'est pas dessiné (vu de tranche, un fil rouge le long du corps)
  const MANTEAU_MINCE = .32;           // radians : vu de tranche, le pan du manteau ne laisse pas un fil de couleur le long du corps
  function manteau(K) {
    const { M, u, pe, pr, Z, P, T, ctx, tint, face } = K, { entier, iTaille, jupe } = K.piles;
    const c = tint(M.manteau.couleur), cs = B.teinte(c, ctx.ombre, .34), cl = B.clair(c, .1);
    const n = entier.length - 1, couche = Math.abs(K.q.penche || 0) > 72;
    // debout, il tombe au mollet ; à genoux, il s'arrête au sol (les mollets sont couchés) ; assis, le pan de devant suit les
    // cuisses et on est assis sur celui du dos ; par terre ou accroupi, il rentre dans la ceinture
    const mollets = norm(add(K.S.jambes.av.s, K.S.jambes.ar.s)), pend = -mollets[1] > .55, tente = K.robe && K.robe.tente, assis = K.flex > 45;
    const iG = jupe ? iTaille + K.robe.iGenou * M_COUPES : iTaille;
    const finDevant = !jupe || tente ? iTaille + .5 : pend ? B.lerp(iTaille, n, .86) : iG - .5, finDos = !jupe || tente || assis ? iTaille + .5 : finDevant;
    const etend = (rangs, g, d, fin) => { const der = rangs[rangs.length - 1], o = rangs.slice(); for (let i = 1; i <= 8; i++) { const k = i / 8; o.push([B.lerp(der[0], fin, k), B.lerp(der[1], g, k), B.lerp(der[2], d, k)]); } return o; };
    const dense = (rangs) => { const o = []; for (let i = 0; i < rangs.length - 1; i++) for (let k = 0; k < 5; k++) o.push(rangs[i].map((x, j) => B.lerp(x, rangs[i + 1][j], k / 5))); o.push(rangs[rangs.length - 1]); return o; };
    const rad = (rangs) => rangs.map(([t, a, b]) => [t, R(a), R(b)]);
    const ep = 1.15 * u, out = [];
    const peint = (rangs, plis) => {
      const r = rad(dense(rangs)), d = F.dTissu(K, entier, r, ep, MANTEAU_MINCE, MANTEAU_FIL * u);
      if (!d) return '';
      const clip = pe.decoupe(d);
      let s = pe.forme(d, c, { taille: K.L.sw * 1.1, decal: .16, k_ombre: .3 });
      let inner = '';
      for (const [k0, k1, w, coul, t0, t1] of plis) {
        const rr = [];
        for (let i = 0; i <= 12; i++) { const j = i / 12, t = B.lerp(t0, r[r.length - 1][0] * t1, j), q = rangA(r, t), l = (q[2] - q[1]), th = q[1] + l * B.lerp(k0, k1, j), ww = l * w * Math.pow(Math.sin(Math.PI * Math.pow(j, .7) * .5), 1.1); rr.push([t, th - ww / 2, th + ww / 2]); }
        if (t0 < r[r.length - 1][0]) inner += `<path d="${F.dTissu(K, entier, rr, ep)}" fill="${coul}" opacity=".6"/>`;
      }
      return s + `<g clip-path="url(#${clip})">${inner}</g>`;
    };
    const rangA = (r, t) => { for (let i = 1; i < r.length; i++) if (t <= r[i][0]) { const k = (t - r[i - 1][0]) / Math.max(1e-6, r[i][0] - r[i - 1][0]); return [t, B.lerp(r[i - 1][1], r[i][1], k), B.lerp(r[i - 1][2], r[i][2], k)]; } return [t, r[r.length - 1][1], r[r.length - 1][2]]; };
    if (!couche) {
      const devant = jupe ? etend(PAN.devant, -2, 58, finDevant) : PAN.devant, dos = jupe ? etend(PAN.dos, 106, 236, finDos) : PAN.dos;
      const plisD = [[.82, .86, .22, cs, 3, 1], [.35, .4, .16, cs, 9, 1], [.6, .62, .09, cl, 5, 1]], plisA = [[.3, .28, .12, cs, 6, 1], [.62, .66, .14, cs, 8, 1], [.47, .5, .06, cl, 6, 1]];
      const zR = Number.isFinite(K.zRobe) ? K.zRobe : K.zT;
      // le haut (buste) et le bas (robe) sont deux calques : assis ou penché, la robe passe devant la tête du côté des
      // jambes — le haut du manteau, lui, reste sous la barbe
      const moitie = (rangs, haut) => { const g = dense(rangs).filter(q => haut ? q[0] <= iTaille + .45 : q[0] >= (assis ? iG - 5 : iTaille - 1.6)); return g.length > 1 ? g : null; };
      for (const [rangs, plis, dz] of [[dos, plisA, .02], [devant, plisD, .04]]) {
        const h = moitie(rangs, true), b = jupe && rangs[rangs.length - 1][0] > iTaille + 1 && moitie(rangs, false);      // (le bas passe par-dessus la ceinture ; s'il n'y en a pas, le haut y rentre)
        // un pan se voit en entier (du haut au bas) ou pas du tout : de profil, il n'en resterait qu'un ruban sous la ceinture
        const haut = h ? peint(h, plis) : '';
        if (!haut) continue;
        out.push({ z: K.zT + dz, svg: haut, manteau: true });
        if (b) out.push({ z: zR + dz, svg: peint(b, plis.map(q => [...q.slice(0, 4), b[0][0], 1])) });
      }
    }
    void pr; void Z; void P; void T; void face;
    return out;
  }
  function cape(K) {
    const { M, u, pe, ctx, tint, P, T } = K, { entier, iTaille, jupe } = K.piles, c = B.teinte(tint(M.manteau.couleur), ctx.ombre, .12), n = entier.length - 1;
    const rangs = [[1, R(70), R(290)], [8, R(86), R(274)], [iTaille, R(84), R(276)], [jupe ? n - 2 : n, R(76), R(284)]];
    const d = F.dTissu(K, entier, rangs, 2.2 * u);
    void P; void T;
    return d ? [{ z: (Number.isFinite(K.zRobe) ? K.zRobe : K.zT) + .02, svg: pe.forme(d, c, { taille: K.L.sw * 1.4 }) }] : [];
  }

  G.HABITS = { corps, bras, cou, coupesBuste, coupesRobe, I, OURLET };
})(typeof window !== 'undefined' ? window : globalThis);
