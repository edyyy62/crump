import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const SCANS_DIR = `${FileSystem.documentDirectory}scans/`;

export async function ensureScanDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SCANS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SCANS_DIR, { intermediates: true });
  }
}

export async function persistPhoto(scanId: string, sourceUri: string): Promise<string> {
  await ensureScanDir();
  const dest = `${SCANS_DIR}${scanId}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deletePhoto(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export async function downscaleForUpload(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulate(uri)
    .resize({ width: 768 })
    .renderAsync();
  const saved = await result.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.72,
  });
  result.release();
  return saved.uri;
}

export async function readBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
