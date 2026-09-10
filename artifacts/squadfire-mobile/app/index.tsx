import React from 'react';

import { GameScreen } from '@/components/GameScreen';

/** Native entry: Skia is available synchronously, render the game directly. */
export default function IndexScreen() {
  return <GameScreen />;
}
