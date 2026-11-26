// Outils communs du moteur de film : maths, courbes d'animation, bruit, couleurs, interpolation d'images-clés.
(function (G) {
  const B = {};
  B.W = 1080; B.H = 1920;
  B.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  B.lerp = (a, b, k) => a + (b - a) * k;
  B.rad = d => d * Math.PI / 180;
  B.deg = r => r * 180 / Math.PI;
  B.f = x => (Math.round(x * 100) / 100).toString();          // nombres courts dans le SVG

  // courbes d'animation (toutes 0→1)
  const E = {
    lineaire: t => t,
    doux: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    sortie: t => 1 - Math.pow(1 - t, 3),
    entree: t => t * t * t,
    sortie_forte: t => 1 - Math.pow(1 - t, 5),
    rebond: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    claque: t => 1 - Math.pow(1 - t, 8),
    elastique: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
    sinus: t => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  B.E = E;
  B.ease = (nom, t) => (E[nom] || E.doux)(B.clamp(t));

  // bruit lisse 1D (valeur, interpolé) — mouvements organiques, tremblements, respiration
  function hash(i, s) { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }
  B.bruit = (x, s = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return B.lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1;
  };
  B.bruitFbm = (x, s = 0) => B.bruit(x, s) * .6 + B.bruit(x * 2.1, s + 7) * .3 + B.bruit(x * 4.3, s + 13) * .1;
  B.alea = (s) => { let a = (s * 9301 + 49297) % 233280; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; };

  // couleurs
  B.hex = c => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
  B.rgb = a => '#' + a.map(v => Math.round(B.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  B.mix = (a, b, k) => { const x = B.hex(a), y = B.hex(b); return B.rgb(x.map((v, i) => B.lerp(v, y[i], k))); };
  B.clair = (c, k) => B.mix(c, '#ffffff', k);
  B.sombre = (c, k) => B.mix(c, '#000000', k);
  B.teinte = (c, ombre, k) => B.mix(c, ombre, k);              // ombre colorée (jamais du noir pur)
  B.lum = c => { const [r, g, b] = B.hex(c); return (.2126 * r + .7152 * g + .0722 * b) / 255; };

  // images-clés : [{t, ...valeurs, ease}] → valeurs à l'instant t (les clés sans une valeur la gardent)
  B.cles = (cles, t, defauts = {}) => {
    if (!cles || !cles.length) return Object.assign({}, defauts);
    const ks = cles.slice().sort((a, b) => a.t - b.t);
    const out = Object.assign({}, defauts);
    const noms = new Set(); ks.forEach(k => Object.keys(k).forEach(n => { if (!['t', 'ease', 'coupe', 'mot', 'mot_n', 'decale'].includes(n)) noms.add(n); }));
    for (const n of noms) {
      const avec = ks.filter(k => k[n] !== undefined);
      if (!avec.length) continue;
      if (t <= avec[0].t) { out[n] = avec[0][n]; continue; }
      if (t >= avec[avec.length - 1].t) { out[n] = avec[avec.length - 1][n]; continue; }
      for (let i = 0; i < avec.length - 1; i++) {
        const a = avec[i], b = avec[i + 1];
        if (t >= a.t && t <= b.t) {
          if (b.coupe) { out[n] = a[n]; break; }
          const k = B.ease(b.ease || 'doux', (t - a.t) / Math.max(b.t - a.t, 1e-4));
          out[n] = (typeof a[n] === 'number' && typeof b[n] === 'number') ? B.lerp(a[n], b[n], k)
            : (typeof a[n] === 'string' && a[n][0] === '#' && typeof b[n] === 'string' && b[n][0] === '#') ? B.mix(a[n], b[n], k)
            : (k < .5 ? a[n] : b[n]);
          break;
        }
      }
    }
    return out;
  };

  // chemin lissé passant par des points (Catmull-Rom → Bézier)
  B.lisse = (pts, ferme = false, tension = .5) => {
    if (pts.length < 2) return '';
    const P = ferme ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${B.f(P[1][0])},${B.f(P[1][1])}`;
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
      const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
      d += `C${B.f(c1[0])},${B.f(c1[1])} ${B.f(c2[0])},${B.f(c2[1])} ${B.f(p2[0])},${B.f(p2[1])}`;
    }
    return d + (ferme ? 'Z' : '');
  };
  B.pt = (p) => `${B.f(p[0])},${B.f(p[1])}`;
  B.rot = (p, a, o = [0, 0]) => { const c = Math.cos(B.rad(a)), s = Math.sin(B.rad(a)); const x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };
  // direction d'un membre : angle 0 = vers le bas, positif = vers l'avant (+x)
  B.dir = (a, L) => [Math.sin(B.rad(a)) * L, Math.cos(B.rad(a)) * L];
  B.add = (a, b) => [a[0] + b[0], a[1] + b[1]];

  G.B = B;
})(typeof window !== 'undefined' ? window : globalThis);
