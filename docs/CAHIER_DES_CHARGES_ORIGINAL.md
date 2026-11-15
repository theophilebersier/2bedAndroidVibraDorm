# Spécifications du Projet : Application "Dual Bed Sync" (Moteurs Vibradorm)

Ce document rassemble toutes les informations matérielles et logicielles nécessaires pour développer une application mobile (ou Web Bluetooth) capable de piloter simultanément ou indépendamment deux sommiers électriques séparés.

## 1. Contexte Matériel (Hardware)
*   **Fabricant** : VIBRADORM GmbH
*   **Modèle** : `V-Mat-Basic-RF-CBI-SMPS-bk-EU-RELAY-NAS` (Item-No.: 0093005668)
*   **Communication** : Bluetooth Low Energy (BLE) via la carte CBI intégrée.
*   **Moteurs** : Double actionneur (Tête max 6500N / Pieds max 6500N).

## 2. Ressources pour le Reverse Engineering (Protocole BLE)
Il n'est pas nécessaire de décompiler l'APK officielle (`com.vibradorm.vmatbasic`). Le protocole complet a déjà été rétro-ingéniéré dans le monde open source.
*   **Dépôt GitHub de référence** : [`kristofferR/ha-adjustable-bed`](https://github.com/kristofferR/ha-adjustable-bed) (projet pour Home Assistant).
*   **Fichiers utiles dans ce dépôt** : 
    *   Dossier `custom_components/adjustable_bed/beds/`
    *   Documentation `docs/beds/vibradorm.md` / `vmat.md`
*   **Données clés à extraire du dépôt** : Les UUID de service GATT, les UUID de caractéristiques TX/RX, et les payloads (octets en hexadécimal) à envoyer en boucle (hold to move) pour lever/baisser (Tête/Pieds) et arrêter au relâchement.

## 3. Interface Utilisateur et Design (UI/UX)
L'application doit posséder une interface simple et intuitive avec 3 modes de sélection :
1.  **Lit Gauche** (contrôle indépendant)
2.  **Lit Droite** (contrôle indépendant)
3.  **Les Deux (Mode Tempur / Sync)** (contrôle simultané)

**Design "Tempur" (Ressource Image / Prompt) :**
Pour illustrer le mode combiné, l'application utilisera une image d'un lit complet.
*   *Prompt à utiliser pour générer l'image (Midjourney/DALL-E) ou pour la recherche web* : "Photographie réaliste d'un lit électrique Tempur moderne vu de face/trois-quarts. Le sommier possède un cadre inférieur rigide noir mat, surmonté d'un bandeau esthétique en tissu gris chiné épais. L'ensemble est élégant, minimaliste, éclairé par une douce lumière LED sous le lit."

## 4. Faisabilité Technique : Contrôler deux appareils BLE en même temps
**Est-ce techniquement faisable ?** 
**OUI**. Un smartphone récent (comme le Samsung Galaxy S24) agit comme un périphérique "Central" et peut maintenir jusqu'à 5 à 7 connexions BLE actives simultanément. Il est tout à fait possible de se connecter aux deux lits (MAC Address A et MAC Address B) en même temps.

**Contraintes et défis à gérer dans le code :**
*   **Latence réseau (Décalage mécanique)** : Même en envoyant les commandes de manière asynchrone (`Promise.all` en JS ou `async/await` en parallèle), un léger délai (quelques millisecondes) peut exister entre la réception de la trame par le lit de gauche et celui de droite. À long terme, cela peut créer un léger décalage physique.
    *   *Solution requise* : Ajouter un bouton "Mise à plat (Flat)" synchronisé, et recommander à l'utilisateur de remettre les lits à plat régulièrement pour réinitialiser la position mécanique zéro.
*   **Gestion d'état (State Management)** : L'application doit s'assurer que les DEUX lits sont bien connectés avant d'autoriser une action sur le bouton "Les Deux". Si un seul lit capte la commande, la literie va se tordre.
*   **Timeouts et reconnexions** : Le BLE met souvent les périphériques en veille. L'application devra gérer les reconnexions transparentes en arrière-plan (auto-connect).
*   **Contrainte Web Bluetooth** : Si développée en Web Bluetooth (PWA sur Chrome), la sécurité de l'API exige un geste utilisateur (clic) pour lancer l'appairage *pour chaque nouvel appareil*. Le code devra gérer l'appairage séquentiel lors de la première utilisation.

## 5. Gestion de l'Éclairage (Câblage sur le boîtier V-Mat)
Le boîtier possède une sortie "CBI" prévue pour une veilleuse à intensité variable sous le lit.
*   **Connectique** : Située sous le capot protège-câbles (connecteur 2 broches basse tension).
*   **Spécifications électriques** : 24V à 29V Courant Continu (DC). **Attention : ne pas brancher de ruban 12V ni de 230V.**
*   **Type de lumière recommandé** : Ruban LED monochrome 2 fils (Blanc chaud ~2700K/3000K), faible puissance (5 à 10 Watts max) pour ne pas surcharger la carte mère.
*   **Contrôle logiciel** : Les trames BLE gèrent l'état On/Off. L'intégration de la lumière dans l'appli devra également cibler les deux lits ou un seul.