// Personnages : construits à partir d'une DESCRIPTION libre (rien n'est pris dans une banque) sur un squelette 3D (rig.js),
// dessinés en illustration. Ce fichier assemble les calques (habits.js, mains.js, tete.js, dans l'ordre de profondeur) et
// joue les actions : poses, marches, regards, visages, souffle, clignements, mouvement secondaire.
(function (G) {
  const B = G.B, RIG = G.RIG, F = G.FORMES, V = RIG.v;
  const f = B.f;
  let UID = 0;
  const { add, sub, mul, dot, norm, app } = V;

  // ------------------------------------------------------------------ visages
  const VISAGES = {
    neutre: { oeil: 1, sour_h: 0, sour_a: 0, bouche: .08, ouvre: 0 },
    doux: { oeil: .92, sour_h: .08, sour_a: -3, bouche: .5, ouvre: 0, plisse: .15 },
    joie: { oeil: .78, sour_h: .18, sour_a: -4, bouche: .95, ouvre: .4, plisse: .45, dents: 1 },
    rire: { oeil: .35, sour_h: .22, sour_a: -6, bouche: 1, ouvre: .85, plisse: .8, dents: 1 },
    triste: { oeil: .82, paupiere: .3, sour_h: .12, sour_a: 18, bouche: -.6, ouvre: 0 },
    pleure: { oeil: .55, paupiere: .42, sour_h: .16, sour_a: 22, bouche: -.75, ouvre: .22, larmes: 1 },
    peur: { oeil: 1.25, sour_h: .38, sour_a: 16, bouche: -.25, ouvre: .4, pupille: .72 },
    terreur: { oeil: 1.4, sour_h: .52, sour_a: 20, bouche: -.35, ouvre: .85, pupille: .6 },
    surprise: { oeil: 1.35, sour_h: .58, sour_a: 0, bouche: 0, ouvre: .65, rond: 1 },
    choc: { oeil: 1.3, sour_h: .45, sour_a: 8, bouche: -.1, ouvre: .5, rond: .6 },
    colere: { oeil: .78, sour_h: -.25, sour_a: -24, bouche: -.4, ouvre: .12 },
    inquiet: { oeil: 1.05, sour_h: .22, sour_a: 15, bouche: -.25, ouvre: 0 },
    honte: { oeil: .6, paupiere: .3, sour_h: .12, sour_a: 15, bouche: -.3, ouvre: 0, regard_y: .8, rougit: 1 },
    determine: { oeil: .86, sour_h: -.1, sour_a: -10, bouche: -.05, ouvre: 0 },
    paix: { oeil: 0, sour_h: .06, sour_a: 4, bouche: .42, ouvre: 0, ferme_doux: 1 },
    prie: { oeil: 0, sour_h: .1, sour_a: 10, bouche: 0, ouvre: 0, ferme_doux: 1 },
    yeux_fermes: { oeil: 0, sour_h: 0, sour_a: 4, bouche: 0, ouvre: 0, ferme_doux: 1 },
    emerveille: { oeil: 1.2, sour_h: .38, sour_a: 4, bouche: .7, ouvre: .5, etoiles: 1, dents: 1 },
    fatigue: { oeil: .55, paupiere: .5, sour_h: 0, sour_a: 8, bouche: -.15, ouvre: 0 },
    soulage: { oeil: .7, sour_h: .1, sour_a: 8, bouche: .55, ouvre: .1, plisse: .3 },
    tendre: { oeil: .85, sour_h: .12, sour_a: 6, bouche: .6, ouvre: 0, plisse: .25 },
  };
  const BRAS_LEVE = -.72;            // hauteur de la direction du bras (−1 : il pend) au-delà de laquelle il est levé
  const VUE_ASSIS_MIN = 25;          // degrés : une personne assise se montre au moins de trois-quarts
  const TELEPHONE = { l: 2.5, h: 5.0, e: .45, centre: 5.6, recul: 1.3 };      // u : demi-largeur, demi-hauteur, demi-épaisseur ; où il est tenu

  // ------------------------------------------------------------------ dessin d'un personnage
  function dessiner(M, S, opts) {
    const u = M.u, q = S.q, P = RIG.positions(M, S), pr = RIG.projecteur(S.yaw, q.rotation || 0, P.O);
    // direction de la caméra dans le repère du personnage (pour savoir ce qui nous fait face)
    const a = S.yaw * Math.PI / 180, cam = [-Math.sin(a), 0, Math.cos(a)];
    const lx = opts.lumiere ?? -1;
    const ctx = { id: opts.id, ombre: opts.ombre || '#2b2140', lumiere: [lx * .55, -.83] };
    const pe = F.Peintre(ctx), cl = opts.couleur_lumiere || '#fff1d6';
    // contre-jour : le côté qu'on voit est dans l'ombre (la lumière les borde, film.js)
    const tint = opts.contre_jour ? (c => B.mix(B.mix(c, ctx.ombre, .3 * opts.contre_jour), cl, .06)) : (c => B.mix(c, cl, .08));
    const veste = M.manteau && M.manteau.type === 'veste', vetu = M.haut.longueur !== 'aucun';
    const K = {
      M, S, P, pr, u, L: M.L, q, T: S.T, Pf: S.Pf, H: S.H, cam, ctx, pe, tint, veste, vetu, sec: opts.sec, L2: ctx.lumiere,
      face: n => dot(norm(n), cam), Z: p => pr(p)[2], zT: pr(P.poitrine)[2],
      flex: (Math.acos(B.clamp(-S.jambes.av.d[1], -1, 1)) + Math.acos(B.clamp(-S.jambes.ar.d[1], -1, 1))) * 90 / Math.PI,      // l'inclinaison moyenne des cuisses (0 debout, 90 assis)
      peau: tint(M.peau), peauO: B.teinte(M.peau, B.mix(ctx.ombre, '#7a2f22', .4), .4),
      cHaut: tint(M.haut.couleur), cTorse: tint(veste ? M.manteau.couleur : M.haut.couleur),
    };
    const groupes = G.HABITS.corps(K).slice(), ajoute = (z, svg) => { if (svg) groupes.push({ z, svg }); };
    const tete = G.TETE.dessiner(K, opts);
    let ecranVu = null;
    // une main devant le visage y pose son ombre : elle ne se confond pas avec la joue
    const ombreVisage = (W) => V.len(sub(W, P.tete)) < G.MAINS.CONTACT_VISAGE * M.L.ty && K.Z(W) > K.Z(P.tete) - 2 * u
      ? (d) => `<g clip-path="url(#${tete.idV})"><path d="${d}" transform="translate(${f(-ctx.lumiere[0] * 1.6 * u)},${f(1.1 * u)})" fill="${B.teinte(M.peau, '#4a1d1a', .6)}" opacity=".55" filter="${pe.flou(.7 * u)}"/></g>` : null;
    const tenu = (k) => k === 'av' ? (opts.tient !== undefined ? opts.tient : M.tient) : (opts.tient_ar !== undefined ? opts.tient_ar : M.tient_ar);
    const objet = (K2, k, b, W, g) => {
      const t = tenu(k), accs = M.accessoires.filter(x => x.os === 'main_' + k);
      let avant = '', apres = '';
      const poser = (o, ac) => { apres += `<g transform="${F.matrice(pr, o, g.cote, mul(g.h, -1))}"><g transform="translate(${f((ac.x || 0) * u)},${f((ac.y || 0) * u)}) rotate(${f(ac.rot || 0)}) scale(${f((ac.echelle || 1) * u / 4.7)})">${ac.svg}</g></g>`; };
      // des mains jointes (la prière) ne tiennent rien ; un téléphone se tient, il ne se serre pas dans un poing
      if (t === 'telephone' && ['tient', 'telephone'].includes(b.main)) {
        const o = telephone(K, g, opts.ecran || '#cfe3ff');
        ecranVu = { pos: pr(o.centre), couleur: opts.ecran || '#cfe3ff' };
        if (K.face(g.pn) > 0) apres += o.svg + G.MAINS.devantObjet(K, g); else avant += o.svg;
      } else if (t && t.svg && ['tient', 'poing', 'pointe'].includes(b.main)) poser(add(W, add(mul(g.h, M.L.paume * .9), mul(g.pn, 1.1 * u))), t);
      for (const ac of accs) poser(W, ac);
      return { avant, apres };
    };
    const bras = {};
    for (const k of ['ar', 'av']) {
      const tel = tenu(k) === 'telephone' && S.bras[k].main === 'tient';
      const b = tel ? Object.assign({}, S.bras[k], { main: 'telephone', mainA: undefined }) : S.bras[k];
      bras[k] = G.HABITS.bras(K, k, b, { ombreVisage: ombreVisage(P['poignet_' + k]), objet });
    }
    // le bras du côté du manteau, levé ou écarté, sort de DESSOUS l'étoffe posée sur l'épaule
    { const k = S.sens > 0 ? 'ar' : 'av', b = S.bras[k]; if (b.d[1] > BRAS_LEVE && K.Z(P['coude_' + k]) - K.Z(P['epaule_' + k]) < 12 * u) for (const g of groupes) if (g.manteau) g.z = Math.max(g.z, bras[k].z + .01); }
    ajoute(tete.fond.z, tete.fond.svg);
    ajoute(tete.tete.z, tete.tete.svg);
    for (const m of tete.devant) ajoute(m.z, m.svg);
    for (const k of ['ar', 'av']) if (bras[k].devantTete) bras[k].z = Math.max(bras[k].z, ...tete.devant.map(m => m.z)) + .02;
    ajoute(bras.ar.z, bras.ar.svg);
    // étreinte : le bras côté caméra passe PAR-DESSUS l'autre personnage (il est rendu à part, sur un calque devant)
    if (!opts.bras_devant) ajoute(bras.av.z, bras.av.svg);
    // l'avant-bras n'a son propre calque que si quelque chose passe entre lui et l'épaule (sinon le bras reste d'un seul tenant)
    for (const k of ['ar', 'av']) if (bras[k].arriere && (k === 'ar' || !opts.bras_devant)) ajoute(bras[k].z2, bras[k].arriere());
    const ordre = groupes.map(g => g.z);
    for (const k of ['ar', 'av']) if (bras[k].avant && bras[k].z2 > bras[k].z && (k === 'ar' || !opts.bras_devant) && ordre.some(z => z > bras[k].z && z < bras[k].z2)) ajoute(bras[k].z2, bras[k].avant());
    for (const ac of M.accessoires.filter(x => ['torse', 'bassin', 'dos'].includes(x.os))) {
      const o = ac.os === 'torse' ? add(P.poitrine, app(S.T, [0, 2 * u, 5.6 * u])) : ac.os === 'dos' ? add(P.poitrine, app(S.T, [0, 0, -6 * u])) : add(P.O, app(S.Pf, [0, 0, 6 * u]));
      ajoute(K.Z(o) + .1, `<g transform="${F.matrice(pr, o, ac.os === 'dos' ? mul(S.T.x, -1) : S.T.x, mul(S.T.y, -1))}"><g transform="translate(${f((ac.x || 0) * u)},${f((ac.y || 0) * u)}) rotate(${f(ac.rot || 0)}) scale(${f((ac.echelle || 1) * u / 4.7)})">${ac.svg}</g></g>`);
    }
    groupes.sort((x, y) => x.z - y.z);
    const pts = { tete: pr(P.tete), haut: pr(add(P.tete, app(S.H, [0, M.L.ty * 1.1, 0]))), assise: pr([P.O[0], RIG.assiseY(M, P), P.O[2]]) };
    return { svg: groupes.map(g => g.svg).join(''), defs: pe.defs.join(''), P, pr, pts, vu: K.face(S.H.z), devant: opts.bras_devant ? bras.av.svg : '', ecran: ecranVu };
  }
  // un téléphone : une boîte mince tenue dans la paume ; son écran regarde du côté de la paume (vers celui qui le tient)
  function telephone(K, g, ecran) {
    const { pr, u } = K, T = TELEPHONE, n = 5;
    const centre = add(g.pt(T.centre, .15), mul(g.pn, T.recul * u));
    const contour = (l, h, r, dn) => {
      const o = [];
      for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]]) for (let i = 0; i <= n; i++) { const an = B.rad(a0 + 90 * i / n); o.push(pr(add(centre, add(add(mul(g.cote, (sx * (l - r) + Math.cos(an) * r) * u), mul(g.h, (sy * (h - r) + Math.sin(an) * r) * u)), mul(g.pn, dn * u))))); }
      return o;
    };
    const devant = K.face(g.pn) > 0, dn = devant ? T.e : -T.e;
    let s = `<path d="${F.dPts(F.enveloppe(contour(T.l, T.h, .75, T.e).concat(contour(T.l, T.h, .75, -T.e))))}" fill="#14161c"/>`;
    if (devant) s += `<path d="${F.dPts(contour(T.l - .22, T.h - .25, .55, dn))}" fill="${ecran}"/>`;
    else {
      s += `<path d="${F.dPts(contour(T.l - .1, T.h - .1, .68, dn))}" fill="#2a2f3a"/>`;
      for (const [x, y] of [[1.2, 3.5], [1.2, 2.3]]) { const c = pr(add(centre, add(add(mul(g.cote, x * u), mul(g.h, y * u)), mul(g.pn, dn * u)))); s += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(.5 * u)}" fill="#0c0e13"/>`; }
    }
    return { svg: s, centre };
  }

  // ------------------------------------------------------------------ animation
  const CYCLES = { marche: { foulee: .74, lev: 3.2, bras: 18, coude: 16, rebond: .9, penche: 3, vue: 72 }, court: { foulee: 1.15, lev: 7, bras: 42, coude: 80, rebond: 2.2, penche: 12, vue: 78 } };

  function qPose(a) {
    const nom = a.pose || 'debout';
    const posee = RIG.compat(Object.assign({}, RIG.poseNommee(nom))), ang = RIG.compat(Object.assign({}, a.angles || {}));
    const q = Object.assign({}, RIG.P0, nom === 'debout' && a.attitude && !((ang.assise || 0) >= .5) ? RIG.ATTITUDES[a.attitude] || {} : {}, posee, ang);
    // assis, un bras qui pend passerait derrière les cuisses : la main se pose sur la cuisse
    if ((q.assise || 0) >= .5) for (const k of ['av', 'ar']) if (RIG.brasPend(q, k)) Object.assign(q, RIG.BRAS_ASSIS[k]);
    if (a.vue !== undefined) q.vue = typeof a.vue === 'number' ? a.vue : { face: 0, trois_quarts: 35, profil: 90, dos: 180 }[a.vue] ?? 35;
    // assis, jamais plein face : les cuisses vues en bout deviennent des boules qui débordent des hanches
    if ((q.assise || 0) >= .5 && Math.abs(q.vue) < VUE_ASSIS_MIN) q.vue = (q.vue < 0 ? -1 : 1) * VUE_ASSIS_MIN;
    for (const k of ['cible_av', 'cible_ar', 'main_av', 'main_ar']) if (a[k] !== undefined) q[k] = a[k];
    if (a.tete !== undefined) q.tete_tourne = a.tete;
    const r = REGARDS[a.regarde];
    if (r) { q.cou += r.cou; if (r.face) q.tete_tourne = -B.clamp(q.vue, -60, 60) * .85; }
    else if (a.regard_cible) q.cou += B.clamp(a.regard_cible[1] / 220, -1, 1) * 14;
    return q;
  }
  // "regarde" : "camera" (« toi » : la tête se tourne vers nous), "ciel", "sol", ou l'id d'un personnage du plan
  // (film.js le résout en "regard_cible" : où est sa tête par rapport à la nôtre, à l'écran)
  const REGARDS = { camera: { cou: 0, face: true, yeux: [0, 0] }, ciel: { cou: -24, yeux: [0, -.9] }, sol: { cou: 20, yeux: [0, .8] } };
  // une pose qui tient quelque chose à lire le regarde (sauf regard écrit dans le script)
  const REGARD_POSE = { telephone: [.1, .85], lit: [0, .8] };
  function regardAction(a) {
    if (a.regard) return a.regard;
    if (REGARDS[a.regarde]) return REGARDS[a.regarde].yeux;
    if (a.regard_cible) return [B.clamp(a.regard_cible[0] / 180, -1, 1) * .85, B.clamp(a.regard_cible[1] / 220, -1, 1) * .7];
    return undefined;
  }

  // Le jeu se compose en COUCHES : l'action i part de l'état RÉEL du corps (l'action i-1, elle-même peut-être encore
  // en train de se fondre dans la précédente, ou en train de marcher) et s'y fond pendant sa "transition". Aucune
  // pose ne repart donc d'une pose qu'elle n'a pas atteinte : plus de saut d'une image à l'autre.
  const ARRET = .4;                  // s : en arrivant, la marche pose son dernier pas au lieu de s'arrêter net
  const T_VISAGE = .32, T_REGARD = .25;
  const POSES_ENLACE = ['enlace', 'blotti'];
  const ARTICULATIONS = ['tete', 'poignet_av', 'poignet_ar', 'cheville_av', 'cheville_ar'];    // poses où le bras côté caméra entoure l'autre (dessiné par-dessus lui)

  function deplacement(a, t) {       // où il en est de sa marche (null si l'action ne le déplace pas)
    if (a.x === undefined || !(a.duree_marche > 0)) return null;
    const k = B.clamp((t - a.t) / a.duree_marche), e = B.ease(a.ease || 'doux', k);
    const tot = Math.hypot(a.x - a.x_depart, a.y_fin - a.y_depart);
    return {
      k, tot, dist: tot * e, x: B.lerp(a.x_depart, a.x, e), y: B.lerp(a.y_depart, a.y_fin, e),
    };
  }
  // La VIE : la respiration se voit et suit l'émotion de l'action (période en s, ampleur des épaules) — chaque couche
  // garde son propre souffle, le fondu entre deux couches reste continu
  const SOUFFLE = [3.8, 1.0];
  const SOUFFLES = { peur: [2.2, 1.7], terreur: [1.8, 2.1], pleure: [2.6, 1.8], inquiet: [3.0, 1.3], colere: [2.8, 1.5], choc: [2.4, 1.6],
    paix: [5.0, 1.1], prie: [5.0, 1.0], yeux_fermes: [5.0, 1.0], soulage: [4.4, 1.6], fatigue: [4.6, 1.3], tendre: [4.4, 1.0] };
  const NEGATIVES = ['triste', 'pleure', 'honte', 'fatigue', 'inquiet', 'peur', 'terreur'];
  // réagir AU MOT : quand la voix appuie un mot (*mot* ou mots en couleur), le personnage réagit un instant —
  // la tête et les épaules tombent s'il souffre, les sourcils montent et la tête se relève sinon
  const DUREE_REACTION = .6;
  function reaction(A, t) {
    if (A.reagit === false) return 0;
    let r = 0;
    for (const ta of A.accents || []) { const x = (t - ta) / DUREE_REACTION; if (x > 0 && x < 1) r = Math.max(r, Math.sin(Math.PI * x)); }
    return r;
  }
  function vie(q, A, t, i) {
    const sd = A.seed, visage = herite(A.actions, i, 'visage', 'neutre');
    const [per, amp] = SOUFFLES[visage] || SOUFFLE;
    const resp = Math.sin(t * 2 * Math.PI / (per + (sd % 5) * .08) + sd);
    q.epaules = (q.epaules || 0) + resp * amp;
    q.penche -= resp * amp * .4;                      // à l'inspiration, la poitrine se soulève et le buste se redresse
    const r = reaction(A, t), triste = NEGATIVES.includes(visage);
    q.cou += r * (triste ? 7 : -4); q.epaules += r * (triste ? -1.4 : .6);
    q.cou += B.bruit(t * .45, sd) * 2.4;
    q.tete_cote += B.bruit(t * .33, sd + 11) * 2;
    q.penche += B.bruit(t * .3, sd + 3) * 1.2;
    q.epaule_av += B.bruit(t * .4, sd + 5) * 2.2; q.epaule_ar += B.bruit(t * .4, sd + 7) * 1.8;
    q.torsion += B.bruit(t * .27, sd + 13) * 2;
  }
  // marche à pieds plantés : les pieds suivent la distance parcourue (ou le temps, pour une marche sur place)
  function cycleMarche(A, a, q, t, depl) {
    const M = A.M, u = M.u, sens = a.sens ?? A.sens;
    const cyc = CYCLES[a.pose === 'court' ? 'court' : 'marche'];
    if (a.vue === undefined) q.vue = cyc.vue;
    const yaw = Math.abs(q.vue) * Math.PI / 180;
    const Ls = (M.L.cuisse + M.L.tibia) * cyc.foulee;
    const dl = depl ? depl.dist / (Math.max(.35, Math.sin(yaw)) * A.echelle) : t * 120 / A.echelle;
    const ph = dl / (2 * Ls);
    const sx = { av: -sens, ar: sens };
    for (const [k, off] of [['av', 0], ['ar', .5]]) {
      const p = ((ph + off) % 1 + 1) % 1;
      let zf, lift = 0;
      if (p < .5) zf = Ls / 2 - (p / .5) * Ls;
      else { const s = (p - .5) / .5; zf = -Ls / 2 + B.ease('sinus', s) * Ls; lift = Math.sin(Math.PI * s) * cyc.lev * u; }
      const bob = (1 + Math.cos(ph * Math.PI * 4)) * cyc.rebond * .5 * u;      // genoux fléchis au contact (le poids)
      q['pied_cible_' + k] = [sx[k] * M.L.hw * .9, M.L.cheville + lift + bob + 1.6 * u, zf];
      q['pied_' + k] = p >= .5 ? -12 * Math.sin(Math.PI * (p - .5) / .5) : (p < .1 ? 8 : 0);
    }
    const sw = Math.sin(ph * Math.PI * 2);
    q.epaule_av = -cyc.bras * sw + 6; q.epaule_ar = cyc.bras * sw - 2;
    q.coude_av = cyc.coude + Math.max(0, -sw) * 14; q.coude_ar = cyc.coude + Math.max(0, sw) * 14;
    q.penche += cyc.penche; q.torsion += sw * 5;
    q.cou -= cyc.penche * .5;
  }
  // le squelette que VISE l'action i à l'instant t
  function cible(A, i, t) {
    const a = A.actions[i], sens = a.sens ?? A.sens;
    const marchePose = a.pose === 'marche' || a.pose === 'court';
    const depl = deplacement(a, t);
    const posePropre = (tq) => { const q = qPose(a); vie(q, A, tq, i); return q; };
    if ((marchePose && !depl) || (depl && depl.k < 1 && depl.tot > 3)) {
      const q = posePropre(t); cycleMarche(A, a, q, t, depl); return RIG.squelette(A.M, q, sens);
    }
    const S = RIG.squelette(A.M, posePropre(t), sens);
    const tA = depl ? a.t + a.duree_marche : 0;
    if (!depl || depl.tot <= 3 || t - tA >= ARRET) return S;
    const qm = posePropre(tA); cycleMarche(A, a, qm, tA, deplacement(a, tA));       // le dernier pas, posé en douceur
    return RIG.melange(RIG.squelette(A.M, qm, sens), S, B.ease('sortie', (t - tA) / ARRET));
  }
  // se lever / s'asseoir / s'agenouiller : le corps passe par une pose de passage (RIG.PASSAGES) et prend son temps
  const DUREE_TRANSITION = .5, DUREE_PASSAGE = 1.0;
  const passageDe = (acts, i) => i > 0 ? RIG.passage(qPose(acts[i - 1]), qPose(acts[i])) : null;
  function dureeTransition(acts, i) {
    return acts[i].transition ?? (passageDe(acts, i) ? DUREE_PASSAGE : DUREE_TRANSITION);
  }
  function squeletteA(A, i, t) {
    const S = cible(A, i, t);
    if (i === 0) return S;
    const a = A.actions[i], k = B.clamp((t - a.t) / dureeTransition(A.actions, i));
    if (k >= 1) return S;
    const S0 = squeletteA(A, i - 1, t), P = passageDe(A.actions, i), jeu = a.jeu ?? 1;
    if (!P) return RIG.melangeJeu(S0, S, k, jeu);
    const q = Object.assign({}, RIG.P0, RIG.PASSAGES[P], { vue: qPose(a).vue });
    vie(q, A, t, i);
    const SP = RIG.squelette(A.M, q, a.sens ?? A.sens);
    return RIG.melangeJeu(RIG.melange(S0, SP, k), RIG.melange(SP, S, k), k, jeu);
  }
  // ce qui n'est pas redit dans une action continue : le visage, le regard, la parole
  function herite(acts, i, cle, defaut) { for (let j = i; j >= 0; j--) if (acts[j][cle] !== undefined) return acts[j][cle]; return defaut; }
  function fond(x0, x1, e) {
    if (Array.isArray(x0) && Array.isArray(x1)) return x0.map((v, j) => B.lerp(v, x1[j] ?? v, e));
    return typeof x0 === 'number' && typeof x1 === 'number' ? B.lerp(x0, x1, e) : (e < .5 ? x0 : x1);
  }
  function enCouches(A, i, t, valeur, duree) {
    const v = valeur(i);
    if (i === 0) return v;
    const k = B.clamp((t - A.actions[i].t) / duree);
    if (k >= 1) return v;
    const v0 = enCouches(A, i - 1, t, valeur, duree), e = B.ease('doux', k);
    if (Array.isArray(v) || typeof v !== 'object') return fond(v0, v, e);
    const out = {};
    for (const n of new Set([...Object.keys(v0), ...Object.keys(v)])) out[n] = fond(v0[n] ?? 0, v[n] ?? 0, e);
    return out;
  }

  // le corps seul (squelette + position au sol) : ce que lit aussi le mouvement secondaire
  function corps(A, t) {
    const acts = A.actions;
    let i = 0;
    for (let k = 0; k < acts.length; k++) if (acts[k].t <= t) i = k;
    const a = acts[i], depl = deplacement(a, t);
    return { i, S: squeletteA(A, i, t), x: depl ? depl.x : (a.x_fin ?? A.x0), y: depl ? depl.y : (a.y_fin ?? A.y0) };
  }
  // poser au sol : le point le plus bas (ou l'assise) touche y — y = le sol sous ses pieds, toujours (assis sur un
  // siège : les pieds touchent le sol ; assis par terre : les fesses aussi). Renvoie ce point bas, en px du dessin.
  function basDuCorps(M, S, P, pr) {
    const { add, mul, rot } = RIG.v, ys = [];
    for (const k of ['av', 'ar']) {
      const j = S.jambes[k], A2 = P['cheville_' + k], d = rot(j.ft, j.ax, 90);
      ys.push(pr(add(A2, add(mul(d, M.L.cheville * .95), mul(j.ft, -1.2 * M.u))))[1]);
      ys.push(pr(add(A2, add(mul(d, M.L.cheville * .6), mul(j.ft, 5.6 * M.u))))[1]);
      ys.push(pr(P['genou_' + k])[1] + M.L.r_tibia[0] * .95);
    }
    ys.push((S.q.assise || 0) > .5 ? pr([P.O[0], RIG.assiseY(M, P), P.O[2]])[1] : pr(P.O)[1] + 5.6 * M.u);
    if (S.q.rotation) {
      ys.push(pr(add(P.tete, RIG.v.app(S.H, [0, M.L.ty * 1.1, 0])))[1]);
      ys.push(pr(P.epaule_av)[1] + 3 * M.u); ys.push(pr(P.epaule_ar)[1] + 3 * M.u);
    }
    return Math.max(...ys);
  }

  // MOUVEMENT SECONDAIRE : ce qui pend (cheveux, voile, robe, manteau) suit le corps avec retard, comme un ressort
  // amorti. Sans mémoire d'une image à l'autre : on relit la trajectoire récente de la tête et du bassin (réponse
  // impulsionnelle du ressort) — le rendu reste déterministe, image par image, dans n'importe quel ordre.
  const RESSORTS = { tete: { f: 1.4, z: .38, max: 5 }, bassin: { f: 1.8, z: .45, max: 6 } };   // Hz, amortissement, écart max (u)
  const PAS_RESSORT = 1 / 30, N_RESSORT = 16;
  // tête et bassin dans le repère du dessin (px avant l'échelle), posés au sol. Le y du sol n'y entre pas : marcher
  // vers le fond fait monter le personnage à l'écran, mais ce n'est pas un mouvement vertical pour le tissu.
  function ancres(A, t, ech) {
    const c = corps(A, t), P = RIG.positions(A.M, c.S), pr = RIG.projecteur(c.S.yaw, c.S.q.rotation || 0, P.O);
    const ox = c.x / ech, oy = -basDuCorps(A.M, c.S, P, pr), tt = pr(P.tete), oo = pr(P.O);
    return { tete: [ox + tt[0], oy + tt[1]], bassin: [ox + oo[0], oy + oo[1]] };
  }
  function secondaire(A, t, ech) {
    const now = ancres(A, t, ech), out = {};
    const somme = {}; for (const n in RESSORTS) somme[n] = [0, 0, 0];
    for (let j = 1; j <= N_RESSORT; j++) {
      const tau = j * PAS_RESSORT, p = ancres(A, Math.max(0, t - tau), ech);
      for (const n in RESSORTS) {
        const r = RESSORTS[n], w = 2 * Math.PI * r.f, h = Math.exp(-r.z * w * tau) * Math.sin(w * Math.sqrt(1 - r.z * r.z) * tau);
        somme[n][0] += h * (p[n][0] - now[n][0]); somme[n][1] += h * (p[n][1] - now[n][1]); somme[n][2] += h;
      }
    }
    for (const n in RESSORTS) {
      let dx = somme[n][0] / somme[n][2], dy = somme[n][1] / somme[n][2];
      const m = Math.hypot(dx, dy), lim = RESSORTS[n].max * A.M.u;
      if (m > lim) { dx *= lim / m; dy *= lim / m; }
      out[n] = [dx, dy];
    }
    return out;
  }

  // clignements : irréguliers (2,2 à 5,4 s, parfois doubles), et un de plus quand le personnage change de pose ou de
  // regard (on cligne en tournant la tête) — toujours les mêmes pour un même personnage (déterministe)
  const DEMI_CLIGNEMENT = .07;
  function clignement(A, t) {
    const al = B.alea(A.seed * 7 + 3), instants = [];
    for (let tb = .4 + al() * 2; tb < t + 1; tb += 2.2 + al() * 3.2) { instants.push(tb); if (al() < .15) instants.push(tb + .26); }
    for (const a of A.actions.slice(1)) if (a.pose || a.regarde || a.regard || a.vue !== undefined) instants.push(a.t + .04);
    let c = 1;
    for (const tb of instants) { const x = Math.abs(t - tb); if (x < DEMI_CLIGNEMENT) c = Math.min(c, x / DEMI_CLIGNEMENT); }
    return c;
  }

  function etat(A, t) {
    const acts = A.actions, sd = A.seed;
    const { i, S, x, y } = corps(A, t);
    const v = enCouches(A, i, t, j => Object.assign({}, VISAGES.neutre, VISAGES[herite(acts, j, 'visage', 'neutre')] || {}), T_VISAGE);
    const rx = reaction(A, t);                       // au mot appuyé : les sourcils montent (ou se froncent de peine)
    if (rx) { if (NEGATIVES.includes(herite(acts, i, 'visage', 'neutre'))) v.sour_a = (v.sour_a || 0) + rx * 7; else v.sour_h = (v.sour_h || 0) + rx * .22; }
    const regard = enCouches(A, i, t, j => {
      const r0 = regardAction(acts[j]) || REGARD_POSE[herite(acts, j, 'pose', 'debout')];
      if (r0) return r0;
      for (let k = j - 1; k >= 0; k--) { const r = regardAction(acts[k]); if (r) return r; }
      return [0, 0];
    }, T_REGARD);
    const cligne = clignement(A, t);
    // parole : visèmes (si la voix est analysée) ou bouche procédurale
    let parle = 0, viseme = null;
    if (herite(acts, i, 'parle', 0)) {
      if (A.visemes && A.visemes.length) {
        const tg = (A.t0 || 0) + t;
        let vv = 'X'; for (const [tv, c] of A.visemes) { if (tv <= tg) vv = c; else break; }
        viseme = vv;
      } else parle = B.clamp(.22 + .5 * Math.abs(B.bruit(t * 7.5, sd)) + .22 * Math.sin(t * 13 + sd), 0, .8);
    }
    return { S, v, x, y, cligne, parle, viseme, regard };
  }

  // l'ombre portée : la silhouette couchée sur le sol (y = ligne du sol), à l'opposé de la lumière (eclairage.js)
  function porteeSvg(po, y, corps) {
    if (!po) return '';
    return `<g transform="matrix(1,0,${f(-po.sx)},${f(po.sy)},${f(po.sx * y)},${f((1 - po.sy) * y)})" opacity="${f(po.opacite)}"><g filter="url(#${po.filtre})">${corps}</g></g>`;
  }
  // l'écran d'un téléphone, dans la pénombre (k : 0 en plein jour → 1 la nuit), éclaire le visage penché dessus :
  // une lueur froide qui part de l'écran et monte jusqu'au visage (repère local du personnage)
  const LUEUR_ECRAN = .5, PORTEE_ECRAN = 1.15, VERS_VISAGE = .6;     // la lueur se centre plus près du visage que de l'écran
  function lueurEcran(r, id, k) {
    if (!k || !r.ecran) return '';
    const [ex, ey] = r.ecran.pos, [tx, ty] = r.pts.tete, R = Math.hypot(tx - ex, ty - ey) * PORTEE_ECRAN, gid = `${id}_ecran`;
    return `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="${r.ecran.couleur}" stop-opacity="${f(LUEUR_ECRAN * k)}"/>` +
      `<stop offset=".45" stop-color="${r.ecran.couleur}" stop-opacity="${f(LUEUR_ECRAN * .45 * k)}"/><stop offset="1" stop-color="${r.ecran.couleur}" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${f(B.lerp(ex, tx, VERS_VISAGE))}" cy="${f(B.lerp(ey, ty, VERS_VISAGE))}" r="${f(R)}" fill="url(#${gid})" style="mix-blend-mode:screen"/>`;
  }
  function rendre(A, t, opts) {
    const e = etat(A, t);
    const M = A.M;
    // ce qu'il tient peut changer d'une action à l'autre ("tient": "telephone" | null | {svg…})
    let tient, tient_ar, bras_devant = false;
    for (const ac of A.actions) if (ac.t <= t) {
      if ('tient' in ac) tient = ac.tient; if ('tient_ar' in ac) tient_ar = ac.tient_ar;
      bras_devant = ac.bras_devant ?? POSES_ENLACE.includes(ac.pose);
    }
    const ech = A.echelle * (A.ech_y ? A.ech_y(e.y) : 1);
    const sec = opts.sans_secondaire ? null : secondaire(A, t, ech);
    const r = dessiner(M, e.S, Object.assign({}, opts, { id: A.id + '_', t, v: e.v, regard: e.regard, parle: e.parle, viseme: e.viseme, cligne: e.cligne, sec, tient, tient_ar, bras_devant }));
    const P = r.P;
    const bas = basDuCorps(M, e.S, P, r.pr);
    const yb = e.y - bas * ech + (A.dy || 0) - (e.S.q.leve_y || 0) * M.u * ech;
    const larg = M.L.sw * 1.75 * ech;
    const ombre = A.ombre === false ? '' : `<ellipse cx="${f(e.x)}" cy="${f(e.y + 2)}" rx="${f(larg)}" ry="${f(larg * .16)}" fill="#120c1c" opacity="${f(.32 * (A.opacite_ombre ?? 1))}" filter="url(#flou6)"/>`;
    const lueur = M.lumiere_propre ? `<ellipse cx="${f(e.x + r.pts.tete[0] * ech * .3)}" cy="${f(yb + r.pr(P.poitrine)[1] * ech)}" rx="${f(M.L.sw * 5.4 * ech)}" ry="${f(M.L.sw * 7.6 * ech)}" fill="url(#gloire)" opacity="${f(M.lumiere_propre)}"/>` : '';
    const lumEcran = lueurEcran(r, A.id, opts.lueur_ecran);
    return {
      svg: `${lueur}${ombre}${porteeSvg(opts.portee, e.y, `<g transform="translate(${f(e.x)},${f(yb)}) scale(${f(ech)})">${r.svg}</g>`)}<g class="corps" transform="translate(${f(e.x)},${f(yb)}) scale(${f(ech)})" filter="${opts.filtre || ''}">${r.svg}</g>` +
        (lumEcran ? `<g transform="translate(${f(e.x)},${f(yb)}) scale(${f(ech)})">${lumEcran}</g>` : ''),
      devant: r.devant ? `<g transform="translate(${f(e.x)},${f(yb)}) scale(${f(ech)})" filter="${opts.filtre || ''}">${r.devant}</g>` : '',
      defs: r.defs, x: e.x, y: e.y, ech,
      tete: [e.x + r.pts.tete[0] * ech, yb + r.pts.tete[1] * ech], haut: yb + r.pts.haut[1] * ech,
      // les articulations dans le monde (contrôle des sauts : une articulation ne bondit jamais d'une image à l'autre)
      articulations: Object.fromEntries(ARTICULATIONS.map(n => { const q = r.pr(P[n]); return [n, [e.x + q[0] * ech, yb + q[1] * ech]]; })),
      sens: e.S.sens, vu: r.vu,
    };
  }

  // planche de contrôle (tests) : dessine un personnage seul dans une pose
  function poser(desc, pose, opts = {}) {
    const M = RIG.modele(desc);
    const A = { id: 'p' + (UID++), M, x0: opts.x ?? 0, y0: opts.y ?? 0, sens: opts.sens ?? 1, seed: 3, echelle: opts.echelle ?? 1, actions: [Object.assign({ t: 0, pose }, opts.action || {})] };
    return rendre(A, opts.t ?? 1, { lumiere: opts.lumiere ?? -1, ombre: opts.ombre, style: opts.style });
  }

  G.PERSO = { modele: RIG.modele, rendre, poser, POSES: RIG.POSES, VISAGES, VISEMES: G.TETE.VISEMES, CYCLES, etat, dessiner, dureeTransition, secondaire };
})(typeof window !== 'undefined' ? window : globalThis);
