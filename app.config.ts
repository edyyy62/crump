import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Crump',
  slug: 'Crump',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'crump',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.crump.personal',
    infoPlist: {
      NSCameraUsageDescription: 'Crump photographs ingredient labels so it can read them.',
      NSPhotoLibraryUsageDescription: 'Crump imports a label photo from your library.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#1C3A2C',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'app.crump.personal',
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1C3A2C',
        image: './assets/splash-icon.png',
      },
    ],
    'expo-image',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Crump to photograph ingredient labels.',
        microphonePermission: 'Crump does not record audio.',
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Crump to import a label photo from your library.',
      },
    ],
  ],
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: 'gpt-4o-mini',
  },
});
