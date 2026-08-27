import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAnalysisStore } from '../store/analysis';
import { PrimaryButton, ScreenMessage } from '../components/Buttons';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { colors } from '../theme';

type Phase =
  | 'capture'
  | 'confirm'
  | 'analyzing'
  | 'unreadable'
  | 'service';

export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const startAnalysis = useAnalysisStore((s) => s.start);
  const jobs = useAnalysisStore((s) => s.jobs);
  const cameraRef = useRef<CameraView>(null);
  const waitingRef = useRef(true);
  const [waitingJobId, setWaitingJobId] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(params.uri ?? null);
  const [phase, setPhase] = useState<Phase>(params.uri ? 'confirm' : 'capture');
  const [busy, setBusy] = useState(false);
  const [serviceMessage, setServiceMessage] = useState(
    'Check the connection and retry. The photo is kept.',
  );

  useEffect(() => {
    if (params.uri) {
      setPhotoUri(params.uri);
      setPhase('confirm');
    }
  }, [params.uri]);

  const takePhoto = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (!photo?.uri) return;
      setPhotoUri(photo.uri);
      setPhase('confirm');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const pickGallery = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
    setPhase('confirm');
  }, []);

  const analyze = useCallback(async () => {
    if (!photoUri) return;
    waitingRef.current = true;
    setPhase('analyzing');
    const { id, done } = await startAnalysis(photoUri);
    setWaitingJobId(id);
    const outcome = await done;
    setWaitingJobId(null);
    if (!waitingRef.current) return;
    if (outcome.kind === 'ok') {
      router.replace(`/product/${outcome.scanId}`);
      return;
    }
    await useAnalysisStore.getState().dismiss(id);
    if (outcome.kind === 'service') {
      setServiceMessage(outcome.message);
    }
    setPhase(outcome.kind);
  }, [photoUri, router, startAnalysis]);

  const runInBackground = useCallback(() => {
    waitingRef.current = false;
    router.replace('/');
  }, [router]);

  const waitingJob = jobs.find((job) => job.id === waitingJobId);
  const analysisStep = waitingJob?.step ?? 0;

  if (phase === 'unreadable') {
    return (
      <ScreenMessage
        title="Couldn't read an ingredient label in this photo"
        body="Frame the ingredients list so the print is sharp and well lit."
      >
        <PrimaryButton
          label="Retake"
          onPress={() => {
            setPhotoUri(null);
            setPhase('capture');
          }}
        />
      </ScreenMessage>
    );
  }

  if (phase === 'service') {
    return (
      <ScreenMessage
        title="Couldn't finish label analysis"
        body={serviceMessage}
      >
        <PrimaryButton label="Retry" onPress={() => void analyze()} />
        <PrimaryButton label="Cancel" tone="cream" onPress={() => router.back()} />
      </ScreenMessage>
    );
  }

  if ((phase === 'confirm' || phase === 'analyzing') && photoUri) {
    return (
      <View className="flex-1 bg-forest-deep">
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit="contain" />
        {phase === 'analyzing' ? (
          <View className="absolute inset-0 justify-end bg-forest-deep/75 px-8" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="rounded-[24px] bg-forest-deep/90 p-5">
              <AnalysisProgress step={analysisStep} light />
              <View className="mt-5">
                <PrimaryButton label="Continue on Home" tone="cream" onPress={runInBackground} />
              </View>
            </View>
          </View>
        ) : (
          <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-1">
              <PrimaryButton
                label="Retake"
                tone="cream"
                onPress={() => {
                  setPhotoUri(null);
                  setPhase('capture');
                }}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton label="Use photo" onPress={() => void analyze()} />
            </View>
          </View>
        )}
      </View>
    );
  }

  if (!permission) {
    return <View className="flex-1 bg-forest-deep" />;
  }

  if (!permission.granted) {
    return (
      <ScreenMessage
        title="Camera access needed"
        body="Crump photographs ingredient lists on packaging. Grant camera access, or import from your library."
      >
        <PrimaryButton label="Allow camera" onPress={() => void requestPermission()} />
        <PrimaryButton label="Import from library" tone="cream" onPress={() => void pickGallery()} />
        <PrimaryButton label="Cancel" tone="cream" onPress={() => router.back()} />
      </ScreenMessage>
    );
  }

  return (
    <View className="flex-1 bg-forest-deep">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" mode="picture" />
      <View className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} className="self-start rounded-full bg-forest-deep/70 px-4 py-2">
          <Text className="font-semibold text-cream">Cancel</Text>
        </Pressable>
      </View>
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-10"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable onPress={() => void pickGallery()} className="h-12 w-12 items-center justify-center rounded-xl bg-cream/20">
          <Ionicons name="images" size={24} color={colors.cream} />
        </Pressable>
        <Pressable
          onPress={() => void takePhoto()}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-cream"
        >
          <View className="h-[60px] w-[60px] rounded-full bg-cream" />
        </Pressable>
        <View className="h-12 w-12" />
      </View>
    </View>
  );
}
