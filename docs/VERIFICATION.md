# Vérifications — version 0.2.0

Réalisées le 15 novembre 2026 sur Windows, avec Node.js 26.13.0 et Chrome installé sur le poste. Les tests du projet fixent les versions des outils dans `package-lock.json`.

## Résultats logiciels

| Vérification | Résultat |
| --- | --- |
| TypeScript strict, sans émission | Réussi |
| Tests unitaires Vitest | 50 réussis, 6 fichiers |
| Tests navigateur Playwright | 30 réussis : 15 ordinateur et 15 mobile émulé |
| Construction Vite de production | Réussie |
| Génération du cache PWA | Réussie, ressources du build figées |
| Ressources servies à la racine | HTTP 200 vérifié lors des captures |
| Chemin de dépôt `/2bedAndroidVibraDorm/` | Vérifié par les tests navigateur, y compris hors ligne |
| Captures ordinateur / mobile | Version 0.2.0 examinée, bouton « Tout monter » visible ; images du README issues de la version 0.1.0 |
| Débordement horizontal | Aucun dans les captures et la vérification à 320 px |
| Installation depuis une archive propre | `npm ci` et construction réussis à partir du fichier de verrouillage |
| Document original dans l’archive Git | Octets identiques à la source fournie |
| GitHub Actions, Ubuntu et Node.js 24 | Validation précédente réussie en 0.1.0 ; chaque publication relance les contrôles |
| Publication GitHub Pages | Déploiement précédent 0.1.0 réussi, réponse HTTPS 200 |

Les sources sont publiées dans [theophilebersier/2bedAndroidVibraDorm](https://github.com/theophilebersier/2bedAndroidVibraDorm). Les exécutions actuelles sont visibles dans [GitHub Actions](https://github.com/theophilebersier/2bedAndroidVibraDorm/actions). L’exécution distante précédente [Checks du commit c79656f](https://github.com/theophilebersier/2bedAndroidVibraDorm/actions/runs/43698380292) s’est terminée avec succès : `npm ci`, `npm run check`, installation de Chromium et `npm run test:e2e`.

Le [déploiement Pages du commit 0ecd9c2](https://github.com/theophilebersier/2bedAndroidVibraDorm/actions/runs/43699424674) a réussi le 15 novembre 2026, après activation de Pages et ajout de l’étape officielle de configuration. L’URL publiée est [https://theophilebersier.github.io/2bedAndroidVibraDorm/](https://theophilebersier.github.io/2bedAndroidVibraDorm/). Une vérification dans Chrome a confirmé la réponse HTTP 200, le contexte sécurisé, la simulation avec éclairage et un rechargement hors ligne sans reprise de connexion. Le service worker utilise le scope du dépôt et aucune erreur JavaScript n’a été relevée dans ce parcours.

## Comportements couverts

Les tests unitaires vérifient les trames et les bornes, les lectures incomplètes, la priorité de STOP, l’annulation d’une répétition, un relâchement pendant une écriture, le refus d’un mouvement combiné incomplet, une erreur de commande, une perte de connexion, la limite de maintien et la reprise sans mouvement. Ils vérifient aussi les dépassements de délai, une connexion terminant tardivement et le refus de transports mélangés ou de commandes inconnues.

Les tests Chrome parcourent l’application construite : état initial déconnecté, simulation sans appel Bluetooth, éclairage, connexion aux deux faux récepteurs, maintien/relâchement, perte d’un récepteur, reconnexion, perte de focus clavier et masquage de page. Ils contrôlent le rechargement hors ligne sans reprise de session et le téléchargement d’un diagnostic sans identité d’appareil. Aucun événement JavaScript non géré n’a été observé dans ces scénarios.

La version 0.2.0 ajoute les vérifications suivantes : restauration des identifiants exacts gauche/droite après rechargement sans sélecteur ni écriture moteur ; reconnexion au retour d’une autre application sans reprise du maintien ; déconnexion volontaire conservée au rechargement et réactivation manuelle ; repli manuel en l’absence de `getDevices` ; nouvelle tentative après un échec radio ; absence de reconnexion réelle en simulation ; commande « Tout monter » (`10`) sur les seules cibles sélectionnées et STOP au relâchement.

Les nouveaux tests unitaires couvrent aussi les données locales invalides, les identifiants dupliqués, les permissions indisponibles, le stockage refusé, les tentatives limitées, l’attente de la fin des commandes et l’invalidation d’une connexion achevée après masquage. Une ancienne tentative Bluetooth terminant tardivement ne peut plus refermer une connexion plus récente.

Deux défauts trouvés pendant les essais ont été corrigés et couverts : l’ancien propriétaire d’une connexion ne referme plus la connexion qui vient d’être rétablie ; le cache statique reste utilisable lorsque le serveur varie ses réponses selon l’en-tête Origin.

Le serveur de test est géré directement par l’API Vite pour assurer sa fermeture sur Windows. Les tests utilisent le chemin d’un dépôt GitHub Pages, tandis que le script de capture vérifie également un hébergement à la racine.

La vérification dans une copie propre a révélé des références manquantes à des dépendances facultatives d’autres plateformes. Le fichier de verrouillage a été complété, puis l’installation standard `npm ci` et la construction ont été vérifiées dans cette copie, avec le cache npm préchargé. Le téléchargement réseau par npm n’a pas été testé ici : le client HTTPS de l’environnement a servi à précharger le cache. Aucun chemin local de dépendance n’est enregistré dans le verrouillage.

## Ce que ces résultats ne valident pas

- Aucune connexion Bluetooth réelle aux sommiers n’a été effectuée.
- L’Android du téléphone et ses deux connexions BLE simultanées ne sont pas testés par l’émulation d’écran.
- La réception physique de STOP, les limites mécaniques et le comportement à la perte de liaison sont inconnus.
- L’alignement des sommiers et les caractéristiques électriques de l’éclairage ne sont pas mesurés.
- L’installation réelle de la PWA sur Android reste à vérifier.

Le suivi des essais physiques figure dans [TESTS_MATERIEL.md](TESTS_MATERIEL.md). Conserver la qualification « version de test » jusqu’à leur réalisation.
