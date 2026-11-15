# Protocole BLE retenu — V-MAT Basic CBI

Référence consultée le 15 novembre 2026 : [kristofferR/ha-adjustable-bed, commit d9bd39af238354d360e99077e225839141b7f69a](https://github.com/kristofferR/ha-adjustable-bed/tree/d9bd39af238354d360e99077e225839141b7f69a).

Sources : [documentation V-MAT Basic](https://github.com/kristofferR/ha-adjustable-bed/blob/d9bd39af238354d360e99077e225839141b7f69a/docs/beds/vmatbasic.md), [constructeur de trames](https://github.com/kristofferR/ha-adjustable-bed/blob/d9bd39af238354d360e99077e225839141b7f69a/custom_components/adjustable_bed/beds/vmatbasic_protocol.py).

La référence distingue les profils `basic`, `cbi` et `xtbox` et indique que leur comportement physique reste à tester. Cette application implémente exclusivement `cbi`, pour la référence matérielle annoncée dans le cahier des charges. La découverte GATT ne constitue pas une identification certaine du profil.

## UUID utilisés

Suffixe constructeur : `-9f03-0de5-96c5-b8f4f3081186`.

| Rôle | UUID complet |
| --- | --- |
| Service de commande | `00001525-9f03-0de5-96c5-b8f4f3081186` |
| Commande moteur | `00001526-9f03-0de5-96c5-b8f4f3081186` |
| Lumière CBI | `00001529-9f03-0de5-96c5-b8f4f3081186` |
| Service de statut requis | `00001527-9f03-0de5-96c5-b8f4f3081186` |
| Service GAP requis | `00001800-0000-1000-8000-00805f9b34fb` |
| Informations facultatives DIS | `0000180a-0000-1000-8000-00805f9b34fb` |
| Modèle facultatif | `00002a24-0000-1000-8000-00805f9b34fb` |
| Firmware facultatif | `00002a26-0000-1000-8000-00805f9b34fb` |

La configuration recherche ces services et exige l’écriture avec réponse sur les caractéristiques moteur et lumière, ainsi que la lecture de la lumière. Aucun remplacement arbitraire d’UUID ni passage automatique à l’écriture sans réponse n’est prévu. Les lectures DIS sont facultatives ; un délai dépassé ferme toutefois la connexion.

## Trames de mouvement

Chaque commande est un octet, écrit avec réponse sur la caractéristique moteur.

| Action de l’interface | Octet hexadécimal |
| --- | --- |
| Lever le dossier | `0b` |
| Baisser le dossier | `0a` |
| Lever les jambes | `09` |
| Baisser les jambes | `08` |
| Monter les deux zones | `10` |
| Descendre les deux zones | `00` |
| Relâchement / STOP | `ff` |

L’identité physique des zones doit être vérifiée. `00` indique une direction de descente ; ce n’est ni une position mesurée ni une calibration.

## Lumière

Les réglages occupent trois octets : intensité U8, puis minuterie en minutes U16 big endian. L’interface retient les domaines documentés 0–255 et 0–1439 minutes. OFF envoie `00 00 00`. Après écriture, l’application relit l’état ; une lecture courte ou échouée laisse l’état inconnu. Le contrôleur propose aussi une bascule basée sur une lecture fraîche ; l’interface utilise les actions explicites Allumer et Éteindre.

Le contrôle de l’éclairage sur les deux lits est une orchestration propre à ce projet : deux commandes indépendantes, avec compte rendu des erreurs par côté. Il ne s’agit pas d’une primitive groupée du protocole.

## Politique temporelle propre à l’application

- Première commande immédiate après validation de toutes les cibles.
- Répétition 30 ms après la fin du groupe d’écritures précédent ; aucune garantie sur la cadence radio.
- Une seule opération GATT à la fois par appareil.
- STOP prioritaire devant les opérations en attente ; les mouvements annulés ne sont plus admis.
- Limite logicielle de maintien : dix secondes ; aucun nouveau maintien avant relâchement du geste précédent.
- Délai de connexion : dix secondes ; opération GATT : 1,5 seconde. Ce sont des limites choisies par le logiciel, sans garantie du fabricant.
- Sur dépassement, la connexion est fermée. Une connexion terminant tardivement est également refermée.
- Après reconnexion, tous les services et caractéristiques sont recherchés de nouveau ; aucun mouvement n’est repris.
- Les choix gauche/droite sont enregistrés localement après validation du profil. Les appareils déjà autorisés sont retrouvés par identifiant exact via [getDevices](https://googlechrome.github.io/samples/web-bluetooth/get-devices.html). La restauration au premier plan est séquentielle, avec au plus trois tentatives par appareil (immédiate, puis après 1 et 3 secondes), et ne transmet aucune trame moteur. Les connexions existantes restent ouvertes au masquage ; une tentative encore en cours est invalidée et son résultat tardif refermé.
- Une déconnexion volontaire suspend la reconnexion du côté concerné jusqu’à une nouvelle connexion manuelle. Aucun sélecteur ni reconnexion réelle en simulation ou en arrière-plan.

Les limites et délais n’annulent pas rétroactivement une trame déjà transmise. Les essais physiques, notamment le comportement à la perte de liaison, restent indispensables.

## Périmètre exclu

Pas de protocole VMAT générique, de XT-Box, de commandes de massage, de mémoire, d’angle, de mise à jour du firmware, de renommage ni de procédure d’appairage chiffrée inventée. Aucun watchdog matériel ou arrêt confirmé n’est présumé.

La mise en œuvre TypeScript est écrite pour ce projet à partir du contrat documenté. Les crédits et le texte MIT amont sont conservés dans [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
