# Plan de réalisation — Dual Bed Sync

Date : 15 novembre 2026.

## 1. Objectif et point de départ

Créer une télécommande mobile simple pour deux sommiers Vibradorm, puis préparer sa publication sur GitHub. La cible matérielle déclarée dans le cahier des charges est le V-Mat-Basic-RF-CBI-SMPS-bk-EU-RELAY-NAS, référence 0093005668.

État au 15 novembre 2026 : version logicielle de test réalisée localement, avec protocole figé, pilote Web Bluetooth, simulation, interface, tests et préparation GitHub. La validation physique n’a pas été réalisée. En attendant l’accès aux lits, les étapes logicielles ont été construites avec des récepteurs simulés ; cela ne valide pas les critères matériels des étapes 1 à 5.

Les prescriptions du document original sont des exigences à examiner. Les affirmations sur les connexions simultanées, les caractéristiques électriques et la synchronisation mécanique ne constituent pas des résultats d’essais.

## 2. Choix techniques de départ

| Sujet | Choix proposé | Condition de validation |
| --- | --- | --- |
| Plateforme | PWA, Chrome sur Android | Prototype sur le téléphone réellement utilisé |
| Développement | TypeScript, Vite, interface légère sans framework imposé | Compilation et tests automatisés |
| Communication | Web Bluetooth, profil V-MAT Basic CBI explicite | Services et caractéristiques vérifiés sur chaque lit |
| Données | Réglages locaux, sans compte ni serveur applicatif | Rechargement et permissions testés |
| Présentation | Français, commandes tactiles larges, état de chaque côté visible | Essais sur téléphone |
| Publication | Sources GitHub, hébergement GitHub Pages envisagé | Dépôt cible, visibilité et licence définis |

