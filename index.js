import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'organization must be verified',
  'analyzeAndPersist failed',
]);

import 'expo-router/entry';
