import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GEOFENCE_TASK, LOCATION_TASK } from './constants';
import { handleGeofenceEvent, onBackgroundLocation } from './pings';

type GeofencePayload = {
  eventType?: Location.GeofencingEventType;
  region?: { identifier?: string };
};

type LocationPayload = {
  locations?: {
    coords: { latitude: number; longitude: number; speed?: number | null };
  }[];
};

if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
    if (error) return;
    const payload = data as GeofencePayload;
    const regionId = payload.region?.identifier;
    const eventType = payload.eventType;
    if (regionId == null || eventType == null) return;
    void handleGeofenceEvent(eventType, regionId);
  });
}

if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
    if (error) return;
    const coords = (data as LocationPayload).locations?.at(-1)?.coords;
    if (!coords) return;
    void onBackgroundLocation(coords);
  });
}
