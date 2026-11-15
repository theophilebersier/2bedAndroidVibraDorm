# Dual Bed Sync pour Android — version 0.3.1

**[Télécharger l’APK signé](https://github.com/theophilebersier/2bedAndroidVibraDorm/raw/refs/heads/apk/DualBedSync.apk)** · Android 7 ou plus récent.

## Installer et retrouver les lits

1. Sur le téléphone, télécharger le fichier APK et l’ouvrir pour installer **Dual Bed Sync**. Android peut demander d’autoriser l’installation depuis le navigateur utilisé.
2. Ouvrir cette nouvelle application. L’en-tête indique **ANDROID · v0.3.1**. Le raccourci web déjà installé est une autre application et peut être retiré de l’écran d’accueil.
3. Autoriser **Appareils à proximité**, activer le Bluetooth, puis choisir une fois le sommier gauche et le droit dans la configuration. Sur Android 7 à 11, le système demande aussi l’autorisation de localisation nécessaire au scan BLE ; aucune position n’est calculée ni transmise.
4. Fermer puis rouvrir l’application près des lits. Elle tente de reconnecter les adresses mémorisées, sans nouvelle sélection et sans reprendre de mouvement. Vérifier ce fonctionnement sur le téléphone et les récepteurs réels.

« Déconnecter » conserve le choix mais désactive sa reconnexion automatique. « Reconnecter » réutilise ce choix dans l’APK ; « Changer d’appareil » ouvre la sélection. Une désinstallation ou un effacement des données supprime les choix.

Le bouton « Tout monter » agit tant qu’il est maintenu, sur les lits sélectionnés. Le relâchement demande STOP. Le passage en arrière-plan et le bouton Retour Android terminent le maintien. Aucun service de commande moteur en arrière-plan n’est lancé.

Le diagnostic peut être enregistré ou partagé via la feuille Android. Il exclut les noms et identifiants des lits. Rien n’est partagé avant cette action explicite.

## Afficher ou masquer l’éclairage

L’éclairage est masqué par défaut. Ouvrir la roue dentée, puis cocher **Afficher les commandes d’éclairage** dans **Affichage** pour le retrouver. Décocher pour le masquer. Ce choix est conservé dans Android et ne lance aucune commande Bluetooth.

Pour mettre à jour, installer l’APK par-dessus l’application existante, sans la désinstaller : les associations des sommiers et les réglages sont conservés.

## Pourquoi l’APK

L’installation depuis une page web crée une PWA, qui conserve les restrictions Bluetooth du navigateur. La récupération des appareils autorisés et leurs permissions persistantes sont encore indiquées comme expérimentales dans l’[état d’implémentation Web Bluetooth](https://github.com/whatwg/bluetooth/blob/main/implementation-status.md). La version 0.2.0 dépendait de ces fonctions : sa mémorisation locale ne pouvait pas supprimer le sélecteur quand Chrome ne restituait pas les appareils.

L’APK utilise [Capacitor](https://capacitorjs.com/docs/android) et le [pilote BLE natif](https://github.com/capacitor-community/bluetooth-le), qui permet la connexion Android par identifiant déjà enregistré. Les attributions sont écrites et relues via les [préférences Android](https://capacitorjs.com/docs/apis/preferences) avant l’initialisation de la télécommande. La sauvegarde Android vers un autre téléphone est désactivée pour ces données.

## Construire

Prérequis : Node.js 24+, JDK 21, Android SDK plateforme 36, Build Tools 35.0.0 et licences SDK acceptées.

```sh
npm ci
npm run check
npm run test:e2e
npm run android:sync
cd android
./gradlew assembleRelease :app:lintRelease
```

Sous Windows, employer `npm.cmd`, `npx.cmd` et `gradlew.bat` si nécessaire. `JAVA_HOME` doit pointer vers JDK 21 et `ANDROID_HOME` vers le SDK. Le wrapper Gradle est fixé à 8.14.3 avec sa somme SHA-256. Les sources de l’interface sont embarquées dans l’APK ; aucun service worker ni serveur distant n’est utilisé par l’application Android.

La construction produit `android/app/build/outputs/apk/release/app-release-unsigned.apk`. Le workflow [Android APK](../.github/workflows/android.yml) construit et vérifie aussi cet APK non signé. Cet artefact doit être signé avant installation.

Sur Windows, `scripts/sign-android.ps1` aligne, signe et vérifie l’APK. Il reçoit les chemins de la clé privée, du fichier contenant son mot de passe, des Build Tools et de l’APK de sortie. L’alias de signature est `dual-bed-sync`. Conserver la clé et son mot de passe hors Git et les sauvegarder pour pouvoir installer les futures mises à jour sans perdre les associations.

La branche `apk` contient uniquement la distribution signée, sa somme SHA-256 et les instructions d’installation. Les clés privées n’y figurent jamais.

## Validation

Les tests automatisés couvrent le pilote natif, le stockage durable, le routage Capacitor, la réouverture sans sélecteur, les événements de pause/reprise, STOP, le respect d’une déconnexion volontaire et la confidentialité du diagnostic. Ils utilisent des appels BLE simulés. La compilation et la signature ne remplacent pas un essai avec le Bluetooth du téléphone et les deux lits. Voir [VERIFICATION.md](VERIFICATION.md).
