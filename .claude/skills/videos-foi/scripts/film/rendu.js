// Rendu du film dans Chromium (Playwright) : chaque image est dessinée par FILM.rendre(t) puis capturée.
//   node rendu.js film_resolu.json apercu/ --instants 0.5,3.2,7       → images PNG (contrôle visuel)
//   node rendu.js film_resolu.json video_muette.mp4 [--workers 2] [--fps 30]  → vidéo (sans son)
// Options : --sans-gpu (rendu logiciel), --brouillon (images JPEG : plus rapide, pour un rendu de travail).
// Mesuré le 24/11/2026 (PC d'Alexis, RTX 3060) : capture PNG classique 716 ms/image ; carte graphique + PNG rapide
// 131 ms (sans perte) ; JPEG 58 ms. Chaque worker a son propre navigateur (un seul navigateur partagé étranglait tout).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const [entree, sortie] = args;
const film = JSON.parse(fs.readFileSync(entree, 'utf8'));
const fps = +opt('fps', film.fps || 30);
const total = film.plans.reduce((m, p) => Math.max(m, p.debut + p.duree), 0);
const page_html = 'file://' + path.resolve(__dirname, 'web/index.html');

const BROUILLON = args.includes('--brouillon');
// la carte graphique (ANGLE selon le système) ; --sans-gpu : rendu logiciel
// une erreur de dessin (un nombre impossible, un générateur qui échoue) ne doit jamais passer inaperçue : elle est
// rapportée une fois, avec le nombre de fois où elle s'est produite, comme les autres alertes
const ERREURS = new Map();
function noterErreur(texte) { const k = texte.replace(/\s+/g, ' ').slice(0, 160); ERREURS.set(k, (ERREURS.get(k) || 0) + 1); }
process.on('exit', () => { for (const [k, n] of ERREURS) process.stdout.write(`!! DESSIN ${k} (${n} fois)\n`); });
function lancer() {
  const angle = { win32: ['--use-angle=d3d11'], darwin: ['--use-angle=metal'] }[process.platform] || [];
  return chromium.launch({ args: args.includes('--sans-gpu') ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', ...angle] });
}
async function ouvrir(b) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => noterErreur('page : ' + e.message));
  p.on('console', m => { if (m.type() === 'error') noterErreur(m.text()); });
  await p.goto(page_html);
  await p.evaluate(d => { window.FILM.charger(d); }, film);
  // les polices ne se chargent qu'à leur 1re utilisation : sans ça, une image peut partir SANS texte (vu le 24/11 :
  // un badge vide dans les images de référence) — on les charge toutes avant la 1re capture
  await p.evaluate(() => Promise.all([...document.fonts].map(f => f.load())).then(() => document.fonts.ready));
  p.cdp = await p.context().newCDPSession(p);
  return p;
}
// une image : PNG sans perte, encodage rapide (la qualité d'abord) ; JPEG en brouillon
// la carte graphique partagée (un jeu ouvert à côté…) peut refuser une capture : on réessaie avant d'abandonner
const ESSAIS_CAPTURE = 4, PAUSE_CAPTURE_MS = 250;
async function capturer(p) {
  const opts = BROUILLON ? { format: 'jpeg', quality: 90, optimizeForSpeed: true } : { format: 'png', optimizeForSpeed: true };
  for (let k = 1; ; k++) {
    try {
      const r = await p.cdp.send('Page.captureScreenshot', opts);
      return Buffer.from(r.data, 'base64');
    } catch (e) {
      if (k >= ESSAIS_CAPTURE) throw new Error(`capture d'image impossible après ${k} essais (${e.message}) — la carte graphique est-elle occupée par une autre application ?`);
      await new Promise(r => setTimeout(r, PAUSE_CAPTURE_MS * k));
    }
  }
}

async function images(instants, dossier) {
  fs.mkdirSync(dossier, { recursive: true });
  const b = await lancer();
  const p = await ouvrir(b);
  const plans = new Set(), tetes = [];
  for (const t of instants) {
    const info = await p.evaluate(t => window.FILM.rendre(t), t);
    plans.add(info.plan);
    fs.writeFileSync(path.join(dossier, `t_${t.toFixed(2).padStart(6, '0')}.png`), await capturer(p));
    const cad = await p.evaluate(t => window.FILM.cadrage(t), t);
    tetes.push({ t, plan: info.plan + 1, tetes: cad.filter(c => !c.hors_champ && !c.de_dos).map(c => ({ id: c.id, x: c.x, y: c.y, r: c.r })) });
    const pbs = cad.filter(c => c.problemes.length).map(c => `${c.id} : ${c.problemes.join(', ')}`);
    process.stdout.write(`t=${t.toFixed(2)} plan ${info.plan + 1}${pbs.length ? '  !! CADRAGE ' + pbs.join(' ; ') : ''}\n`);
  }
  fs.writeFileSync(path.join(dossier, 'tetes.json'), JSON.stringify(tetes));       // où sont les visages : contrôle de LISIBILITÉ (Python, sur les pixels)
  for (const l of await controler(p, [...plans].sort((a, b) => a - b))) process.stdout.write(l + '\n');
  await b.close();
}

