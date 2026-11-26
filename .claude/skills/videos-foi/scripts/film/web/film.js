// Le film : plans, couches à profondeur (parallaxe 2,5D), caméra, profondeur de champ, personnages, objets,
// matières (eau, pluie, lumière…), textes (sous-titres mot à mot, cartes de verset, étiquettes, titres),
// transitions, étalonnage, grain. Rendu image par image, déterministe : FILM.rendre(t) dessine l'instant t.
(function (G) {
  const B = G.B, f = B.f, PERSO = G.PERSO, MONDE = G.MONDE;
  const W = B.W, H = B.H;
  const NS = 'http://www.w3.org/2000/svg';
  let D = null;                         // le film résolu (temps en secondes)
  const cache = {};                     // plans construits
  let svg, slots, html, sousPapier, papierEl;
  // format « papier » : illustration en haut (HP px), papier déchiré en bas avec le texte dit, mot à mot
  let PAPIER = false, HP = 1920, CY = 960, FEN = null;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function charger(data) {
    D = data;
    svg = document.getElementById('monde');
    svg.innerHTML = ''; for (const k in cache) delete cache[k]; FEN = null;      // (l'atelier recharge le film à chaque retouche)
    html = document.getElementById('textes');
    sousPapier = document.getElementById('sous_papier');
    papierEl = document.getElementById('papier');
    PAPIER = ['lumiere', 'papier'].includes((D.style || {}).format || 'lumiere');     // « plein_ecran » : l'ancien format
    if (PAPIER) {
      FEN = Object.assign({ x0: 46, x1: 1034, haut: 70, bas: 1130 }, D.style.fenetre || {});
      HP = FEN.bas; CY = (FEN.haut + FEN.bas) / 2;
      construireLumiere();
    }
    const defs = el('defs', { id: 'defs_film' }, svg);
    defs.innerHTML = [2, 4, 6, 10, 18, 30].map(s => `<filter id="flou${s}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`).join('') +
      `<radialGradient id="gloire"><stop offset="0" stop-color="#fff6dc" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe7a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>`;
    slots = [el('g', { id: 'planA' }, svg), el('g', { id: 'planB' }, svg)];
    D.personnages = D.personnages || {};
    for (const k in D.personnages) D.personnages[k]._M = PERSO.modele(D.personnages[k]);
  }

  // ------------------------------------------------------------------ format « lumière » : la fenêtre en arche sur la nuit
  // L'image vit dans une arche (un vitrail, une porte ouverte) posée sur un fond bleu nuit ; le texte dit est dessous,
  // et le mot prononcé s'allume en or (« Ta parole est une lampe à mes pieds », Psaume 119:105).
  function arche() {
    const { x0, x1, haut, bas } = FEN, r = (x1 - x0) / 2, cx = (x0 + x1) / 2;
    return `M${x0},${bas} L${x0},${haut + r} A${r},${r} 0 0 1 ${x1},${haut + r} L${x1},${bas} Z`;
  }
  function construireLumiere() {
    const d = arche();
    svg.style.clipPath = `path('${d}')`;
    sousPapier.style.clipPath = `path('${d}')`;
    const gi = document.getElementById('grain_illus');
    gi.style.display = 'block'; gi.style.clipPath = `path('${d}')`;
    papierEl.style.display = 'block';
    papierEl.innerHTML = `<svg width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;left:0;top:0">
      <defs><filter id="lueurCadre" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10"/></filter>
      <linearGradient id="orCadre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a0"/><stop offset=".5" stop-color="#e9b65c"/><stop offset="1" stop-color="#b9893f"/></linearGradient></defs>
      <path d="${d}" fill="none" stroke="var(--lueur)" stroke-width="14" opacity=".35" filter="url(#lueurCadre)"/>
      <path d="${d}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="26" style="mix-blend-mode:multiply" transform="translate(0,0)" clip-path="url(#dedans)"/>
      <clipPath id="dedans"><path d="${d}"/></clipPath>
      <path d="${d}" fill="none" stroke="url(#orCadre)" stroke-width="5"/></svg>`;
  }
  const COUL_PANNEAU = { fond: '#121830', fond2: '#0b1020', texte: '#f4ecdc', gris: '#55607f', actif: '#ffd36b', lueur: '#ffd36b' };
  const SEUIL_PANNEAU_CLAIR = .6;
  const CERNE_ACTIF = 2.5;            // px : le liseré d'encre du mot actif sur un panneau clair     // luminance du fond au-delà de laquelle le panneau est « clair »

  // ------------------------------------------------------------------ construction d'un plan (une fois)
  function construire(i) {
    if (cache[i]) return cache[i];
    const p = D.plans[i];
    const lieu = Object.assign({}, (D.lieux || {})[p.lieu] || {});
    const root = document.createElementNS(NS, 'g');
    const items = [];
    const lum = ECLAIRAGE.ambiance(lieu, p);             // heure, direction, couleurs, ombres portées, voile (eclairage.js)
    const fid = 'rim' + i;
    const dx = lum.cote < 0 ? 3 : -3;
    const fd = el('defs', {}, root);
    fd.innerHTML = `<filter id="${fid}" x="-20%" y="-10%" width="140%" height="120%"><feOffset in="SourceAlpha" dx="${dx}" dy="2" result="o"/>` +
      `<feComposite in="SourceAlpha" in2="o" operator="out" result="b"/><feFlood flood-color="${lum.couleur}" flood-opacity="${lum.rim}"/><feComposite in2="b" operator="in" result="r"/>` +
      `<feGaussianBlur in="r" stdDeviation=".8" result="rb"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="rb"/></feMerge></filter>` +
      `<filter id="sil${i}" x="-50%" y="-50%" width="200%" height="200%"><feFlood flood-color="${lum.ombre}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
    // le sol du lieu : horizon + échelle de référence → la perspective est la même pour le décor et les personnages
    const sol = Object.assign({}, lieu.sol || {}, p.sol || {});
    const aSol = sol.horizon !== undefined;
    const ech_y = aSol ? (y) => Math.max(.05, (y - sol.horizon) / Math.max(1, (sol.y_ref ?? 1500) - sol.horizon)) : null;
    const perspective = (o) => aSol ? Object.assign({ horizon: sol.horizon, fuite: sol.fuite, distance: sol.distance, y_ref: sol.y_ref ?? 1500, echelle_sol: sol.echelle ?? 1 }, o) : o;
    const toutes = [...(lieu.couches || []), ...(p.couches || []), ...(lieu.objets || []), ...(p.objets || [])];
    const persp = (o) => poserSur(accorder(perspective(o), toutes, lieu, perspective), toutes, perspective);
    // une foule se range par son rang le plus en avant : ceux qui sont devant elle passent devant, les autres derrière
    const piedDe = (o) => o.y_sol ?? (o.gen === 'foule' && o.zone ? o.zone[3] : POSES_PAR_LE_PIED.includes(o.gen) ? (o.y ?? undefined) : undefined);
    // couches du lieu + couches propres au plan
    const couches = [...(lieu.couches || []), ...(p.couches || [])];
    // d'où vient chaque chose (le lieu ou le plan, sa liste, son rang) : l'atelier la retrouve quand on la déplace
    const source = (liste, k) => { const n = (lieu[liste] || []).length; return k < n ? { ou: 'lieu', liste, k } : { ou: 'plan', liste, k: k - n }; };
    couches.forEach((c0, k) => {
      const c = persp(ECLAIRAGE.cielDeLHeure(c0, lieu));
      const g = el('g', { 'class': 'couche' });
      const z = c.z_ordre ?? piedDe(c) ?? (c.devant ? 1e6 : -1e6);
      if (c.gen && MONDE.dynamique(c)) {
        items.push({ d: c.profondeur ?? 1, z, g, couche: c, dyn: true, id: `p${i}c${k}`, source: source('couches', k) });
      } else {
        if (c.gen && !MONDE.GEN[c.gen]) throw new Error(`générateur inconnu : ${c.gen}`);
        // une barque qui porte des passagers se dessine en deux : l'arrière (ici), l'avant par-dessus eux (plus bas)
        const passagers = c.gen === 'barque' && c.id ? (p.acteurs || []).filter(a => a.porte_par === c.id) : [];
        g.innerHTML = c.gen ? MONDE.GEN[c.gen](passagers.length ? Object.assign({}, c, { partie: 'arriere' }) : c, `p${i}c${k}`, 0) : (c.svg || '');
        items.push({ d: c.profondeur ?? 1, z, g, couche: c, anims: [], source: source('couches', k) });
        if (passagers.length) {
          const ga = el('g', { 'class': 'couche' });
          ga.innerHTML = MONDE.GEN.barque(Object.assign({}, c, { partie: 'avant' }), `p${i}c${k}a`, 0);
          items.push({ d: c.profondeur ?? 1, z: Math.max(...passagers.map(a => a.y ?? sol.y_ref ?? 1500)) + .5, g: ga, couche: c, anims: [] });
        }
      }
    });
    // les objets du lieu (un banc, un lampadaire : dans chacun de ses plans) + ceux du plan
    const objets = [...(lieu.objets || []), ...(p.objets || [])];
    objets.forEach((o0, k) => {
      const o = persp(o0);
      const g = el('g', { 'class': 'objet' });
      if (o.gen && !MONDE.GEN[o.gen]) throw new Error(`générateur inconnu : ${o.gen}`);
      const dyn = o.gen && MONDE.dynamique(o);
      g.innerHTML = dyn ? '' : (o.svg || (o.gen ? MONDE.GEN[o.gen](o, `p${i}o${k}`, 0) : ''));
      items.push({ d: o.profondeur ?? 1, z: o.z_ordre ?? piedDe(o) ?? (o.devant ? 1e6 - 1 : 1e5), g, objet: o, anims: dyn ? null : [], dyn, couche: dyn ? o : undefined, id: `p${i}o${k}`, source: source('objets', k) });
    });
    (p.acteurs || []).forEach((a, k) => {
      const g = el('g', { 'class': 'acteur' });
      const P = D.personnages[a.id];
      if (!P) throw new Error(`personnage inconnu : ${a.id} (plan ${i + 1})`);
      const y0 = a.y ?? sol.y_ref ?? 1500;
      const A = {
        id: `p${i}a${k}${a.id}`, M: P._M, x0: a.x ?? 540, y0, sens: a.sens ?? 1, seed: (k + 1) * 13 + i,
        echelle: (a.echelle ?? 1) * (aSol && a.perspective !== false ? (sol.echelle ?? 1) : 1),
        ech_y: aSol && a.perspective !== false ? ech_y : null, dy: a.dy || 0, t0: p.debut,
        visemes: a.levres !== false ? (D.visemes || null) : null, ombre: a.ombre, opacite_ombre: a.opacite_ombre, actions: [],
        accents: (p.mots || []).filter(m => m.accent).map(m => m.t), reagit: a.reagit,
      };
      // actions : déplacements résolus (marche vers x et/ou y ; en profondeur, il se tourne vers nous ou de dos)
      let x = A.x0, y = y0;
      const acts = (a.actions || [{ t: 0, pose: 'debout' }]).slice().sort((u, v) => u.t - v.t);
      let prec = null;
      acts.forEach((ac) => {
        const r = Object.assign({}, ac);
        if ((r.pose ?? (prec ? prec.pose : 'debout')) === 'debout' && r.attitude === undefined) r.attitude = attitudeDe(a.id);
        // une action qui ne dit pas de pose (un visage, un regard qui change) garde la posture en cours : la pose, ses
        // angles (assis reste assis), son orientation — sinon il se relèverait tout seul
        if (prec && ac.pose === undefined) {
          r.pose = prec.pose;
          if (ac.angles === undefined && prec.angles !== undefined) r.angles = prec.angles;
          if (ac.vue === undefined && prec.vue !== undefined) r.vue = prec.vue;
        }
        prec = r;
        if (ac.x !== undefined || ac.y !== undefined) {
          const x2 = ac.x ?? x, y2 = ac.y ?? y;
          const ek = ech_y ? ech_y((y + y2) / 2) : 1;
          const dist = Math.hypot(x2 - x, (y2 - y) * 2.4) / Math.max(.2, ek * (A.echelle || 1));
          r.x_depart = x; r.y_depart = y; r.x = x2; r.y_fin = y2;
          r.duree_marche = ac.duree ?? Math.max(.4, dist / (ac.vitesse || (ac.pose === 'court' ? 520 : 190)));
          if (r.sens === undefined && Math.abs(x2 - x) > 2) r.sens = x2 > x ? 1 : -1;
          if (r.vue === undefined && Math.abs(y2 - y) * 2.4 > Math.abs(x2 - x) * 1.5) r.vue = y2 > y ? 12 : 168;
          x = x2; y = y2;
        }
        r.x_fin = x; r.y_fin = y;
        A.actions.push(r);
      });
      items.push({ d: a.profondeur ?? 1, z: y0, g, acteur: A, spec: a });
      // le calque « devant » de ce personnage (un bras qui entoure quelqu'un) : après tous les personnages
      const gd = el('g', { 'class': 'acteur_devant' });
      items[items.length - 1].devant = gd;
      items.push({ d: a.profondeur ?? 1, z: Z_DEVANT, g: gd });
    });
    // caméra « cadre » : on dit QUI on filme et COMMENT (large, moyen, serre, visage) ; le moteur calcule x, y, zoom
    // pour que ces personnages soient entiers dans l'image et leurs visages AU-DESSUS des sous-titres
    const parId = {};
    for (const it of items) if (it.acteur && !parId[it.spec.id]) parId[it.spec.id] = it;
    // "regarde": "<id>" → où est sa tête par rapport à la nôtre (à l'écran), au début de l'action
    for (const it of items) if (it.acteur) for (const ac of it.acteur.actions) if (typeof ac.regarde === 'string' && parId[ac.regarde]) {
      const moi = PERSO.rendre(it.acteur, ac.t + .3, { sans_secondaire: true }).tete, lui = PERSO.rendre(parId[ac.regarde].acteur, ac.t + .3, { sans_secondaire: true }).tete;
      ac.regard_cible = [lui[0] - moi[0], lui[1] - moi[1]];
    }
    if (p.camera) p.camera = suivreTransitions(p.camera, parId);
    for (const key of (p.camera || [])) if (key.cadre) Object.assign(key, cadrer(key, parId, p));
    const ordre = (u, v) => u.d - v.d || u.z - v.z;
    // une petite foule ne montre jamais une moitié de personne : qui serait coupé par le bord (au début ou à la fin du plan)
    // n'est pas là
    if (FEN) items.forEach((it, k) => {
      const o = it.couche || it.objet;
      if (!o || o.gen !== 'foule') return;
      const cams = [camera(p, 0), camera(p, (p.duree ?? 1) * .5), camera(p, p.duree ?? 1)];
      const garde = (x, y, e) => cams.every(cam => { const r = DEMI_FIGURANT * e, g0 = ecran(cam, [x - r, y], it.d)[0], g1 = ecran(cam, [x + r, y], it.d)[0]; return g1 < FEN.x0 || g0 > FEN.x1 || (g0 > FEN.x0 - (g1 - g0) * COUPE_FOULE && g1 < FEN.x1 + (g1 - g0) * COUPE_FOULE); });
      it.g.innerHTML = MONDE.GEN.foule(Object.assign({}, o, { garde }), `p${i}f${k}`, 0);
    });
    for (const it of items) {
      if (it.anims) it.g.querySelectorAll('[data-anim]').forEach(e => { try { it.anims.push([e, JSON.parse(e.getAttribute('data-anim'))]); } catch (err) { } });
      if (it.objet && it.objet.anim) it.anims.push([it.g.firstElementChild || it.g, it.objet.anim]);
    }
    // la lumière : voile de profondeur (dehors), surcouche à l'écran (direction, vignette, moment clé), sources proches
    if ((lieu.couches || []).some(x => x.gen === 'ciel')) {
      const gv = el('g', { 'class': 'voile' });
      gv.innerHTML = ECLAIRAGE.voile(lum, `voile${i}`, sol.horizon ?? 1000);
      items.push({ d: PROFONDEUR_VOILE, z: -1e6, g: gv });
    }
    const surcouche = { d: 1e3, z: 0, g: el('g', { 'class': 'eclairage' }), ecran: true };
    items.push(surcouche);
    items.sort(ordre);
    for (const it of items) root.appendChild(it.g);
    const sources = ECLAIRAGE.sources([...(lieu.couches || []), ...(p.couches || []), ...objets]);
    const c = { root, items, p, lieu, lum, fid, ordre, surcouche, sources, portee: ECLAIRAGE.portee(lum) };
    cache[i] = c;
    return c;
  }

  // ------------------------------------------------------------------ caméra
  const ETAL = { contraste: 1.04, saturation: .97, sepia: .05 };   // étalonnage du format lumière (24/11 : moins délavé)
  const PROFONDEUR_VOILE = .55;     // le voile de profondeur passe entre le lointain et le plan des personnages
  // en dessous de cette exposition (le soir, la nuit), un écran allumé éclaire le visage ; pleinement sous EXPO_JOUR − PENOMBRE
  const EXPO_JOUR = .95, PENOMBRE = .3;
  // ce qui se pose au sol par son pied (y) : il passe devant ou derrière les personnages selon ce pied
  const POSES_PAR_LE_PIED = ['meuble', 'arbre', 'rochers', 'batiment', 'volume', 'animal', 'auge', 'feu', 'accessoire', 'lampadaire', 'puits', 'tombeau', 'croix', 'objet'];
  const ECART_BULLE = .92;           // la bulle reste à au moins ça du centre de la tête (en demi-hauteurs de tête)
  const DE_DOS = -.05;             // le visage regarde au fond (cosinus) : on ne le mesure pas
  const MARGE_TEXTE = 34, MARGE_BADGE = 70, LARGE_LETTRE = .66;     // px entre l'étiquette et les bords de l'arche ; largeur moyenne d'une capitale (part du corps)
  const SANS_OMBRE_PAPIER = ['ciel', 'sol', 'piece', 'barque', 'chemin', 'relief'];
  const DEMI_FIGURANT = 62, COUPE_FOULE = .1;      // demi-largeur d'un corps (px à l'échelle 1) ; part qui peut dépasser du cadre
  const BADGE_Y = 128;              // px sous le haut de l'arche : là où elle est assez large pour un badge, au-dessus des têtes
  const TETE_AU_SOL = .34;          // tête plus basse que ça (part de sa taille debout) : le corps est au sol
  const Z_DEVANT = 5e4;             // au-dessus de tous les personnages (leurs z = y des pieds), sous les objets « devant »
  const PLANS_CAM = {               // hauteur du (des) personnage(s) à l'écran, hauteur du visage à l'écran
    ensemble: [420, 1000], large: [640, 880], moyen: [1050, 760], americain: [1350, 760], serre: [1800, 780], visage: [3000, 820],
  };
  const PLANS_PAPIER = (hp) => ({     // dans le panneau illustration (hauteur hp)
    ensemble: [hp * .32, hp * .6], large: [hp * .64, hp * .4], moyen: [hp * 1.0, hp * .36], americain: [hp * 1.25, hp * .35], serre: [hp * 1.7, hp * .38], visage: [hp * 2.7, hp * .44],
  });
  // L'ACCORD entre les matières d'un lieu : l'eau reflète le ciel à l'horizon, l'eau qui passe devant une barque est celle du
  // lac à cet endroit, une plage a un rivage (sable mouillé, écume) — rien ne se règle à la main, rien ne jure
  function accorder(o, toutes, lieu, perspective = (x) => x) {
    const eau = toutes.find(c => c.gen === 'eau'), ciel0 = toutes.find(c => c.gen === 'ciel'), ciel = ciel0 && ECLAIRAGE.cielDeLHeure(ciel0, lieu), astre = ciel?.astre;
    // l'eau prend la couleur du ciel, et le chemin de lumière suit l'astre qu'on voit (ou il n'y en a pas)
    if (o.gen === 'eau' && ciel) return Object.assign({}, o, { reflet: o.reflet || B.mix(B.clair(o.couleur || '#2f6f86', .2), ciel.bas || '#f2b46b', .5), astre_x: astre ? astre[0] : undefined, astre_couleur: o.astre_couleur || ciel.astre_couleur }, astre ? { suit: { x: astre[0], y: astre[1], d: ciel.profondeur ?? 1 } } : {});
    // un rayon part de ce qui l'éclaire : la fenêtre de la pièce, le soleil du ciel (jamais d'un point du mur ou du vide)
    if (o.gen === 'rayons') {
      const piece = toutes.find(c => c.gen === 'piece' && c.fenetres?.length);
      if (piece) { const cible = o.source?.[0] ?? 540, milieu = (fe) => Math.abs(fe.x + fe.l / 2 - cible); return Object.assign({}, o, { fenetre: [...piece.fenetres].sort((a, b) => milieu(a) - milieu(b))[0], piece: perspective(piece), profondeur: piece.profondeur ?? 1 }); }
      if (astre) return Object.assign({}, o, { source: [astre[0], astre[1]], profondeur: ciel.profondeur ?? 1 });
    }
    if (o.gen === 'barque' && eau) {
      const e = accorder(eau, toutes, lieu), c = e.couleur || '#2f6f86', k = B.clamp(((o.y ?? 1300) - (e.y ?? 1250)) / 900);
      return Object.assign({}, o, { eau: k < .25 ? B.mix(e.reflet || B.clair(c, .35), c, k / .25) : B.mix(c, e.fond || B.sombre(c, .55), (k - .25) / .75) });
    }
    if (o.gen === 'sol' && eau && o.rivage === undefined && (o.y ?? 0) > (eau.y ?? 1e9)) return Object.assign({}, o, { rivage: true });
    return o;
  }
  // "sur": "<id d'un meuble ou d'un objet>" : posé SUR son plateau (x : où le long, "fond" : 0 devant → 1 au fond) — sa hauteur,
  // sa taille et l'ordre du dessin se calculent : une coupe ne flotte jamais devant la table
  function poserSur(o, toutes, perspective) {
    if (!o.sur) return o;
    const m0 = toutes.find(q => q.id === o.sur);
    if (!m0) throw new Error(`« ${o.gen} ${o.type || ''} » posé sur « ${o.sur} », qui n'existe pas dans ce lieu ou ce plan (donner un "id" au meuble)`);
    const m = perspective(m0), k = MONDE.kSol(m, m.y_sol ?? m.y), d = m.gen === 'objet' ? MONDE.OBJETS[m.type].d.map(v => v * MONDE.OBJETS_CM) : [300, 140, 250];
    const P = MONDE.PERSP(m), prof = (m.prof ?? d[2]) * k * (o.fond ?? .45), pied = MONDE.fuite(P, [o.x ?? m.x + (m.l ?? d[0]) * k / 2, m.y], prof), kk = P.D / (P.D + prof);
    return Object.assign({}, o, { x: pied[0], y: pied[1] - (m.h ?? d[1]) * k * kk, y_sol: pied[1], z_ordre: m.y + .6 - (o.fond ?? .45) * .3, ombre_sol: false });
  }
  // l'attitude d'un personnage (toujours la même pour lui) : tirée de son nom ; Jésus, ouvert et calme
  function attitudeDe(id) {
    if (id.includes('jesus')) return 1;
    let h = 7;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973;
    return 1 + h % (RIG.ATTITUDES.length - 1);
  }
  function cadrer(key, parId, p) {
    const ids = Array.isArray(key.cadre) ? key.cadre : [key.cadre];
    let x0 = Infinity, x1 = -Infinity, Hd = 0, ty = 0, n = 0, bas = 0;
    for (const id of ids) {
      const it = parId[id];
      if (!it) throw new Error(`caméra : « ${id} » n'est pas un acteur de ce plan`);
      const r = PERSO.rendre(it.acteur, key.t ?? 0, { sans_secondaire: true });
      x0 = Math.min(x0, r.tete[0]); x1 = Math.max(x1, r.tete[0]);
      Hd = Math.max(Hd, 99.5 * it.acteur.M.u * r.ech);      // sa hauteur DEBOUT à cet endroit (assis : même cadre)
      ty += r.tete[1]; n++;
      bas += (r.y - r.tete[1]) / Math.max(1, 99.5 * it.acteur.M.u * r.ech);          // où est sa tête : 0 au sol, ≈ 1 debout
    }
    const TAB = PAPIER ? PLANS_PAPIER(HP) : PLANS_CAM;
    const P = TAB[key.plan || 'moyen'] || TAB.moyen;
    let z = P[0] / Math.max(30, Hd) * (key.zoom_k ?? 1);
    if (x1 - x0 > 1) z = Math.min(z, (key.largeur_max ?? 760) / (x1 - x0 + 160));
    z = B.clamp(z, .6, 6);
    // un corps au sol (prosterné, allongé) se cadre plus bas et plus près : la tête en haut, il ne restait que du sol
    const auSol = B.clamp((TETE_AU_SOL - bas / n) / TETE_AU_SOL);
    if (!key.zoom_k) z = B.clamp(z * (1 + .3 * auSol), .6, 6);
    const hy = ty / n, ye = key.y_ecran ?? (PAPIER ? P[1] + (HP * .58 - P[1]) * auSol : P[1]), xe = key.x_ecran ?? 540;
    return { x: (x0 + x1) / 2 - (xe - 540) / z + (key.dx || 0), y: hy - (ye - CY) / z + (key.dy || 0), zoom: z };
  }
  // La caméra suit un personnage qui change de hauteur (il se lève, s'assoit, se penche) : une clé « cadre » posée
  // pendant une transition de pose reçoit une clé jumelle à la fin de la transition, cadrée sur la pose ATTEINTE
  // (sinon la tête sort de l'image pendant qu'il se lève). Les déplacements (marche) ne sont pas concernés.
  function finTransition(key, parId) {
    let fin = 0;
    for (const id of [].concat(key.cadre)) {
      const acts = parId[id]?.acteur.actions || [];
      let i = 0;
      for (let j = 0; j < acts.length; j++) if (acts[j].t <= key.t) i = j;
      if (i > 0 && !acts[i].duree_marche) fin = Math.max(fin, acts[i].t + PERSO.dureeTransition(acts, i));
    }
    return fin;
  }
  function suivreTransitions(cles, parId) {
    const tries = cles.slice().sort((a, b) => a.t - b.t), out = [];
    tries.forEach((key, k) => {
      out.push(key);
      if (!key.cadre) return;
      const fin = finTransition(key, parId), suivante = tries[k + 1];
      if (fin > key.t + .05 && (!suivante || suivante.t > fin + .05)) {
        const jumelle = Object.assign({}, key, { t: fin });
        delete jumelle.mot; delete jumelle.coupe;           // la jumelle suit en douceur, elle ne coupe pas
        out.push(jumelle);
      }
    });
    return out;
  }
  function camera(p, tp) {
    const cles = p.camera && p.camera.length ? p.camera : [{ t: 0, x: 540, y: CY, zoom: 1 }, { t: p.duree, zoom: 1.06 }];
    const c = B.cles(cles, tp, { x: 540, y: CY, zoom: 1, rot: 0, tremble: p.tremble || 0 });
    if (c.tremble) {
      c.x += B.bruitFbm(tp * 1.3, 11) * 14 * c.tremble; c.y += B.bruitFbm(tp * 1.1, 17) * 10 * c.tremble; c.rot += B.bruitFbm(tp * .9, 23) * 1.4 * c.tremble;
    }
    // la caméra respire toujours un peu (jamais une image morte)
    c.x += B.bruit(tp * .2, 31) * 3; c.y += B.bruit(tp * .17, 37) * 3;
    c.horizon = Object.assign({}, D.lieux?.[p.lieu]?.sol, p.sol).horizon;
    return c;
  }
  // le lointain tient à l'horizon : quand la caméra monte, descend ou s'approche, le ciel, les collines, la mer restent posés sur la
  // ligne où finit le sol (sans cela, la caméra qui descend avale les collines derrière lui)
  const surHorizon = (cam, d) => cam.horizon === undefined || d >= 1 ? 0 : (cam.horizon - cam.y) * cam.zoom - (cam.horizon - CY - (cam.y - CY) * d) * Math.pow(cam.zoom, d);
  function transformCouche(cam, d) {
    const z = Math.pow(cam.zoom, d);
    const px = 540 + (cam.x - 540) * d, py = CY + (cam.y - CY) * d;
    return `translate(540,${f(CY + surHorizon(cam, d))}) rotate(${f(cam.rot * Math.min(1, d))}) scale(${f(z)}) translate(${f(-px)},${f(-py)})`;
  }

  // ------------------------------------------------------------------ rendu d'un plan à l'instant tp
  function rendrePlan(i, tp, slot) {
    const c = construire(i);
    if (slot.firstChild !== c.root) { slot.innerHTML = ''; slot.appendChild(c.root); }
    const p = c.p, cam = camera(p, tp);
    const foc = p.mise_au_point ?? 1, dof = p.flou_profondeur ?? D.style?.flou_profondeur ?? (PAPIER ? 0 : 1);
    const etatsObjets = {}, ecrans = {};
    for (const it of c.items) {
      if (it.ecran) continue;                   // la surcouche de lumière est en coordonnées de l'écran
      it.g.setAttribute('transform', transformCouche(cam, it.d));
      const fl = dof * Math.min(14, Math.abs(it.d - foc) * (it.d > foc ? 22 : 7) * (1 + (cam.zoom - 1) * .8)) + (it.couche?.flou || it.objet?.flou || 0);
      const ombreP = PAPIER && it.d >= .3 && !it.couche?.sans_ombre && !(it.couche && it.couche.gen && MONDE.dynamique(it.couche)) && !SANS_OMBRE_PAPIER.includes(it.couche?.gen)
        ? ` drop-shadow(0 ${f(5 * Math.pow(cam.zoom, it.d))}px ${f(5 * Math.pow(cam.zoom, it.d))}px rgba(28,18,10,.38))` : '';
      // contre-jour : les personnages sont bordés de lumière
      const bord = it.acteur && c.lum.contre_jour ? ` drop-shadow(0 0 2.5px ${c.lum.couleur}) drop-shadow(0 0 10px ${c.lum.couleur})` : '';
      it.g.style.filter = (fl > .6 ? `blur(${f(fl)}px)` : '') + ombreP + bord;
      // tout s'anime en temps DU PLAN : un plan ne dépend que de lui-même (rendu par plan, avec cache)
      // un objet OU une couche du lieu qui a un id (une barque) peut porter des passagers ("porte_par")
      if (it.anims) for (const [e, a] of it.anims) { const r = MONDE.animer(e, a, tp, tp); const src = it.objet || it.couche; if (src && src.id) etatsObjets[src.id] = r; }
      if (it.dyn) it.g.innerHTML = MONDE.GEN[it.couche.gen](suivre(it.couche, cam, it.d), it.id, tp, tp);
    }
    for (const it of c.items) {
      if (!it.acteur) continue;
      const A = it.acteur, s = it.spec;
      // un passager suit l'objet qui le porte (barque qui tangue, monture…)
      let pre = '', post = '';
      if (s.porte_par && etatsObjets[s.porte_par]) {
        const o = etatsObjets[s.porte_par];
        pre = `<g transform="translate(${f(o.tx)},${f(o.ty)}) rotate(${f(o.rot)},${o.pivot[0]},${o.pivot[1]})">`; post = '</g>';
      }
      const src = ECLAIRAGE.eclairePar(c.sources, s.x ?? 540, s.y ?? 1500);      // une lampe, un feu tout près : il éclaire ce côté-là
      const r = PERSO.rendre(A, tp, {
        lumiere: src ? src.cote : c.lum.cote, couleur_lumiere: src ? B.mix(c.lum.couleur, src.couleur, src.force) : c.lum.couleur, ombre: c.lum.ombre,
        filtre: PAPIER ? '' : `url(#${c.fid})`, ecran: s.ecran, style: PAPIER ? 'papier' : undefined, sans_secondaire: s.secondaire === false,
        portee: c.portee && s.ombre !== false ? Object.assign({ filtre: `sil${i}` }, c.portee) : null, contre_jour: c.lum.contre_jour,
        lueur_ecran: B.clamp((EXPO_JOUR - (c.lum.expo ?? 1)) / PENOMBRE),
      });
      // le personnage se détache : liseré de lumière du côté de la source, et de nuit il est moins sombre que le décor
      if (!s.silhouette) {
        const sur = ECLAIRAGE.surPersonnage(c.lum, src ? src.couleur : c.lum.couleur, src ? src.cote : c.lum.cote);
        it.g.style.filter = sur + ' ' + (it.g.style.filter || '');
        if (it.devant) it.devant.style.filter = sur;
      }
      const vis = s.apparait !== undefined ? B.clamp((tp - s.apparait) / .35) : 1;
      const dis = s.disparait !== undefined ? B.clamp((s.disparait - tp) / .35) : 1;
      const habiller = (svg, suffixe) => {     // caché sous une ligne (l'eau, le bord d'une barque, un mur), fondu, porté
        if (s.coupe_y !== undefined) {
          const cid = A.id + 'cp' + suffixe;
          svg = `<clipPath id="${cid}"><rect x="-3000" y="-3000" width="7000" height="${f(3000 + s.coupe_y)}"/></clipPath><g clip-path="url(#${cid})">${svg}</g>`;
        }
        return `${pre}<g opacity="${f(vis * dis)}">${svg}</g>${post}`;
      };
      it.g.innerHTML = `<defs>${r.defs}</defs>` + habiller(r.svg, '');
      it.devant.innerHTML = r.devant ? habiller(r.devant, 'd') : '';
      it.tete = r.tete; it.vu = r.vu; it.articulations = r.articulations; it.r_tete = A.M.L.ty * r.ech; it.transform = transformCouche(cam, it.d); it.z = r.y;
      const e = ecran(cam, r.tete, it.d), zz = Math.pow(cam.zoom, it.d);
      ecrans[s.id] = { x: e[0], y: e[1], r: A.M.L.ty * r.ech * zz, sens: r.sens, pieds: ecran(cam, [r.x, r.y], it.d) };
    }
    // qui passe devant qui : l'ordre suit les pieds (y) quand les personnages se déplacent en profondeur
    c.surcouche.g.innerHTML = ECLAIRAGE.surcouche(c.lum, `ecl${i}`, tp, PAPIER ? FEN : null);
    const trie = c.items.slice().sort(c.ordre);
    if (trie.some((it, k) => it !== c.items[k])) { c.items = trie; for (const it of trie) c.root.appendChild(it.g); }
    // étalonnage du plan
    const grade = Object.assign({ luminosite: c.lum.expo ?? 1 }, D.style?.etalonnage || {}, c.lieu.etalonnage || {}, p.etalonnage || {});   // l'heure règle l'exposition
    return { cam, grade, c, ecrans };
  }

  // ------------------------------------------------------------------ textes (HTML par-dessus)
  function sousTitres(p, tp) {
    if (!p.mots || p.sous_titres === false) return '';
    // groupe affiché = la phrase en cours (≤ 3 lignes), le mot dit en or
    const mots = p.mots;
    let k = -1;
    for (let j = 0; j < mots.length; j++) if (mots[j].t <= tp) k = j;
    if (k < 0 || tp > p.voix_fin + .6) return '';
    const g = mots[k].groupe;
    const du = mots.filter(m => m.groupe === g);
    return `<div class="st">${du.map(m => `<span class="${m === mots[k] ? 'actif' : ''}${m.accent ? ' accent' : ''}${m.t > tp ? ' futur' : ''}">${m.texte}</span>`).join(' ')}</div>`;
  }
  // icône Lucide (contours) qui se dessine : chaque tracé a pathLength=1 et se révèle avec dashoffset
  function icone(svgInner, taille, couleur, k, trait = 2.2) {
    const d = B.clamp(k);
    const inner = (svgInner || '').replace(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g, `<$1 pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1 - d)}"`);
    return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="${trait}" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 4px 14px rgba(0,0,0,.5))">${inner}</svg>`;
  }
  // un point du monde (coordonnées du lieu) → l'écran, avec la caméra du plan
  const ecran = (cam, pt, d = 1) => {
    const z = Math.pow(cam.zoom, d), px = 540 + (cam.x - 540) * d, py = CY + (cam.y - CY) * d;
    return [540 + (pt[0] - px) * z, CY + surHorizon(cam, d) + (pt[1] - py) * z];
  };
  const mondeDe = (cam, [x, y], d = 1) => { const z = Math.pow(cam.zoom, d); return [540 + (cam.x - 540) * d + (x - 540) / z, CY + (cam.y - CY) * d + (y - CY - surHorizon(cam, d)) / z]; };
  // le chemin de lumière sur l'eau reste sous l'astre, qui ne bouge pas avec la même profondeur
  const suivre = (c, cam, d) => c.suit ? Object.assign({}, c, { astre_x: mondeDe(cam, ecran(cam, [c.suit.x, c.suit.y], c.suit.d), d)[0] }) : c;
  // une flèche part au bord de ce qui est écrit, jamais à travers (ni sa note, ni celle d'en dessous)
  const NOTE = { car: .38, haut: .62, marge: 14, pas: 6 };
  function horsDesNotes(p, de, vers) {
    const boites = (p.graphiques || []).filter(n => n.type === 'note' && n.texte && n.position).map(n => { const t = n.taille ?? 66; return [n.position, n.texte.length * t * NOTE.car / 2 + NOTE.marge, t * NOTE.haut + NOTE.marge]; });
    const L = Math.hypot(vers[0] - de[0], vers[1] - de[1]) || 1;
    let sortie = Math.min(40, L / 3);
    for (let k = sortie; k < L * .7; k += NOTE.pas) { const q = [de[0] + (vers[0] - de[0]) * k / L, de[1] + (vers[1] - de[1]) * k / L]; if (boites.some(([c, w, h]) => Math.abs(q[0] - c[0]) < w && Math.abs(q[1] - c[1]) < h)) sortie = k + NOTE.pas; }
    return [de[0] + (vers[0] - de[0]) * sortie / L, de[1] + (vers[1] - de[1]) * sortie / L];
  }
  // mots d'un texte affiché qui apparaissent quand la voix les dit (synchro) ou en cascade
  function motsCascade(g, p, tp, d0) {
    const mots = (g.texte || '').split(/\s+/).filter(Boolean);
    const tps = [];
    if (g.synchro !== false && p.mots) {
      let j = 0;
      const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9']/g, '').split("'").pop();
      for (const m of mots) {
        const n = norm(m.replace(/\*/g, ''));
        let tr = null;
        for (let k = j; k < p.mots.length; k++) if (norm(p.mots[k].texte) === n && p.mots[k].t >= d0 - .05) { tr = p.mots[k].t; j = k + 1; break; }
        tps.push(tr);
      }
    }
    let last = d0;
    return mots.map((m, i) => { const t = tps[i] ?? (last + (i === 0 ? 0 : g.cadence ?? .09)); last = t; return { m, t, or: /^\*.*\*[.,!?;:…]*$/.test(m) || (g.or || []).includes(m.replace(/[*.,!?;:…]/g, '')) }; });
  }
  // ------------------------------------------------------------------ format papier : le texte dit, mot à mot, sur le papier
  function couleursPapier(p, c) { return Object.assign({}, COUL_PANNEAU, D.style?.panneau || {}, c?.lieu?.panneau || {}, p.panneau || {}); }
  function karaoke(p, tp, col) {
    if (!p.mots || !p.mots.length || p.sous_titres === false) return '';
    const encre = B.lum(col.fond) > SEUIL_PANNEAU_CLAIR;
    const mots = p.mots;
    let g = mots[0].groupe;
    for (const m of mots) if (m.t - .06 <= tp) g = m.groupe;
    const du = mots.filter(m => m.groupe === g);
    const long = du.map(m => m.texte).join(' ').length;
    const fs = long > 52 ? 66 : long > 38 ? 74 : long > 24 ? 82 : 90;
    const kin = g === mots[0].groupe ? B.clamp(tp / .15) : B.clamp((tp - (du[0].t - .06)) / .14);
    let dernier = -1;
    du.forEach((m, j) => { if (m.t <= tp + .02) dernier = j; });
    const sp = du.map((m, j) => {
      const k = B.clamp((tp - m.t + .02) / .1);
      const actif = j === dernier && tp < (du[j + 1]?.t ?? m.t + .45) + .05;            // le mot qu'on dit : la lampe
      const c = actif ? col.actif : B.mix(col.gris, col.texte, k);
      // sur le panneau doré (clair), le mot qui s'allume reste blanc lumineux mais cerné d'encre : blanc sur or ne se lit pas
      const cerne = actif && encre ? `-webkit-text-stroke:${CERNE_ACTIF}px ${col.texte};paint-order:stroke fill;` : '';
      return `<span style="color:${c};${cerne}${actif ? `text-shadow:0 0 18px ${col.lueur}99,0 0 2px ${col.lueur}` : ''}">${m.texte}</span>`;
    }).join(' ');
    return `<div class="kara" style="top:${HP + 40}px;height:${Math.min(560, 1920 - HP - 230)}px"><div style="font-size:${fs}px;opacity:${f(kin)};transform:translateY(${f((1 - B.ease('sortie', kin)) * 10)}px)">${sp}</div></div>`;
  }
  // une bulle, des ondes, une goutte… accrochées à la tête d'un personnage (à l'écran)
  function pres(ecrans, g, def = [540, HP * .45]) {
    const e = g.sur && ecrans[g.sur];
    if (!e) return { x: (g.position || def)[0], y: (g.position || def)[1], r: g.r ?? 60, sens: 1 };
    return e;
  }
  const BULLES = {
    sourire: (c) => `<path d="M-26,-4 Q0,22 26,-4" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    gribouillis: (c) => `<path d="M-30,4 q8,-16 16,0 t16,0 t16,0 t16,0" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    triste: (c) => `<path d="M-24,10 Q0,-12 24,10" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    points: (c) => `<circle cx="-22" cy="0" r="7" fill="${c}"/><circle cx="0" cy="0" r="7" fill="${c}"/><circle cx="22" cy="0" r="7" fill="${c}"/>`,
    coeur: (c) => `<path d="M0,18 C-30,-2 -22,-26 0,-12 C22,-26 30,-2 0,18Z" fill="#b8432f"/>`,
    question: (c) => `<text x="0" y="16" text-anchor="middle" font-family="Fraunces" font-weight="800" font-size="52" fill="${c}">?</text>`,
    exclamation: (c) => `<text x="0" y="16" text-anchor="middle" font-family="Fraunces" font-weight="800" font-size="52" fill="${c}">!</text>`,
  };
  // chaque graphisme affiché est marqué (data-g) : le contrôle qualité sait où il est (chevauchements, visages cachés)
  const marquer = (h, h0, type) => h.length > h0 ? h.slice(0, h0) + `<div class="gr" data-g="${type}">` + h.slice(h0) + '</div>' : h;
  function illustration(p, tp, cam, ecrans) {
    let h = '';
    for (const g of (p.graphiques || [])) {
      const h0 = h.length;
      try {
      const d0 = g.t ?? 0, d1 = g.fin ?? p.duree;
      if (tp < d0 || tp > d1 + .3) continue;
      const k = B.clamp((tp - d0) / .3), ks = B.clamp((d1 + .3 - tp) / .3), a = Math.min(k, ks);
      const e = B.ease('rebond', k);
      if (g.type === 'badge' || g.type === 'ruban') {   // étiquette « lampe » : pastille nuit + filet d'or (« UNE HISTOIRE DE JÉSUS · LUC 15 »)
        const [x, y] = g.position || [540, FEN ? FEN.haut + BADGE_Y : 120];
        const clair = g.fond === 'clair';
        const fond = clair ? 'rgba(255,248,232,.92)' : (g.fond || 'rgba(14,19,38,.82)'), coul = clair ? '#2b1d10' : (g.couleur || '#ffd98a');
        const kk = B.ease('sortie', k);
        // dans l'arche, l'étiquette tient entre les deux bords à sa hauteur : un texte long s'écrit plus petit
        let taille = g.taille ?? 28;
        if (FEN) { const ar = (FEN.x1 - FEN.x0) / 2, dy0 = Math.max(0, FEN.haut + ar - y + taille), place = 2 * Math.sqrt(Math.max(0, ar * ar - dy0 * dy0)) - MARGE_BADGE, large = (g.texte || '').length * (taille * LARGE_LETTRE + 4) + 64 + (g._svg ? taille * 2 : 0); if (large > place) taille = Math.max(18, taille * (place - 64) / (large - 64)); }
        h += `<div class="ruban" style="left:${f(x)}px;top:${f(y)}px;background:${fond};color:${coul};font-size:${f(taille)}px;opacity:${f(a)};transform:translate(-50%,-50%) rotate(${g.rotation ?? 0}deg) scale(${f(.92 + .08 * kk)});clip-path:inset(0 ${f((1 - kk) * 50)}% 0 ${f((1 - kk) * 50)}% round 40px)">${g._svg ? `<svg width="${(g.taille ?? 30) * 1.3}" height="${(g.taille ?? 30) * 1.3}" viewBox="0 0 24 24" fill="none" stroke="${coul}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g._svg}</svg>` : ''}<span>${g.texte}</span></div>`;
      } else if (g.type === 'bulle' || g.type === 'pensee') {
        const pe = pres(ecrans, g);
        if (FEN && (pe.x < FEN.x0 - pe.r * .2 || pe.x > FEN.x1 + pe.r * .2)) continue;      // celui qui parle est hors champ : pas de bulle orpheline
        const cote = g.cote ?? (pe.sens > 0 ? 1 : -1);
        let R = g.taille ?? B.clamp(pe.r * (g.type === 'pensee' ? 1.35 : 1.0), 80, 190);
        let bx = pe.x + cote * (pe.r * 1.35 + R * .55), by = pe.y - pe.r * 1.25 - R * .3;
        if (FEN) {                       // la bulle reste DANS l'arche et ne couvre JAMAIS la tête : on cherche sa place, quitte à la réduire
          const ar = (FEN.x1 - FEN.x0) / 2, acx = (FEN.x0 + FEN.x1) / 2, acy = FEN.haut + ar, R0 = R;
          const lg = g.type === 'pensee' ? [1.12, .86, .95, .62] : [1.0, .66, .86, .56];       // l'étendue de la bulle (rayons) et de son coin vers le haut
          const dedans = (x, y, r) => x - r * lg[0] > FEN.x0 + 14 && x + r * lg[0] < FEN.x1 - 14 && y + r * .8 < HP - 10 && (y - r * lg[1] > acy || Math.hypot(Math.abs(x - acx) + r * lg[2], Math.min(0, y - r * lg[3] - acy)) < ar - 16);
          const libre = (x, y, r) => Math.hypot(Math.max(Math.abs(x - pe.x) - r * 1.12, 0), Math.max(Math.abs(y - pe.y) - r * .92, 0)) >= pe.r * ECART_BULLE;
          let place = null;
          for (const k of [1, .86, .74, .64, .55, .47]) {
            const r = R0 * k;
            for (const cs of [cote, -cote]) for (const dy of [-1.3, -1, -.7, -.4, -.1, .2]) for (const dx of [1.0, 1.15, 1.35]) {
              const x = pe.x + cs * (pe.r * dx + r * .9), y = pe.y + dy * pe.r;
              if (!place && dedans(x, y, r) && libre(x, y, r)) place = [x, y, r];
            }
          }
          if (!place) continue;          // aucune place : mieux vaut pas de bulle qu'un visage caché
          [bx, by, R] = place;
        }
        by += Math.sin(tp * 2.2) * 4;
        const coul = g.couleur || '#2a211b';
        let inner = g.contenu && BULLES[g.contenu] ? BULLES[g.contenu](coul) : g._svg ? `<g transform="translate(${f(-R * .5)},${f(-R * .5)}) scale(${f(R / 24)})" fill="none" stroke="${coul}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${g._svg}</g>` : g.texte ? `<text x="0" y="12" text-anchor="middle" font-family="Fraunces" font-weight="700" font-size="34" fill="${coul}">${g.texte}</text>` : '';
        if (g.acteur && D.personnages[g.acteur.id]) {     // une petite scène dans la bulle de pensée (souvenir, imagination)
          const rr = PERSO.poser(D.personnages[g.acteur.id], g.acteur.pose || 'debout', { x: 0, y: R * .55, echelle: (R * 1.5) / 460, sens: g.acteur.sens ?? 1, t: tp, style: 'papier', action: { vue: g.acteur.vue ?? 20, visage: g.acteur.visage || 'neutre' } });
          inner = `<defs>${rr.defs}</defs><clipPath id="pc${Math.round(bx)}"><ellipse cx="0" cy="0" rx="${R * .98}" ry="${R * .78}"/></clipPath><g clip-path="url(#pc${Math.round(bx)})">${rr.svg}</g>`;
        }
        const fond = g.fond || '#ece5d8', vers = bx > pe.x ? 1 : -1;      // la queue va vers la tête, de quelque côté que soit la bulle
        const forme = g.type === 'pensee'
          ? '<g class="corps-bulle">' + [[0, 0, R, R * .8], [-R * .55, -R * .35, R * .55, R * .5], [R * .5, -R * .4, R * .55, R * .5], [R * .1, R * .35, R * .7, R * .5]].map(([cx, cy, rx, ry]) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fond}"/>`).join('') + '</g>' +
            `<circle cx="${f(-vers * R * .95)}" cy="${f(R * .95)}" r="${f(R * .14)}" fill="${fond}"/><circle cx="${f(-vers * R * 1.25)}" cy="${f(R * 1.3)}" r="${f(R * .08)}" fill="${fond}"/>`
          : `<g class="corps-bulle"><rect x="${f(-R * .95)}" y="${f(-R * .62)}" width="${f(R * 1.9)}" height="${f(R * 1.24)}" rx="${f(R * .35)}" fill="${fond}"/></g><path d="M${f(-vers * R * .2)},${f(R * .55)} L${f(-vers * R * .75)},${f(R * 1.05)} L${f(-vers * R * .55)},${f(R * .5)}Z" fill="${fond}"/>`;
        h += `<svg class="et" width="1080" height="${HP}" style="opacity:${f(a)};overflow:visible"><g transform="translate(${f(bx)},${f(by)}) scale(${f(.6 + .4 * e)})" style="filter:drop-shadow(0 4px 5px rgba(28,18,10,.35))">${forme}${inner}</g></svg>`;
      } else if (g.type === 'ondes') {    // l'angoisse, le bruit : des ondes autour de la tête
        const pe = pres(ecrans, g);
        let sv = '';
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
          const ph = ((tp * (g.vitesse ?? .9) + i / 3) % 1), rr = pe.r * (1.35 + ph * 1.1);
          sv += `<path d="M${f(pe.x + sd * rr * .55)},${f(pe.y - rr * .8)} A${f(rr)},${f(rr)} 0 0 ${sd > 0 ? 1 : 0} ${f(pe.x + sd * rr * .55)},${f(pe.y + rr * .8)}" stroke="${g.couleur || '#ece5d8'}" stroke-width="${f(Math.max(4, pe.r * .07))}" fill="none" stroke-linecap="round" opacity="${f((1 - ph) * .85 * a)}"/>`;
        }
        h += `<svg class="et" width="1080" height="${HP}">${sv}</svg>`;
      } else if (g.type === 'goutte') {   // goutte de sueur (gêne, peur)
        const pe = pres(ecrans, g), cote = g.cote ?? 1;
        const ph = (tp * .6) % 1, x = pe.x + cote * pe.r * .75, y = pe.y - pe.r * .55 + ph * pe.r * .35, R = pe.r * .16;
        h += `<svg class="et" width="1080" height="${HP}" style="opacity:${f(a * (1 - Math.max(0, ph - .8) * 5))}"><path d="M${f(x)},${f(y - R * 1.8)} C${f(x + R)},${f(y - R * .4)} ${f(x + R)},${f(y + R)} ${f(x)},${f(y + R)} C${f(x - R)},${f(y + R)} ${f(x - R)},${f(y - R * .4)} ${f(x)},${f(y - R * 1.8)}Z" fill="#dfe9f0" stroke="#7d8a94" stroke-width="2"/></svg>`;
      } else if (g.type === 'coeur') {    // le cœur qui bat (ou qui s'apaise) sur la poitrine
        const pe = pres(ecrans, g), bpm = g.bpm ?? 110;
        const ph = (tp * bpm / 60) % 1, bat = 1 + .16 * Math.exp(-ph * 9) + .08 * Math.exp(-Math.max(0, ph - .18) * 9) * (ph > .18 ? 1 : 0);
        const x = pe.x + (g.dx ?? 0) * pe.r, y = pe.y + pe.r * (g.dy ?? 2.6), R = pe.r * (g.taille ?? .38) * bat;
        h += `<svg class="et" width="1080" height="${HP}" style="opacity:${f(a)}"><path d="M${f(x)},${f(y + R * .9)} C${f(x - R * 1.6)},${f(y - R * .1)} ${f(x - R * 1.1)},${f(y - R * 1.4)} ${f(x)},${f(y - R * .6)} C${f(x + R * 1.1)},${f(y - R * 1.4)} ${f(x + R * 1.6)},${f(y - R * .1)} ${f(x)},${f(y + R * .9)}Z" fill="${g.couleur || '#7a2e22'}"/></svg>`;
      } else if (g.type === 'traits') {   // ce qui assaille : des traits qui filent vers quelqu'un (bruit, regards, pression)
        const pe = pres(ecrans, g), de = g.de === 'droite' ? 1 : -1;
        let sv = '';
        for (let i = 0; i < (g.n ?? 5); i++) {
          const ph = ((tp * (g.vitesse ?? .8) + i * .23) % 1), yy = pe.y + pe.r * (-.6 + i * .55), x0 = pe.x + de * (pe.r * 4.5 - ph * pe.r * 2.6), L = pe.r * 1.6;
          let d = `M${f(x0)},${f(yy)}`;
          for (let j = 1; j <= 6; j++) d += ` L${f(x0 + de * L * j / 6)},${f(yy + Math.sin(j * 1.9 + tp * 8 + i) * pe.r * .08)}`;
          sv += `<path d="${d}" stroke="${g.couleur || '#ece5d8'}" stroke-width="${f(Math.max(3, pe.r * .05))}" fill="none" stroke-linecap="round" opacity="${f(Math.sin(ph * Math.PI) * .9 * a)}"/>`;
        }
        h += `<svg class="et" width="1080" height="${HP}">${sv}</svg>`;
      } else if (g.type === 'carte') {        // enseigner : la carte exacte du 1er siècle (enseigner.js)
        h += ENSEIGNER.carte(g, tp, FEN);
      } else if (g.type === 'frise') {
        h += ENSEIGNER.frise(g, tp, FEN);
      } else if (g.type === 'telephone') {   // un téléphone tenu vers nous, le message qui s'écrit
        const [x, y] = g.position || [760, HP * .5], T = g.taille ?? 520;
        const n = (g.texte || '').length, kk = B.clamp((tp - d0 - .3) / Math.max(.6, n * .035));
        const txt = (g.texte || '').slice(0, Math.round(n * kk));
        h += `<div class="tel" style="left:${f(x)}px;top:${f(y)}px;width:${f(T * .52)}px;height:${f(T)}px;opacity:${f(a)};transform:translate(-50%,-50%) rotate(${g.rotation ?? 4}deg) translateY(${f((1 - B.ease('sortie', k)) * 60)}px)"><div class="ecran"><div class="msg" style="font-size:${f(T * .062)}px">${txt}</div></div></div>`;
      }
      } finally { h = marquer(h, h0, g.type); }
    }
    return h;
  }
  function citation(g, p, tp, d0, ks, k) {        // la carte de la Parole : nuit, filet d'or, chaque mot s'allume quand on le dit
    const ws = motsCascade(Object.assign({ cadence: .12 }, g), p, tp, d0);
    let dernier = -1;
    ws.forEach((w, j) => { if (w.t <= tp + .02) dernier = j; });
    const sp = ws.map(({ m, t }, j) => {
      const kk = B.clamp((tp - t + .02) / .1), actif = j === dernier && tp < (ws[j + 1]?.t ?? t + .45) + .05;
      return `<span style="color:${actif ? '#ffd36b' : B.mix('#5d6888', '#f6eedf', kk)};${actif ? 'text-shadow:0 0 16px #ffd36b88' : ''}">${m.replace(/\*/g, '')}</span>`;
    }).join(' ');
    const e = B.ease('sortie', k);
    const lampe = `<svg width="54" height="40" viewBox="-27 -26 54 40"><path d="M-22,2 Q-22,-8 0,-8 Q16,-8 24,-4 L12,4 Q2,12 -12,9 Q-22,8 -22,2Z" fill="#e9b65c"/><path d="M22,-6 q4,-9 0,-16 q-5,8 0,16Z" fill="#ffd36b"/><circle cx="22" cy="-12" r="9" fill="#ffd36b" opacity=".25"/></svg>`;
    return `<div class="citation" style="top:${g.y ?? HP - 210}px;opacity:${f(Math.min(k * 1.5, ks))};transform:translateX(-50%) translateY(${f((1 - e) * 40)}px)">${lampe}<div class="en">${g.entete ?? 'LA BIBLE DIT'}</div><div class="q">«&nbsp;${sp}&nbsp;»</div><div class="rf">${g.ref || ''}</div></div>`;
  }
  // un bloc de texte tient dans l'arche À SA HAUTEUR : plus il est haut, plus ses marges sont larges
  function marges(y) {
    if (!FEN) return '';
    const ar = (FEN.x1 - FEN.x0) / 2, dy = Math.max(0, FEN.haut + ar - y), m = Math.round(FEN.x0 + ar - Math.sqrt(Math.max(0, ar * ar - dy * dy)) + MARGE_TEXTE);
    return `;left:${m}px;right:${m}px`;
  }
  function textes(p, tp, cam) {
    let h = '', flouMonde = 0, voileMonde = 0, cacheST = false;
    for (const g of (p.graphiques || [])) {
      const h0 = h.length;
      try {
      const d0 = g.t ?? 0, d1 = g.fin ?? p.duree;
      if (tp < d0 || tp > d1 + .4) continue;
      const k = B.clamp((tp - d0) / .45), ks = B.clamp((d1 + .4 - tp) / .4), a = Math.min(k, ks);
      if (g.fond) voileMonde = Math.max(voileMonde, a * (typeof g.fond === 'number' ? g.fond : .45));
      if ((g.type === 'texte' && g.synchro !== false) || g.sous_titres === false) cacheST = true;     // le texte à l'écran EST la phrase dite : pas de doublon
      if (['ruban', 'bulle', 'pensee', 'ondes', 'goutte', 'coeur', 'traits', 'telephone', 'carte', 'frise'].includes(g.type)) continue;   // dans l'arche
      if (g.type === 'definition') { h += ENSEIGNER.definition(g, tp, k, ks); continue; }
      if (g.type === 'citation' || (PAPIER && g.type === 'verset')) { h += citation(g, p, tp, d0, ks, k); cacheST = true; continue; }
      if (g.type === 'fin') {          // l'écran de fin : la lampe allumée sur la nuit, la phrase, le passage à lire
        const kb = tp >= d0 ? 1 : 0, kh = B.clamp((tp - d0 - .25) / .6), kt = B.clamp((tp - d0 - .8) / .6);   // le fond de nuit tout de suite : jamais un décor vide entre deux
        const fl = 1 + .06 * Math.sin(tp * 11) + .04 * Math.sin(tp * 17.3), hl = 1 + .1 * Math.sin(tp * 2.1);
        h += `<div class="fin" style="opacity:${f(kb)}"><svg width="420" height="360" viewBox="-210 -230 420 360" style="opacity:${f(kh)};overflow:visible">` +
          `<defs><radialGradient id="halo"><stop offset="0" stop-color="#ffd36b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>` +
          `<circle cx="96" cy="-92" r="${f(150 * hl)}" fill="url(#halo)"/>` +
          `<path d="M-150,10 Q-150,-50 -10,-50 Q80,-50 120,-30 L72,22 Q20,70 -80,62 Q-150,56 -150,10Z" fill="#e9b65c"/><path d="M-150,10 Q-150,-50 -10,-50 Q80,-50 120,-30 L100,-8 Q40,-26 -60,-24 Q-140,-20 -150,10Z" fill="#ffe3a0" opacity=".55"/>` +
          `<ellipse cx="-20" cy="-50" rx="40" ry="9" fill="#b9893f"/><path d="M-150,10 Q-190,0 -186,-36 Q-170,-14 -150,-12" fill="none" stroke="#e9b65c" stroke-width="12" stroke-linecap="round"/>` +
          `<g transform="translate(110,-36) scale(1,${f(fl)})"><path d="M0,0 C-20,-20 -10,-58 0,-84 C10,-58 22,-20 0,0Z" fill="#ffd36b"/><path d="M0,-4 C-9,-16 -5,-38 0,-52 C5,-38 10,-16 0,-4Z" fill="#fff6d8"/></g></svg>` +
          `<div class="ligne" style="opacity:${f(kt)}">${g.ligne || ''}</div><div class="grand" style="opacity:${f(kt)}">${g.texte || ''}</div><div class="petit" style="opacity:${f(kt)}">${g.sous || ''}</div></div>`;
        cacheST = true; continue;
      }
      if (g.type === 'verset') {
        flouMonde = Math.max(flouMonde, a);
        // le verset se lit mot à mot (rythme de lecture), la référence arrive à la fin
        const ws = (g.texte || '').split(/\s+/), n = ws.length, vit = g.vitesse ?? Math.min(.11, 1.8 / n);
        const sp = ws.map((w, i) => { const kk = B.clamp((tp - d0 - .15 - i * vit) / .35); return `<span style="opacity:${f(kk)};transform:translateY(${f((1 - B.ease('sortie', kk)) * 14)}px)">${i === 0 ? '« ' : ''}${w}${i === n - 1 ? ' »' : ''}</span>`; }).join(' ');
        const kr = B.clamp((tp - d0 - .3 - n * vit) / .4);
        h += `<div class="carte" style="opacity:${f(ks)};top:${g.y ?? 600}px"><div class="v">${sp}</div><div class="filet" style="width:${f(B.ease('sortie', kr) * 180)}px"></div><div class="ref" style="opacity:${f(kr)}">${g.ref || ''}</div></div>`;
      } else if (g.type === 'titre') {
        h += `<div class="titre" style="opacity:${f(a)};top:${g.y ?? 300}px">${g.texte}${g.sous ? `<div class="sous">${g.sous}</div>` : ''}</div>`;
      } else if (g.type === 'lieu') {
        h += `<div class="lieu" style="opacity:${f(a)}"><span class="barre" style="width:${f(B.ease('sortie', k) * 60)}px"></span>${g.texte}${g.sous ? `<div class="sous">${g.sous}</div>` : ''}</div>`;
      } else if (g.type === 'mot') {
        const e = B.ease('rebond', k);
        h += `<div class="motcle" style="opacity:${f(a)};top:${g.y ?? 700}px;transform:scale(${f(.7 + .3 * e)})">${g.texte}</div>`;
      } else if (g.type === 'texte') {
        // texte cinétique : chaque mot entre quand la voix le dit (ou en cascade), les mots *entre étoiles* en or
        const ws = motsCascade(g, p, tp, d0);
        const sp = ws.map(({ m, t, or }) => { const kk = B.clamp((tp - t) / .22), e = B.ease('rebond', kk); return `<span class="${or ? 'or' : ''}" style="opacity:${f(B.clamp(kk * 2))};transform:translateY(${f((1 - e) * 28)}px) scale(${f(.6 + .4 * e)});filter:blur(${f((1 - kk) * 6)}px)">${m.replace(/\*/g, '')}</span>`; }).join(' ');
        h += `<div class="kin${g.style === 'serif' ? ' serif' : ''}" style="opacity:${f(ks)};top:${g.y ?? 560}px;font-size:${g.taille ?? 92}px${marges(g.y ?? 560)}">${sp}</div>`;
      } else if (g.type === 'icone') {
        const [x, y] = g.monde ? ecran(cam, g.position || [540, 700]) : (g.position || [540, 700]);
        const e = B.ease('rebond', B.clamp((tp - d0 - .5) / .35));
        h += `<div class="ico" style="left:${f(x)}px;top:${f(y)}px;opacity:${f(ks)};transform:translate(-50%,-50%) scale(${f(.85 + .15 * e)})">${icone(g._svg, g.taille ?? 200, g.couleur || '#ffd34d', B.clamp((tp - d0) / (g.duree_trace ?? .7)), g.trait ?? 2)}${g.texte ? `<div class="cap" style="opacity:${f(B.clamp((tp - d0 - .4) / .3))}">${g.texte}</div>` : ''}</div>`;
      } else if (g.type === 'note' || g.type === 'cercle' || g.type === 'fleche') {
        // annotation manuscrite : un trait qui se dessine vers ce qu'on montre, le texte qui s'écrit
        const coul = g.couleur || '#ffd34d';
        const cible = g.cible ? (g.monde === false ? g.cible : ecran(cam, g.cible)) : null;
        const pos = g.position ? (g.monde === true ? ecran(cam, g.position) : g.position) : (cible ? [cible[0] + 160, cible[1] - 220] : [540, 700]);
        const kt = B.clamp((tp - d0) / (g.duree_trace ?? .55));
        let sv = '';
        const wob = (i) => B.bruit(i * 1.7, (g.seed || 3)) * 6;
        if (g.type === 'cercle' && cible) {
          const rx = g.r ?? 110, ry = (g.r ?? 110) * (g.aplati ?? .8), n = 40, pts = [];
          for (let i = 0; i <= n; i++) { const an = -2.2 + i / n * Math.PI * 2.15; const rr = 1 + wob(i) / 90; pts.push([cible[0] + Math.cos(an) * rx * rr * (1 + i / n * .06), cible[1] + Math.sin(an) * ry * rr]); }
          sv += `<path d="${B.lisse(pts)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1 - kt)}" stroke="${coul}" stroke-width="${g.epaisseur ?? 9}" fill="none" stroke-linecap="round"/>`;
        }
        if ((g.type === 'note' || g.type === 'fleche') && cible) {
          const dx = cible[0] - pos[0], dy = cible[1] - pos[1], L = Math.hypot(dx, dy) || 1;
          const st = horsDesNotes(p, pos, cible), en = [cible[0] - dx / L * (g.marge ?? 30), cible[1] - dy / L * (g.marge ?? 30)];
          const mid = [(st[0] + en[0]) / 2 - dy / L * 60 * (g.courbe ?? 1), (st[1] + en[1]) / 2 + dx / L * 60 * (g.courbe ?? 1)];
          sv += `<path d="M${f(st[0])},${f(st[1])} Q${f(mid[0])},${f(mid[1])} ${f(en[0])},${f(en[1])}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1 - kt)}" stroke="${coul}" stroke-width="${g.epaisseur ?? 7}" fill="none" stroke-linecap="round"/>`;
          if (kt > .92) { const an = Math.atan2(en[1] - mid[1], en[0] - mid[0]), al = 34; for (const s2 of [-1, 1]) sv += `<path d="M${f(en[0])},${f(en[1])} l${f(-Math.cos(an + s2 * .5) * al)},${f(-Math.sin(an + s2 * .5) * al)}" stroke="${coul}" stroke-width="${g.epaisseur ?? 7}" stroke-linecap="round" opacity="${f((kt - .92) / .08)}"/>`; }
        }
        if (sv) h += `<svg class="et" width="1080" height="1920" style="opacity:${f(ks)};filter:drop-shadow(0 3px 8px rgba(0,0,0,.55))">${sv}</svg>`;
        if (g.texte && g.type !== 'fleche') {
          const kw = B.clamp((tp - d0 - .25) / (g.duree_ecriture ?? Math.max(.4, g.texte.length * .035)));
          const tpos = g.type === 'cercle' && !g.position && cible ? [cible[0], cible[1] + (g.r ?? 110) * .8 + 30] : pos;
          h += `<div class="note" style="left:${f(tpos[0])}px;top:${f(tpos[1])}px;font-size:${g.taille ?? 66}px;color:${g.couleur_texte || '#fffaf0'};opacity:${f(ks)};transform:translate(-50%,-50%) rotate(${g.rotation ?? -4}deg);clip-path:inset(-20% ${f((1 - kw) * 100)}% -20% -5%)">${g.texte}</div>`;
        }
      } else if (g.type === 'liste') {
        let it = '';
        (g.items || []).forEach((x, i) => {
          const ti = x.t ?? (d0 + .3 + i * .5), kk = B.clamp((tp - ti) / .35), e = B.ease('sortie', kk);
          it += `<div class="it" style="opacity:${f(kk)};transform:translateX(${f((1 - e) * -60)}px)">${icone(x._svg || g._svg, 62, x.couleur || g.couleur || '#ffd34d', B.clamp((tp - ti) / .5), 2.4)}<span>${x.texte}</span></div>`;
        });
        h += `<div class="liste" style="opacity:${f(ks)};top:${g.y ?? 420}px${marges(g.y ?? 420)}">${g.titre ? `<div class="t" style="opacity:${f(k)}">${g.titre}</div>` : ''}${it}</div>`;
      } else if (g.type === 'compare') {
        const cote = (c, ti) => { const kk = B.clamp((tp - ti) / .4), e = B.ease('sortie', kk); return `<div class="c" style="opacity:${f(kk)};transform:translateY(${f((1 - e) * 40)}px)">${c._svg ? icone(c._svg, 120, c.couleur || '#ffd34d', B.clamp((tp - ti) / .6), 1.8) : ''}<div class="h">${c.titre || ''}</div><div class="x">${c.texte || ''}</div></div>`; };
        h += `<div class="cmp" style="opacity:${f(ks)};top:${g.y ?? 420}px${marges(g.y ?? 420)}">${cote(g.gauche || {}, d0)}${cote(g.droite || {}, g.t_droite ?? d0 + .8)}</div>`;
      } else if (g.type === 'chiffre') {
        const kk = B.ease('sortie', B.clamp((tp - d0) / (g.duree_compte ?? 1.2)));
        const v = Math.round((g.de ?? 0) + ((g.valeur ?? 0) - (g.de ?? 0)) * kk);
        h += `<div class="chiffre" style="opacity:${f(a)};top:${g.y ?? 560}px"><div class="n">${g.prefixe || ''}${v.toLocaleString('fr-FR')}${g.suffixe || ''}</div>${g.texte ? `<div class="l">${g.texte}</div>` : ''}</div>`;
      } else if (g.type === 'etiquette') {
        const [x, y] = g.monde ? ecran(cam, g.cible || [540, 900]) : (g.cible || [540, 900]), [lx, ly] = g.position || [x + 120, y - 180];
        const kk = B.ease('sortie', k);
        h += `<svg class="et" width="1080" height="1920" style="opacity:${f(a)}"><path d="M${f(x)},${f(y)} L${f(B.lerp(x, lx, kk))},${f(B.lerp(y, ly, kk))}" stroke="#fffaf0" stroke-width="4" stroke-linecap="round"/><circle cx="${f(x)}" cy="${f(y)}" r="8" fill="#ffd34d"/></svg><div class="etiq" style="left:${f(lx)}px;top:${f(ly)}px;opacity:${f(B.clamp((k - .5) * 2) * ks)}">${g.texte}</div>`;
      } else if (g.type === 'html') {
        h += `<div style="position:absolute;inset:0;opacity:${f(a)}">${g.html}</div>`;
      }
      } finally { h = marquer(h, h0, g.type); }
    }
    return { h, flouMonde, voileMonde, cacheST };
  }

  // ------------------------------------------------------------------ rendu global
  function rendre(t) {
    const plans = D.plans;
    let i = plans.findIndex(p => t >= p.debut && t < p.debut + p.duree);
    if (i < 0) i = t < 0 ? 0 : plans.length - 1;
    const p = plans[i], tp = t - p.debut;
    const tr = p.transition || 'coupe', dtr = p.duree_transition ?? (tr === 'fondu' ? .6 : tr === 'noir' || tr === 'blanc' ? .7 : 0);
    let opa = 1, voile = null;
    const r = rendrePlan(i, tp, slots[i % 2]);
    slots[i % 2].setAttribute('opacity', '1');
    const autre = slots[(i + 1) % 2];
    if (i > 0 && tp < dtr && tr === 'fondu') {
      const q = plans[i - 1];
      rendrePlan(i - 1, t - q.debut, autre);
      opa = B.ease('doux', tp / dtr);
      svg.appendChild(slots[i % 2]);                       // le plan entrant passe devant
      slots[i % 2].setAttribute('opacity', f(opa));
      autre.setAttribute('opacity', '1');
    } else { autre.innerHTML = ''; }
    if (tr === 'noir' || tr === 'blanc') { const k = tp < dtr ? 1 - B.ease('doux', tp / dtr) : 0; if (k > 0) voile = [tr === 'noir' ? '#000' : '#fff', k]; }
    // fin de plan suivi d'un noir / blanc : la descente
    const n = plans[i + 1];
    if (n && (n.transition === 'noir' || n.transition === 'blanc')) { const d2 = n.duree_transition ?? .7; const k = B.clamp((tp - (p.duree - d2 * .6)) / (d2 * .6)); if (k > 0) voile = [n.transition === 'noir' ? '#000' : '#fff', Math.max(voile ? voile[1] : 0, B.ease('doux', k))]; }
    // textes
    const tx = textes(p, tp, r.cam);
    const g = r.grade;
    if (PAPIER) {
      const col = couleursPapier(p, r.c);
      document.getElementById('scene').style.background = `radial-gradient(ellipse 120% 70% at 50% 35%, ${col.fond} 0%, ${col.fond2} 100%)`;
      papierEl.style.setProperty('--lueur', col.lueur);
      // sur un panneau clair (le moment doré), le texte à l'écran passe en encre sombre : le blanc s'y perdrait
      const clair = B.lum(col.fond) > SEUIL_PANNEAU_CLAIR;
      html.classList.toggle('sur-clair', clair);
      if (clair) { html.style.setProperty('--kin', col.texte); html.style.setProperty('--kin-or', B.mix(col.gris, col.texte, .35)); }
      sousPapier.innerHTML = illustration(p, tp, r.cam, r.ecrans) + (n && (n.transition === 'noir') ? '' : '');
      svg.style.filter = `brightness(${f((1 - tx.voileMonde * .5) * (g.luminosite ?? 1))}) contrast(${g.contraste ?? ETAL.contraste}) saturate(${g.saturation ?? ETAL.saturation}) sepia(${g.sepia ?? ETAL.sepia})`;
      const kara = tx.cacheST ? '' : karaoke(p, tp, col);
      const gr = D.style?.grain ?? .05;
      html.innerHTML = (gr ? `<div class="grain" style="opacity:${gr};background-position:${Math.floor((t * 977) % 400)}px ${Math.floor((t * 613) % 400)}px"></div>` : '') + tx.h + kara +
        (voile ? `<div style="position:absolute;inset:0;background:${voile[0]};opacity:${f(voile[1])}"></div>` : '');
      return { plan: i, tp };
    }
    const flou = tx.flouMonde * 16;
    const sombre = 1 - tx.flouMonde * .35 - tx.voileMonde * .5;
    svg.style.filter = `${flou > .3 ? `blur(${f(flou)}px)` : ''} brightness(${f(sombre * (g.luminosite ?? 1))}) contrast(${g.contraste ?? 1.06}) saturate(${g.saturation ?? 1.08})`;
    const teinte = g.teinte ? `<div class="teinte" style="background:${g.teinte};opacity:${g.teinte_force ?? .18}"></div>` : '';
    const st = tx.flouMonde > .2 || tx.cacheST ? '' : sousTitres(p, tp);
    const gr = (D.style?.grain ?? .06);
    html.innerHTML = teinte + `<div class="vignette" style="opacity:${D.style?.vignette ?? .55}"></div>` +
      (gr ? `<div class="grain" style="opacity:${gr};background-position:${Math.floor((t * 977) % 400)}px ${Math.floor((t * 613) % 400)}px"></div>` : '') +
      tx.h + st + (voile ? `<div style="position:absolute;inset:0;background:${voile[0]};opacity:${f(voile[1])}"></div>` : '');
    return { plan: i, tp };
  }

  // haut de l'arche (bord visible de la fenêtre) à l'abscisse x : un rectangle surmonté d'un demi-cercle
  function hautArche(x) {
    const r = (FEN.x1 - FEN.x0) / 2, cx = (FEN.x0 + FEN.x1) / 2, cy = FEN.haut + r;
    return Math.abs(x - cx) >= r ? Infinity : cy - Math.sqrt(r * r - (x - cx) * (x - cx));
  }
  const COUPE_TETE_MAX = .15;           // part de la hauteur de la tête que l'arche peut couper (au-delà : tête coupée)
  // un personnage tout entier hors du cadre est un choix (hors champ) ; à moitié dedans, c'est un défaut. Son corps
  // (bras compris) s'étend à ~3 demi-hauteurs de tête de l'axe de sa tête.
  const DEMI_CORPS = 3;
  // un corps coupé d'un côté ALORS QU'IL Y A LA PLACE de l'autre est une erreur de cadre ; un gros plan dont les deux
  // épaules sortent (il ne tiendrait pas de toute façon) est un choix
  const CORPS_COUPE_MAX = .06;          // part de la largeur du corps qui peut sortir sur un côté
  function contourCorps(it) {
    const el = it.g.querySelector('.corps');
    if (!el) return null;
    const b = el.getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect();
    return { x0: b.left - sc.left, x1: b.right - sc.left };
  }
  const GROS_PLAN = 185;                // px : demi-hauteur de la tête à l'écran à partir de laquelle c'est un gros plan
  function coupeEvitable(b, r) {
    const w = b.x1 - b.x0, g = Math.max(0, FEN.x0 - b.x0), d = Math.max(0, b.x1 - FEN.x1);
    if (w > FEN.x1 - FEN.x0 && r >= GROS_PLAN) return false;             // un gros plan : les deux épaules sortent, c'est voulu
    if (g > 0 && d > 0) return r < GROS_PLAN;                            // des bras ouverts coupés des deux côtés : reculer
    return (g + d) / w > CORPS_COUPE_MAX;
  }
  // contrôle du cadrage : où sont les têtes à l'écran, et sont-elles cachées par les sous-titres ou hors champ ?
  function cadrage(t) {
    const out = [];
    const i = D.plans.findIndex(p => t >= p.debut && t < p.debut + p.duree);
    if (i < 0 || !cache[i]) return out;
    const p = D.plans[i], cam = camera(p, t - p.debut);
    for (const it of cache[i].items) if (it.acteur && it.tete) {
      const [x, y] = ecran(cam, it.tete, it.d);
      const z = Math.pow(cam.zoom, it.d);
      const r = it.r_tete * z;                                   // demi-hauteur de la tête à l'écran
      const st = p.mots && p.sous_titres !== false && (t - p.debut) < p.voix_fin + .5;
      const pb = [];
      if (PAPIER) {
        if (!it.spec.hors_champ_ok) {
          const bord = hautArche(x), corps = contourCorps(it);
          const dehors = corps ? corps.x1 < FEN.x0 + 2 || corps.x0 > FEN.x1 - 2 : x < FEN.x0 - DEMI_CORPS * r || x > FEN.x1 + DEMI_CORPS * r;
          if (dehors) { out.push({ id: it.spec.id, x: Math.round(x), y: Math.round(y), r: Math.round(r), hors_champ: true, problemes: pb }); continue; }
          if (x < FEN.x0 + 20 || x > FEN.x1 - 20 || y > HP - 40) pb.push('personnage coupé au bord du cadre');
          else if (y < bord + 20) pb.push('tête hors de la fenêtre');
          else if ((bord - (y - r)) / (2 * r) > COUPE_TETE_MAX) pb.push("tête coupée par l'arche");
          else if (corps && coupeEvitable(corps, r)) pb.push('corps coupé au bord du cadre');      // la tête est dedans, mais le corps ?
        }
        out.push({ id: it.spec.id, x: Math.round(x), y: Math.round(y), r: Math.round(r), de_dos: it.vu < DE_DOS, problemes: pb });
        continue;
      }
      if (x < 40 || x > 1040 || y < 60 || y > 1860) pb.push('tête hors champ');
      else if (x > 880 && y > 1100) pb.push("tête sous l'interface TikTok");
      if (st && y + r > 1235 && y - r < 1420 && x > 80 && x < 1000) pb.push('visage sous les sous-titres');
      out.push({ id: it.spec.id, x: Math.round(x), y: Math.round(y), problemes: pb });
    }
    return out;
  }

  // les articulations de chaque personnage du plan affiché à l'instant t (après FILM.rendre(t)), dans le monde
  function articulations(t) {
    const i = D.plans.findIndex(p => t >= p.debut && t < p.debut + p.duree);
    if (i < 0 || !cache[i]) return [];
    return cache[i].items.filter(it => it.acteur && it.articulations).map(it => ({ id: it.spec.id, a: it.articulations, ech: it.acteur.echelle || 1 }));
  }

  const TRAITS_SEULS = ['note', 'cercle', 'fleche', 'etiquette'];      // annotations : on mesure leur texte, pas leurs traits
  // où sont, à l'écran, les graphismes affichés (après FILM.rendre) : [{type, x0, y0, x1, y1}]
  function graphismes() {
    const out = [], sc = document.getElementById('scene').getBoundingClientRect();
    for (const w of document.querySelectorAll('[data-g]')) {
      let b = null;
      for (const el of w.querySelectorAll(':scope > *')) {
        let r;
        if (el instanceof SVGSVGElement && TRAITS_SEULS.includes(w.dataset.g)) continue;    // une flèche en diagonale : sa boîte ne dit rien
        if (el instanceof SVGSVGElement) { const bb = el.getBBox(); r = [bb.x, bb.y, bb.x + bb.width, bb.y + bb.height]; }
        else { const c = el.getBoundingClientRect(); r = [c.left - sc.left, c.top - sc.top, c.right - sc.left, c.bottom - sc.top]; }
        if (r[2] - r[0] < 2 || r[3] - r[1] < 2) continue;
        b = b ? [Math.min(b[0], r[0]), Math.min(b[1], r[1]), Math.max(b[2], r[2]), Math.max(b[3], r[3])] : r;
      }
      const cb = w.querySelector('.corps-bulle'), q = cb && cb.getBoundingClientRect();      // le corps d'une bulle (sans sa queue, qui va vers la tête)
      if (b) out.push({ type: w.dataset.g, x0: b[0], y0: b[1], x1: b[2], y1: b[3], corps: q ? { x0: q.left - sc.left, y0: q.top - sc.top, x1: q.right - sc.left, y1: q.bottom - sc.top } : null });
    }
    return out;
  }
  // un graphisme sort-il de l'arche ? (ses coins du haut contre l'arrondi, ses côtés contre les bords)
  function horsArche(g) {
    if (!FEN) return false;
    const b = g.corps || g, ar = (FEN.x1 - FEN.x0) / 2, cx = (FEN.x0 + FEN.x1) / 2, cy = FEN.haut + ar;
    const coin = (x, y) => y >= cy ? x < FEN.x0 - 2 || x > FEN.x1 + 2 : Math.hypot(x - cx, y - cy) > ar + 2;
    const r = g.corps || ['badge', 'ruban'].includes(g.type) ? Math.min(b.x1 - b.x0, b.y1 - b.y0) * .3 : 0;      // une bulle, une étiquette ont des bords ronds
    return coin(b.x0 + r, b.y0 + r * .5) || coin(b.x1 - r, b.y0 + r * .5) || coin(b.x0, (b.y0 + b.y1) / 2) || coin(b.x1, (b.y0 + b.y1) / 2);
  }
  // le texte dit (karaoké) tient-il dans sa place ?
  function texteDeborde() {
    const k = document.querySelector('.kara');
    return !!k && k.scrollHeight > k.clientHeight + 4;
  }

  // ------------------------------------------------------------------ pour l'atelier : ce qui se prend à la souris
  // un point de l'écran (1080 × 1920) → le monde du plan affiché à l'instant t (profondeur d)
  const planA = (t) => D.plans.findIndex(p => t >= p.debut && t < p.debut + p.duree);
  function versMonde(t, p, d = 1) {
    const i = planA(t);
    return i < 0 ? p : mondeDe(camera(D.plans[i], t - D.plans[i].debut), p, d);
  }
  // les personnages, meubles, objets, animaux du plan affiché : leur boîte à l'écran, d'où ils viennent
  const FONDS = ['ciel', 'nuages', 'relief', 'sol', 'piece', 'eau', 'pluie', 'neige', 'particules', 'rayons', 'brume', 'eclair', 'ville', 'chemin', 'premier_plan', 'vegetation'];
  function elements(t) {
    const i = planA(t);
    if (i < 0 || !cache[i]) return [];
    const sc = document.getElementById('scene').getBoundingClientRect(), k = sc.width / 1080;
    const boite = (g) => { const b = g.getBoundingClientRect(); return b.width < 1 ? null : [(b.left - sc.left) / k, (b.top - sc.top) / k, (b.right - sc.left) / k, (b.bottom - sc.top) / k]; };
    const out = [];
    let rang = 0;
    const acteurs = D.plans[i].acteurs || [];
    for (const it of cache[i].items) {
      if (it.acteur) { const b = boite(it.g.querySelector('.corps') || it.g); if (b) out.push({ genre: 'acteur', id: it.spec.id, k: acteurs.indexOf(it.spec), boite: b, d: it.d, x: it.spec.x ?? 540, y: it.spec.y, z: it.z }); } else if (it.source) {
        const o = it.couche || it.objet;
        if (!o.gen || FONDS.includes(o.gen) || o.x === undefined && o.pos === undefined) continue;
        const b = boite(it.g);
        if (b) out.push({ genre: 'objet', gen: o.gen, type: o.type || o.espece || '', source: it.source, boite: b, d: it.d, x: o.x ?? o.pos?.[0], y: o.y ?? o.pos?.[1], z: it.z });
      }
      rang++;
    }
    return out;
  }
  // une retouche locale (déplacer, tourner) : le plan se redessine, sans recharger le film
  function rafraichir(i) { delete cache[i]; }

  G.FILM = { charger, rendre, cadrage, articulations, graphismes, horsArche, texteDeborde, versMonde, elements, rafraichir, plan: planA, film: () => D };
})(typeof window !== 'undefined' ? window : globalThis);
