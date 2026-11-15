import { isAndroid } from '../platform';

export async function exportDiagnostic(diagnostic: object): Promise<void> {
  const text = JSON.stringify(diagnostic, null, 2);
  const name = 'dual-bed-sync-diagnostic.json';
  if (isAndroid()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const file = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Diagnostic Dual Bed Sync', files: [file.uri], dialogTitle: 'Enregistrer ou partager le diagnostic' });
  } else {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
