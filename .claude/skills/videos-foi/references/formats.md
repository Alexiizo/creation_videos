# Les formats

**Décision d'Alexis (23/11/2026, 2e version) : on RACONTE et on EXPLIQUE — pas d'histoires à choix.** Le concept :
des vidéos captivantes pour parler de Jésus, de sa Parole et de comment l'appliquer dans la réalité d'aujourd'hui,
de façon HYPER accessible, pour toucher aussi ceux qui ne le connaissent pas ou qui se sont éloignés.

## 1. `recit` — le format principal (60–100 s) : raconter, expliquer, appliquer
| Temps | Registre (`"registre"`) | Ce qu'on entend / ce qu'on voit |
|---|---|---|
| 0–6 s | `aujourdhui` — **l'accroche** | Une situation que le spectateur vit VRAIMENT (2 h du matin, le téléphone, l'angoisse ; la honte après une erreur ; le deuil ; la solitude au milieu des autres ; le sentiment de ne servir à rien). Phrase courte, image qui bouge, un personnage d'aujourd'hui qui lui ressemble. `accroche.md` |
| 6–45 s | `recit` — **le récit** | La Bible racontée comme un film : « Il y a deux mille ans, … ». Les faits du texte, montrés plan par plan, les paroles EXACTES (Segond 1910, `cite`), une carte `verset` sur LA phrase. Contexte historique vérifié, dit en une phrase simple. |
| 45–70 s | `explication` — **ce que ça veut dire** | Simplement, sans jargon : pourquoi ce moment compte, ce qu'il révèle de Jésus (il vient au milieu de la tempête ; il tend la main avant le reproche ; il pardonne avant qu'on change). Une idée, pas trois. Images : retour au récit, gros plans, mot-clé à l'écran, étiquettes. |
| 70–90 s | `aujourdhui` — **ce que ça change pour toi** | Retour au personnage du début : la même situation, éclairée par ce qu'on vient de voir. Concret (« ce soir », « demain au lycée », « quand la peur revient »). Le verset `pont` en carte. |
| 90–100 s | `invitation` — **la porte ouverte** | Une seule chose simple à faire maintenant : une prière tirée du texte, écrire “prie pour moi” en commentaire, lire le passage. Puis l'écran de fin (titre + passage). `mission.md` |

Règles :
- **Le fil rouge = la situation du début** : posée dans la 1re phrase, éclairée par le récit, reprise à la fin. Le
  spectateur doit sentir que la vidéo parle de LUI.
