# Références et crédits

Le contrat V-MAT Basic CBI, les UUID et les valeurs des trames proviennent des travaux de rétro-ingénierie de **kristofferR**, dans [ha-adjustable-bed](https://github.com/kristofferR/ha-adjustable-bed), révision `d9bd39af238354d360e99077e225839141b7f69a`.

La mise en œuvre TypeScript et l’interface ont été écrites pour Dual Bed Sync. Les schémas et icônes sont des visuels vectoriels originaux, sans photographie de marque réutilisée.

Le texte de licence du dépôt de référence est conservé ci-dessous, tel que consulté à cette révision. Cette notice ne choisit pas la licence du code original de Dual Bed Sync.

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

La version Android emploie Capacitor et ses plugins App, Preferences, Filesystem et Share (Drifty / Ionic), ainsi que `@capacitor-community/bluetooth-le`. Les licences MIT des composants d’exécution sont réunies dans [public/THIRD_PARTY_LICENSES.txt](public/THIRD_PARTY_LICENSES.txt), généré depuis les paquets verrouillés et embarqué dans l’APK. Les bibliothèques AndroidX, Kotlin et Cordova utilisées par la compilation conservent leurs licences Apache 2.0 et les notices présentes dans leurs distributions.

Les autres dépendances npm servent au développement et aux tests. Le fichier `package-lock.json` fixe les versions et les intégrités.
