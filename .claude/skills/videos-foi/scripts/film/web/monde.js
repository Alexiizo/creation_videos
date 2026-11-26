// Générateurs du monde : ciel, nuages, relief, eau, pluie, neige, particules, rayons, brume, lumières.
// Ce ne sont pas des décors tout faits : ce sont des MATIÈRES (de l'eau, de l'air, de la lumière) que le script
// règle librement et que Claude combine avec les lieux qu'il dessine en SVG pour chaque histoire.
(function (G) {
  const B = G.B, f = B.f;
  const W = B.W, H = B.H;
  const GEN = {};

  // eau : surface animée (calme → tempête), reflets du ciel et de l'astre, crêtes d'écume
  GEN.eau = (p, id, t) => {
    const y0 = p.y ?? 1250, c = p.couleur || '#2f6f86', ag = p.agitation ?? .2, prof = p.fond || B.sombre(c, .55);
    const cl = p.reflet || B.clair(c, .35);
    let s = `<defs><linearGradient id="${id}e" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y0 + 900}"><stop offset="0" stop-color="${cl}"/><stop offset=".25" stop-color="${c}"/><stop offset="1" stop-color="${prof}"/></linearGradient></defs>`;
    s += `<rect x="-2500" y="${y0}" width="6080" height="3000" fill="url(#${id}e)"/>`;
    if (p.astre_x !== undefined) {             // chemin de lumière de l'astre sur l'eau
      for (let k = 0; k < 22; k++) {
        const y = y0 + 8 + Math.pow(k, 1.6) * 9, w = (30 + k * 7) * (.6 + .4 * Math.sin(t * 2.3 + k * 1.7));
        const x = p.astre_x + Math.sin(t * 1.3 + k) * 12, e = 2 + k * .45;
        s += `<path d="M${f(x - w / 2)},${f(y)}Q${f(x)},${f(y - e)} ${f(x + w / 2)},${f(y)}Q${f(x)},${f(y + e)} ${f(x - w / 2)},${f(y)}Z" fill="${p.astre_couleur || '#fff1c9'}" opacity="${f(.6 * (1 - k / 22))}" style="mix-blend-mode:soft-light"/><path d="M${f(x - w / 2)},${f(y)}Q${f(x)},${f(y - e)} ${f(x + w / 2)},${f(y)}Q${f(x)},${f(y + e)} ${f(x - w / 2)},${f(y)}Z" fill="${p.astre_couleur || '#fff1c9'}" opacity="${f(.34 * (1 - k / 22))}"/>`;
      }
    }
    const n = 30;
    for (let k = 0; k < n; k++) {
      const kk = k / n, y = y0 + 6 + Math.pow(k, 1.62) * 8.5;
      const amp = (1.5 + k * .45) * (1 + 6 * ag * kk) * (1 + .3 * Math.sin(k * 2.9));
      const fr = .012 / (1 + ag * .9) * (1 + .3 * Math.sin(k * 2.3 + 1)), v = (.7 + k * .05) * (1 + ag * 1.5);
      let d = '', ec = '', dedans = false;
      for (let x = -600; x <= 1700; x += 16) {
        const sv = Math.sin(x * fr + t * v + k * 1.7), yy = y + sv * amp;
        d += (x === -600 ? 'M' : 'L') + f(x) + ',' + f(yy);
        if (ag > .35 && k > 4 && sv < -.75) { ec += (dedans ? 'L' : 'M') + f(x) + ',' + f(yy); dedans = true; } else dedans = false;
      }
      s += `<path d="${d}" fill="none" stroke="${cl}" stroke-width="${f(1.2 + kk * 3 * (1 + ag))}" opacity="${f(.22 + .12 * ag)}"/>`;
      if (ec) s += `<path d="${ec}" fill="none" stroke="#ffffff" stroke-width="${f((2 + 10 * kk) * ag)}" stroke-linecap="round" opacity="${f(.15 + .55 * ag * kk)}"/>`;
    }
    return s;
  };

  // pluie (écran) : traits obliques sur 3 profondeurs, déterministe en t
  GEN.pluie = (p, id, t) => {
    const n = p.n || 260, v = p.vent ?? .25, op = p.opacite ?? .5; let s = '';
    for (let i = 0; i < n; i++) {
      const h = (i * 7919) % 1000 / 1000, h2 = (i * 104729) % 1000 / 1000, prof = .4 + (i % 3) * .3;
      const vit = 2600 * prof, L = 40 + 70 * prof;
      const y = ((h * H * 1.3 + t * vit) % (H + 300)) - 150, x = (h2 * (W + 600) - 300 + y * v) ;
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - L * v)}" y2="${f(y - L)}" stroke="${p.couleur || '#c9dcf0'}" stroke-width="${f(1 + prof * 1.4)}" opacity="${f(op * prof)}"/>`;
    }
    return s;
  };
  GEN.neige = (p, id, t) => {
    const n = p.n || 160; let s = '';
    for (let i = 0; i < n; i++) {
      const h = (i * 7919) % 1000 / 1000, h2 = (i * 104729) % 1000 / 1000, prof = .4 + (i % 3) * .3;
      const y = ((h * H + t * 120 * prof) % (H + 100)) - 50, x = (h2 * (W + 200) - 100) + Math.sin(t * .8 + i) * 30;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2 + prof * 4)}" fill="#fff" opacity="${f(.8 * prof)}"/>`;
    }
    return s;
  };
  // particules en suspension : poussière dans la lumière, lucioles, braises, pollen, embruns
  GEN.particules = (p, id, t) => {
    const n = p.n || 60, c = p.couleur || '#fff3d6', type = p.type2 || p.genre || 'poussiere'; let s = '';
    const zone = p.zone || [0, 0, W, H];
    for (let i = 0; i < n; i++) {
      const h = (i * 7919 % 1000) / 1000, h2 = (i * 104729 % 1000) / 1000, h3 = (i * 15485863 % 1000) / 1000;
      let x = zone[0] + h * zone[2] + B.bruit(t * .15 + i, 3) * 60, y = zone[1] + h2 * zone[3] + B.bruit(t * .12 + i, 9) * 60;
      if (type === 'braises') y = zone[1] + zone[3] - ((h2 * zone[3] + t * 90 * (.5 + h3)) % zone[3]);
      const r = (type === 'lucioles' ? 3 : type === 'braises' ? 2.5 : 1.6) * (.6 + h3 * 1.4);
      const op = type === 'lucioles' ? .5 + .5 * Math.sin(t * 2 + i * 1.3) : (.25 + .5 * h3) * (.6 + .4 * Math.sin(t * 1.1 + i));
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" opacity="${f(B.clamp(op) * (p.opacite ?? 1))}"/>`;
      if (type === 'lucioles' || type === 'braises') s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 4)}" fill="${c}" opacity="${f(B.clamp(op) * .15)}"/>`;
    }
    return s;
  };
  // rayons de lumière depuis un point (soleil derrière les nuages, lumière divine, fenêtre)
  GEN.rayons = (p, id, t) => {
    if (p.fenetre) return MONDE.rais(p.piece, p.fenetre, p.couleur, p.opacite ?? .35, id, t);
    const [x, y] = p.source || [800, 300], n = p.n || 7, L = p.longueur || 2400, c = p.couleur || '#fff1c9';
    let s = `<defs><linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + Math.sin(B.rad(p.angle ?? 200)) * L}" y2="${y - Math.cos(B.rad(p.angle ?? 200)) * L}"><stop offset="0" stop-color="${c}" stop-opacity="${p.opacite ?? .35}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`;
    for (let i = 0; i < n; i++) {
      const a = B.rad((p.angle ?? 200) + (i - (n - 1) / 2) * (p.ecart ?? 9) + Math.sin(t * .3 + i) * 1.2), w = B.rad((p.largeur ?? 3) * (.6 + .5 * Math.sin(i * 2.7)));
      const ax = Math.sin(a - w) * L, ay = -Math.cos(a - w) * L, bx = Math.sin(a + w) * L, by = -Math.cos(a + w) * L;
      s += `<path d="M${x},${y} L${f(x + ax)},${f(y + ay)} L${f(x + bx)},${f(y + by)}Z" fill="url(#${id}r)" opacity="${f(.5 + .5 * Math.sin(t * .7 + i * 1.9))}" style="mix-blend-mode:screen"/>`;
    }
    return s;
  };
  // brume en bandes qui dérivent
  GEN.brume = (p, id, t) => {
    const y = p.y ?? 1200, c = p.couleur || '#dfe6ee', op = p.opacite ?? .35; let s = '';
    for (let i = 0; i < (p.n || 4); i++) {
      const yy = y + (i - 1.5) * (p.ecart || 60), x = ((t * (12 + i * 5) + i * 400) % 2400) - 1200;
      s += `<ellipse cx="${f(x + 540)}" cy="${f(yy)}" rx="1400" ry="${f(55 + i * 10)}" fill="${c}" opacity="${f(op * (.6 + .4 * Math.sin(t * .2 + i)))}" filter="url(#flou30)"/>`;
    }
    return s;
  };
  // lumière ponctuelle (lampe, téléphone, feu, fenêtre) : halo qui vacille
  GEN.lumiere = (p, id, t) => {
    const [x, y] = p.pos || [540, 900], r = p.rayon || 300, c = p.couleur || '#ffd48a';
    const v = p.vacille ? (1 + .08 * B.bruit(t * 9, 4) + .05 * Math.sin(t * 23)) : 1;
    return `<defs><radialGradient id="${id}l"><stop offset="0" stop-color="${c}" stop-opacity="${p.intensite ?? .6}"/><stop offset=".4" stop-color="${c}" stop-opacity="${(p.intensite ?? .6) * .35}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${x}" cy="${y}" r="${f(r * v)}" fill="url(#${id}l)" style="mix-blend-mode:${p.mode || 'screen'}"/>`;
  };
  // éclair : flash du ciel à des instants donnés (avec "instants": [t1, t2])
  GEN.eclair = (p, id, t) => {
    let k = 0;
    for (const ti of (p.instants || [])) { const d = t - ti; if (d >= 0 && d < .45) k = Math.max(k, d < .06 ? 1 : d < .12 ? .3 : d < .18 ? .8 : (1 - (d - .18) / .27) * .5); }
    if (k <= 0) return '';
    const x = p.x ?? 300, r = B.alea(Math.floor((p.instants || [0])[0] * 10) + 1);
    let d = `M${x},-200`, xx = x, yy = -200;
    while (yy < (p.sol ?? 1100)) { xx += (r() - .5) * 140; yy += 60 + r() * 90; d += `L${f(xx)},${f(yy)}`; }
    return `<rect x="-3000" y="-3000" width="7000" height="7000" fill="${p.couleur || '#dfe9ff'}" opacity="${f(k * .45)}"/><path d="${d}" stroke="#ffffff" stroke-width="5" fill="none" opacity="${f(k)}" filter="url(#flou2)"/><path d="${d}" stroke="#ffffff" stroke-width="2" fill="none" opacity="${f(k)}"/>`;
  };

  // animation des éléments marqués data-anim='{"type": …}' dans le SVG des lieux et des objets
  function animer(el, a, t, tp) {
    const ty = a.type, am = a.amp ?? 1, per = a.periode ?? 3, ph = (a.phase ?? 0) + (a.seed ?? 0) * .7;
    const w = 2 * Math.PI / per;
    let tx = 0, tyy = 0, rot = 0, sc = 1, op = null, skew = 0;
    if (ty === 'balance') rot = Math.sin(t * w + ph) * (a.amp ?? 4);
    else if (ty === 'flotte') tyy = Math.sin(t * w + ph) * (a.amp ?? 6);
    else if (ty === 'vague') tx = Math.sin(t * w + ph) * (a.amp ?? 10);
    else if (ty === 'tangue') { rot = Math.sin(t * w + ph) * (a.amp ?? 4) + Math.sin(t * w * 2.3 + 1) * (a.amp ?? 4) * .25; tyy = Math.sin(t * w * 1.3 + ph + 1) * (a.houle ?? (a.amp ?? 4) * 2.5); }
    else if (ty === 'pulse') sc = 1 + Math.sin(t * w + ph) * (a.amp ?? .05);
    else if (ty === 'tourne') rot = (t * 360 / per) % 360;
    else if (ty === 'vent') skew = Math.sin(t * w + ph) * (a.amp ?? 4) + B.bruit(t * .8, ph) * (a.amp ?? 4) * .5;
    else if (ty === 'derive') tx = ((t * (a.vx ?? 10)) % 3000);
    else if (ty === 'clignote' || ty === 'vacille') op = B.clamp(.75 + .25 * B.bruit(t * (a.vitesse ?? 8), ph) + .1 * Math.sin(t * 17 + ph));
    else if (ty === 'scintille') op = .3 + .7 * Math.abs(Math.sin(t * (1 + (a.seed % 5) * .3) + a.seed));
    if (a.cles) {                     // images-clés en temps du plan : {t, x, y, rot, echelle, opacite}
      const k = B.cles(a.cles, tp, { x: 0, y: 0, rot: 0, echelle: 1, opacite: 1 });
      tx += k.x; tyy += k.y; rot += k.rot; sc *= k.echelle; op = op === null ? k.opacite : op * k.opacite;
    }
    const [px, py] = a.pivot || [0, 0];
    el.setAttribute('transform', `translate(${f(tx)},${f(tyy)}) rotate(${f(rot)},${px},${py}) translate(${px},${py}) scale(${f(sc)}) skewX(${f(skew)}) translate(${-px},${-py})`);
    if (op !== null) el.setAttribute('opacity', f(op));
    return { tx, ty: tyy, rot, pivot: [px, py] };
  }

  // générateurs animés : redessinés à chaque image (les autres sont construits une fois et animés par data-anim)
  const DYN = new Set(['eau', 'pluie', 'neige', 'particules', 'rayons', 'brume', 'lumiere', 'eclair', 'feu']);
  const dynamique = (c) => DYN.has(c.gen) || (c.gen === 'objet' && G.MONDE.OBJETS_VIVANTS?.has(c.type)) || (c.gen === 'accessoire' && ['lampe', 'bougie'].includes(c.type) && c.allume !== false);
  G.MONDE = { GEN, animer, DYN, dynamique };
})(typeof window !== 'undefined' ? window : globalThis);
