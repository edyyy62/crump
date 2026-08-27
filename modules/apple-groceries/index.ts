import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type GroceryPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export async function searchNearbyGroceries(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<GroceryPlace[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const native = requireNativeModule<{
      searchNearby: (
        latitude: number,
        longitude: number,
        radiusMeters: number,
      ) => Promise<GroceryPlace[]>;
    }>('AppleGroceries');
    return await native.searchNearby(latitude, longitude, radiusMeters);
  } catch {
    return [];
  }
}