- **Hyper accessible** : un ado qui n'a jamais ouvert une Bible comprend tout. Aucun mot d'Église sans son
  explication en 3 mots (« la grâce : un cadeau qu'on ne mérite pas »). Phrases courtes, présent, « tu ».
- **Fidèle** (`bible.md`) : `"passage"` à la racine ; chaque plan `recit` / `explication` a son `"appui"` ; chaque
  « … » vérifié mot pour mot ; on raconte ce que dit le texte, on n'invente rien.
- **Une phrase = une image** (2,5–4 s) ; les paroles de Jésus ont de l'air (`"pause"`), souvent en carte `verset`.
- **Pas de choix, pas de jeu, pas de « tu as perdu »** : on raconte et on explique.
- **La lumière** : le récit peut être nocturne si le texte l'exige ; la fin est toujours lumineuse.
- Les lieux et les personnages sont INVENTÉS pour chaque vidéo à partir du script (`moteur-film.md`) — aucune
  banque, aucun décor réutilisé par défaut.
- Démo vérifiée, complète (≈ 100 s) et 100 % générée : `assets/exemple-film/film.json` (« Trop loin pour revenir ? »,
  le fils prodigue : Théo à 2 h du matin → la parabole → le père qui court → « je me lèverai » → « Père, je reviens »).

## 2. Formats de réserve (sur demande d'Alexis)
| `type_video` | Durée | Recette |
|---|---|---|
| `question` | 45–90 s | Une vraie question que les gens posent (« Si Dieu existe, pourquoi la souffrance ? », « Dieu peut-il me pardonner ça ? ») : on la pose franchement, on reconnaît ce qu'elle a de dur, on répond avec 1–3 passages montrés en images, sans gagner un débat. `pont` obligatoire. |
| `promesse` | 20–40 s | UN verset pour un moment précis (l'angoisse du soir, le deuil, l'examen, la solitude) : la situation en 2 phrases, le verset en carte, une image de lumière, une phrase de prière. |
| `temoignage` | 45–100 s | Une histoire VRAIE (Alexis, ou quelqu'un qui a donné son accord : `"temoignage": {"source": "…", "accord": true}`), racontée en images, avec le verset qui a compté. |
| `evangile` | 50–80 s | L'Évangile en entier, simplement : Dieu crée et aime → l'homme se détourne → Jésus vient, meurt, ressuscite → le cadeau qu'on reçoit par la foi → une prière. `pont` obligatoire. |

## 3. Trouver le sujet (sans banque) — et VARIER vraiment (retour d'Alexis du 25/11)
Partir des **vraies situations** des gens (commentaires reçus, questions entendues, ce qu'Alexis vit et voit
autour de lui), puis chercher dans la Bible ce qui y répond : `python3 scripts/bible.py --chercher "<mots>"`, puis
lire le passage en entier. Ne jamais refaire la situation ni le passage des 3 dernières vidéos du journal.

**Varier le dosage de Bible** — pas toujours « une histoire de la Bible racontée » : alterner trois dosages, et ne
jamais en faire trois du même de suite (le journal le dit) :
| Dosage | Ce qu'on voit surtout | La Bible | Exemples de sujets |
|---|---|---|---|
| **récit** (≈ 1 sur 3) | une histoire de la Bible racontée comme un film | 50–60 % du temps | la tempête, Pierre, Lazare |
| **vie** (≈ 1 sur 3) | UNE personne d'aujourd'hui et ce qu'elle traverse, racontée de près (sa journée, ses pensées, ce qu'elle n'ose dire à personne) ; la Bible arrive comme une réponse, pas comme un cours | un verset ou une parole de Jésus, 15–25 % | la comparaison sur Instagram, le parent qui crie, se sentir de trop au repas de famille, le burn-out, la rupture, le premier mensonge qui en entraîne d'autres, être le seul croyant de sa classe |
| **question** (≈ 1 sur 3) | une vraie question qu'on se pose, posée franchement, avec ses objections | 2–3 versets qui éclairent, 25–35 % | « Si Dieu existe, pourquoi le mal ? », « Est-ce que prier sert à quelque chose ? », « Dieu peut-il encore m'aimer après ça ? », « Pourquoi Jésus et pas une autre religion ? » |
Le format reste `recit` (accroche → cœur → ce que ça change → porte) ; c'est la part de chaque registre qui change :
en **vie**, l'aujourd'hui EST le cœur de la vidéo (plusieurs plans, un personnage qu'on suit, des détails vrais qui
font dire « c'est moi ») ; en **question**, le cœur est l'explication honnête (sans esquiver la difficulté).
Toujours : fidèle (chaque verset vérifié mot pour mot), Jésus au centre de la réponse, une porte simple à la fin.

Proposer 2–3 idées à Alexis, **de dosages différents** : la situation d'aujourd'hui, le dosage, le passage, la
phrase qui fait basculer, la 1re phrase de la vidéo. Le dosage s'écrit dans `video.json` (`"dosage": "recit"|"vie"
|"question"`) et dans la ligne de journal.

## Sources de l'analyse du 23/11
- Premier Christianity, « Millions are watching these bizarre AI Bible videos on TikTok » :
  https://www.premierchristianity.com/opinion/millions-are-watching-these-bizarre-ai-bible-videos-on-tiktok-should-you-be-worried-or-encouraged/19850.article
- Crosswalk, « Christians split over viral AI videos that put Bible characters on TikTok » :
  https://www.crosswalk.com/headlines/contributors/michael-foust/christians-split-over-viral-ai-videos-that-put-bible-characters-on-tiktok.html
- NPR (via WBHM), « Fantasy or faith? One company's AI-generated Bible content stirs controversy » :
  https://wbhm.org/npr-story/fantasy-or-faith-one-companys-ai-generated-bible-content-stirs-controversy/
- EWTN News, record de 10 384 baptêmes d'adultes en France en 2025 (+45 %) :
  https://www.ewtnnews.com/world/europe/france-sees-record-10384-adult-baptisms-in-2025-45-percent-increase-as-young-catholics-lead-revival
- EWTN News, les réseaux sociaux dans le cheminement des catéchumènes (78 %) :
  https://www.ewtnnews.com/world/europe/social-media-and-personal-research-driving-frances-record-baptism-boom-survey-reveals
- Texte biblique : Louis Segond 1910, domaine public (BibleCorps) : https://github.com/BibleCorps/fra-b-lsg1910-pd-ubs
