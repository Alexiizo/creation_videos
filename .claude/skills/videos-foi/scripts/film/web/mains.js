// Mains : une paume, quatre doigts à trois phalanges et un pouce, dans l'espace. Chaque forme de main (RIG.MAINS) règle le
// pli et l'écart des doigts ; le dessin réunit tout en une seule silhouette, puis trace les séparations des doigts qui se
// touchent : la main se lit comme une main à toutes les tailles, jamais comme une moufle.
(function (G) {
  const B = G.B, RIG = G.RIG, F = G.FORMES, V = RIG.v, f = B.f;
  const { add, sub, mul, cross, norm, rot } = V;
  const TAILLE = 1.04;                      // une main un peu grande : elle se lit sur un téléphone
  // écart au centre de la paume, longueur, rayon (index → auriculaire)
  const DOIGTS = [{ x: 1.55, b: 3.75, l: 4.1, r: .62 }, { x: .52, b: 3.95, l: 4.55, r: .64 }, { x: -.52, b: 3.85, l: 4.2, r: .61 }, { x: -1.5, b: 3.5, l: 3.3, r: .53 }];
  const PHALANGES = [.45, .31, .24], PLIS = [.62, .9, .55];        // part de la longueur ; part de l'angle à chaque jointure
  const TOUCHE = 1.25;                      // deux doigts à moins de (somme des rayons × ça) se touchent : on trace leur séparation
  const CONTACT_VISAGE = 1.75;              // une main à moins de ça (rayons de tête) devant le visage y porte une ombre

  // la géométrie : les volumes de la main (piles de coupes), dans l'ordre où on les dessine
  function geometrie(K, k, b, W) {
    const { M, u, S } = K, e = u * TAILLE * (M.enfant ? 1.08 : 1) * (M.fem ? .92 : 1);
    const h = norm(b.h), pn = norm(sub(b.pn, mul(h, V.dot(b.pn, h)))), sx = k === 'av' ? -S.sens : S.sens;
    const cote = mul(norm(cross(h, pn)), -sx);               // vers le pouce
    const forme = RIG.MAINS[b.main] || RIG.MAINS.detendue;
    const fb = b.mainA && b.mainB && b.mainA !== b.mainB ? [RIG.MAINS[b.mainA] || forme, RIG.MAINS[b.mainB] || forme, b.kmain] : null;
    const doigts = fb ? fb[0].d.map((x, i) => B.lerp(x, fb[1].d[i], fb[2])) : forme.d;
    const pouce = fb ? B.lerp(fb[0].p, fb[1].p, fb[2]) : forme.p, ecart = fb ? B.lerp(fb[0].e, fb[1].e, fb[2]) : forme.e;
    const pt = (dh, dc, dp = 0) => add(W, add(mul(h, dh * e), add(mul(cote, dc * e), mul(pn, dp * e))));
    const anneau = (dh, w, t, dc = 0) => F.coupe(pt(dh, dc), mul(cote, w * e), mul(pn, t * e));
    const paume = [anneau(-.5, 1.2, 1.0), anneau(.7, 1.45, 1.1, .05), anneau(2.1, 2.02, 1.08, .05), anneau(3.4, 2.12, .9), anneau(4.15, 1.75, .66)];
    const os = DOIGTS.map((d, i) => {
      const base = pt(d.b, d.x), dir = rot(h, pn, (1.5 - i) * ecart * .62 * (sx > 0 ? 1 : -1)), axe = norm(cross(pn, dir));
      const pts = [base];
      let a = 0;
      PHALANGES.forEach((part, j) => { a += doigts[i] * PLIS[j]; pts.push(add(pts[j], mul(rot(dir, axe, -a), d.l * part * e))); });
      return { pts, r: [d.r, d.r * .97, d.r * .88, d.r * .72].map(x => x * e), plie: doigts[i] };
    });
    // le pouce : de la base de la paume, vers l'extérieur, il se replie vers la paume
    const p0 = pt(.9, 1.05, .25), dp = norm(add(add(mul(h, .8), mul(cote, B.lerp(.22, .85, B.clamp((ecart - 2) / 10)))), mul(pn, .3))), axeP = norm(cross(dp, pn));
    const p1 = add(p0, mul(rot(dp, axeP, pouce * .25), 1.95 * e)), p2 = add(p1, mul(rot(dp, axeP, pouce * .8), 1.7 * e)), p3 = add(p2, mul(rot(dp, axeP, pouce * 1.15), 1.15 * e));
    const pouceOs = { pts: [p0, p1, p2, p3], r: [1.0, .8, .68, .52].map(x => x * e) };
    const chaine = (o) => o.pts.map((p, i) => F.sphere(p, o.r[i]));
    return { e, h, pn, cote, paume, os, pouceOs, volumes: [paume, ...os.map(chaine), chaine(pouceOs)], centre: pt(2.6, 0), pt };
  }

  function dessiner(K, k, b, W, opts = {}) {
    const { pr, pe, peau, peauO } = K;
    const g = geometrie(K, k, b, W), e = g.e;
    const ds = g.volumes.map(v => F.dPile(pr, v, 18)), d = ds.join(' ');
    let s = '';
    // devant le visage : l'ombre de la main, pour qu'elle ne se confonde pas avec la joue
    if (opts.ombreVisage) s += opts.ombreVisage(d);
    s += pe.forme(d, peau, { taille: 2.6 * e, decal: .2, ombre: B.mix(peau, peauO, .75) });
    // les séparations des doigts voisins qui se touchent à l'écran
    const trait = f(.17 * e), E = g.os.map(o => o.pts.map(p => pr(p)));
    let sep = '';
    for (let i = 0; i < 3; i++) {
      const a = E[i], c = E[i + 1], ra = g.os[i].r, rc = g.os[i + 1].r, mil = [];
      for (let j = 0; j < 4; j++) {
        const dist = Math.hypot(a[j][0] - c[j][0], a[j][1] - c[j][1]);
        if (dist > (ra[j] + rc[j]) * TOUCHE) break;
        mil.push([(a[j][0] + c[j][0]) / 2, (a[j][1] + c[j][1]) / 2]);
      }
      if (mil.length > 1) sep += B.lisse(mil, false, .5);
    }
    // le pouce se détache de la paume quand il passe devant elle
    const zP = pr(g.pouceOs.pts[2])[2], zC = pr(g.centre)[2];
    const dPouce = zP > zC + .3 * e ? F.dPile(pr, g.pouceOs.pts.map((p, i) => F.sphere(p, g.pouceOs.r[i])), 18) : '';
    const coupe = sep || dPouce ? pe.decoupe(d) : '';
    if (dPouce) s += `<g clip-path="url(#${coupe})"><path d="${dPouce}" fill="${peauO}" opacity=".32" transform="translate(${f(-K.L2[0] * .3 * e)},${f(.3 * e)})"/></g>` + `<path d="${dPouce}" fill="${peau}"/>`;
    if (sep) s += `<g clip-path="url(#${coupe})"><path d="${sep}" fill="none" stroke="${peauO}" stroke-width="${trait}" stroke-linecap="round" opacity=".55"/></g>`;
    return { svg: s, d, g };
  }
  // les doigts qui passent DEVANT l'objet tenu (un téléphone, un livre) : le pouce et le bout des doigts repliés
  function devantObjet(K, g) {
    const { pr, pe, peau, peauO } = K;
    const vols = [g.pouceOs.pts.map((p, i) => F.sphere(p, g.pouceOs.r[i]))];
    return pe.forme(vols.map(v => F.dPile(pr, v, 18)).join(' '), peau, { taille: 2 * g.e, decal: .2, ombre: B.mix(peau, peauO, .75) });
  }

  G.MAINS = { dessiner, geometrie, devantObjet, CONTACT_VISAGE, TAILLE };
})(typeof window !== 'undefined' ? window : globalThis);
