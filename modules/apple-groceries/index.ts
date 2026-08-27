import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type GroceryPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  identifier?: string;
  address?: string;
  phone?: string;
  url?: string;
  category?: string;
  typeId?: string;
  logoUrl?: string | null;
};

type NativeAppleGroceries = {
  searchNearby: (
    latitude: number,
    longitude: number,
    radiusMeters: number,
    typeIds: string[],
  ) => Promise<GroceryPlace[]>;
  presentPlaceCard: (
    id: string,
    name: string,
    latitude: number,
    longitude: number,
    identifier: string,
  ) => Promise<void>;
};

function nativeModule(): NativeAppleGroceries | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule<NativeAppleGroceries>('AppleGroceries');
  } catch {
    return null;
  }
}

export async function searchNearbyGroceries(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  typeIds: string[],
): Promise<GroceryPlace[]> {
  if (typeIds.length === 0) return [];
  const native = nativeModule();
  if (!native) return [];
  return native.searchNearby(latitude, longitude, radiusMeters, typeIds);
}

export async function presentPlaceCard(place: GroceryPlace): Promise<void> {
  const native = nativeModule();
  if (!native) return;
  try {
    await native.presentPlaceCard(
      place.id,
      place.name,
      place.latitude,
      place.longitude,
      place.identifier ?? '',
    );
  } catch {
    // Place Card is iOS 18+; older systems open Maps from native instead.
  }
}
