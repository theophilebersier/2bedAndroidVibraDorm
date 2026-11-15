# Publication GitHub et GitHub Pages

Le code est destiné au dépôt public [theophilebersier/2bedAndroidVibraDorm](https://github.com/theophilebersier/2bedAndroidVibraDorm), indiqué par le propriétaire. Le déploiement Pages est une opération distincte de la publication des sources.

## Choisir le dépôt

Dépôt choisi : `theophilebersier/2bedAndroidVibraDorm`, public. La licence du code original reste à définir ; le projet porte clairement la mention « version de test, matériel non validé ».

Le dépôt peut contenir les sources, les tests, `package-lock.json`, les documents, les captures et les workflows. Ne pas publier `node_modules/`, `dist/`, les rapports Playwright, les diagnostics privés ou les fichiers `.env` : ils sont ignorés par `.gitignore`.

## Envoyer les fichiers

Créer un dépôt vide sur GitHub, sans README généré. Depuis le dossier du projet, initialiser Git uniquement s’il ne l’est pas encore :

```sh
git init -b main
git add .
git commit -m "Build initial Dual Bed Sync test application"
git remote add origin https://github.com/theophilebersier/2bedAndroidVibraDorm.git
git push -u origin main
```

Utiliser la connexion GitHub habituelle ; ne pas coller de jeton dans une URL ou un fichier du projet. Si un dépôt local est déjà initialisé, vérifier ses remotes et sa branche avant ces commandes.

Le workflow `Checks` exécute l’installation reproductible, le contrôle TypeScript, les tests unitaires, la construction et les tests navigateur. Sa [première exécution distante](https://github.com/theophilebersier/2bedAndroidVibraDorm/actions/runs/43698380292) a réussi sur Ubuntu avec Node.js 24.

## Héberger la PWA

Dans les paramètres du dépôt, choisir **Pages → Source → GitHub Actions**. La disponibilité de Pages pour un dépôt privé dépend de l’offre GitHub ; vérifier les [conditions GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Le workflow **Deploy Pages** reconstruit et teste la version, puis publie `dist/`. Il se lance automatiquement lorsque le code de l’application ou sa configuration de construction change sur `main`. Les modifications de documentation seules ne redéploient pas l’application. Il peut aussi être lancé manuellement depuis **Actions → Deploy Pages → Run workflow** sur `main`. L’URL est retournée par GitHub dans le résultat du déploiement.

La base Vite et les ressources PWA sont relatives (`./`) pour fonctionner sous le chemin du dépôt. Le service worker limite son cache à son propre scope. Il n’utilise aucune API serveur ou commande Bluetooth à distance. Le navigateur du téléphone établit les connexions directement avec les sommiers.

Après déploiement, ouvrir l’URL HTTPS dans Chrome sur Android. L’installation sur l’écran d’accueil est proposée si le navigateur la permet. Commencer par la simulation, puis suivre [les essais matériels](TESTS_MATERIEL.md).

Une archive distincte de `dist/` peut servir à un hébergement statique HTTPS différent de GitHub Pages. Un simple fichier ZIP ou une ouverture en `file://` ne fournit pas l’origine HTTPS nécessaire au Bluetooth.

## Versions suivantes

Documenter les modifications et résultats matériels avant une nouvelle version. Le service worker attend la fermeture des anciennes pages pour activer une mise à jour : fermer toutes les fenêtres de la PWA et la rouvrir, puis vérifier la version affichée avant un essai.
