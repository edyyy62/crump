import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { AnalysisJob } from '../store/analysis';
import { AnalysisProgress } from './AnalysisProgress';

export function PendingJobCard({
  job,
  onRetry,
  onDismiss,
}: {
  job: AnalysisJob;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const running = job.status === 'running';
  const unreadable = job.failure?.kind === 'unreadable';
  const title = running
    ? job.stepLabel
    : unreadable
      ? "Couldn't read this label"
      : "Couldn't finish analysis";
  const body = running
    ? 'Finishing in the background.'
    : unreadable
      ? 'Try another photo of the ingredients list.'
      : (job.message ?? 'Check the connection and retry.');

  return (
    <View className="mb-3 overflow-hidden rounded-3xl bg-cream">
      <View className="flex-row items-center px-3 py-3">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-cream-dark">
          <Image source={{ uri: job.photoUri }} className="h-16 w-16" contentFit="cover" />
          {running ? (
            <View className="absolute inset-0 bg-forest-deep/25" />
          ) : null}
        </View>
        <View className="ml-3 min-w-0 flex-1 pr-2">
          {running ? (
            <AnalysisProgress step={job.step} compact />
          ) : (
            <>
              <Text className="text-[17px] font-semibold text-ink">{title}</Text>
              <Text className="mt-0.5 text-[13px] leading-5 text-muted">{body}</Text>
            </>
          )}
        </View>
      </View>
      {!running ? (
        <View className="flex-row gap-2 border-t border-cream-dark px-3 py-2">
          <Pressable onPress={onRetry} className="flex-1 items-center rounded-full bg-forest py-2.5">
            <Text className="font-semibold text-cream">Retry</Text>
          </Pressable>
          <Pressable onPress={onDismiss} className="flex-1 items-center rounded-full bg-page py-2.5">
            <Text className="font-semibold text-forest">Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
