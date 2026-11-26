// L'atelier piloté dans un vrai navigateur : node atelier_e2e.js <url> <vidéo> <video.json>   (appelé par tests/test_atelier.py)
// Chaque vérification regarde ce qui est écrit dans video.json, pas seulement ce qui s'affiche.
const { chromium } = require('playwright');
const fs = require('fs');
const [url, nom, fichier] = process.argv.slice(2);
const film = () => JSON.parse(fs.readFileSync(fichier, 'utf8'));
const soucis = [];
function verifie(vrai, quoi) { console.log(vrai ? 'ok ' : 'NON', quoi); if (!vrai) soucis.push(quoi); }
// attend que le fichier dise vrai (l'enregistrement est automatique, un instant après le geste)
async function ecrit(test, quoi) {
  for (let i = 0; i < 50; i++) { try { if (test(film())) return verifie(true, quoi); } catch { /* le fichier s'écrit */ } await new Promise(r => setTimeout(r, 120)); }
  verifie(false, quoi);
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/409/.test(m.text())) erreurs.push(m.text()); });
  await p.goto(url + '/');
  await p.waitForSelector('a.arche');
  await p.goto(`${url}/#/${nom}`);
  await p.waitForSelector('.morceau');
  await p.waitForFunction(() => document.querySelector('iframe').contentWindow.FILM?.film()?.plans.length);
  await p.waitForTimeout(800);

  // prendre un personnage à la souris et le déplacer, puis annuler
  const i = film().plans.findIndex(q => q.acteurs?.length === 1 && !q.fin);
  await p.locator('.numero').nth(i).click();
  await p.waitForTimeout(500);
  const place = await p.evaluate(() => { const F = document.querySelector('iframe').contentWindow.FILM, t = Number(document.querySelector('.frise').getAttribute('aria-valuenow')), e = F.elements(t).find(x => x.genre === 'acteur'), c = document.querySelector('.calque').getBoundingClientRect(), k = c.width / 1080, y = Math.max(e.boite[1], 100); return [c.left + (e.boite[0] + e.boite[2]) / 2 * k, c.top + (y + 130) * k, k]; });
  const avant = film().plans[i].acteurs[0].x;
  await p.mouse.move(place[0], place[1]);
  await p.mouse.down();
  await p.mouse.move(place[0] + 50, place[1], { steps: 6 });
  await p.mouse.up();
  await ecrit(f => f.plans[i].acteurs[0].x > avant + 5, 'un personnage se déplace à la souris');
  await p.keyboard.press('Control+z');
  await ecrit(f => f.plans[i].acteurs[0].x === avant, "et le déplacement s'annule");

  // choisir un geste sur dessin
  await p.mouse.click(place[0], place[1]);
  await p.locator('.choix-image').first().click();
  await p.locator('.case', { hasText: 'Mains levées' }).click();
  await ecrit(f => f.plans[i].acteurs[0].actions[0].pose === 'mains_levees', 'un geste se choisit sur dessin');

  // écrire : modifier un texte, ajouter un plan entre deux
  await p.keyboard.press('Escape');
  await p.locator('.paragraphe').nth(1).locator('.mini').click({ force: true });
  await p.locator('.saisie').fill('Une phrase *toute* neuve.');
  await p.keyboard.press('Enter');
  await ecrit(f => f.plans[1].texte === 'Une phrase *toute* neuve.', 'un texte se modifie');
  const n = film().plans.length;
  await p.locator('.entre').nth(2).click({ force: true });
  await p.locator('.saisie').fill('Un plan de plus.');
  await p.keyboard.press('Enter');
  await ecrit(f => f.plans.length === n + 1 && f.plans[2].texte === 'Un plan de plus.', "un plan s'ajoute");

  // écrire longtemps : ni l'enregistrement, ni le vérificateur, ni Claude ne referment ce qui s'écrit, ni n'écrasent un autre plan
  await p.locator('.paragraphe').nth(0).locator('.mini').click({ force: true });
  await p.locator('.saisie').fill('Une phrase longue');
  const ailleurs = film(); ailleurs.plans.unshift({ texte: 'Le plan de Claude.', registre: 'recit' });
  fs.writeFileSync(fichier, JSON.stringify(ailleurs));
  await p.waitForTimeout(4000);
  await p.locator('.saisie').pressSequentially(', toujours ouverte.');
  verifie(await p.locator('.saisie').inputValue() === 'Une phrase longue, toujours ouverte.', "une phrase qui s'écrit reste ouverte");
  await p.keyboard.press('Escape');
  await p.waitForFunction(n => document.querySelectorAll('.paragraphe').length === n, ailleurs.plans.length, { timeout: 8000 }).catch(() => {});
  verifie(film().plans[0].texte === 'Le plan de Claude.' && await p.locator('.paragraphe').count() === ailleurs.plans.length, "et rien n'est écrasé");
  await p.waitForTimeout(600);

  // écrire dans un champ puis appuyer aussitôt sur un bouton : le champ est gardé ET le bouton répond
  await p.locator('.paragraphe').nth(0).locator('.numero').click();
  await p.locator('.inspecteur textarea').first().fill('Écrit dans la colonne de droite.');
  await p.locator('.inspecteur .entete .bouton[title="Descendre ce plan"]').click();
  await ecrit(f => f.plans[1].texte === 'Écrit dans la colonne de droite.', 'un champ quitté sur un bouton : les deux comptent');

  // un objet dans un lieu, à sa taille réelle
  await p.locator('#o-lieux').click();
  await p.locator('#p-lieux .fiche').first().click();
  await p.waitForTimeout(300);
  await p.locator('.inspecteur .ajout', { hasText: 'Ajouter' }).first().click();
  await p.locator('.case', { hasText: 'Commode' }).click();
  await ecrit(f => Object.values(f.lieux).some(l => (l.objets || []).some(o => o.type === 'commode' && o.h === 237)), 'un meuble se pose dans un lieu');

  // la Bible
  await p.locator('#o-bible').click();
  await p.locator('.bible input').fill('Luc 15:20');
  await p.waitForSelector('.verset');
  verifie((await p.locator('.verset').first().textContent()).includes('Luc 15:20'), 'la Bible se cherche');

  // lire
  await p.keyboard.press('Escape');
  await p.locator('#o-texte').click();
  const t0 = await p.locator('.temps').textContent();
  await p.locator('.transport .rond').click();
  await p.waitForTimeout(1300);
  await p.locator('.transport .rond').click();
  verifie(await p.locator('.temps').textContent() !== t0, 'la vidéo se joue');

  // Claude modifie le fichier : la page suit ; deux écritures à la fois : on choisit, rien n'est écrasé
  const f2 = film(); f2.titre = 'Écrit par Claude';
  fs.writeFileSync(fichier, JSON.stringify(f2));
  await p.waitForFunction(() => document.querySelector('.titre-film').value === 'Écrit par Claude', null, { timeout: 8000 }).then(() => verifie(true, "ce qu'écrit Claude arrive tout seul"), () => verifie(false, "ce qu'écrit Claude arrive tout seul"));
  await p.locator('.titre-film').fill('Écrit par moi');
  const f3 = film(); f3.passage = 'Luc 15:20';
  fs.writeFileSync(fichier, JSON.stringify(f3));
  await p.keyboard.press('Enter');
  await p.evaluate(() => document.activeElement.blur());
  await p.waitForSelector('dialog[open]', { timeout: 8000 });
  verifie(film().passage === 'Luc 15:20', "un conflit n'écrase rien");
  await p.locator('dialog .bouton', { hasText: 'Garder la mienne' }).click();
  await ecrit(f => f.titre === 'Écrit par moi', 'et la version choisie est gardée');

  // une commande, ses alertes rangées à leur plan
  await p.locator('.etape', { hasText: 'Contrôler' }).click();
  const rangee = p.locator('.paragraphe').nth(1).locator('.points', { hasText: 'corps coupé' });
  verifie(await rangee.waitFor({ timeout: 8000 }).then(() => true, () => false), "une alerte d'image se range sous son plan");

  verifie(!erreurs.length, 'aucune erreur dans la page' + (erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''));
  await b.close();
  process.exit(soucis.length ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(1); });