// Les contrôles sur TOUT le plan, image par image (sans capture : quelques millisecondes par image) :
// - CADRAGE : une tête peut sortir de l'arche entre deux images de la planche ;
// - SAUT : une articulation (tête, main, pied) qui bondit d'un coup, seule, d'une image à l'autre ;
// - MISE EN PAGE (tous les 0,1 s) : deux graphismes qui se recouvrent, un graphisme posé sur un visage, le texte dit
//   qui ne tient pas sous l'arche.
const PAS_CONTROLE = 1 / 30;
const VISAGE = .72;                 // rayon du visage, en part de la demi-hauteur de la tête
const GRANDS = ['texte', 'mot', 'chiffre'], TETE = 1.12;   // les grands mots ne touchent pas la tête (cheveux compris) : rayon, en demi-hauteurs
const BULLES = ['bulle', 'pensee'], CORPS_BULLE = .45;      // demi-étendue du corps de la bulle, en part de sa boîte (ses bords sont ronds)
const OPAQUES = ['badge', 'ruban', 'citation', 'verset', 'definition', 'texte', 'liste', 'compare'];
const DANS_ARCHE = ['badge', 'ruban', 'bulle', 'pensee', 'texte', 'liste', 'compare', 'chiffre', 'etiquette', 'mot', 'icone'];
const SAUT_PX = 30;                 // un bond d'au moins 30 px (à l'échelle 1)…
const SAUT_FACTEUR = 3;             // … et 3 fois plus grand que les pas d'image voisins (un geste vif n'est pas un saut)
const TOUS_LES = 3;                 // images entre deux contrôles de mise en page
const RECOUVREMENT_MAX = .25;       // part de la plus petite des deux boîtes
const MIN_DUREE_ALERTE = .15;       // s : un défaut plus bref ne se voit pas (un graphisme qui passe en entrant)
const SANS_CONTROLE = ['carte', 'frise', 'fin', 'ondes', 'goutte', 'coeur', 'traits', 'html', 'titre'];   // pleine arche, ou posés exprès sur quelqu'un
async function controler(p, plans) {
  const spans = plans.map(i => ({ i, debut: film.plans[i].debut, duree: film.plans[i].duree }));
  const reglages = { pas: PAS_CONTROLE, SAUT_PX, SAUT_FACTEUR, TOUS_LES, RECOUVREMENT_MAX, SANS_CONTROLE, VISAGE, GRANDS, TETE, OPAQUES, BULLES, CORPS_BULLE, DANS_ARCHE };
  const r = await p.evaluate(([spans, R]) => {
    const defauts = [], sauts = [];
    const aire = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
    const inter = (a, b) => aire({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
    // les défauts de mise en page à cet instant : [{cle, id, pb}]
    function miseEnPage(tetes) {
      const out = [], gr = window.FILM.graphismes().filter(g => !R.SANS_CONTROLE.includes(g.type));
      for (let i = 0; i < gr.length; i++) for (let j = i + 1; j < gr.length; j++)
        if (inter(gr[i], gr[j]) > R.RECOUVREMENT_MAX * Math.min(aire(gr[i]), aire(gr[j])))
          out.push({ cle: `${gr[i].type}+${gr[j].type}`, id: 'graphismes', pb: `${gr[i].type} et ${gr[j].type} se recouvrent` });
      for (const g of gr) if (R.DANS_ARCHE.includes(g.type) && window.FILM.horsArche(g)) out.push({ cle: `arche<${g.type}`, id: g.type, pb: 'sort de l\'arche (texte plus court, ou "taille")' });
      for (const t of tetes) for (const g of gr) {
        const mx = (g.x1 - g.x0) * .12, my = (g.y1 - g.y0) * .12;
        // un texte opaque (badge, carte, liste…) ne touche pas le visage (un disque) ; une bulle, un signe ne le couvrent pas
        const r = (t.r || 0) * (R.GRANDS.includes(g.type) ? R.TETE : R.VISAGE), dx = Math.max(g.x0 - t.x, 0, t.x - g.x1), dy = Math.max(g.y0 - t.y, 0, t.y - g.y1);
        // une bulle : son corps (sans la queue, qui va vers la tête) ne mord pas sur le visage
        const c = g.corps, mord = c && Math.hypot(Math.max(Math.abs(t.x - (c.x0 + c.x1) / 2) - (c.x1 - c.x0) * R.CORPS_BULLE, 0), Math.max(Math.abs(t.y - (c.y0 + c.y1) / 2) - (c.y1 - c.y0) * R.CORPS_BULLE, 0)) < r;
        const couvre = R.OPAQUES.includes(g.type) ? Math.hypot(dx, dy) < r : R.BULLES.includes(g.type) ? mord : t.x > g.x0 + mx && t.x < g.x1 - mx && t.y > g.y0 + my && t.y < g.y1 - my;
        if (couvre && !t.hors_champ) out.push({ cle: `${t.id}<${g.type}`, id: t.id, pb: R.GRANDS.includes(g.type) ? `${g.type} posé sur la tête` : `visage caché par ${g.type}` });
      }
      if (window.FILM.texteDeborde()) out.push({ cle: 'texte', id: 'texte', pb: 'le texte dit ne tient pas sous l\'arche (phrase trop longue)' });
      return out.map(x => Object.assign(x, { genre: 'MISE EN PAGE' }));
    }
    for (const s of spans) {
      const ouverts = {}, traces = {};          // traces : id|articulation → [{tp, x, y, ech}]
      let mep = [];
      for (let tp = 0, n = 0; tp < s.duree - 1e-3; tp += R.pas, n++) {
        window.FILM.rendre(s.debut + tp);
        const tetes = window.FILM.cadrage(s.debut + tp);
        if (n % R.TOUS_LES === 0) mep = miseEnPage(tetes);
        const ici = [...tetes.flatMap(c => c.problemes.map(pb => ({ cle: `${c.id}|${pb}`, id: c.id, pb, genre: 'CADRAGE' }))), ...mep];
        const vus = new Set(ici.map(x => x.cle));
        for (const x of ici) { if (ouverts[x.cle]) ouverts[x.cle].a = tp + R.pas; else ouverts[x.cle] = Object.assign({ plan: s.i, de: tp, a: tp + R.pas }, x); }
        for (const cle of Object.keys(ouverts)) if (!vus.has(cle)) { defauts.push(ouverts[cle]); delete ouverts[cle]; }
        for (const ac of window.FILM.articulations(s.debut + tp)) for (const [nom, q] of Object.entries(ac.a))
          (traces[`${ac.id}|${nom}`] = traces[`${ac.id}|${nom}`] || []).push({ tp, x: q[0], y: q[1], ech: ac.ech });
      }
      for (const cle of Object.keys(ouverts)) defauts.push(Object.assign(ouverts[cle], { a: Math.min(ouverts[cle].a, s.duree) }));
      for (const [cle, tr] of Object.entries(traces)) {
        const d = tr.slice(1).map((q, k) => Math.hypot(q.x - tr[k].x, q.y - tr[k].y) / q.ech);
        d.forEach((x, k) => {
          const voisins = Math.max(d[k - 1] ?? 0, d[k + 1] ?? 0, 2);
          if (x > R.SAUT_PX && x > R.SAUT_FACTEUR * voisins) { const [id, nom] = cle.split('|'); sauts.push({ plan: s.i, id, n: nom, tp: tr[k + 1].tp, px: x }); }
        });
      }
    }
    return { defauts, sauts };
  }, [spans, reglages]);
  const s = x => x.toFixed(2).replace('.', ',');
  return [
    ...r.defauts.filter(x => x.a - x.de >= MIN_DUREE_ALERTE).map(x => `!! ${x.genre} plan ${x.plan + 1} · ${x.id} : ${x.pb} (de ${s(x.de)} s à ${s(x.a)} s dans le plan)`),
    ...r.sauts.map(x => `!! SAUT plan ${x.plan + 1} · ${x.id} : ${x.n.replace('_', ' ')} bondit de ${Math.round(x.px)} px d'un coup à ${s(x.tp)} s dans le plan`),
  ];
}

// RENDU PAR PLAN, AVEC CACHE : chaque plan devient un morceau de vidéo nommé par l'empreinte de tout ce qui le
// dessine (le plan, son lieu, ses personnages, le style, le code du moteur, le plan voisin s'il s'y fond) ; un plan
// inchangé n'est jamais re-rendu. Les morceaux se recollent sans réencodage.
const crypto = require('crypto');
const empreinte = (x) => crypto.createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
const MOTEUR = empreinte(['web', 'web/index.html', 'web/film.css'].flatMap(f => {
  const c = path.join(__dirname, f);
  return fs.statSync(c).isDirectory() ? fs.readdirSync(c).filter(x => x.endsWith('.js')).sort().map(x => fs.readFileSync(path.join(c, x), 'utf8')) : [fs.readFileSync(c, 'utf8')];
}).join('\n'));
const sansDebut = (q) => q && Object.fromEntries(Object.entries(q).filter(([k]) => k !== 'debut'));
function idsActeurs(p) {
  const ids = new Set((p?.acteurs || []).map(a => a.id));
  for (const g of p?.graphiques || []) if (g.acteur?.id) ids.add(g.acteur.id);
  return ids;
}
// les morceaux : les images qui appartiennent à chaque plan (même règle que FILM.rendre : debut ≤ t < debut + duree)
function morceaux(dossier) {
  const n = Math.ceil(total * fps), out = [];
  for (let k = 0; k < n; k++) {
    const t = k / fps;
    let i = film.plans.findIndex(p => t >= p.debut && t < p.debut + p.duree);
    if (i < 0) i = film.plans.length - 1;
    if (out.length && out[out.length - 1].i === i) out[out.length - 1].k1 = k + 1; else out.push({ i, k0: k, k1: k + 1 });
  }
  for (const m of out) {
    const p = film.plans[m.i], prec = film.plans[m.i - 1], suiv = film.plans[m.i + 1];
    const ids = new Set([...idsActeurs(p), ...(p.transition === 'fondu' ? idsActeurs(prec) : [])]);
    m.cle = empreinte({
      moteur: MOTEUR, fps, brouillon: BROUILLON, n: m.k1 - m.k0, plan: sansDebut(p), lieu: film.lieux?.[p.lieu], style: film.style,
      personnages: [...ids].sort().map(id => [id, film.personnages?.[id]]),
      levres: (film.visemes || []).filter(([t]) => t >= p.debut - .1 && t < p.debut + p.duree + .1).map(([t, c]) => [+(t - p.debut).toFixed(3), c]),
      fondu: p.transition === 'fondu' ? { plan: sansDebut(prec), lieu: film.lieux?.[prec?.lieu] } : null,
      fin: suiv && ['noir', 'blanc'].includes(suiv.transition) ? [suiv.transition, suiv.duree_transition] : null,
    });
    m.fichier = path.join(dossier, `${m.cle}.mp4`);
  }
  return out;
}
async function rendreMorceau(p, m, threads) {
  const tmp = m.fichier.replace(/\.mp4$/, '.en_cours.mp4');           // jamais un morceau à moitié rendu dans le cache
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', BROUILLON ? 'mjpeg' : 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-crf', opt('crf', '16'), '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-threads', String(threads), tmp]);
  const t0 = Date.now();
  for (let k = m.k0; k < m.k1; k++) {
    await p.evaluate(t => window.FILM.rendre(t), k / fps);
    const img = await capturer(p);
    if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code) throw new Error(`ffmpeg a échoué sur le plan ${m.i + 1}`);
  fs.renameSync(tmp, m.fichier);
  process.stdout.write(`  plan ${m.i + 1} rendu : ${m.k1 - m.k0} images en ${((Date.now() - t0) / 1000).toFixed(1).replace('.', ',')} s\n`);
}

