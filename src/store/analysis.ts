import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import type { AnalyzeFailure } from '../domain/analyze';
import { ANALYSIS_STEPS, analyzeAndPersist } from '../domain/analyze';
import { deletePhoto, persistPhoto } from '../lib/photos';
import { useScanStore } from './scans';

export type AnalysisJob = {
  id: string;
  photoUri: string;
  startedAt: number;
  status: 'running' | 'failed';
  step: number;
  stepLabel: string;
  failure?: AnalyzeFailure;
  message?: string;
};

export type AnalysisOutcome =
  | { kind: 'ok'; scanId: string }
  | { kind: 'unreadable' }
  | { kind: 'service'; message: string };

type AnalysisStore = {
  jobs: AnalysisJob[];
  start: (sourceUri: string) => Promise<{ id: string; done: Promise<AnalysisOutcome> }>;
  retry: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
};

function patchJob(id: string, patch: Partial<AnalysisJob>): void {
  useAnalysisStore.setState({
    jobs: useAnalysisStore.getState().jobs.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  });
}

async function runJob(job: AnalysisJob): Promise<AnalysisOutcome> {
  const result = await analyzeAndPersist(job.photoUri, (progress) => {
    patchJob(job.id, { step: progress.step, stepLabel: progress.label, status: 'running' });
  });
  if (result.kind === 'ok') {
    useScanStore.getState().upsert(result.scan);
    useAnalysisStore.setState({
      jobs: useAnalysisStore.getState().jobs.filter((item) => item.id !== job.id),
    });
    if (job.photoUri.includes(`pending-${job.id}`)) {
      await deletePhoto(job.photoUri);
    }
    return { kind: 'ok', scanId: result.scan.id };
  }
  patchJob(job.id, {
    status: 'failed',
    failure: result,
    message: result.kind === 'service' ? result.message : undefined,
  });
  return result.kind === 'service'
    ? { kind: 'service', message: result.message }
    : { kind: 'unreadable' };
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  jobs: [],
  start: async (sourceUri) => {
    const id = randomUUID();
    const photoUri = await persistPhoto(`pending-${id}`, sourceUri);
    const job: AnalysisJob = {
      id,
      photoUri,
      startedAt: Date.now(),
      status: 'running',
      step: 0,
      stepLabel: ANALYSIS_STEPS[0].label,
    };
    set({ jobs: [job, ...get().jobs] });
    const done = runJob(job);
    return { id, done };
  },
  retry: async (id) => {
    const job = get().jobs.find((item) => item.id === id);
    if (!job) return;
    const next = {
      ...job,
      status: 'running' as const,
      step: 0,
      stepLabel: ANALYSIS_STEPS[0].label,
      failure: undefined,
      message: undefined,
    };
    set({
      jobs: get().jobs.map((item) => (item.id === id ? next : item)),
    });
    await runJob(next);
  },
  dismiss: async (id) => {
    const job = get().jobs.find((item) => item.id === id);
    set({ jobs: get().jobs.filter((item) => item.id !== id) });
    if (job?.photoUri) await deletePhoto(job.photoUri);
  },
}));
