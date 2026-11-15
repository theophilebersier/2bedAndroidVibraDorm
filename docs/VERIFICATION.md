# Vérifications — version 0.4.0 Android et web

Réalisées le 15 novembre 2026 sur Windows : Node.js 26.13.0, Chrome installé, JDK 21.0.13, Gradle 8.14.3 et Android SDK 36.

| Vérification | Résultat |
| --- | --- |
| TypeScript strict, interface et configuration Capacitor | Réussi |
| Tests unitaires Vitest | 62 réussis, 8 fichiers |
| Tests Playwright | 52 réussis : 26 ordinateur et 26 mobile émulé |
| Construction de production, cache web hors ligne | Réussis |
| Synchronisation Capacitor et 6 plugins natifs | Réussie |
| Android `assembleRelease` et `:app:lintRelease` | Réussis ; lint : 0 erreur, 18 avertissements de versions et de ressources du modèle |
| Alignement et signature APK | RSA 3072 bits, signatures v2 et v3 vérifiées par apksigner |
| Métadonnées APK | `ch.bersier.dualbedsync`, version 0.4.0 / code 400, minimum API 24 (Android 7), cible API 36, release sans débogage |
| Permissions | Appareils à proximité ; localisation limitée à Android 11 et antérieurs ; scan `neverForLocation` ; vibration (permission normale, sans dialogue) |

APK : 3 376 194 octets. SHA-256 :

```text
54d1c72643499aa14faaee60d6f967b37da47f8adc3a92f21bf736ff7e7feb30
```

Certificat de signature, empreinte SHA-256 :

```text
17dea637c04e865a19f0448842f6588c3669e21430fd12c9a818b70f5fe203e0
```

Les tests couvrent le protocole CBI, STOP prioritaire, les pertes de liaison, les délais, les cibles combinées, la limite de maintien et l’éclairage. « Tout monter » envoie `10` aux seules cibles sélectionnées, puis `ff` au relâchement.

Le pilote Android est testé avec des appels BLE simulés : connexion directe par adresse sans sélecteur ni écriture moteur, relecture du profil, refus d’un récepteur incompatible, écritures avec réponse, délai dépassé, fermeture après échec et attente de fin de déconnexion. L’ancien transport ne peut pas fermer la nouvelle connexion. Le stockage est relu au démarrage et une écriture durable doit aboutir avant l’annonce d’un enregistrement.

Quatre parcours utilisent les vrais adaptateurs JavaScript Capacitor avec un pont Android simulé et sans Web Bluetooth : réouverture sans sélection, pause avec STOP puis reconnexion sans reprise, déconnexion volontaire conservée et reconnexion par adresse, partage du diagnostic sans identité d’appareil. Ils passent chacun sur ordinateur et mobile émulé. Les 30 parcours web passent également, y compris le mode hors ligne. Quatre parcours supplémentaires (web/Android, ordinateur/mobile) vérifient la migration des anciens réglages vers un éclairage masqué, la conservation du choix affiché/masqué après rechargement, des valeurs d’intensité/minuterie et des associations, sans sélection ni commande moteur. Les 18 fichiers de production correspondent octet pour octet aux ressources embarquées dans l’APK signé. Aucun événement JavaScript non géré n’a été observé.

Dix parcours supplémentaires (cinq par format d’écran) couvrent : enregistrement et restauration Android/web de tous les réglages, sélection au démarrage sans mouvement ni sélecteur, commande limitée au côté préféré, désactivation persistante du retour tactile, thème automatique et choix explicite, noms traités comme du texte sans injection HTML, et impulsions tactiles uniques. Un vibreur simulé en échec ou ne répondant jamais ne bloque pas STOP. Les sauvegardes successives sont sérialisées.

Vérification visuelle des thèmes sombre et clair et du mode simplifié. Les interfaces complète et simplifiée, l’éclairage optionnel et les noms de 32 caractères tiennent sur des largeurs de 320, 390 et 1440 pixels sans défilement horizontal. Les barres Android sont commandées selon le thème via SystemBars.

Les sources et workflows sont publiés dans [le dépôt GitHub](https://github.com/theophilebersier/2bedAndroidVibraDorm). Les résultats distants des workflows Checks, Deploy Pages et Android APK sont disponibles dans [GitHub Actions](https://github.com/theophilebersier/2bedAndroidVibraDorm/actions).

## Limites

L’émulateur Android installé sur ce poste n’a pas démarré faute d’accélération Windows Hypervisor Platform active. Windows n’a pas été modifié. Les tests mobiles ci-dessus sont des tests de navigateur et de pont natif simulé.

Aucun essai Bluetooth natif sur le téléphone et les lits réels n’a été effectué par l’agent. Le retour utilisateur sur la version Android 0.3.0 indique que l’application fonctionne très bien après installation, y compris la reconnexion. Il ne s’agit pas d’un procès-verbal d’essais instrumentés. La version 0.4.0 ajoute la personnalisation locale et le retour tactile. Le pilote Bluetooth et les paquets moteur restent identiques. Le vibreur réel de ce téléphone n’a pas été testé par l’agent. Une liaison perdue ou un processus terminé empêche de garantir la réception de STOP. Aucun alignement mécanique n’est mesuré.

Le retour utilisateur sur la version 0.2.0 a confirmé que la PWA demandait encore une sélection après fermeture : `getDevices` et les permissions persistantes ne sont pas disponibles dans toutes les configurations Chrome. La version 0.3.0 fournit l’APK natif et indique cette limitation sur le web.

Procédures : [installation Android](ANDROID.md) et [essais matériels](TESTS_MATERIEL.md).
