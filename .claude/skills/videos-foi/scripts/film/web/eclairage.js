// La LUMIÈRE qui raconte : chaque lieu a une heure (nuit, aube, matin, midi, soir, or) qui règle la direction et la
// hauteur du soleil, sa couleur, la couleur des ombres, les ombres portées des personnages, le voile de profondeur, la
// vignette ; le contre-jour fait des silhouettes bordées de lumière ; une source proche (lampe, feu, fenêtre) éclaire
// le côté des personnages tourné vers elle ; le moment clé (panneau doré) s'illumine DANS la scène.
// Tout est paramétré par le script ("heure", "lumiere": {…}) ; rien n'est une image toute faite.
(function (G) {
  const B = G.B, f = B.f;
  // hauteur : élévation du soleil (degrés) ; portee : opacité des ombres portées ; clair / sombre : force du dégradé de
  // lumière (côté soleil / côté opposé) ; vignette ; brume : couleur et force du voile de profondeur ; ciel : [haut, bas]
  const HEURES = {
    nuit: { couleur: '#a9c4ff', ombre: '#151a33', hauteur: 50, portee: 0, clair: .10, sombre: .34, vignette: .42, brume: '#2a3550', brume_f: .12, ciel: ['#0e1630', '#2a3b6b'], expo: .78, teinte: ['#8c9ce0', .24], lisere: .75 },
    aube: { couleur: '#ffd9b0', ombre: '#4a3550', hauteur: 12, portee: .26, clair: .30, sombre: .20, vignette: .24, brume: '#f4cfc0', brume_f: .22, ciel: ['#6d7fb8', '#ffc8a0'], expo: .96, teinte: ['#ffc8c0', .14], lisere: .5 },
    matin: { couleur: '#fff1d6', ombre: '#3a3550', hauteur: 35, portee: .24, clair: .20, sombre: .16, vignette: .18, brume: '#dfe8f0', brume_f: .16, ciel: ['#78aedb', '#f6e6c4'], expo: 1 },
    midi: { couleur: '#fffaf0', ombre: '#3a3a4a', hauteur: 70, portee: .2, clair: .12, sombre: .12, vignette: .14, brume: '#e8eef2', brume_f: .12, ciel: ['#5f9fd8', '#dcecf6'], expo: 1.02 },
    soir: { couleur: '#ffcf8a', ombre: '#3a2440', hauteur: 14, portee: .26, clair: .32, sombre: .22, vignette: .26, brume: '#f2c89a', brume_f: .2, ciel: ['#4a5c9a', '#ffb070'], expo: .92, teinte: ['#ffb080', .16], lisere: .55 },
    or: { couleur: '#fff3c4', ombre: '#7a4a2a', hauteur: 18, portee: .18, clair: .40, sombre: .10, vignette: .10, brume: '#ffe7b0', brume_f: .24, ciel: ['#ffcf7d', '#fff2d0'], expo: 1, teinte: ['#ffe0a0', .12], lisere: .45 },
  };
  // sans heure : une lumière neutre (celle du lieu), ombres portées seulement dehors (là où il y a un ciel)
  const NEUTRE = { hauteur: 35, portee: .2, clair: .18, sombre: .14, vignette: .18, brume_f: .14, lisere: .3 };
  // la lumière dorée du moment clé éclaire le MONDE, pas les visages : au-delà, un personnage près du soleil se délavait
  const BLOOM = .26;                      // force de la lumière dorée du moment clé (au cœur)
  const MONTEE = 1.1;                      // s : le moment clé s'illumine en un peu plus d'une seconde
  const PORTEE_SOURCE = 620;               // px : une lampe, un feu éclairent ce qui est à moins de cette distance

  function ambiance(lieu, p) {
    const h = HEURES[p.heure || lieu.heure] || null;
    const dehors = (lieu.couches || []).some(c => c.gen === 'ciel');
    const base = Object.assign({}, NEUTRE, h || {}, { portee: dehors ? (h ? h.portee : NEUTRE.portee) : 0 });      // dans une pièce fermée, le soleil ne couche pas d'ombres au sol
    const lum = Object.assign({ cote: -1, couleur: base.couleur || '#fff1d6', ombre: base.ombre || '#2b2140', rim: .7 }, lieu.lumiere || {}, p.lumiere || {});
    const ciel0 = (lieu.couches || []).find(c => c.gen === 'ciel'), ciel = ciel0 && cielDeLHeure(ciel0, lieu);
    return Object.assign(base, lum, {
      brume: lum.brume || base.brume || ciel?.bas || '#e8e2d6',
      astre: ciel?.astre || null,
      contre_jour: lum.contre_jour ? (lum.contre_jour === true ? 1 : lum.contre_jour) : 0,
      dore: !!(p.panneau || lieu.panneau),
    });
  }

  // un ciel sans couleurs prend celles de l'heure ; sans astre, le soleil (ou la lune) se place du côté d'où vient la
  // lumière, d'autant plus bas sur l'horizon qu'il est tôt ou tard
  const COUVRANTS = ['pluie', 'neige', 'eclair'];
  function cielDeLHeure(c, lieu) {
    const h = HEURES[lieu.heure];
    if (c.gen !== 'ciel' || !h) return c;
    const horizon = c.horizon ?? lieu.sol?.horizon ?? 1000, cote = (lieu.lumiere?.cote ?? -1) < 0 ? -1 : 1;
    const nuit = lieu.heure === 'nuit';
    // un ciel d'orage (pluie, neige, éclairs) cache le soleil, la lune et les étoiles
    const couvert = lieu.couvert ?? (lieu.couches || []).some(k => COUVRANTS.includes(k.gen));
    const astre = couvert ? undefined : [cote < 0 ? 230 : 850, horizon - 40 - (horizon - 160) * B.clamp((h.hauteur - 10) / 70), nuit ? 38 : 56];
    return Object.assign({ haut: h.ciel[0], bas: h.ciel[1], etoiles: (nuit && !couvert) || undefined, lune: (nuit && !couvert) || undefined, astre,
      astre_couleur: nuit ? '#f2f4ff' : B.mix(h.couleur, h.hauteur < 20 ? '#fff0b8' : '#ffffff', .4) }, c);      // (bas sur l'horizon, il reste chaud)
  }

  // le voile de profondeur (perspective aérienne) : entre le lointain et le plan des personnages, plus dense à
  // l'horizon ; coordonnées du monde (il suit la caméra en parallaxe)
  function voile(amb, id, horizon = 1000) {
    if (!amb.brume_f) return '';
    return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${horizon - 900}" x2="0" y2="${horizon + 260}">` +
      `<stop offset="0" stop-color="${amb.brume}" stop-opacity="0"/><stop offset=".78" stop-color="${amb.brume}" stop-opacity="${f(amb.brume_f)}"/>` +
      `<stop offset="1" stop-color="${amb.brume}" stop-opacity="0"/></linearGradient></defs>` +
      `<rect x="-3000" y="${horizon - 900}" width="7080" height="1160" fill="url(#${id})"/>`;
  }

  // ce qui se pose par-dessus l'image (en coordonnées de l'écran) : la lumière qui vient de son côté, l'ombre du côté
  // opposé, la vignette, et sur le moment clé la lumière dorée qui monte depuis le soleil
  function surcouche(amb, id, tp, fen) {
    const { x0 = 0, x1 = 1080, haut = 0, bas = 1920 } = fen || {};
    const cote = amb.cote < 0 ? -1 : 1, hy = B.clamp(1 - amb.hauteur / 90, .2, 1);
    const ax = cote < 0 ? x0 : x1, bx = cote < 0 ? x1 : x0;
    let s = `<defs><linearGradient id="${id}d" gradientUnits="userSpaceOnUse" x1="${ax}" y1="${f(haut + (bas - haut) * (1 - hy) * .4)}" x2="${bx}" y2="${f(bas - (bas - haut) * (1 - hy) * .2)}">` +
      `<stop offset="0" stop-color="${amb.couleur}" stop-opacity="${f(amb.clair)}"/><stop offset=".5" stop-color="${amb.couleur}" stop-opacity="0"/>` +
      `<stop offset=".55" stop-color="${amb.ombre}" stop-opacity="0"/><stop offset="1" stop-color="${amb.ombre}" stop-opacity="${f(amb.sombre)}"/></linearGradient>` +
      `<radialGradient id="${id}v" cx="540" cy="${f((haut + bas) * .52)}" r="${f((bas - haut) * .78)}" gradientUnits="userSpaceOnUse">` +
      `<stop offset=".55" stop-color="${amb.ombre}" stop-opacity="0"/><stop offset="1" stop-color="${amb.ombre}" stop-opacity="${f(amb.vignette)}"/></radialGradient>`;
    const bloom = amb.dore ? B.ease('sortie', B.clamp(tp / MONTEE)) : 0;
    const [sx, sy] = amb.astre ? amb.astre : [cote < 0 ? x0 + 140 : x1 - 140, haut + 380];
    if (bloom) s += `<radialGradient id="${id}b" cx="${sx}" cy="${sy}" r="1100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3c4" stop-opacity="${f(BLOOM * bloom)}"/>` +
      `<stop offset=".35" stop-color="#ffd98a" stop-opacity="${f(BLOOM * .4 * bloom)}"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>`;
    s += `</defs><rect x="${x0}" y="${haut}" width="${x1 - x0}" height="${bas - haut}" fill="url(#${id}d)" style="mix-blend-mode:soft-light"/>` +
      `<rect x="${x0}" y="${haut}" width="${x1 - x0}" height="${bas - haut}" fill="url(#${id}v)" style="mix-blend-mode:multiply"/>`;
    if (amb.teinte) s += `<rect x="${x0}" y="${haut}" width="${x1 - x0}" height="${bas - haut}" fill="${amb.teinte[0]}" opacity="${f(amb.teinte[1])}" style="mix-blend-mode:multiply"/>`;
    if (bloom) s += `<rect x="${x0}" y="${haut}" width="${x1 - x0}" height="${bas - haut}" fill="url(#${id}b)" style="mix-blend-mode:screen"/>`;
    return s;
  }

  // Le LISERÉ : une fine ligne de lumière sur le bord du personnage tourné vers la source (elle le détache du fond, de
  // nuit surtout) ; et la RELÈVE : quand la scène est sombre, les personnages le sont moins qu'elle — la nuit se lit dans
  // le décor, l'histoire se lit sur les visages.
  const LISERE = { dx: 1.1, dy: -.9, flou: 1.6, force: .7 };       // px (à l'échelle du monde) : une lueur fine, jamais une copie décalée
  const SATURE = 1.5;
  const RELEVE = .55;                     // part de l'assombrissement qu'on rend aux personnages
  function surPersonnage(amb, couleur, cote) {
    const k = amb.lisere ?? NEUTRE.lisere, dx = (cote < 0 ? -1 : 1) * LISERE.dx;
    const alpha = Math.round(B.clamp(k * LISERE.force) * 255).toString(16).padStart(2, '0');
    const releve = Math.pow(1 / Math.max(.3, amb.expo ?? 1), RELEVE);
    const couleurs = 1 + SATURE * (1 - Math.min(1, amb.expo ?? 1));          // assombrie et bleuie, une peau devient grise : on lui rend sa couleur
    return `${releve > 1.01 ? `brightness(${f(releve)}) saturate(${f(couleurs)}) ` : ''}drop-shadow(${f(dx)}px ${f(LISERE.dy)}px ${f(LISERE.flou)}px ${couleur}${alpha})`;
  }

  // l'ombre portée d'un personnage : sa silhouette couchée sur le sol, à l'opposé de la lumière, d'autant plus longue
  // que le soleil est bas ; en contre-jour, elle vient vers nous
  function portee(amb) {
    if (!amb.portee) return null;
    const h = B.rad(B.clamp(amb.hauteur, 8, 85));
    // l'astre est DANS le ciel qu'on voit : il est derrière la scène, les ombres viennent donc vers nous (jamais vers lui)
    const devant = amb.contre_jour || amb.astre;
    return { sx: -(amb.cote < 0 ? -1 : 1) * B.clamp(.35 / Math.tan(h), .1, 1.0), sy: (devant ? -1 : 1) * (.12 + .12 * (1 - amb.hauteur / 90)), opacite: amb.portee };
  }

  // les sources de lumière posées dans le plan (lampe, bougie, feu, halo) : en coordonnées du monde
  function sources(objets) {
    const out = [];
    for (const o of objets || []) {
      if (o.gen === 'lumiere' && o.pos) out.push({ x: o.pos[0], y: o.pos[1], couleur: o.couleur || '#ffd48a' });
      else if (o.gen === 'feu') out.push({ x: o.x ?? 540, y: (o.y ?? 1500) - 80, couleur: '#ffb35a' });
      else if (o.gen === 'objet' && o.allume !== false && (o.type !== 'abribus' || o.allume) && G.MONDE.OBJETS_LUMIERE[o.type]) {
        const [kx, ky, coul] = G.MONDE.OBJETS_LUMIERE[o.type], d = G.MONDE.OBJETS[o.type].d, cm = G.MONDE.OBJETS_CM;
        out.push({ x: (o.x ?? 400) + (o.l ?? d[0] * cm) * kx, y: (o.y ?? 1500) - (o.h ?? d[1] * cm) * ky, couleur: o.couleur2 || coul });
      } else if (o.gen === 'lampadaire' && o.allume !== false) out.push({ x: (o.x ?? 540) + (o.sens ?? 1) * (o.h ?? 430) * .16, y: (o.y ?? 1500) - 160, couleur: o.lumiere || '#ffd9a0' });
      else if (o.gen === 'accessoire' && ['lampe', 'bougie'].includes(o.type) && o.allume !== false) out.push({ x: o.x ?? 540, y: o.y ?? 1500, couleur: '#ffcf7a' });
    }
    return out;
  }
  // la source la plus proche d'un personnage : de quel côté elle l'éclaire, et de quelle couleur
  function eclairePar(srcs, x, y) {
    let best = null, dmin = PORTEE_SOURCE;
    for (const s of srcs) { const d = Math.hypot(s.x - x, s.y - y); if (d < dmin) { dmin = d; best = s; } }
    return best ? { cote: best.x < x ? -1 : 1, couleur: best.couleur, force: 1 - dmin / PORTEE_SOURCE } : null;
  }

  G.ECLAIRAGE = { surPersonnage, HEURES, ambiance, cielDeLHeure, voile, surcouche, portee, sources, eclairePar };
})(typeof window !== 'undefined' ? window : globalThis);