Chrome documente Web Bluetooth sur Android, en contexte sécurisé, avec un geste utilisateur pour ouvrir le sélecteur de périphérique. L’attribution gauche/droite utilisera les appareils autorisés par le navigateur ; aucune saisie d’adresse MAC ne sera nécessaire. [Documentation Chrome](https://developer.chrome.com/docs/capabilities/bluetooth)

Le Bluetooth en arrière-plan et la reprise après veille seront traités comme des limitations à mesurer. La V1 vise une commande au premier plan. Toute reconnexion revient à un état arrêté, sans reprise du mouvement précédent.

Si le prototype web ne permet pas un contrôle fiable, conserver le protocole et la logique de commande séparés de l’interface pour passer à une application Android native.

## 3. Périmètre de la V1

- Associer explicitement un appareil au lit gauche et un autre au lit droit ; refuser le même appareil pour les deux côtés.
- Afficher séparément les états : non configuré, connexion, prêt, déconnecté et erreur.
- Choisir gauche, droite ou les deux.
- Commander les deux zones de mouvement par maintien, avec arrêt au relâchement.
- Proposer « Tout descendre — maintenir », sans afficher une position à plat mesurée.
- Contrôler l’éclairage CBI de chaque côté et adresser les deux côtés quand ils sont prêts ; afficher les échecs partiels.
- Proposer une simulation clairement identifiée pour développer et examiner l’interface sans matériel.
- Fournir un diagnostic exportable après retrait des identifiants d’appareils.

Les positions mémorisées, les pourcentages d’inclinaison, le massage et les accessoires XT-Box restent hors V1. L’illustration du lit viendra après la validation fonctionnelle et utilisera un visuel original.

## 4. Principes de commande à implémenter

1. Valider les capacités GATT et la disponibilité des cibles avant le premier mouvement. En mode combiné, les deux sessions doivent être prêtes ; aucun démarrage volontaire sur un seul côté.
2. Sérialiser les écritures de chaque appareil. Une seule action de mouvement peut être active à la fois.
3. Utiliser un identifiant de session de mouvement : les écritures en attente d’une session annulée ne doivent plus démarrer.
4. Au relâchement, à l’annulation tactile, à la perte de capture, au changement de cible ou à la perte de visibilité, annuler les répétitions et demander STOP aux connexions encore utilisables.
5. Après une erreur d’écriture ou une déconnexion pendant une commande combinée, arrêter les répétitions des deux côtés, demander STOP au côté joignable et signaler le défaut.
6. Une connexion perdue empêche de garantir la réception de STOP par le lit concerné. Ne jamais afficher « arrêté confirmé » à partir d’une simple tentative d’écriture. Vérifier sur matériel le comportement à la perte de liaison.
7. Ajouter une limite de durée par maintien, définie et documentée pendant les essais. Le minuteur navigateur ne remplace pas un dispositif d’arrêt matériel et peut être suspendu avec la page.
8. Ne pas présenter deux commandes parallèles comme une garantie d’alignement mécanique ou une transaction Bluetooth atomique.

Ces règles sont des décisions de conception ; leur efficacité physique devra être testée.

## 5. Architecture prévue

```text
dual-bed-sync/
  README.md
  .gitignore
  docs/
    CAHIER_DES_CHARGES_ORIGINAL.md
    PLAN_PROJET.md
    PROTOCOLE_BLE.md             # à rédiger à partir d’une révision figée
    TESTS_MATERIEL.md            # procédure et résultats
    PUBLICATION_GITHUB.md
  src/
    protocol/                   # constantes et construction des trames
    transport/                  # interface commune, BLE réel et simulateur
    control/                    # états, maintien, arrêt et coordination
    ui/                         # commandes, sélection et configuration
    storage/                    # préférences locales
  public/                       # manifeste, icônes et visuels
  tests/                        # protocole et scénarios de commande
  .github/workflows/            # vérifications puis déploiement
```

Cette structure est maintenant réalisée. Voir le README et le rapport VERIFICATION.md pour l’état effectif des tests ; les validations physiques restent ouvertes.

L’interface utilise le contrôleur ; le contrôleur utilise un transport abstrait ; le transport réel utilise les trames du module protocole. La simulation emprunte la même logique de contrôle et ne doit jamais ouvrir une connexion physique.

## 6. Étapes et critères de sortie

| Étape | Travail | Critère pour passer à la suite |
| --- | --- | --- |
| 0 — Cadrage | Conserver le document original, organiser le périmètre, identifier les inconnues | Réalisé dans ce dossier |
| 1 — Preuve Bluetooth | Figer la référence amont, créer le prototype, sélectionner un appareil, lire ses capacités | Profil et accès GATT compatibles sur un lit réel ; aucun mouvement au chargement |
| 2 — Un seul lit | Implémenter les trames, les états, le maintien et STOP | Essai bref de chaque sens et arrêt au relâchement vérifiés sur ce lit |
| 3 — Deux lits | Attribuer les côtés, valider les deux sessions, coordonner les commandes | Double connexion et scénarios d’échec testés ; aucun mode combiné avec une cible indisponible |
| 4 — Interface et lumière | Construire l’écran mobile, intégrer la lumière, ajouter la simulation | Parcours mobile utilisable ; état réel distingué de l’intention et de la simulation |
| 5 — PWA et robustesse | Installation, cache de l’interface, reprise, veille, reconnexion et diagnostics | Tests de cycle de vie réalisés ; aucune commande différée après retour à l’écran |
| 6 — GitHub | Documentation, contrôles automatisés, licence, version de test et procédure de publication | Projet reproductible depuis un clone propre ; résultats matériels documentés |

Un échec de faisabilité à l’étape 1 ou 3 entraîne une révision du choix technique avant de poursuivre l’habillage de l’application.

## 7. Vérifications prévues

Les tests automatisés porteront surtout sur le protocole et les situations où une commande pourrait continuer ou partir sur la mauvaise cible :

- maintien suivi d’un relâchement avant la fin d’une écriture ;
- STOP prioritaire et suppression des répétitions devenues obsolètes ;
- deux doigts, changement de cible et commande opposée pendant une action ;
- perte d’une connexion, écriture qui échoue ou reste en attente ;
- blocage du mode combiné si un lit manque ;
- reconnexion sans reprise de mouvement ;
- éclairage avec réponse courte ou échec de lecture ;
- simulation incapable d’appeler le transport réel.

Les essais physiques seront progressifs : un lit, l’autre, puis les deux. Consigner téléphone, navigateur, modèles, firmware si lisible et résultats. Contrôler aussi relâchement hors bouton, changement d’application, verrouillage d’écran et perte de liaison. La fin des essais sera rapportée séparément des résultats des tests logiciels.

## 8. Référence du protocole et inconnues matérielles

La source correspondant au paquet applicatif indiqué est [V-MAT Basic](https://github.com/kristofferR/ha-adjustable-bed/blob/main/docs/beds/vmatbasic.md). Elle distingue les profils Basic, CBI et XT-Box et reste marquée non vérifiée sur matériel. Elle décrit des mouvements par maintien et un arrêt explicite, sans retour de position ni préréglage automatique à plat. Le pilote ciblera explicitement CBI, sous réserve des observations sur les lits réels.

Avant d’écrire le pilote, relever le commit amont et conserver dans PROTOCOLE_BLE.md les UUID, les trames, les modes d’écriture et les règles temporelles effectivement retenus. Créditer la source et vérifier les obligations de licence de tout code réutilisé.

À vérifier pendant les étapes concernées :

- appareil et navigateur réellement utilisés ;
- présence du profil CBI sur les deux récepteurs et capacité de double connexion ;
- rôle physique exact de chaque zone de mouvement ;
- arrêt réel lors d’une perte de liaison ;
- éclairage déjà installé et caractéristiques constructeur de sa sortie.

Les tensions et puissances mentionnées dans le cahier des charges restent des données non vérifiées. Aucun achat ni modification de câblage n’est nécessaire pour commencer le développement.

## 9. Préparation de GitHub

Nom proposé : `dual-bed-sync`.

Préparer localement README, procédure de lancement, commandes de test, procédure matérielle, captures, références et limites connues. Ajouter les contrôles de compilation et de tests dans GitHub Actions lorsque le code existe.

Conserver les identifiants d’appareils et les journaux bruts hors du dépôt. Définir le compte cible, la visibilité et la licence avant la publication. Ne pas présenter le logiciel comme officiellement approuvé par les marques.

Si la PWA est retenue, préparer un déploiement GitHub Pages avec les chemins adaptés au nom du dépôt et HTTPS. GitHub Pages héberge les fichiers statiques issus du dépôt ; le Bluetooth s’exécute sur le téléphone de l’utilisateur. [Documentation GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## 10. Prochaine action

Publier une version de test sur une origine HTTPS choisie, puis réaliser les essais sur le téléphone et les deux lits selon TESTS_MATERIEL.md. Confirmer le profil de chaque récepteur et le comportement d’arrêt avant de qualifier le contrôle combiné.
