import { initializeStorage } from './storage/persistent';

void initializeStorage().then(() => import('./main')).catch(() => {
  const app = document.querySelector('#app');
  if (app) app.innerHTML = '<main style="padding:32px;font-family:system-ui"><h1>Stockage indisponible</h1><p>Fermez puis rouvrez Dual Bed Sync. Aucun mouvement n’a été demandé par cette ouverture de l’application.</p></main>';
});
