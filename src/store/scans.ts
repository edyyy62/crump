import { create } from 'zustand';
import type { Scan } from '../types';
import { getDb } from '../db/database';
import {
  deleteScan as deleteScanRow,
  getScan,
  listScans,
  renameScan as renameScanRow,
} from '../db/repositories';
import { deletePhoto } from '../lib/photos';

type ScanStore = {
  ready: boolean;
  scans: Scan[];
  load: () => Promise<void>;
  upsert: (scan: Scan) => void;
  remove: (id: string) => Promise<void>;
  rename: (id: string, productName: string) => Promise<void>;
};

export const useScanStore = create<ScanStore>((set, get) => ({
  ready: false,
  scans: [],
  load: async () => {
    const scans = await listScans(await getDb());
    set({ scans, ready: true });
  },
  upsert: (scan) => {
    set({
      scans: [scan, ...get().scans.filter((item) => item.id !== scan.id)].sort(
        (a, b) => b.scannedAt - a.scannedAt,
      ),
    });
  },
  remove: async (id) => {
    const existing = get().scans.find((item) => item.id === id) ?? (await getScan(await getDb(), id));
    const db = await getDb();
    await deleteScanRow(db, id);
    if (existing?.photoUri) {
      await deletePhoto(existing.photoUri);
    }
    set({ scans: get().scans.filter((item) => item.id !== id) });
  },
  rename: async (id, productName) => {
    await renameScanRow(await getDb(), id, productName);
    set({
      scans: get().scans.map((item) => (item.id === id ? { ...item, productName } : item)),
    });
  },
}));
