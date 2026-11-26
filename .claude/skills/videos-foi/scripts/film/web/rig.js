// Squelette 3D des personnages : proportions (à partir d'une DESCRIPTION, jamais d'une banque), poses en angles
// d'articulations ou en cibles (cinématique inverse), marche à pieds plantés, mélange des poses, projection.
// Repère du personnage : X sur le côté, Y vers le haut, Z vers l'avant (là où il regarde). La caméra regarde le
// personnage de face quand "vue" = 0° ; 35° = trois-quarts ; 90° = profil ; 180° = de dos. Le dessin (perso.js)
// projette ce squelette : n'importe quelle vue, n'importe quel geste, toujours cohérent.
(function (G) {
  const B = G.B;
  const R = {};
  // ------------------------------------------------------------------ vecteurs 3D
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1e-9; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const nlerp = (a, b, k) => {
    if (dot(a, b) < -.97) b = norm(add(b, [1e-3, 2e-3, 3e-3]));
    return norm(lerp3(a, b, k));
  };
  function rot(v, ax, deg) {                           // rotation de v autour de l'axe ax (Rodrigues)
    if (!deg) return v;
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), k = norm(ax);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  const I3 = () => ({ x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
  const app = (F, l) => add(add(mul(F.x, l[0]), mul(F.y, l[1])), mul(F.z, l[2]));
  const frot = (F, ax, deg) => deg ? { x: rot(F.x, ax, deg), y: rot(F.y, ax, deg), z: rot(F.z, ax, deg) } : F;
  function ortho(F) {
    const z = norm(F.z), x = norm(sub(F.x, mul(z, dot(F.x, z)))); return { x, y: cross(z, x), z };
  }
  // l'interpolation sphérique : une direction qui TOURNE à vitesse régulière vers l'autre. L'interpolation en ligne
  // droite (nlerp) reste immobile puis bascule d'un coup quand les deux directions sont presque opposées (l'avant-bras
  // levé vers le visage → baissé : la main sautait de 130 px en une image). k peut dépasser [0, 1] (élan, amorti).
  const SLERP_MIN = 1e-3, MAIN_OEIL = .35;        // écart d'une main qui couvre un œil (part de la demi-largeur de tête)
  const EPAULE = 3.5;                      // u
  function slerp(a, b, k) {
    const th = Math.acos(B.clamp(dot(a, b), -1, 1));
    if (th < SLERP_MIN) return nlerp(a, b, k);
    let ax = cross(a, b);
    if (len(ax) < 1e-6) ax = cross(a, Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0]);     // exactement opposées : par devant
    return norm(rot(a, norm(ax), th * k * 180 / Math.PI));
  }
  const flerp = (A, Bf, k) => ortho({ x: nlerp(A.x, Bf.x, k), y: nlerp(A.y, Bf.y, k), z: nlerp(A.z, Bf.z, k) });
  R.v = { add, sub, mul, dot, cross, len, norm, lerp3, nlerp, slerp, rot, app, frot, ortho, X, Y, Z, I3 };

  // ------------------------------------------------------------------ description → modèle (proportions)
  R.modele = function (d) {
    d = d || {};
    const age = d.age || 'adulte';                     // bebe | enfant | ado | jeune | adulte | age
    const sil = d.silhouette || 'homme';               // homme | femme
    const corp = d.corpulence ?? .5;                    // 0 mince … 1 fort
    const enfant = age === 'enfant' || age === 'bebe', ado = age === 'ado', vieux = age === 'age';
    const fem = sil === 'femme';
    const taille = (d.taille ?? 1) * (age === 'bebe' ? .38 : enfant ? .62 : ado ? .92 : fem ? .95 : 1);
    const u = 470 * taille / 100;
    const hs = (d.tete ?? 1) * (age === 'bebe' ? 1.7 : enfant ? 1.36 : ado ? 1.14 : 1.1);   // tête relativement plus grosse
    const lg = age === 'bebe' ? .62 : enfant ? .84 : 1;                                      // jambes plus courtes
    const c = .88 + corp * .3;
    const M = {
      age, sil, corp, enfant, vieux, fem, ado, taille, u, hs,
      peau: d.peau || '#c68e66', yeux: d.yeux || '#3b2414', levres: d.levres || null,
      cheveux: Object.assign({ style: fem ? 'long' : 'court', couleur: vieux ? '#c4bfb8' : '#2a1d15' }, d.cheveux || {}),
      barbe: d.barbe ? Object.assign({ style: 'courte', couleur: (d.cheveux || {}).couleur || (vieux ? '#cfcac3' : '#2a1d15') }, d.barbe === true ? {} : d.barbe) : null,
      haut: Object.assign({ couleur: '#7d8fb3', manches: 'longues', col: 'rond', longueur: 'hanches' }, d.haut || {}),
      bas: d.bas === null ? null : Object.assign({ type: 'pantalon', couleur: '#3a4560' }, d.bas || {}),
      manteau: d.manteau ? Object.assign({ type: 'drape', couleur: '#8e2b26' }, d.manteau) : null,
      ceinture: d.ceinture || null,
      chaussures: Object.assign({ type: 'chaussures', couleur: '#3b2e25' }, d.chaussures || {}),
      coiffe: d.coiffe ? Object.assign({ couleur: '#d8cbb0' }, d.coiffe) : null,
      lunettes: d.lunettes || null,
      accessoires: d.accessoires || [],
      tient: d.tient || null, tient_ar: d.tient_ar || null,
      rides: d.rides ?? vieux, taches: d.taches_rousseur || false, maquillage: d.maquillage || false,
      bandes: d.bandes || null,                        // un corps enveloppé de bandes (couleur du linge)
      lumiere_propre: d.gloire || 0,
      cils: d.cils ?? fem,
      traits: d.traits || 'detaille',                  // detaille | simple (yeux-points, style papier) | aucun (silhouette sans visage)
    };
    M.L = {
      cheville: 3.0 * u, tibia: 22 * u * lg, cuisse: 22.5 * u * lg,
      torse: 31 * u * (enfant ? .9 : 1), cou: 4.1 * u, bras: 15.5 * u * (enfant ? .9 : 1), avbras: 13.2 * u * (enfant ? .9 : 1),
      paume: 3.9 * u, doigt: 3.6 * u,
      sw: (fem ? 7.5 : 8.7) * u * c * (enfant ? .9 : 1), hw: (fem ? 4.7 : 4.2) * u * c,
      // tête (ellipsoïde)
      tx: 6.9 * u * hs, ty: 7.9 * u * hs, tz: 7.4 * u * hs,
      // rayons des membres
      r_bras: [2.55 * u * c, 2.05 * u * c], r_avbras: [2.0 * u * c, 1.45 * u * c],
      r_cuisse: [4.3 * u * c * (fem ? 1.06 : 1), 2.85 * u * c], r_tibia: [2.75 * u * c, 1.65 * u * c],
      r_cou: (fem ? 2.25 : 2.6) * u * (enfant ? .85 : 1),
    };
    M.L.hanchesH = M.L.cheville + M.L.tibia + M.L.cuisse;
    return M;
  };

  // ------------------------------------------------------------------ poses
  // Angles en degrés. Bras / jambes "av" = côté caméra, "ar" = côté opposé (le dessin les échange tout seul quand
  // le personnage regarde de l'autre côté). épaule / hanche : levée vers l'avant ; ecart : sur le côté ; coude /
  // genou : pliés ; paume : rotation de l'avant-bras (0 paume vers le corps, 90 paume vers l'avant) ; main : forme.
  const P0 = {
    vue: 35, penche: 0, cote: 0, torsion: 0, epaules: 0, cou: 0, tete_cote: 0, tete_tourne: 0, bassin: 0,
    epaule_av: 4, ecart_av: 6, rot_av: 0, coude_av: 10, paume_av: 0, poignet_av: 4, main_av: 'detendue',
    epaule_ar: -2, ecart_ar: 6, rot_ar: 0, coude_ar: 8, paume_ar: 0, poignet_ar: 4, main_ar: 'detendue',
    hanche_av: 1, ecart_jambe_av: 2, genou_av: 2, pied_av: 0,
    hanche_ar: -1, ecart_jambe_ar: 2, genou_ar: 2, pied_ar: 0,
    rotation: 0, leve_y: 0, assise: 0,
  };
  R.P0 = P0;
  // cibles nommées pour les mains (repère du buste, en unités u ; X vers le côté du bras, Z vers l'avant)
  const CIBLES = {
    poitrine: [0, 13, 7.5], coeur: [1.5, 15, 6.5], ventre: [0, 6, 8], bouche: [0, 31, 9], visage: [-4.0, 27.2, 13.2],
    front: [0, 34, 8], tete: [0, 40, 3], devant: [0, 16, 22], haut: [0, 52, 6], oreille: [-9.8, 24.6, 4.5],
    telephone: [1, 15, 16], menton: [0, 27, 8], hanche: [-9, 2, 0], dos: [0, 8, -6],
    cuisse: [-4.3, -3.2, 13],                        // assis : la main posée sur le dessus de la cuisse, vers le genou
  };
  R.CIBLES = CIBLES;
  // les attitudes « debout sans rien faire » : le poids sur une jambe, une main à la ceinture, les mains jointes devant…
  R.ATTITUDES = [
    {},
    { hanche_ar: 5, genou_ar: 11, ecart_jambe_ar: 4, torsion: 4, epaule_av: 10, coude_av: 28, ecart_av: 9, epaule_ar: 7, coude_ar: 22, ecart_ar: 8 },
    { cible_ar: [2.2, 9.5, 8.6], main_ar: 'detendue', paume_ar: 70, epaule_av: 8, coude_av: 24, ecart_av: 8, hanche_av: 4, genou_av: 9 },
    { cible_av: [1.4, 2.6, 9.4], cible_ar: [1.4, 3.6, 9.0], main_av: 'detendue', main_ar: 'detendue', paume_av: 80, paume_ar: 80, hanche_ar: 3, genou_ar: 7 },
    { cible_av: [1.8, 10.5, 8.4], main_av: 'detendue', paume_av: 70, epaule_ar: 9, coude_ar: 26, ecart_ar: 9, hanche_ar: 5, genou_ar: 10 },
  ];
  // assis, un bras que le geste ne règle pas pose la main sur la cuisse (pendant comme debout, il passerait derrière
  // les cuisses et le buste : on ne verrait plus les bras)
  R.BRAS_ASSIS = { av: { cible_av: 'cuisse', main_av: 'detendue', paume_av: 140 }, ar: { cible_ar: 'cuisse', main_ar: 'detendue', paume_ar: 140 } };   // paume posée : on voit le dos de la main
  // un bras « qui pend » : sans cible, à peine levé, à peine plié, pas écarté
  R.brasPend = (q, k) => !q['cible_' + k] && (q['epaule_' + k] ?? 0) < 25 && (q['coude_' + k] ?? 0) < 30 && (q['ecart_' + k] ?? 0) < 20;
  const POSES = {
    debout: {}, attente: {},
    face: { vue: 0 }, profil: { vue: 90 }, dos: { vue: 180 },
    assis: { assise: 1, hanche_av: 86, genou_av: 86, hanche_ar: 82, genou_ar: 80, ecart_jambe_av: 5, ecart_jambe_ar: 5, pied_av: 4, pied_ar: 4, penche: 4 },
    assis_sol: { assise: 1, hanche_av: 140, genou_av: 100, hanche_ar: 134, genou_ar: 96, ecart_jambe_av: 7, ecart_jambe_ar: 7, pied_av: 10, pied_ar: 10, cible_av: [-2, 13, 18], cible_ar: [-5, 12, 17], main_av: 'detendue', main_ar: 'detendue', penche: 10, cou: 12 },
    assis_sol_tete: { assise: 1, hanche_av: 146, genou_av: 108, hanche_ar: 140, genou_ar: 104, ecart_jambe_av: 6, ecart_jambe_ar: 6, pied_av: 10, pied_ar: 10, cible_av: [-1, 15, 15], cible_ar: [-4, 15, 14], main_av: 'detendue', main_ar: 'detendue', penche: 26, cou: 36 },
    assis_sol_jambes: { assise: 1, hanche_av: 100, genou_av: 20, hanche_ar: 96, genou_ar: 26, ecart_jambe_av: 6, ecart_jambe_ar: 6, pied_av: -30, pied_ar: -30, cible_av: [-11, 1, 2], cible_ar: [-10, 1, -2], main_av: 'ouverte', main_ar: 'ouverte', paume_av: 90, paume_ar: 90, penche: -12, cou: 4 },
    a_genoux: { hanche_av: 4, genou_av: 92, hanche_ar: -2, genou_ar: 94, pied_av: 88, pied_ar: 88, penche: -2 },
    accroupi: { hanche_av: 110, genou_av: 140, hanche_ar: 104, genou_ar: 142, pied_av: -20, pied_ar: -20, penche: 26, epaule_av: 40, coude_av: 40, epaule_ar: 34, coude_ar: 44 },
    prie: { cible_av: 'poitrine', cible_ar: 'poitrine', main_av: 'jointes', main_ar: 'jointes', cou: 10, penche: 3 },
    prie_genoux: { hanche_av: 4, genou_av: 92, hanche_ar: -2, genou_ar: 94, pied_av: 88, pied_ar: 88, cible_av: 'poitrine', cible_ar: 'poitrine', main_av: 'jointes', main_ar: 'jointes', cou: 14, penche: 4 },
    // la face contre terre : assis sur les talons, le buste à l'horizontale, le front près du sol, les mains devant
    prosterne: { hanche_av: 62, genou_av: 152, hanche_ar: 58, genou_ar: 148, pied_av: 80, pied_ar: 80, penche: 99, cou: 10, epaule_av: 171, coude_av: 4, epaule_ar: 168, coude_ar: 5, ecart_av: 9, ecart_ar: 9, main_av: 'ouverte', main_ar: 'ouverte', paume_av: -80, paume_ar: -80 },
    mains_levees: { epaule_av: 158, ecart_av: 22, coude_av: 12, epaule_ar: 152, ecart_ar: 24, coude_ar: 14, main_av: 'ouverte', main_ar: 'ouverte', paume_av: 85, paume_ar: 85, cou: -16, penche: -6 },
    bras_ouverts: { epaule_av: 40, ecart_av: 62, coude_av: 14, epaule_ar: 38, ecart_ar: 62, coude_ar: 16, main_av: 'ouverte', main_ar: 'ouverte', paume_av: 95, paume_ar: 95, penche: -3, vue: 18 },
    tend_main: { vue: 62, epaule_av: 80, ecart_av: 14, coude_av: 8, main_av: 'ouverte', paume_av: 70, penche: 6 },
    tend_main_bas: { vue: 58, cible_av: [-3, 9, 27], main_av: 'ouverte', paume_av: 70, epaule_ar: 8, coude_ar: 20, penche: 14, cou: 18, hanche_av: 8, genou_av: 10 },
    prend_main: { vue: 60, epaule_av: 62, coude_av: 18, main_av: 'tient', paume_av: 40, penche: 10 },
    pointe: { vue: 60, epaule_av: 84, ecart_av: 6, coude_av: 4, main_av: 'pointe', paume_av: 10 },
    // le bras LOINTAIN se lève (le bras proche passait devant le visage)
    montre_haut: { epaule_ar: 136, ecart_ar: 28, coude_ar: 8, main_ar: 'pointe', cou: -9, epaule_av: 8, coude_av: 24, ecart_av: 8 },
    regarde_haut: { cou: -26, penche: -6, epaule_av: 6, epaule_ar: -4 },
    tete_baissee: { cou: 26, penche: 8, epaules: 1.5, epaule_av: 0, epaule_ar: -2 },
    mains_visage: { cible_av: 'visage', cible_ar: 'visage', main_av: 'ouverte', main_ar: 'ouverte', paume_av: 175, paume_ar: 175, cou: 22, penche: 12 },
    bras_croises: { cible_av: [1.6, 14.6, 8.0], cible_ar: [2.6, 12.0, 6.2], main_av: 'posee', main_ar: 'poing', paume_ar: 40 },
    pense: { cible_av: 'menton', main_av: 'poing', cible_ar: [3, 10, 6], main_ar: 'detendue', cou: -4 },
    telephone: { cible_av: 'telephone', main_av: 'tient', paume_av: 110, cou: 24, tete_tourne: -6, epaule_ar: 10, coude_ar: 30 },
    appel: { cible_av: 'oreille', main_av: 'tient', paume_av: 170 },
    ecoute: { cou: 8, tete_cote: 6 },
    enseigne: { vue: 45, epaule_av: 58, ecart_av: 18, coude_av: 46, main_av: 'ouverte', paume_av: 80, epaule_ar: 10, coude_ar: 22 },
    // la main qui bénit est celle du côté lointain, à hauteur d'épaule (l'autre passait devant la bouche)
    benit: { vue: 42, epaule_ar: 72, ecart_ar: 40, coude_ar: 78, main_ar: 'benit', paume_ar: 90, penche: -2, epaule_av: 8, coude_av: 24, ecart_av: 8 },
    accueille: { epaule_av: 52, ecart_av: 36, coude_av: 22, epaule_ar: 34, ecart_ar: 44, coude_ar: 26, main_av: 'ouverte', main_ar: 'ouverte', paume_av: 80, paume_ar: 80 },
    peur: { cible_av: [-6.5, 20, 12], cible_ar: [-6, 19, 11], main_av: 'ouverte', main_ar: 'ouverte', paume_av: 160, paume_ar: 160, penche: -12, cou: -4, epaules: 2.5 },
    recule: { vue: 55, epaule_av: 62, coude_av: 60, main_av: 'ouverte', paume_av: 110, penche: -14, hanche_av: 16, genou_av: 6, hanche_ar: -18, genou_ar: 12 },
    rame: { cible_av: [-2.5, 6, 20], cible_ar: [-2.5, 7, 19], main_av: 'poing', main_ar: 'poing', penche: 22 },
    porte: { cible_av: [-3, 12, 12], cible_ar: [3, 12, 12], main_av: 'tient', main_ar: 'tient', paume_av: 60, paume_ar: 60, penche: -6 },
    allonge: { rotation: -90, epaule_av: 8, epaule_ar: -6, cou: -6, vue: 20 },
    tombe: { epaule_av: 140, ecart_av: 30, coude_av: 20, epaule_ar: 120, ecart_ar: 30, coude_ar: 30, hanche_av: 30, genou_av: 40, penche: -25, main_av: 'ouverte', main_ar: 'ouverte' },
    se_noie: { epaule_av: 150, ecart_av: 30, coude_av: 30, epaule_ar: 130, ecart_ar: 34, coude_ar: 40, main_av: 'ouverte', main_ar: 'ouverte', paume_av: 80, paume_ar: 80, cou: -22, penche: -8 },
    // étreinte : celui qui serre. Ses mains se posent à plat sur le DOS de l'autre (une haute, une plus basse), sa tête se penche
    // sur la sienne ; l'autre se blottit (« blotti ») : plus bas, la tête contre son épaule
    enlace: { vue: 64, cible_av: [2.2, 14.5, 10.4], cible_ar: [-1.5, 19, 9.6], main_av: 'posee', main_ar: 'posee', penche: 4, cou: 24, tete_cote: 6 },
    blotti: { vue: 70, hanche_av: 20, genou_av: 34, hanche_ar: 15, genou_ar: 31, penche: 21, cou: 30, tete_tourne: -26, cible_av: [2.4, 11, 11.2], cible_ar: [-1, 7, 10.6], main_av: 'posee', main_ar: 'posee' },
    leve_tete: { cou: -16 },
    marche: {}, court: {}, attend: {},
    salue: { epaule_av: 150, ecart_av: 30, coude_av: 40, main_av: 'ouverte', paume_av: 90 },
    lit: { cible_av: [-3, 16, 16], cible_ar: [4, 16, 16], main_av: 'tient', main_ar: 'tient', paume_av: 120, paume_ar: 120, cou: 26 },
    pleure_assis: { assise: 1, hanche_av: 86, genou_av: 86, hanche_ar: 82, genou_ar: 80, cible_av: 'visage', cible_ar: 'visage', main_av: 'ouverte', main_ar: 'ouverte', paume_av: 175, paume_ar: 175, cou: 26, penche: 22 },
  };
  R.POSES = POSES;
  // Poses de PASSAGE (jamais écrites dans un script : le moteur les insère tout seul) — se lever, s'asseoir,
  // s'agenouiller passent par elles comme chez un animateur. Elles sont volontairement appuyées : le mouvement ne
  // fait que s'en approcher (courbe de Bézier entre la pose de départ, le passage et l'arrivée).
  const PASSAGES = {
    lever: { hanche_av: 84, genou_av: 98, hanche_ar: 80, genou_ar: 94, pied_av: -8, pied_ar: -8, penche: 48, cou: -24, epaule_av: 42, coude_av: 34, epaule_ar: 36, coude_ar: 34, main_av: 'ouverte', main_ar: 'ouverte' },
    genou: { hanche_av: 92, genou_av: 96, pied_av: -6, hanche_ar: -4, genou_ar: 96, pied_ar: 70, penche: 34, cou: -20, epaule_av: 30, coude_av: 40, epaule_ar: 24, coude_ar: 30, main_av: 'ouverte', main_ar: 'detendue' },
  };
  R.PASSAGES = PASSAGES;
  const basse = q => (q.assise || 0) > .5 || (q.genou_av || 0) > 60 || (q.genou_ar || 0) > 60;
  const aGenoux = q => (q.genou_ar || 0) > 60 && Math.abs(q.hanche_ar || 0) < 20;
  // le passage entre deux poses (angles) : null si le corps ne change pas de hauteur
  R.passage = function (qa, qb) {
    if (basse(qa) === basse(qb)) return null;
    return aGenoux(qa) || aGenoux(qb) ? 'genou' : 'lever';
  };
  // formes de mains : repli des doigts (index, majeur, annulaire, auriculaire), pouce, écart
  const MAINS = {
    detendue: { d: [12, 18, 22, 26], p: 16, e: 4 }, ouverte: { d: [4, 2, 4, 8], p: 6, e: 12 },
    poing: { d: [100, 105, 108, 110], p: 70, e: 0 }, pointe: { d: [0, 100, 105, 108], p: 60, e: 2 },
    tient: { d: [62, 68, 72, 76], p: 46, e: 2 }, jointes: { d: [2, 0, 2, 4], p: 10, e: 0 },
    benit: { d: [0, 0, 80, 85], p: 50, e: 3 }, telephone: { d: [26, 28, 30, 34], p: 14, e: 3 }, posee: { d: [12, 10, 10, 14], p: 10, e: 3 }, griffe: { d: [50, 50, 50, 50], p: 30, e: 14 },
  };
  R.MAINS = MAINS;
  function poseNommee(nom) { if (typeof nom === 'object') return nom; return Object.assign({}, POSES[nom] || {}); }
  R.poseNommee = poseNommee;
  // compatibilité avec les anciens réglages ("tourne" 0–1, "corps")
  function compat(q) {
    if (q.corps !== undefined && q.penche === undefined) q.penche = q.corps;
    if (q.tourne !== undefined && typeof q.tourne === 'number' && q.tete_tourne === undefined) q.tete_tourne = -(q.tourne - .35) * 70;
    if (q.vue === 'face') q.vue = 0; else if (q.vue === 'trois_quarts') q.vue = 35; else if (q.vue === 'profil') q.vue = 90; else if (q.vue === 'dos') q.vue = 180;
    return q;
  }
  R.compat = compat;

  // ------------------------------------------------------------------ squelette
  // sens : +1 regarde vers la droite de l'écran, -1 vers la gauche. sx : côté (en X) du bras / de la jambe "av".
  function brasFK(sx, q, k) {
    const flex = q['epaule_' + k], abd = q['ecart_' + k], tw = q['rot_' + k], el = q['coude_' + k];
    let d = rot([0, -1, 0], Z, sx * abd); d = rot(d, X, -flex);
    let ax = rot(rot(X, Z, sx * abd), X, -flex); ax = rot(ax, d, sx * tw);
    const f = rot(d, ax, -el);
    let pn = rot(rot([-sx, 0, 0], Z, sx * abd), X, -flex); pn = rot(pn, d, sx * tw); pn = rot(pn, ax, -el);
    pn = rot(pn, f, sx * (q['paume_' + k] || 0));
    return { d, f, pn: norm(sub(pn, mul(f, dot(pn, f)))), ax };
  }
  function ik2(S, T, a, b, pole) {                // deux os : renvoie le point milieu (coude / genou)
    let dv = sub(T, S); let dist = len(dv);
    const u = norm(dv);
    dist = B.clamp(dist, Math.abs(a - b) + 1e-3, a + b - 1e-3);
    let v = sub(pole, mul(u, dot(pole, u))); if (len(v) < 1e-6) v = [0, 0, 1]; v = norm(v);
    const ca = (a * a + dist * dist - b * b) / (2 * a * dist), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const E = add(S, add(mul(u, a * ca), mul(v, a * sa)));
    return { E, T2: add(S, mul(u, dist)) };
  }
  function jambeFK(sx, q, k) {
    const flex = q['hanche_' + k], abd = q['ecart_jambe_' + k], kn = q['genou_' + k];
    let d = rot([0, -1, 0], Z, sx * abd); d = rot(d, X, -flex);
    const ax = rot(rot(X, Z, sx * abd), X, -flex);
    const s = rot(d, ax, kn);
    let ft = rot(s, ax, -90); ft = rot(ft, ax, q['pied_' + k] || 0);
    return { d, s, ft, ax };
  }

  // calcule le squelette complet (repère du personnage, pieds au sol y = 0 sauf assise)
  R.squelette = function (M, q, sens) {
    const L = M.L, u = M.u;
    const sav = -sens, sar = sens;                 // côté X des membres "av" / "ar"
    const S = { sens, yaw: (q.vue ?? 35) * sens, q };
    const Pf = frot(I3(), X, q.bassin || 0);
    const O = [0, L.hanchesH, 0];
    let T = I3();
    T = frot(T, Y, (q.torsion || 0) * sens);
    T = frot(T, Z, -(q.cote || 0) * sens);
    T = frot(T, X, q.penche || 0);
    S.Pf = Pf; S.T = T; S.O = O;
    let H = frot(T, T.y, (q.tete_tourne || 0) * sens);
    H = frot(H, H.x, q.cou || 0);
    H = frot(H, H.z, -(q.tete_cote || 0) * sens);
    S.H = H;
    // bras
    S.bras = {};
    for (const [k, sx] of [['av', sav], ['ar', sar]]) {
      const cible = q['cible_' + k];
      let r;
      if (cible) {
        const c = typeof cible === 'string' ? CIBLES[cible] : cible;
        if (c) {
          // cible dans le repère du buste (unités u) : x > 0 = vers l'AUTRE côté du corps (bras croisés)
          const lc = [-sx * c[0] * u, c[1] * u, c[2] * u];
          const base = add(O, app(Pf, [0, 6 * u, 0]));
          let Tg = add(base, app(T, lc));
          const mn = q['main_' + k];
          // les mains qui cachent le visage : chacune devant SON œil, à plat, quelle que soit l'inclinaison de la tête
          if (cible === 'visage') {
            const nuque = add(base, app(T, [0, L.torse - 6 * u + L.cou, .5 * u])), C = add(nuque, app(H, [0, 4.2 * u * M.hs, 1.0 * u * M.hs]));
            const ya = S.yaw * Math.PI / 180;                  // (décalée vers la caméra : c'est l'œil qu'on voit qu'elle cache)
            Tg = add(add(C, app(H, [sx * L.tx * MAIN_OEIL, -3.8 * u, L.tz * .95])), mul([-Math.sin(ya), 0, Math.cos(ya)], 1.9 * u));
          }
          if (mn === 'jointes') Tg = add(Tg, app(T, [sx * .55 * u, -2.5 * u, 0]));      // les deux paumes se touchent
          const Sh = add(base, app(T, [sx * L.sw, L.torse - 6 * u - EPAULE * u + (q.epaules || 0) * .6 * u, -.6 * u]));
          const pole = app(T, [sx * .55, -1, -.3]);
          const { E, T2 } = ik2(Sh, Tg, L.bras, L.avbras, pole);
          const d = norm(sub(E, Sh)), f = norm(sub(T2, E));
          let ax = cross(f, d); ax = len(ax) < 1e-4 ? app(T, X) : norm(ax);
          let pn = app(T, [-sx, -.35, 0]);
          pn = norm(sub(pn, mul(f, dot(pn, f))));
          pn = rot(pn, f, sx * (q['paume_' + k] || 0));
          r = { d, f, pn: norm(sub(pn, mul(f, dot(pn, f)))), ax };
          // un téléphone se tient l'écran vers le visage (sinon on le lit et on le montre à la fois)
          if (cible === 'telephone' && mn === 'tient') { const tete = add(base, app(T, [0, L.torse - 6 * u + L.cou + 4 * u * M.hs, 3 * u])), vers = norm(sub(tete, Tg)); r.jointes = { h: norm(sub(f, mul(vers, dot(f, vers)))), pn: vers }; }
          // les mains qui cachent le visage : à plat devant lui, les doigts vers le front (elles couvrent les deux yeux)
          if (cible === 'visage') r.jointes = { h: norm(add(H.y, mul(H.z, .12))), pn: mul(H.z, -1) };
          // une main posée à plat sur le dos de l'autre : elle épouse le dos (doigts vers le haut, paume vers soi), elle ne dépasse pas
          if (mn === 'posee') r.jointes = q['cible_' + k][2] < 9 && k === 'av' ? { h: app(T, norm([-sx * .9, .25, -.25])), pn: app(T, [0, 0, -1]) } : { h: app(T, norm([-sx * .1, .95, .18])), pn: app(T, [0, .1, -1]) };      // (bras croisés : à plat sur l'autre bras)
          if (mn === 'jointes') { r.jointes = { h: app(T, norm([0, 1, .3])), pn: app(T, [-sx, 0, 0]) }; }
        }
      }
      if (!r) { const b = brasFK(sx, q, k); r = { d: app(T, b.d), f: app(T, b.f), pn: app(T, b.pn), ax: app(T, b.ax) }; }
      // poignet : la main se plie vers la paume
      const w = q['poignet_' + k] || 0;
      if (r.jointes) { r.h = r.jointes.h; r.pn = r.jointes.pn; delete r.jointes; }
      else { r.h = rot(r.f, cross(r.f, r.pn), w); r.pn = rot(r.pn, cross(r.f, r.pn), w); }
      r.main = q['main_' + k] || 'detendue';
      S.bras[k] = r;
    }
    // jambes (FK, ou cible pour la marche / les pieds au sol)
    S.jambes = {};
    for (const [k, sx] of [['av', sav], ['ar', sar]]) {
      const Hj = add(O, app(Pf, [sx * L.hw, 0, 0]));
      const cible = q['pied_cible_' + k];
      let r;
      if (cible) {
        const pole = [sx * .12, .1, 1];
        const { E, T2 } = ik2(Hj, cible, L.cuisse, L.tibia, pole);
        const d = norm(sub(E, Hj)), s = norm(sub(T2, E));
        let ax = cross(d, s); ax = len(ax) < 1e-4 ? X : norm(ax);
        if (dot(ax, X) < 0) ax = mul(ax, -1);
        let ft = norm(cross(ax, s)); if (ft[2] < 0) ft = mul(ft, -1);
        ft = rot(ft, ax, q['pied_' + k] || 0);
        r = { d, s, ft, ax };
      } else r = jambeFK(sx, q, k);
      r.H = Hj;
      S.jambes[k] = r;
    }
    return S;
  };

  // positions des articulations à partir des directions (après mélange)
  // (les épaules : EPAULE u sous la base du cou — à 2,2 elles montaient au menton, comme si tout le monde haussait les épaules)
  R.positions = function (M, S) {
    const L = M.L, u = M.u, P = {};
    const sav = -S.sens, sar = S.sens;
    P.O = S.O;
    P.taille = add(S.O, app(S.Pf, [0, 6 * u, 0]));                     // pivot du buste
    P.cou = add(P.taille, app(S.T, [0, L.torse - 6 * u, 0]));
    P.poitrine = add(P.taille, app(S.T, [0, (L.torse - 6 * u) * .58, .3 * u]));
    P.ventre = add(P.taille, app(S.T, [0, 2 * u, .6 * u]));
    const ep = S.q.epaules || 0;
    for (const [k, sx] of [['av', sav], ['ar', sar]]) {
      const b = S.bras[k];
      const Sh = add(P.taille, app(S.T, [sx * L.sw, L.torse - 6 * u - EPAULE * u + ep * .6 * u, -.6 * u]));
      const E = add(Sh, mul(b.d, L.bras)), W = add(E, mul(b.f, L.avbras));
      P['epaule_' + k] = Sh; P['coude_' + k] = E; P['poignet_' + k] = W;
      const j = S.jambes[k];
      const Hj = add(S.O, app(S.Pf, [sx * L.hw, 0, 0]));
      const K = add(Hj, mul(j.d, L.cuisse)), A = add(K, mul(j.s, L.tibia));
      P['hanche_' + k] = Hj; P['genou_' + k] = K; P['cheville_' + k] = A;
    }
    P.nuque = add(P.cou, app(S.T, [0, L.cou, .5 * u]));
    P.tete = add(P.nuque, app(S.H, [0, 4.2 * u * M.hs, 1.0 * u * M.hs]));
    return P;
  };

  // point le plus bas (le personnage est posé au sol), ou la hauteur de l'assise
  R.plusBas = function (M, S, P) {
    const u = M.u, L = M.L;
    const ys = [];
    for (const k of ['av', 'ar']) {
      const j = S.jambes[k], A = P['cheville_' + k];
      const bas = rot(j.ft, j.ax, 90);
      ys.push(add(A, add(mul(bas, L.cheville), mul(j.ft, -1.3 * u)))[1], add(A, add(mul(bas, L.cheville * .55), mul(j.ft, 5.6 * u)))[1]);
      ys.push(P['genou_' + k][1] - L.r_tibia[0] * .95);
      ys.push(P['poignet_' + k][1] - 1.2 * u);
    }
    ys.push(P.O[1] - 5.6 * u);
    ys.push(P.tete[1] - L.ty);
    return Math.min(...ys);
  };
  R.assiseY = (M, P) => P.O[1] - 5.6 * M.u;          // dessous des fesses

  // ------------------------------------------------------------------ mélange de deux squelettes
  // f = facteur de mélange de chaque partie du corps (0 = A, 1 = B ; un peu en dehors de [0, 1] : élan, dépassement)
  function melangeParties(A, Bs, f, k) {
    const S = { sens: Bs.sens, yaw: B.lerp(A.yaw, Bs.yaw, f.buste), q: Bs.q };
    S.O = lerp3(A.O, Bs.O, f.racine); S.Pf = flerp(A.Pf, Bs.Pf, f.racine); S.T = flerp(A.T, Bs.T, f.buste); S.H = flerp(A.H, Bs.H, f.tete);
    S.bras = {}; S.jambes = {};
    for (const s of ['av', 'ar']) {
      const a = A.bras[s], b = Bs.bras[s];
      S.bras[s] = { d: slerp(a.d, b.d, f.bras), f: slerp(a.f, b.f, f.avbras), h: slerp(a.h, b.h, f.main), pn: slerp(a.pn, b.pn, f.main), ax: slerp(a.ax, b.ax, f.bras), main: k < .5 ? a.main : b.main, mainA: a.mainA || a.main, mainB: b.mainB || b.main, kmain: B.clamp(f.main) };
      const ja = A.jambes[s], jb = Bs.jambes[s];
      S.jambes[s] = { d: slerp(ja.d, jb.d, f.jambes), s: slerp(ja.s, jb.s, f.jambes), ft: slerp(ja.ft, jb.ft, f.jambes), ax: slerp(ja.ax, jb.ax, f.jambes) };
    }
    return S;
  }
  const PARTIES = ['racine', 'buste', 'tete', 'bras', 'avbras', 'main', 'jambes'];
  // mélange uniforme (tout le corps au même rythme) : sert aux fondus techniques (la marche qui se pose)
  R.melange = function (A, Bs, k) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const f = {}; for (const n of PARTIES) f[n] = k;
    return melangeParties(A, Bs, f, k);
  };
  // Le JEU d'acteur : chaque partie a son retard (chevauchement : le buste mène, l'avant-bras et la main suivent, la
  // tête arrive en dernier), son élan contraire avant de partir (anticipation) et son dépassement qui se pose
  // (amorti). [retard (part de la transition), anticipation, dépassement] ; 0 / 0 = la courbe « doux » d'avant.
  // Les jambes ne dépassent jamais (un genou ne se tord pas à l'envers).
  const JEU = { racine: [0, 1.4, .2], buste: [0, 1.6, .6], tete: [.12, .8, 1.3], bras: [.05, 1.6, 1.0], avbras: [.13, .9, 1.5], main: [.2, .5, 1.8], jambes: [0, .7, 0] };
  R.JEU = JEU;
  function courbeJeu(k, [retard, anti, dep], ampleur) {
    const x = B.clamp((k - retard) / (1 - retard)), ci = 1.70158 * anti * ampleur, co = 1.70158 * dep * ampleur;
    if (x < .5) { const y = 2 * x; return .5 * ((ci + 1) * y * y * y - ci * y * y); }
    const y = 2 * x - 2; return .5 + .5 * (1 + (co + 1) * y * y * y + co * y * y);
  }
  R.courbeJeu = courbeJeu;
  // k linéaire 0 → 1 sur la durée de la transition ; ampleur : 0 = mouvement mécanique, 1 = défaut, 1,5 = appuyé
  R.melangeJeu = function (A, Bs, k, ampleur = 1) {
    if (k <= 0) return A; if (k >= 1) return Bs;
    const f = {}; for (const n of PARTIES) f[n] = courbeJeu(k, JEU[n], ampleur);
    return melangeParties(A, Bs, f, k);
  };

  // ------------------------------------------------------------------ projection (vue + roulis)
  // renvoie une fonction p3 → [x écran, y écran, profondeur] (repère local : y écran vers le bas, unités px)
  R.projecteur = function (yawDeg, roll, pivot) {
    const a = yawDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const rr = (roll || 0) * Math.PI / 180, cr = Math.cos(rr), sr = Math.sin(rr);
    const pv = pivot || [0, 0, 0];
    const f = p => {
      const x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c, y = p[1];
      let X2 = x - pv[0], Y2 = -(y - pv[1]);
      if (rr) { const xx = X2 * cr - Y2 * sr, yy = X2 * sr + Y2 * cr; X2 = xx; Y2 = yy; }
      return [X2 + pv[0], Y2 - pv[1], z];
    };
    f.dir = v => { const x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c; let X2 = x, Y2 = -v[1]; if (rr) { const xx = X2 * cr - Y2 * sr, yy = X2 * sr + Y2 * cr; X2 = xx; Y2 = yy; } return [X2, Y2, z]; };
    return f;
  };

  G.RIG = R;
})(typeof window !== 'undefined' ? window : globalThis);
