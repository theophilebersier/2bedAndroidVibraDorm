# Essais matériels — à réaliser

Les résultats ci-dessous ne sont pas encore renseignés. Le logiciel a été testé avec des récepteurs simulés ; aucun des essais physiques n’a été réalisé par l’agent.

## Fiche de session

| Information | Valeur à renseigner |
| --- | --- |
| Date | |
| Téléphone et version Android | |
| Navigateur et version | |
| URL HTTPS de l’application | |
| Modèle / firmware du sommier gauche | |
| Modèle / firmware du sommier droit | |
| Référence des télécommandes d’origine | |
| Éclairage existant | |

Conserver les identifiants Bluetooth et les journaux bruts hors du dépôt public. Les appareils sont désignés simplement gauche et droit dans les résultats partagés.

## Ordre des essais

Réaliser les premiers essais de mouvement sur un seul sommier, avec un maintien très bref et en observant l’arrêt au relâchement. Garder la télécommande d’origine disponible. Dégager la zone des mécanismes avant les mouvements. Ne pas provoquer de torsion du lit assemblé pour tester une perte de liaison.

1. Depuis l’URL HTTPS, ouvrir la configuration et choisir uniquement le lit gauche. La connexion ne doit déclencher aucun mouvement. Relever les informations disponibles ; vérifier que le récepteur correspond au profil CBI prévu.
2. Revenir à la télécommande et sélectionner « Gauche ». Vérifier brièvement chaque sens du dossier et des jambes, puis le relâchement et le bouton Arrêter. Tester aussi le relâchement après déplacement du doigt hors du bouton.
3. Vérifier « Tout monter » puis « Tout descendre » par maintien, avec arrêt au relâchement : ces commandes ne doivent jamais annoncer une position mesurée ou une calibration.
4. Répéter les essais sur le lit droit seul. Confirmer la correspondance des côtés et des zones.
5. Vérifier l’éclairage installé : lecture, allumage, extinction, intensité et minuterie. Ne pas modifier le câblage pour ces essais.
6. Connecter les deux appareils sans mouvement et vérifier la stabilité des deux sessions. Sélectionner « Les deux » uniquement après la validation indépendante des deux côtés.
7. Réaliser un mouvement combiné bref dans une configuration mécaniquement adaptée. Observer la réception des deux côtés et l’arrêt au relâchement. Documenter tout décalage, sans le transformer en position estimée.
8. Vérifier le retour après changement d’application, verrouillage d’écran et reconnexion. Le mouvement précédent ne doit jamais reprendre automatiquement. Ces essais nécessitent une observation physique de l’arrêt, pas seulement un changement de l’interface.
9. Après une connexion réussie avec la version 0.2.0, recharger puis fermer et rouvrir l’application. Vérifier la reconnexion sans nouvelle sélection, les côtés inchangés et l’absence de mouvement. Tester aussi un retour depuis une autre application après perte des liaisons.
10. Dans la configuration, déconnecter volontairement un côté. Recharger et vérifier que seul l’autre se reconnecte. Reconnecter manuellement le premier côté, puis vérifier que sa reconnexion automatique est réactivée.

Les pertes de liaison et dépassements de délai sont déjà exercés en simulation. Une validation physique supplémentaire de ces défauts doit se faire dans une configuration sans contrainte entre les deux sommiers. En cas de doute sur l’arrêt d’un lit, utiliser sa télécommande et interrompre l’essai.

## Feuille de résultats

| Essai | Gauche | Droite | Ensemble | Observations |
| --- | --- | --- | --- | --- |
| Connexion sans mouvement | À tester | À tester | À tester | |
| Dossier : monter / descendre | À tester | À tester | À tester | |
| Jambes : monter / descendre | À tester | À tester | À tester | |
| Relâchement / STOP | À tester | À tester | À tester | |
| Relâchement hors bouton | À tester | À tester | À tester | |
| Descente des deux zones | À tester | À tester | À tester | |
| Montée des deux zones | À tester | À tester | À tester | |
| Limite de maintien | À tester | À tester | À tester | |
| Éclairage : lecture / ON / OFF | À tester | À tester | À tester | |
| Intensité / minuterie | À tester | À tester | À tester | |
| Changement d’application / veille | À tester | À tester | À tester | |
| Reconnexion sans reprise | À tester | À tester | À tester | |
| Rechargement / réouverture, côtés mémorisés | À tester | À tester | À tester | |
| Déconnexion volontaire conservée | À tester | À tester | À tester | |
| Perte de liaison, arrêt physique | À tester | À tester | À tester | |

Si un test échoue, noter la commande, le côté, les versions et exporter le diagnostic. Le diagnostic ne contient pas les trames brutes ni les noms d’appareils. Un échec matériel bloque la qualification du scénario concerné même si tous les tests logiciels passent.
