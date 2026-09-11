/**
 * Campaign persistence (AsyncStorage). Kept apart from the pure progress model so
 * the simulation and tests never import platform code.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CAMPAIGN_STORAGE_KEY, LEGACY_STORAGE_KEYS, defaultCampaign, migrateCampaign, type CampaignProgress } from './campaign-progress';

export { defaultCampaign, migrateCampaign, recordStageCleared, recordStageReached, type CampaignProgress } from './campaign-progress';

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

export async function saveCampaign(progress: CampaignProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('[campaign] save failed', err);
  }
}

export async function resetCampaign(): Promise<CampaignProgress> {
  const fresh = defaultCampaign();
  await saveCampaign(fresh);
  return fresh;
}