(async () => {
  const inst = opt('instants');
  if (inst) return images(inst.split(',').map(Number), sortie);
  const w = Math.max(1, +opt('workers', 2));
  const threads = Math.max(1, Math.floor(require('os').cpus().length / w));    // l'encodage ne doit pas noyer la machine
  const cache = path.join(path.dirname(path.resolve(sortie)), '.plans');
  fs.mkdirSync(cache, { recursive: true });
  const tous = morceaux(cache), aFaire = tous.filter(m => !fs.existsSync(m.fichier));
  console.log(`${tous.length - aFaire.length} plan(s) déjà rendus (cache), ${aFaire.length} à rendre`);
  aFaire.sort((a, b) => (b.k1 - b.k0) - (a.k1 - a.k0));                  // les plus longs d'abord
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(w, aFaire.length) }, async () => {
    const b = await lancer();                                              // un navigateur par worker
    const p = await ouvrir(b);
    for (let m; (m = aFaire.shift());) await rendreMorceau(p, m, threads);
    await b.close();
  }));
  const liste = sortie + '.txt';
  const cheminFfmpeg = (c) => c.split(path.sep).join('/').split("'").join("'\\''");    // la liste du concat d'ffmpeg
  fs.writeFileSync(liste, tous.map(m => `file '${cheminFfmpeg(m.fichier)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', sortie]);
  fs.unlinkSync(liste);
  const n = tous.reduce((a, m) => a + m.k1 - m.k0, 0);
  console.log(`${n} images en ${((Date.now() - t0) / 1000).toFixed(0)} s → ${sortie}`);
})();
