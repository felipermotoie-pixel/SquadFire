/**
 * Campaign persistence (AsyncStorage). Kept apart from the pure progress model so
 * the simulation and tests never import platform code.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CAMPAIGN_STORAGE_KEY, LEGACY_STORAGE_KEYS, defaultCampaign, migrateCampaign, serializeCampaign, type CampaignProgress } from './campaign-progress';

export {
  defaultCampaign,
  migrateCampaign,
  planetProgress,
  recordPlanetCompleted,
  recordStageCleared,
  serializeCampaign,
  type CampaignProgress,
  type PlanetProgress,
} from './campaign-progress';

export async function loadCampaign(): Promise<CampaignProgress> {
  try {
    const current = await AsyncStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (current) return migrateCampaign(JSON.parse(current));
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy) {
        const migrated = migrateCampaign(JSON.parse(legacy));
        await saveCampaign(migrated);
        return migrated;
      }
    }
  } catch (err) {
    console.warn('[campaign] load failed, starting fresh', err);
  }
  return defaultCampaign();
}

/**
 * Writes are chained so two commits issued in the same tick can never land on disk
 * out of order (an older write finishing last would resurrect stale progress).
 */
let writeChain: Promise<void> = Promise.resolve();

export function saveCampaign(progress: CampaignProgress): Promise<void> {
  const payload = serializeCampaign(progress);
  writeChain = writeChain.then(async () => {
    try {
      await AsyncStorage.setItem(CAMPAIGN_STORAGE_KEY, payload);
    } catch (err) {
      console.warn('[campaign] save failed', err);
    }
  });
  return writeChain;
}

export async function resetCampaign(): Promise<CampaignProgress> {
  const fresh = defaultCampaign();
  await saveCampaign(fresh);
  return fresh;
}
