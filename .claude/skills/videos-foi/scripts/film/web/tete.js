// Tête : visage, oreilles, cheveux, barbe, coiffes. Le visage est un seul volume (crâne + mâchoire) au dégradé doux ; les
// traits, la ligne des cheveux, les mèches, la barbe sont des contours posés sur ce volume (azimut, élévation) : ils
// tournent avec la tête et épousent la silhouette au lieu de la traverser.
(function (G) {
  const B = G.B, F = G.FORMES, V = G.RIG.v, f = B.f;
  const { add, mul, norm, app, dot } = V;
  const ENCRE = '#2a1d16';
  const OEIL = { az: .37, el: -.01, rx: .78, ry: 1.02 };                 // yeux-points : place (radians), taille (u)
  const MACHOIRE = { y: -3.0, z: .7, x: .81, h: .6, p: .74 };             // centre (u), demi-axes (part de la tête)
  const BOUCHE_Y = -3.75;                                                // u sous le centre de la tête
  const VISEMES = { X: [0, 1, 0, 0, 0], A: [0, .9, 0, 0, 0], B: [.22, 1, 0, 1, 0], C: [.42, 1.05, 0, 1, 0], D: [.7, 1, 0, 1, .3], E: [.45, .75, .6, 0, 0], F: [.25, .55, 1, 0, 0], G: [.15, .95, 0, 1, 0], H: [.4, .95, 0, 1, .8] };   // [ouverture, largeur, rondeur, dents, langue] (Rhubarb)
  const OREILLES_CACHEES = ['long', 'mi_long', 'boucles_longues', 'tresse', 'afro'], COIFFES_FERMEES = ['voile', 'keffieh', 'capuche'], COIFFES_COUVRANTES = [...COIFFES_FERMEES, 'turban', 'bonnet', 'casquette', 'casque'];
  const N_BOUCLES = 110, N_LISIERE = 30;
  const MAIN = 8, MAIN_PRES = 2.4, MAIN_FONDU = 1.8;                      // u : longueur de la main ; distance de l'œil à la main où il se ferme, puis se rouvre
  const SANS_FAVORIS = ['degarni', 'chauve', 'rase'];
  const miroir = (c) => c.map(([az, el]) => [-az, el]);

  // ------------------------------------------------------------------ contours (azimut, élévation) sur le crâne
  const CAPS = { court: [[0, .7, -.62], .02, 1.07], boucles: [[0, .7, -.62], .02, 1.05], rase: [[0, .7, -.62], .02, 1.015], long: [[0, .6, -.75], -.14, 1.07], mi_long: [[0, .6, -.75], -.14, 1.07], boucles_longues: [[0, .6, -.75], -.14, 1.06], tresse: [[0, .62, -.74], -.08, 1.05], chignon: [[0, .64, -.72], -.02, 1.045], queue: [[0, .64, -.72], -.02, 1.045], afro: [[0, .55, -.6], -.22, 1.24] };
  // une coupe courte : la ligne du front en vague, les tempes nettes, les pattes
  const COURT = [[-1.47, -.14], [-1.33, -.02], [-1.27, .24], [-1.06, .47], [-.8, .6], [-.5, .58], [-.2, .49], [.12, .46], [.45, .52], [.75, .6], [1.0, .52], [1.24, .28], [1.33, -.02], [1.47, -.14], [1.75, .25], [1.6, .8], [.9, 1.2], [0, 1.35], [-.9, 1.2], [-1.6, .8], [-1.75, .25]];
  // cheveux longs : un rideau de chaque côté de la raie, du sommet à la tempe, derrière la joue
  const rideau = (raie) => [[raie - .06, 1.12], [raie + .02, .78], [raie + .2, .62], [.62, .47], [.86, .27], [1.0, .03], [1.07, -.25], [1.1, -.52], [1.25, -.85], [1.8, -1.05], [2.6, -.95], [2.9, -.2], [2.6, .5], [1.9, .85], [1.2, 1.15]];
  const COURONNE = [[1.0, .06], [1.16, .3], [1.6, .46], [2.2, .53], [2.8, .53], [3.2, .53], [3.55, .36], [3.55, -.5], [3.2, -.67], [2.8, -.68], [2.4, -.66], [1.85, -.5], [1.5, -.34], [1.32, -.2]];      // (les deux moitiés se recouvrent derrière : une seule couronne)
  // la barbe sur la mâchoire : le bord du haut (joues, coins de la bouche, dessous du nez), puis le dessous du menton
  const BARBE = [[-1.5, .16], [-1.25, .06], [-.95, -.04], [-.68, -.05], [-.5, .05], [-.28, .2], [0, .22], [.28, .2], [.5, .05], [.68, -.05], [.95, -.04], [1.25, .06], [1.5, .16], [1.8, -.2], [1.5, -.75], [.8, -1.15], [0, -1.3], [-.8, -1.15], [-1.5, -.75], [-1.85, -.2]];
  const COLLIER = [[-1.5, .16], [-1.25, .0], [-.95, -.14], [-.68, -.28], [-.42, -.36], [0, -.38], [.42, -.36], [.68, -.28], [.95, -.14], [1.25, .0], [1.5, .16], [1.8, -.2], [1.5, -.75], [.8, -1.15], [0, -1.3], [-.8, -1.15], [-1.5, -.75], [-1.85, -.2]];
  const FAVORI = [[1.32, .22], [1.56, .22], [1.66, -.2], [1.62, -.55], [1.4, -.64], [1.26, -.34]];

  function dessiner(K, opts) {
    const { M, S, P, L, u, pe, pr, Z, face, tint, peau, peauO, ctx, H: Hf } = K;
    const C = P.tete, hs = M.hs, uh = u * hs, tx = L.tx, ty = L.ty, tz = L.tz, sw = L.sw;
    const h = (x, y, z) => add(C, app(Hf, [x, y, z])), hu = (x, y, z) => h(x * uh, y * uh, z * uh);
    const crane = { c: hu(0, .9, -.4), m: [mul(Hf.x, tx), mul(Hf.y, ty * .98), mul(Hf.z, tz)] };
    const machoire = { c: hu(0, MACHOIRE.y, MACHOIRE.z), m: [mul(Hf.x, tx * MACHOIRE.x * (M.fem ? .95 : M.enfant ? 1.02 : 1)), mul(Hf.y, ty * MACHOIRE.h * (M.enfant ? .92 : 1)), mul(Hf.z, tz * MACHOIRE.p)] };
    const gonfle = (e, k, d = [0, 0, 0]) => ({ c: add(e.c, app(Hf, d)), m: e.m.map(a => mul(a, k)) });
    const sansTraits = M.traits === 'aucun';
    const oT = K.sec?.tete || [0, 0], zTete = Z(C);
    const masses = [];                     // ce qui pend derrière ou sur le côté : { z, svg, dessus }
    const ch = M.cheveux, st = ch.style, chc = tint(ch.couleur), chO = B.teinte(ch.couleur, ctx.ombre, .34), chL = B.clair(chc, .13);
    const co = M.coiffe, coc = co ? tint(co.couleur) : null, couvert = co && COIFFES_COUVRANTES.includes(co.type), ferme = co && COIFFES_FERMEES.includes(co.type);

    // --- le visage : crâne et mâchoire en une seule silhouette
    const ptsT = F.enveloppe(F.ptsEllipse(F.ellipse(pr, crane.c, crane.m), 34).concat(F.ptsEllipse(F.ellipse(pr, machoire.c, machoire.m), 30)));
    let dVisage = B.lisse(ptsT, true, .5);
    // le nez dépasse dès qu'on n'est plus de face : arête → pointe → base
    const rn = (M.fem || M.enfant ? .82 : 1) * uh;
    if (face(Hf.z) < .96 && !sansTraits) dVisage += ' ' + B.lisse(F.enveloppe([[0, 1.0, -.55], [0, .1, .55], [0, -.75, 1.25], [0, -1.15, 1.12], [0, -1.6, -.2], [.75, -1.15, -.35], [-.75, -1.15, -.35]].map(([x, y, z]) => pr(h(x * rn, (y - .2) * uh, tz * .95 + z * rn)))), true, .5);
    const c0 = pr(C), Lx = ctx.lumiere[0], Ly = ctx.lumiere[1];
    const teint = pe.rond([c0[0] + Lx * tx * .55, c0[1] + Ly * ty * .3], tx * 2.05, [[0, B.clair(peau, .05)], [.5, peau], [.82, B.mix(peau, peauO, .38)], [1, B.mix(peau, peauO, .7)]]);
    const idV = pe.decoupe(dVisage);
    let tete = `<path d="${dVisage}" fill="${teint}"/>`;

    // --- les traits
    const v = opts.v || {};
    const surf = (az, el, prof = 1) => {
      const q = F.dirSphere(az, el), n = app(Hf, norm([q[0] / tx, q[1] / ty, q[2] / tz]));
      return { p: h(q[0] * tx * prof, q[1] * ty * prof, q[2] * tz * prof), n, t1: app(Hf, norm([Math.cos(az) * tx, 0, -Math.sin(az) * tz])), t2: app(Hf, norm([-Math.sin(az) * Math.sin(el) * tx, -Math.cos(el) * ty, -Math.cos(az) * Math.sin(el) * tz])), vis: face(n) };
    };
    const colle = (s3, g, op = 1) => `<g transform="${F.matrice(pr, s3.p, s3.t1, s3.t2)}" opacity="${f(op)}">${g}</g>`;
    let traits = '';
    const rose = v.rougit ? .42 : M.maquillage ? .26 : M.enfant ? .24 : .17;
    if (!sansTraits) for (const sd of [-1, 1]) {
      const s3 = surf(sd * .6, -.31);
      if (s3.vis > .12) traits += colle(s3, `<ellipse rx="${f(2.1 * uh)}" ry="${f(1.35 * uh)}" fill="${pe.rond([0, 0], 2.0 * uh, [[0, '#e0604c', rose], [.6, '#e0604c', rose * .5], [1, '#e0604c', 0]])}"/>`, B.clamp(s3.vis * 1.8));
    }
    if (M.taches && !sansTraits) { const s3 = surf(0, -.22); if (s3.vis > .2) traits += colle(s3, Array.from({ length: 10 }, (_, i) => `<circle cx="${f((i % 2 ? 1 : -1) * (1.6 + (i * .53) % 1.7) * uh)}" cy="${f(((i * .37) % .9) * uh)}" r="${f(.17 * uh)}" fill="${B.sombre(M.peau, .3)}" opacity=".5"/>`).join('')); }
    const cache = K.q.cible_av === 'visage' && K.q.cible_ar === 'visage';         // derrière les mains, les yeux sont fermés
    const cligne = opts.cligne ?? 1, regard = opts.regard || [0, 0];
    const mains = ['av', 'ar'].map(k => { const W = P['poignet_' + k], b = S.bras[k]; return [pr(W), pr(add(W, mul(b.h || b.f, MAIN * u)))]; }).filter(([, bout]) => bout[2] > pr(C)[2]);
    const cSourcil = M.vieux ? B.mix(M.cheveux.couleur, '#8f8a84', .5) : B.mix(M.cheveux.couleur === '#1c130d' ? ENCRE : B.sombre(M.cheveux.couleur, .25), ENCRE, .35);
    if (!sansTraits) for (const sd of [-1, 1]) {
      const s3 = surf(sd * OEIL.az, OEIL.el);
      if (s3.vis < .06) continue;
      // une main qui arrive devant l'œil (ou qui s'en retire) : il se ferme avant elle, rien ne dépasse entre les doigts
      const po = pr(s3.p), loinMain = Math.min(Infinity, ...mains.map(([a, b]) => F.distSegment(po, a, b))) / uh;
      const ouvO = v.ferme_doux || cache ? 0 : Math.max(0, (v.oeil ?? 1) * cligne * B.clamp((loinMain - MAIN_PRES) / MAIN_FONDU));
      const rx = OEIL.rx * uh * (M.enfant ? 1.1 : 1) * (M.fem ? 1.04 : 1), ry = OEIL.ry * uh * (M.enfant ? 1.08 : 1), ry2 = ry * Math.min(1.35, ouvO);
      let g = '';
      if (cache || loinMain < MAIN_PRES) { /* derrière les mains : rien à voir entre les doigts */ } else if (ouvO < .12 || v.ferme_doux) {
        const bas = v.ferme_doux ? .62 : .25;
        g += `<path d="M${f(-rx * 1.35)},${f(ry * .05)} Q0,${f(ry * 1.25 * bas)} ${f(rx * 1.35)},${f(ry * .05)}" fill="none" stroke="${ENCRE}" stroke-width="${f(.34 * uh)}" stroke-linecap="round"/>`;
        if (M.cils) g += `<path d="M${f(sd * rx * 1.3)},${f(ry * .06)} l${f(sd * .55 * uh)},${f(.28 * uh)}" stroke="${ENCRE}" stroke-width="${f(.24 * uh)}" stroke-linecap="round"/>`;
      } else {
        const ix = regard[0] * rx * .62, iy = (regard[1] + (v.regard_y || 0)) * ry * .42;
        g += `<ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${f(rx)}" ry="${f(ry2)}" fill="${ENCRE}"/>` +
          `<circle cx="${f(ix - Math.sign(Lx || -1) * -rx * .34)}" cy="${f(iy - ry2 * .36)}" r="${f(rx * .3)}" fill="#fff" opacity=".92"/><circle cx="${f(ix - rx * .28)}" cy="${f(iy + ry2 * .42)}" r="${f(rx * .14)}" fill="#fff" opacity=".4"/>`;
        // le sourire remonte la paupière du bas, la fatigue et la peine descendent celle du haut
        const pl = v.plisse || 0, pp = Math.min(.62, v.paupiere || 0);
        if (pl > .05) g += `<path d="M${f(-rx * 1.7)},${f(ry2 * (1.06 - pl * .6))} Q0,${f(ry2 * (.72 - pl * .62))} ${f(rx * 1.7)},${f(ry2 * (1.06 - pl * .6))} V${f(ry2 * 1.7)} H${f(-rx * 1.7)}Z" fill="${peau}"/>`;
        if (pp > .05) { const yp = -ry2 + 2 * ry2 * pp; g += `<path d="M${f(-rx * 1.6)},${f(-ry2 * 1.6)} H${f(rx * 1.6)} V${f(yp)} Q0,${f(yp - ry2 * .22)} ${f(-rx * 1.6)},${f(yp)}Z" fill="${peau}"/><path d="M${f(-rx * 1.25)},${f(yp)} Q0,${f(yp - ry2 * .2)} ${f(rx * 1.25)},${f(yp)}" fill="none" stroke="${ENCRE}" stroke-width="${f(.3 * uh)}" stroke-linecap="round"/>`; }
        else if (M.cils) g += `<path d="M${f(-sd * rx * .7)},${f(iy - ry2 * .86)} Q${f(sd * rx * .5)},${f(iy - ry2 * 1.3)} ${f(sd * rx * 1.5)},${f(iy - ry2 * .62)}" fill="none" stroke="${ENCRE}" stroke-width="${f(.26 * uh)}" stroke-linecap="round"/>`;
      }
      if (v.larmes) { const ph = ((opts.t || 0) * .55 + (sd > 0 ? .45 : 0)) % 1; g += `<path d="M${f(sd * rx * .25)},${f(ry * 1.15 + ph * 4.6 * uh)} q${f(-.5 * uh)},${f(.85 * uh)} 0,${f(1.3 * uh)} q${f(.5 * uh)},${f(-.45 * uh)} 0,${f(-1.3 * uh)}Z" fill="#cfe8ff" opacity="${f(.95 - ph * .7)}"/>`; }
      // le sourcil : un fuseau, épais vers le nez, effilé vers la tempe
      if (cache || loinMain < MAIN_PRES) continue;
      const sh = v.sour_h || 0, sa = v.sour_a || 0, by = -ry * (1.72 + sh * 1.5), bw = rx * 1.55, si = sd > 0 ? -1 : 1, k = B.rad(sa);
      const xi = si * bw, yi = by - Math.sin(k) * bw * .85, xo = -si * bw, yo = by + Math.sin(k) * bw * .5 + ry * .08, e1 = .3 * uh * (M.fem ? .78 : 1), xm = 0, ym = (yi + yo) / 2 - ry * .26;
      g += `<path d="M${f(xi)},${f(yi - e1)} Q${f(xm)},${f(ym - e1 * 1.1)} ${f(xo)},${f(yo)} Q${f(xm)},${f(ym + e1 * .9)} ${f(xi)},${f(yi + e1)} Q${f(xi + si * e1 * .8)},${f(yi)} ${f(xi)},${f(yi - e1)}Z" fill="${cSourcil}"/>`;
      traits += colle(s3, g, B.clamp((s3.vis - .06) / .22));
    }
    if (!sansTraits) {                   // le nez : l'ombre douce de son côté, et celle de sa base
      const s3 = surf(0, -.13), dx = -Math.sign(Lx || -1);
      if (s3.vis > .05) traits += colle(s3, `<path d="M${f(dx * .12 * uh)},${f(-1.5 * uh)} Q${f(dx * 1.0 * uh)},${f(.15 * uh)} ${f(dx * .82 * uh)},${f(.72 * uh)} Q0,${f(1.15 * uh)} ${f(-dx * .62 * uh)},${f(.72 * uh)} Q${f(dx * .22 * uh)},${f(.66 * uh)} ${f(dx * .12 * uh)},${f(-1.5 * uh)}Z" fill="${peauO}" opacity=".3"/>`, B.clamp(s3.vis * 1.5));
    }
    if (M.rides && !sansTraits) {
      const s3 = surf(0, .4); if (s3.vis > .2) traits += colle(s3, `<path d="M${f(-2.2 * uh)},0 q${f(2.2 * uh)},${f(-.5 * uh)} ${f(4.4 * uh)},0 M${f(-1.6 * uh)},${f(.95 * uh)} q${f(1.6 * uh)},${f(-.4 * uh)} ${f(3.2 * uh)},0" fill="none" stroke="${peauO}" stroke-width="${f(.24 * uh)}" stroke-linecap="round"/>`, .5);
      for (const sd of [-1, 1]) { const s4 = surf(sd * .72, .0); if (s4.vis > .2) traits += colle(s4, `<path d="M0,0 l${f(sd * .9 * uh)},${f(-.3 * uh)} M0,${f(.35 * uh)} l${f(sd * .9 * uh)},${f(.1 * uh)}" stroke="${peauO}" stroke-width="${f(.2 * uh)}" stroke-linecap="round"/>`, .5); }
    }

    // --- l'oreille : un pavillon et son creux, devant les cheveux courts
    let oreille = '';
    const cachee = OREILLES_CACHEES.includes(st) || ferme || (co && ['casque'].includes(co.type));
    if (!cachee) for (const sd of [-1, 1]) {
      const nrm = app(Hf, [sd, 0, -.15]);
      if (face(nrm) < -.5) continue;
      const cO = h(sd * tx * .97, -.75 * uh, -.75 * uh), av = [mul(Hf.x, .55 * uh), mul(Hf.y, 1.75 * uh), mul(Hf.z, 1.15 * uh)], eO = F.ellipse(pr, cO, av), dO = F.dEllipse(eO);
      const un = pe.forme(dO, B.mix(peau, peauO, .1), { taille: 3 * uh, decal: .12 }) + (face(nrm) > .12 ? `<path d="${F.dEllipse(F.ellipse(pr, add(cO, app(Hf, [sd * .35 * uh, .05 * uh, .12 * uh])), av.map(a => mul(a, .56))))}" fill="${peauO}" opacity=".5"/>` : '');
      if (face(nrm) < .12) tete = un + tete; else oreille += un;
    }

    // --- la barbe
    let barbe = '';
    const ba = M.barbe, cBa = ba ? tint(B.mix(ba.couleur, M.peau, .06)) : null, cBaO = ba ? B.teinte(ba.couleur, ctx.ombre, .4) : null;
    if (ba && ba.style !== 'moustache') {
      const ell = gonfle(machoire, ba.style === 'naissante' ? 1.01 : 1.055, [0, -.12 * uh, .1 * uh]), longue = ba.style === 'longue';
      const ds = [F.dEll(K, ell, ba.style === 'collier' ? COLLIER : BARBE, { min: .1 })];
      if (!SANS_FAVORIS.includes(st) && ba.style !== 'naissante') for (const sd of [-1, 1]) ds.push(F.dEll(K, gonfle(crane, 1.02), sd > 0 ? FAVORI : miroir(FAVORI), { min: .3 }));
      if (SANS_FAVORIS.includes(st)) for (const sd of [-1, 1]) ds.push(F.dEll(K, gonfle(crane, 1.02), sd > 0 ? FAVORI : miroir(FAVORI), { min: .3 }));
      if (longue) {
        // (elle part de sous la bouche : plus haut, la tête baissée, elle remontait sur les yeux)
        const cps = [[-.74, .42, .6, .32], [-1.0, .46, .56, .35], [-1.26, .46, .44, .3], [-1.52, .44, .25, .2], [-1.74, .4, .05, .06]].map(([y, z, a, b], i) => F.coupe(h(0, ty * y, tz * z), mul(Hf.x, tx * a), mul(Hf.z, tz * b), [oT[0] * .1 * i, oT[1] * .1 * i]));
        ds.push(F.dPile(pr, F.adoucir(cps, 4)));
      }
      const d = ds.filter(Boolean);
      if (d.length) {
        barbe += ba.style === 'naissante' ? `<path d="${d.join(' ')}" fill="${cBa}" opacity=".26"/>` : pe.forme(d, cBa, { taille: 6 * uh, decal: .08, k_ombre: .24 });
        if (ba.style !== 'naissante') {
          const cl = pe.decoupe(d), y0 = longue ? -1.35 : -.95;
          let poils = '';
          if (!longue) for (const az of [-1.1, -.7, -.3, .12, .5, .9, 1.25]) poils += F.dLigneEll(K, ell, [[az, -.42 - Math.abs(az) * .08], [az * .95, -.66], [az * .85, y0]]);
          else for (const x of [-.34, -.12, .1, .32]) poils += B.lisse([pr(h(tx * x, -ty * .82, tz * (.74 - Math.abs(x) * .3))), pr(h(tx * x * .86, -ty * 1.12, tz * (.72 - Math.abs(x) * .3))), pr(h(tx * x * .5, -ty * 1.42, tz * .62))], false, .5);
          barbe += `<g clip-path="url(#${cl})"><path d="${poils}" fill="none" stroke="${cBaO}" stroke-width="${f(.24 * uh)}" stroke-linecap="round" opacity=".32"/></g>`;
        }
      }
    }
    // vu de dos, la barbe pend devant la poitrine : elle est derrière la tête et le buste
    if (barbe && face(Hf.z) < -.12) { masses.push({ z: zTete - tz, svg: barbe }); barbe = ''; }
    // --- la bouche, sur la mâchoire
    if (!sansTraits) {
      const vm = surf(0, -.45), yM = BOUCHE_Y * uh, relY = (yM - MACHOIRE.y * uh) / (ty * MACHOIRE.h), zF = MACHOIRE.z * uh + tz * MACHOIRE.p * Math.sqrt(Math.max(0, 1 - relY * relY)) + .12 * u;
      const s3 = Object.assign({}, vm, { p: h(0, yM, zF) });
      if (vm.vis > .05) barbe += `<g clip-path="url(#${idV})">${colle(s3, bouche(K, opts, v, uh, ba, cBa, cBaO), B.clamp((vm.vis - .05) / .2))}</g>`;
    }

    // --- les cheveux
    const masse = (cps, coul, o = {}) => { const d = F.dPile(pr, F.adoucir(cps, 4)); masses.push({ z: o.z ?? Math.min(...cps.map(c => pr(c.c)[2])), svg: pe.forme(d, coul, { taille: 6 * u, decal: .14 }) + (o.traits ? `<g clip-path="url(#${pe.decoupe(d)})">${o.traits}</g>` : ''), dessus: o.dessus }); };
    const anneauH = (x, y, z, a, b, k = 0) => F.coupe(h(x, y, z), mul(Hf.x, a), mul(Hf.z, b), [oT[0] * k, oT[1] * k]);
    const anneauT = (x, y, z, a, b, k = 0) => F.coupe(add(P.cou, app(S.T, [x, y, z])), mul(S.T.x, a), mul(S.T.z, b), [oT[0] * k, oT[1] * k]);
    const long = st === 'long' || st === 'boucles_longues', fin = M.fem ? -12.5 : -4.4;
    if (!couvert || !ferme) {
      if (long) masse([anneauH(0, ty * .35, -tz * .3, tx * .98, tz * .72), anneauH(0, -ty * .3, -tz * .42, tx * 1.05, tz * .62, .2), anneauH(0, -ty * .95, -tz * .5, tx * 1.0, tz * .5, .5), anneauT(0, B.lerp(-1, fin, .5) * u, -3.2 * u, sw * .7, 2.4 * u, .8), anneauT(0, fin * u, -3.6 * u, sw * .5, 1.2 * u, 1), anneauT(0, (fin - 1.7) * u, -3.7 * u, sw * .3, .8 * u, 1), anneauT(0, (fin - 2.5) * u, -3.7 * u, sw * .08, .3 * u, 1)], chc);
      if (st === 'mi_long') masse([anneauH(0, ty * .35, -tz * .3, tx * .98, tz * .72), anneauH(0, -ty * .3, -tz * .4, tx * 1.07, tz * .64, .2), anneauH(0, -ty * .88, -tz * .42, tx * .98, tz * .5, .5), anneauH(0, -ty * 1.12, -tz * .4, tx * .72, tz * .34, .6)], chc);
      if (st === 'tresse') { const cps = [anneauH(0, -ty * .1, -tz * .95, 2.0 * u, 1.6 * u), anneauH(0, -ty * .75, -tz * .95, 1.9 * u, 1.5 * u, .4), anneauT(0, -8 * u, -5.4 * u, 1.6 * u, 1.3 * u, .8), anneauT(0, -16 * u, -5.6 * u, 1.0 * u, .9 * u, 1), anneauT(0, -19 * u, -5.6 * u, .3 * u, .3 * u, 1)]; masse(cps, chc); }
      if (st === 'chignon') masse([anneauH(0, ty * .78, -tz * .72, 1.4 * u, 1.4 * u), anneauH(0, ty * .62, -tz * .95, 3.1 * u, 2.6 * u), anneauH(0, ty * .28, -tz * 1.02, 2.9 * u, 2.4 * u), anneauH(0, ty * .1, -tz * .9, 1.2 * u, 1.2 * u)], chc);
      if (st === 'queue') masse([anneauH(0, ty * .42, -tz * .98, 1.1 * u, 1.1 * u), anneauH(0, ty * .28, -tz * 1.3, 2.1 * u, 1.7 * u, .3), anneauH(0, -ty * .25, -tz * 1.42, 2.5 * u, 1.8 * u, .7), anneauH(0, -ty * .85, -tz * 1.28, 1.8 * u, 1.3 * u, 1), anneauH(0, -ty * 1.2, -tz * 1.16, .25 * u, .25 * u, 1.1)], chc);
    }
    let dessus = '';
    const ellC = (k) => gonfle(crane, k, [0, .2 * u, -.12 * u]);
    if (CAPS[st] && !ferme) {
      const [n, d, k] = CAPS[st], cap = F.calotte(K, ellC(1.005), n, d, { k });
      if (st === 'rase') dessus += `<path d="${cap}" fill="${chc}" opacity=".55"/>`;
      else {
        const ds = [cap], ell2 = ellC(st === 'court' ? 1.05 : k + .012);
        // derrière le visage, la chevelure longue dépasse de son bord : aucun jour entre la joue et les mèches du fond
        if (['long', 'mi_long', 'boucles_longues'].includes(st) && !couvert) masses.push({ z: zTete - tz * .5, svg: `<path d="${F.calotte(K, ellC(1.06), [0, .72, -.69], -.66)}" fill="${B.teinte(chc, ctx.ombre, .12)}"/>` });
        if (!couvert) {
          if (st === 'court') ds.push(F.dEll(K, ell2, COURT, { min: .12 }));
          if (['long', 'mi_long', 'boucles_longues', 'tresse'].includes(st)) { const raie = ch.raie ?? (M.fem ? .24 : .04); for (const sd of [-1, 1]) ds.push(F.dEll(K, ell2, sd > 0 ? rideau(raie) : miroir(rideau(-raie)), { min: .1 })); }
          if (['boucles', 'afro', 'boucles_longues'].includes(st)) ds.push(...boucles(K, st, ellC, uh));
        }
        const d2 = ds.filter(Boolean);
        dessus += pe.forme(d2, chc, { taille: tx, decal: .1, k_ombre: .3 });
        if (d2.length && !couvert) {
          const cl = pe.decoupe(d2);
          let meches = '', clairs = '';
          if (st === 'court') { for (const [a, b] of [[-1.0, -1.15], [-.55, -.72], [.1, -.1], [.55, .5], [1.0, 1.1]]) meches += F.dLigneEll(K, ell2, [[a * .5, 1.22], [B.lerp(a * .5, b, .5), .95], [b, .66]]); clairs += F.dLigneEll(K, ell2, [[-.5, 1.05], [-.2, .86], [.15, .74]]) + F.dLigneEll(K, ell2, [[-.15, 1.15], [.25, .98], [.55, .84]]); }
          if (['long', 'mi_long', 'tresse'].includes(st)) { const raie = ch.raie ?? (M.fem ? .24 : .04); for (const sd of [-1, 1]) { const r0 = raie; for (const e of [.5, .95]) meches += F.dLigneEll(K, ell2, [[r0, 1.1 + e * .1], [sd * .55 + r0 * .5, .86 + e * .12], [sd * (1.05 + e * .15), .5 + e * .05], [sd * (1.22 + e * .22), .05], [sd * (1.24 + e * .25), -.45]]); clairs += F.dLigneEll(K, ell2, [[sd * .35 + r0, .98], [sd * .75, .78], [sd * 1.08, .42]]); } meches += F.dLigneEll(K, ell2, [[raie, .78], [raie * .9, 1.1], [raie * .6, 1.5]]); }
          if (['queue', 'chignon'].includes(st)) for (const az of [-1.35, -.8, -.25, .3, .85, 1.4]) meches += F.dLigneEll(K, ell2, [[az, .66 - Math.abs(az) * .3], [az * 1.12, .95 - Math.abs(az) * .18], [az * 1.6, 1.08 - Math.abs(az) * .15]]);
          dessus += `<g clip-path="url(#${cl})" fill="none" stroke-linecap="round"><path d="${meches}" stroke="${chO}" stroke-width="${f(.3 * uh)}" opacity=".5"/><path d="${clairs}" stroke="${chL}" stroke-width="${f(.5 * uh)}" opacity=".7"/></g>`;
        }
      }
      if (st === 'queue' && !couvert) { const e = F.ellipse(pr, h(0, ty * .4, -tz * 1.02), [mul(Hf.x, 1.3 * u), mul(Hf.y, 1.3 * u), mul(Hf.z, .8 * u)]); masses.push({ z: Z(h(0, ty * .4, -tz * 1.02)) + .2, svg: `<path d="${F.dEllipse(e)}" fill="${B.teinte(chc, '#a8645a', .5)}"/>` }); }
      if (ch.frange && !couvert) dessus += pe.forme(F.dEll(K, ellC(1.09), [[-1.05, .42], [-.8, .24], [-.4, .2], [0, .22], [.4, .2], [.8, .24], [1.05, .42], [.8, .95], [0, 1.1], [-.8, .95]]), chc, { taille: 4 * u, decal: .1 });
    }
    if (st === 'degarni' && !ferme) { const ds = [COURONNE, miroir(COURONNE)].map(c => F.dEll(K, ellC(1.045), c, { min: .24 })).filter(Boolean); if (ds.length) dessus += pe.forme(ds, chc, { taille: 4 * u, decal: .12 }); }
    // les mèches longues qui encadrent le visage et tombent sur l'épaule
    if ((long || st === 'mi_long') && !couvert) for (const sd of [-1, 1]) {
      const haut = surf(sd * 1.42, 0), su = (az, el, k = 1.03) => surf(sd * az, el, k).p;
      const bouts = st === 'mi_long' || Math.abs(K.q.penche || 0) > 60 ? [[su(1.44, -.68), 1.5], [su(1.4, -.86), .8], [su(1.36, -.96), .2]] : M.fem
        ? [[add(P.cou, app(S.T, [sd * sw * .6, -.4 * u, 1.6 * u])), 1.75], [add(P.cou, app(S.T, [sd * sw * .64, -6 * u, 4.3 * u])), 1.55], [add(P.cou, app(S.T, [sd * sw * .57, -10 * u, 5.2 * u])), 1.05], [add(P.cou, app(S.T, [sd * sw * .5, -12.4 * u, 5.5 * u])), .3]]
        : [[add(P.cou, app(S.T, [sd * sw * .58, -.2 * u, 1.0 * u])), 1.45], [add(P.cou, app(S.T, [sd * sw * .62, -2.8 * u, 2.2 * u])), .95], [add(P.cou, app(S.T, [sd * sw * .6, -4.2 * u, 2.6 * u])), .3]];
      // une main portée au visage passe devant la mèche : elle s'arrête à l'épaule, sa pointe ne ressort pas sous le coude
      const kb = sd === (S.sens < 0 ? 1 : -1) ? 'av' : 'ar', replie = B.clamp((P['poignet_' + kb][1] - P['epaule_' + kb][1] + 8 * u) / (7 * u));
      if (long && replie > 0) bouts.forEach((b, i) => { b[1] = B.lerp(b[1], i ? .3 : .9, replie); if (i) b[0] = V.lerp3(b[0], bouts[0][0], replie * .97); });
      // (contre le crâne : pas d'oreillettes qui dépassent aux tempes)
      const chaine = [[su(1.2, 1.0, .92), .12], [su(1.35, .75, .92), .9], [su(1.55, .42, .93), 1.55], [su(1.55, .12, .945), 1.75], [su(1.5, -.18, .965), 1.85], [su(1.45, -.5, .99), 1.9], ...bouts].map(([p, r], i, t) => { const k = i / (t.length - 1); return F.coupe(p, mul(S.T.x, r * uh * .78), mul(S.T.z, r * uh * .9), [oT[0] * .6 * k, oT[1] * .6 * k]); });
      const trait = B.lisse(chaine.slice(3, -1).map(c => { const p = pr(c.c); return [p[0] + (c.d ? c.d[0] : 0), p[1] + (c.d ? c.d[1] : 0)]; }), false, .5);
      masse(chaine, chc, { z: pr(chaine[4].c)[2], dessus: haut.vis > -.04, traits: `<path d="${trait}" fill="none" stroke="${chO}" stroke-width="${f(.32 * uh)}" opacity=".45"/>` });
    }

    // --- les coiffes
    let coiffe = '';
    const ouverture = { d: '' };
    if (co) coiffe = coiffes(K, { ouverture, co, coc, crane, ellC, surf, h, masse, anneauH, anneauT, masses, colle, uh, tx, ty, tz, oT });
    let lun = '';
    // un linge enroulé autour du visage (Lazare : « le visage enveloppé d'un linge », Jean 11:44)
    if (M.bandes) { const cb = B.teinte(M.bandes, ctx.ombre, .34); let d = ''; for (let i = 0; i < 9; i++) { const e0 = -.95 + i * .25, pts = []; for (let k = 0; k <= 12; k++) { const az = -Math.PI * .95 + k / 12 * Math.PI * 1.9; pts.push([az, e0 + Math.sin(az + i * 1.7) * .13]); } d += F.dLigneEll(K, gonfle(crane, 1.015, [0, -1.2 * uh, 0]), pts); } coiffe += `<g clip-path="url(#${idV})"><path d="${d}" fill="none" stroke="${cb}" stroke-width="${f(.34 * uh)}" stroke-linecap="round" opacity=".6"/></g>`; }
    if (M.lunettes) {
      for (const sd of [-1, 1]) { const s3 = surf(sd * OEIL.az, OEIL.el, 1.05); if (s3.vis > .1) lun += colle(s3, `<circle r="${f(1.85 * uh)}" fill="#ffffff" fill-opacity=".1" stroke="${M.lunettes}" stroke-width="${f(.36 * uh)}"/>`); }
      const p = surf(0, .02, 1.06); if (p.vis > .1) lun += colle(p, `<path d="M${f(-.85 * uh)},0 Q0,${f(-.45 * uh)} ${f(.85 * uh)},0" fill="none" stroke="${M.lunettes}" stroke-width="${f(.32 * uh)}"/>`);
    }
    let acc = '';
    for (const ac of M.accessoires.filter(a => a.os === 'tete')) { const s3 = surf(0, .1); acc += `<g transform="${F.matrice(pr, C, s3.t1, s3.t2)}"><g transform="translate(${f((ac.x || 0) * u)},${f((ac.y || 0) * u)}) rotate(${f(ac.rot || 0)}) scale(${f((ac.echelle || 1) * u / 4.7)})">${ac.svg}</g></g>`; }

    const dedans = (svg) => ouverture.d ? `<g clip-path="url(#${pe.decoupe(ouverture.d)})">${svg}</g>` : svg;
    // sous un voile, le tissu se ferme autour du cou
    let guimpe = '';
    if (ferme && co.type !== 'capuche') guimpe = pe.forme(F.dPile(pr, F.adoucir([anneauT(0, -1.7 * u, .6 * u, 3.3 * u, 3.0 * u), anneauT(0, .2 * u, .4 * u, 4.2 * u, 3.8 * u), anneauH(0, -ty * .62, 0, tx * .8, tz * .78)], 4)), B.teinte(coc, ctx.ombre, .14), { taille: 4 * u, decal: .14 });
    const zT = zTete, arriere = masses.filter(m => !m.dessus && m.z < zT).sort((x, y) => x.z - y.z), avant = masses.filter(m => m.dessus || m.z >= zT).sort((x, y) => x.z - y.z);
    // ce qui pend par-dessus le corps (cheveux vus de dos, mèches sur l'épaule, pan du voile) passe devant le buste, la robe, le manteau
    const zDevant = Math.max(zT, K.zT, Number.isFinite(K.zRobe) ? K.zRobe : -Infinity) + .07;
    // l'ombre des cheveux sur le front
    return {
      fond: { z: Math.min(zT - tz * .9, ...arriere.map(m => m.z)), svg: arriere.map(m => m.svg).join('') },
      devant: avant.map(m => ({ z: Math.max(zDevant, m.z), svg: m.svg })),
      tete: { z: zT, svg: G.HABITS.cou(K) + guimpe + dedans(tete + `<g clip-path="url(#${idV})">${traits}</g>` + barbe + dessus + oreille) + coiffe + lun + acc },
      idV, dVisage, z: zT, rayon: ty,
    };
  }

  // une chevelure bouclée : des boucles rondes réparties sur la calotte, plus serrées au front
  function boucles(K, st, ellC, uh) {
    const k = st === 'afro' ? 1.2 : 1.03, ell = ellC(k), w = F.regardEll(K, ell), out = [], r0 = (st === 'afro' ? 2.1 : 1.75) * uh;
    const n = norm([0, .7, -.62]);
    // la lisière (front, tempes, nuque) : de petites boucles régulières le long du bord de la calotte, toutes attachées
    if (st === 'boucles') {
      const e2 = V.cross(n, [1, 0, 0]), dn = .11, rr = Math.sqrt(1 - dn * dn);
      for (let i = 0; i < N_LISIERE; i++) { const a = (i + .5) / N_LISIERE * 2 * Math.PI, q = add(mul(n, dn), add([rr * Math.cos(a), 0, 0], mul(e2, rr * Math.sin(a)))); if (dot(q, w) > -.25) out.push(F.dCercle(K.pr(F.surEll(ell, q)), r0 * (.56 + .18 * ((i * .618) % 1)))); }
    }
    for (let i = 0; i < N_BOUCLES; i++) {
      const j = i >> 1, el = Math.asin(1 - 1.35 * (j + .5) / (N_BOUCLES / 2)), az = (i % 2 ? -1 : 1) * Math.abs(((j * 2.39996) % (2 * Math.PI)) - Math.PI), q = F.dirSphere(az, el);      // (la même chose des deux côtés)
      const dedans = dot(q, n) - (st === 'boucles' ? .2 : -.02);
      if (dedans < 0 || dot(q, w) < -.25) continue;
      const lisiere = st === 'boucles' ? B.lerp(.66, 1, B.clamp(dedans / .35)) : 1;                        // de plus en plus grosses vers le sommet
      out.push(F.dCercle(K.pr(F.surEll(ell, q)), r0 * (.85 + .3 * ((j * .618) % 1)) * lisiere * (q[2] > .3 && q[1] < .75 ? .78 : 1)));
    }
    return out;
  }

  // la bouche : fermée, une ligne effilée couleur de lèvre ; ouverte, une forme sombre, la langue, les dents du haut
  function bouche(K, opts, v, uh, ba, cBa, cBaO) {
    const { M, pe, u } = K, vis = opts.viseme ? VISEMES[opts.viseme] || VISEMES.X : null;
    let ouvre = Math.max(v.ouvre || 0, opts.parle || 0), larg = 1, rond = v.rond || 0, dents = v.dents || 0, langue = 0;
    if (vis) { ouvre = Math.max((v.ouvre || 0) * .4, vis[0]); larg = vis[1]; rond = Math.max(rond, vis[2]); dents = Math.max(dents, vis[3]); langue = vis[4]; }
    const mw = 1.55 * uh * larg * (1 - rond * .42), cur = (v.bouche || 0) * 1.0 * uh, barbu = ba && ba.style !== 'naissante' && ba.style !== 'collier';
    const trait = B.mix(B.teinte(M.peau, '#5a1c18', .62), ENCRE, barbu ? .35 : .25), levre = M.levres || B.mix(M.peau, '#b4534a', M.fem || M.maquillage ? .5 : .34);
    let g = '';
    if (barbu) {          // la moustache : deux ailes, sous le nez
      const y = -.55 * uh;
      g += `<path d="M0,${f(y - .75 * uh)} C${f(mw * .5)},${f(y - 1.25 * uh)} ${f(mw * 1.15)},${f(y - .5 * uh)} ${f(mw * 1.4)},${f(y + .75 * uh)} C${f(mw * .9)},${f(y + .3 * uh)} ${f(mw * .35)},${f(y + .45 * uh)} 0,${f(y + .1 * uh)} C${f(-mw * .35)},${f(y + .45 * uh)} ${f(-mw * .9)},${f(y + .3 * uh)} ${f(-mw * 1.4)},${f(y + .75 * uh)} C${f(-mw * 1.15)},${f(y - .5 * uh)} ${f(-mw * .5)},${f(y - 1.25 * uh)} 0,${f(y - .75 * uh)}Z" fill="${B.mix(cBa, cBaO, .35)}"/>`;
    }
    if (ouvre > .06) {
      const hh = (.45 + 2.15 * ouvre) * uh, w2 = mw * .86, yc = -cur * .42;
      const d = `M${f(-w2)},${f(yc)} Q0,${f(yc + cur * .3 - hh * .12)} ${f(w2)},${f(yc)} Q${f(w2 * .82)},${f(hh * .98)} 0,${f(hh)} Q${f(-w2 * .82)},${f(hh * .98)} ${f(-w2)},${f(yc)}Z`, id = pe.decoupe(d);
      g += `<path d="${d}" fill="#4a1614"/><g clip-path="url(#${id})"><ellipse cx="0" cy="${f(hh * (1.02 - langue * .2))}" rx="${f(w2 * .66)}" ry="${f(hh * .42)}" fill="#c4615a"/>` +
        (dents ? `<path d="M${f(-w2)},${f(yc - .4 * uh)} H${f(w2)} V${f(yc + hh * .24)} Q0,${f(yc + hh * .36)} ${f(-w2)},${f(yc + hh * .24)}Z" fill="#f8f2ea"/>` : '') + `</g><path d="${d}" fill="none" stroke="${barbu ? levre : trait}" stroke-width="${f(.26 * uh)}" stroke-linejoin="round" opacity=".85"/>`;
    } else {
      const y0 = -cur * .55, ym = cur * .6, e = .24 * uh;
      if (barbu || M.fem || M.levres) g += `<path d="M${f(-mw * .78)},${f(B.lerp(ym, y0, .62))} Q0,${f(ym + 1.15 * uh)} ${f(mw * .78)},${f(B.lerp(ym, y0, .62))} Q0,${f(ym + .1 * uh)} ${f(-mw * .78)},${f(B.lerp(ym, y0, .62))}Z" fill="${levre}" opacity="${barbu ? .95 : .7}"/>`;
      g += `<path d="M${f(-mw)},${f(y0)} Q0,${f(ym * 2 - y0 - e)} ${f(mw)},${f(y0)} Q0,${f(ym * 2 - y0 + e * 1.25)} ${f(-mw)},${f(y0)}Z" fill="${trait}" stroke="${trait}" stroke-width="${f(.16 * uh)}" stroke-linejoin="round"/>`;
      if (opts.viseme === 'A') g += `<path d="M${f(-mw * .7)},${f(.05 * u)} L${f(mw * .7)},${f(.05 * u)}" stroke="${trait}" stroke-width="${f(.42 * uh)}" stroke-linecap="round"/>`;
    }
    return g;
  }

  // ------------------------------------------------------------------ voile, keffieh, turban, bonnet, couronne…
  function coiffes(K, o) {
    const { M, S, P, L, u, pe, pr, ctx, tint, H: Hf } = K, { co, coc, crane, ellC, surf, h, masse, anneauH, anneauT, masses, tx, ty, tz, oT } = o, sw = L.sw, type = co.type;
    let s = '';
    const tour = (el, k) => { let d = '', cours = []; for (let i = 0; i <= 40; i++) { const az = -Math.PI + i / 40 * Math.PI * 2, q = surf(az, el, k); if (q.vis > 0) cours.push(pr(q.p)); else { if (cours.length > 1) d += B.lisse(cours, false, .5); cours = []; } } if (cours.length > 1) d += B.lisse(cours, false, .5); return d; };
    if (COIFFES_FERMEES.includes(type)) {
      const cc = type === 'capuche' ? K.cTorse : coc, cs = B.teinte(cc, ctx.ombre, .34), ell = { c: add(crane.c, app(Hf, [0, .2 * u, -.2 * u])), m: crane.m.map(a => mul(a, 1.14)) };
      // l'intérieur du voile, puis le pan du dos
      masses.push({ z: K.Z(P.tete) - tz * .6, svg: `<path d="${F.dEllipse(F.ellipse(pr, ell.c, ell.m))}" fill="${cs}"/>` });
      masse([anneauH(0, ty * .3, -tz * .25, tx * 1.08, tz * .8), anneauH(0, -ty * .35, -tz * .4, tx * 1.14, tz * .72, .2), anneauH(0, -ty * .95, -tz * .5, tx * 1.1, tz * .62, .4), anneauT(0, -4 * u, -3.4 * u, sw * .92, 2.8 * u, .7), anneauT(0, -12 * u, -4.4 * u, sw * .84, 1.7 * u, 1)], B.teinte(cc, ctx.ombre, .1));
      const cap = F.calotte(K, ell, [0, .1, -1], -.46), bord = F.calotte(K, gon(ell, .985), [0, .1, -1], -.56);
      o.ouverture.d = F.calotte(K, gon(ell, .985), [0, -.1, 1], .5);       // le visage ne se voit que dans l'ouverture du voile
      s += bord ? `<path d="${bord}" fill="${cs}"/>` : '';
      if (cap) {
        s += pe.forme(cap, cc, { taille: tx, decal: .1 });
        const cl = pe.decoupe(cap);
        s += `<g clip-path="url(#${cl})"><path d="${[-1, 1].map(sd => F.dLigneEll(K, ell, [[sd * .5, 1.15], [sd * 1.15, .7], [sd * 1.5, .15], [sd * 1.55, -.45]]) + F.dLigneEll(K, ell, [[sd * .9, 1.2], [sd * 1.7, .75], [sd * 1.95, .1], [sd * 1.95, -.5]])).join('')}" fill="none" stroke="${cs}" stroke-width="${f(.5 * u)}" stroke-linecap="round" opacity=".5"/></g>`;
      }
      // les deux pans : de derrière la joue jusque sur la poitrine, ils encadrent le visage sans le couvrir
      for (const sd of [-1, 1]) {
        const s3 = surf(sd * 1.32, .1, 1.12);
        const cps = [[surf(sd * 1.35, 1.0, 1.0).p, .12], [surf(sd * 1.5, .75, 1.04).p, .75], [surf(sd * 1.52, .35, 1.08).p, 1.2], [surf(sd * 1.44, -.1, 1.11).p, 1.6], [surf(sd * 1.36, -.45, 1.1).p, 2.0], [add(P.cou, app(S.T, [sd * sw * .55, -.6 * u, 2.6 * u])), 2.5], [add(P.cou, app(S.T, [sd * sw * .56, -7 * u, 5.2 * u])), 2.5], [add(P.cou, app(S.T, [sd * sw * .52, -13 * u, 5.8 * u])), 2.1]]
          .map(([p, r], i) => F.coupe(p, mul(S.T.x, r * u), mul(S.T.z, r * .7 * u), [oT[0] * .12 * i, oT[1] * .12 * i]));
        const d = F.dPile(pr, F.adoucir(cps, 4)), trait = (dx) => B.lisse(cps.slice(4).map(c => { const p = pr(add(c.c, mul(S.T.x, dx * u))); return [p[0] + c.d[0], p[1] + c.d[1]]; }), false, .5);
        const svg = pe.forme(d, cc, { taille: 5 * u, decal: .14 }) + `<g clip-path="url(#${pe.decoupe(d)})"><path d="${trait(-.7)}${trait(.8)}" fill="none" stroke="${cs}" stroke-width="${f(.36 * u)}" stroke-linecap="round" opacity=".5"/></g>`;
        masses.push(s3.vis > .05 ? { z: K.Z(cps[5].c), svg, dessus: true } : { z: K.Z(P.tete) - tz * .3, svg });
      }
      if (type === 'keffieh') s += `<path d="${tour(.5, 1.17)}" fill="none" stroke="${co.cordon || '#2a1d14'}" stroke-width="${f(1.2 * u)}" stroke-linecap="round"/><path d="${tour(.62, 1.15)}" fill="none" stroke="${co.cordon || '#2a1d14'}" stroke-width="${f(1.0 * u)}" stroke-linecap="round"/>`;
    } else if (type === 'casquette' || type === 'bonnet') {
      const ell = ellC(1.1), d = F.calotte(K, ell, [0, 1, .05], type === 'bonnet' ? .2 : .26);
      if (d) s += pe.forme(d, coc, { taille: tx, decal: .12 });
      if (type === 'casquette') { const s3 = surf(0, .32, 1.1); if (s3.vis > -.3) s += pe.forme(F.dEllipse(F.ellipse(pr, add(s3.p, app(Hf, [0, -.1 * u, 2.5 * u])), [mul(Hf.x, 4.7 * u), mul(Hf.y, .5 * u), mul(Hf.z, 3.4 * u)])), B.sombre(coc, .14), { taille: 3 * u }); }
      else s += `<path d="${tour(.3, 1.12)}" fill="none" stroke="${B.teinte(coc, ctx.ombre, .18)}" stroke-width="${f(2.0 * u)}" stroke-linecap="round"/>`;
    } else if (['couronne', 'couronne_epines', 'bandeau'].includes(type)) {
      const cc = type === 'couronne_epines' ? '#5a3f28' : (co.couleur || '#e0b84a');
      s += `<path d="${tour(.45, 1.1)}" fill="none" stroke="${cc}" stroke-width="${f((type === 'couronne' ? 1.7 : 1.1) * u)}" stroke-linecap="round"/>`;
      if (type === 'couronne_epines') s += `<path d="${tour(.52, 1.1)}" fill="none" stroke="${B.sombre(cc, .2)}" stroke-width="${f(.6 * u)}" stroke-linecap="round"/>`;
      for (let i = 0; i < 12; i++) {
        const s4 = surf(-Math.PI + i * Math.PI / 6, .45, 1.1);
        if (s4.vis < .05) continue;
        if (type === 'couronne') s += o.colle(s4, `<path d="M${f(-1.1 * u)},${f(.2 * u)} L0,${f(-2.8 * u)} L${f(1.1 * u)},${f(.2 * u)}Z" fill="${cc}"/><circle cy="${f(-2.8 * u)}" r="${f(.4 * u)}" fill="${B.clair(cc, .4)}"/>`);
        else if (type === 'couronne_epines') s += o.colle(s4, `<path d="M${f(-1 * u)},${f(.3 * u)} l${f(-.6 * u)},${f(-1.2 * u)} M${f(.6 * u)},${f(-.2 * u)} l${f(.8 * u)},${f(-1 * u)}" stroke="${cc}" stroke-width="${f(.32 * u)}" stroke-linecap="round"/>`);
      }
    } else if (type === 'casque') {
      const d = F.calotte(K, ellC(1.14), [0, 1, -.1], .2), c = tint(co.couleur || '#a8adb4');
      if (d) s += pe.forme(d, c, { taille: tx, decal: .2 });
      s += `<path d="${tour(.22, 1.15)}" fill="none" stroke="${B.teinte(c, ctx.ombre, .25)}" stroke-width="${f(1.1 * u)}" stroke-linecap="round"/>` + pe.forme(F.dEllipse(F.ellipse(pr, add(crane.c, app(Hf, [0, ty * 1.15, -1 * u])), [mul(Hf.x, 1.0 * u), mul(Hf.y, 2.2 * u), mul(Hf.z, 5.5 * u)])), '#b3261e', { taille: 3 * u });
    } else if (type === 'turban') {
      const bandes = [[.2, 1.14, coc], [.52, 1.16, B.teinte(coc, ctx.ombre, .1)], [.8, 1.06, coc]];
      for (const [el, k, c] of bandes) s += pe.forme(F.dEllipse(F.ellipse(pr, add(crane.c, app(Hf, [0, ty * el, -.3 * u])), [mul(Hf.x, tx * k * Math.cos(el * .72)), mul(Hf.y, 2.5 * u), mul(Hf.z, tz * k * Math.cos(el * .72))])), c, { taille: 5 * u, decal: .12 });
    } else if (co.svg) { const s3 = surf(0, .6, 1.05); s += o.colle(s3, `<g transform="scale(${f(u / 4.7)})">${co.svg}</g>`); }
    void M;
    return s;
  }
  const gon = (e, k) => ({ c: e.c, m: e.m.map(a => mul(a, k)) });

  G.TETE = { dessiner, VISEMES };
})(typeof window !== 'undefined' ? window : globalThis);
