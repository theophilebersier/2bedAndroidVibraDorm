# Dual Bed Sync

Télécommande Android et web pour deux sommiers Vibradorm V-MAT Basic CBI : commande indépendante ou combinée et éclairage sous le lit.

**Version 0.4.0. Le fonctionnement de la version Android 0.3.0 a été confirmé par son utilisateur sur ses lits. Les tests automatisés utilisent des transports simulés.**

Dépôt : [theophilebersier/2bedAndroidVibraDorm](https://github.com/theophilebersier/2bedAndroidVibraDorm).

**[Installer l’APK Android signé](https://github.com/theophilebersier/2bedAndroidVibraDorm/raw/refs/heads/apk/DualBedSync.apk)** — version avec Bluetooth natif et attributions conservées dans Android. Voir les [instructions d’installation et de compilation](docs/ANDROID.md).

**[Ouvrir la version web](https://theophilebersier.github.io/2bedAndroidVibraDorm/)** — Chrome sur Android. Le raccourci installé depuis cette page conserve les restrictions Bluetooth du navigateur ; la reconnexion après fermeture complète y dépend de fonctions expérimentales.

![Interface ordinateur, en simulation](docs/preview-desktop.png)

## Fonctions

- Sélection du lit gauche, droit ou des deux.
- Dossier et jambes : monter/descendre tant que le bouton est maintenu.
- « Tout monter » et « Tout descendre » : les deux zones par maintien, sans estimation de position.
- APK Android : attribution gauche/droite durable et reconnexion par adresse enregistrée au démarrage et au retour au premier plan, sans sélection répétée.
- Version web : attribution locale ; reconnexion après fermeture uniquement si le navigateur restitue ses appareils autorisés.
- STOP au relâchement, annulation tactile, perte de focus ou masquage de la page.
- Commande combinée bloquée tant que les deux sessions ne sont pas prêtes.
- Maintien limité à dix secondes ; relâcher puis maintenir de nouveau pour continuer.
- Éclairage CBI masqué par défaut, réactivable dans la configuration → Affichage → « Afficher les commandes d’éclairage ». Choix conservé après fermeture ; intensité et minuterie précédentes préservées.
- Thème clair, sombre (mode nuit) ou automatique selon le téléphone.
- Noms personnalisés des côtés (32 caractères), conservés localement sans renommer les récepteurs Bluetooth.
- Sélection gauche/droite/les deux au démarrage, sans mouvement automatique.
- Interface simplifiée avec grands boutons et illustration masquée, tous les mouvements et STOP conservés.
- Retour tactile désactivable : vibration au début et à la fin d’une commande moteur, native sur Android et selon la prise en charge du navigateur sur le web.
- Simulation explicite, y compris déconnexion d’un côté, sans appel Bluetooth.
- Interface française responsive, contrôle au clavier et mode PWA avec cache de l’interface.
- Diagnostic JSON sans noms ni identifiants d’appareils.

## Démarrer

Prérequis : Node.js 24 ou 26, ou Node 22 à partir de 22.12, et npm.

```sh
npm ci
npm run dev
```

Ouvrir l’URL locale affichée par Vite. Sous PowerShell, employer `npm.cmd` si l’exécution de `npm.ps1` est bloquée.

Le bouton « Essayer sans connecter de lit » permet de parcourir l’application immédiatement. Le mode réel reste le mode initial. Au chargement, seuls les sommiers déjà mémorisés et autorisés peuvent être reconnectés ; aucune commande de mouvement n’est lancée.

Pour construire et prévisualiser la version installable :

```sh
npm run build
npm run preview
```

Servir `dist/` par HTTP local ou HTTPS. Ouvrir directement le fichier `index.html` ne convient pas aux modules et à Web Bluetooth.

## Utiliser les sommiers

1. Sur le téléphone, ouvrir l’application en HTTPS dans Chrome sur Android. Vérifier la présence de Web Bluetooth sur tout autre navigateur.
2. Ouvrir la configuration, conserver « Bluetooth réel », puis choisir le sommier gauche et le droit séparément. Les côtés sont définis en regardant le lit depuis son pied.
3. Confirmer le profil et le comportement de chaque sommier selon la [procédure matérielle](docs/TESTS_MATERIEL.md), avant les essais combinés.
4. Maintenir un bouton de direction. Relâcher pour envoyer STOP. Garder l’application au premier plan et la télécommande d’origine accessible pendant les essais.

La configuration vérifie les services et les propriétés GATT attendus. Un nom Bluetooth ou un modèle lu ne prouve pas à lui seul la compatibilité. La sélection propose les appareils à proximité ; choisir uniquement les récepteurs V-MAT Basic CBI prévus.

Dans l’APK, l’attribution gauche/droite est conservée dans les préférences Android après une connexion réussie. Au démarrage et au retour au premier plan, le pilote natif se reconnecte directement aux adresses enregistrées, sans liste à sélectionner. Dans la version web, cette récupération utilise `navigator.bluetooth.getDevices` et dépend de sa disponibilité et des autorisations conservées par le navigateur. Aucun rapprochement par nom ni sélecteur automatique n’est utilisé. Les échecs radio donnent lieu à deux nouvelles tentatives espacées ; un nouveau retour au premier plan permet de réessayer. Aucun mouvement ne reprend automatiquement.

« Déconnecter » désactive la reconnexion automatique du côté concerné, y compris après rechargement. « Reconnecter » la réactive après une connexion réussie. Si le navigateur ne fournit pas `getDevices`, si les permissions ont été retirées ou si les données locales ont été effacées, il faut renouveler la sélection manuellement. Le mode simulation n’effectue aucune reconnexion réelle. Les tentatives sont suspendues en arrière-plan et pendant une commande.

Lors de la première ouverture de l’APK, choisir les deux appareils : l’application Android et le raccourci web ont des stockages séparés. Les ouvertures suivantes de l’APK réutilisent ces choix. Une désinstallation ou un effacement des données de l’application les supprime.

## Vérifier

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Les tests navigateur lancent un serveur de prévisualisation de `dist/` : construire d’abord avec `npm run build`. Pour utiliser Chrome déjà installé sous PowerShell :

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
```

Les projets Playwright couvrent un affichage ordinateur et un téléphone Android émulé. Les interactions GATT sont simulées ; ces résultats ne constituent pas une validation du Bluetooth du téléphone ou des sommiers. Voir le [rapport de vérification](docs/VERIFICATION.md).

## Architecture

`src/protocol` construit les trames ; `src/transport` fournit les pilotes Android, Web Bluetooth et simulation ; `src/control` orchestre les états, les arrêts et la reconnexion ; `src/ui` fournit les visuels ; `src/storage` conserve les réglages et les attributions (SharedPreferences dans l’APK, localStorage sur le web). `src/bootstrap.ts` attend la lecture des préférences avant de charger l’interface. `android/` contient le projet natif Capacitor. Aucun compte, aucune télémétrie ni serveur applicatif.

Le service worker ne conserve que l’interface et les ressources statiques. Il n’enregistre aucune action Bluetooth, ne reprend aucun mouvement et ne force pas la mise à jour d’une page ouverte. Fermer toutes les fenêtres de l’application puis la rouvrir pour appliquer une mise à jour disponible.

## Limites connues

- Le protocole amont est lui aussi déclaré non vérifié sur matériel pour ce profil.
- Les écritures des deux côtés ne sont pas atomiques. Aucun capteur de position ou alignement mécanique n’est fourni.
- Une liaison perdue ou une page suspendue empêche de garantir la réception de STOP. Le minuteur logiciel ne constitue pas un arrêt matériel.
- Les connexions et reconnexions en arrière-plan ne sont pas prises en charge.
- Les profils Basic sans CBI, XT-Box, les mémoires et le massage ne sont pas implémentés.
- Les caractéristiques électriques de la sortie lumière mentionnées dans le document initial n’ont pas été vérifiées ; aucune intervention de câblage n’a été réalisée.

## Documents

- [Protocole, révision de référence et trames](docs/PROTOCOLE_BLE.md)
- [APK Android : installation, pilote natif et construction](docs/ANDROID.md)
- [Essais sur les lits et feuille de résultats](docs/TESTS_MATERIEL.md)
- [Publication sur GitHub et GitHub Pages](docs/PUBLICATION_GITHUB.md)
- [Rapport des vérifications](docs/VERIFICATION.md)
- [Plan de réalisation](docs/PLAN_PROJET.md)
- [Cahier des charges original, conservé sans modification](docs/CAHIER_DES_CHARGES_ORIGINAL.md)
- [Crédits et licence de la référence amont](THIRD_PARTY_NOTICES.md)

Le choix de licence du code original de ce projet reste à définir avant sa distribution publique. Les dépendances et la référence amont conservent leurs propres licences. Application indépendante, sans affiliation avec Vibradorm ou Tempur.
