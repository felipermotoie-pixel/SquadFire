import React from 'react';

import { CampaignScreen } from '@/components/CampaignScreen';

/** Native entry: Skia is available synchronously, render the campaign flow directly. */
export default function IndexScreen() {
  return <CampaignScreen />;
}
