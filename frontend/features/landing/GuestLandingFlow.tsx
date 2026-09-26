'use client';

import { useEffect, useState } from 'react';
import { LevelGate } from './LevelGate';
import { DeferredLandingPage } from './DeferredLandingPage';
import {
  readSessionEducationLevel,
  writeSessionEducationLevel,
  type EducationLevel,
} from './educationLevel';
import type { InformaticsAvailability, LandingCatalog } from './getLandingData';

interface GuestLandingFlowProps {
  forceChooseLevel: boolean;
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
  saveError: boolean;
}

export function GuestLandingFlow({
  forceChooseLevel,
  catalog,
  informatics,
  saveError,
}: GuestLandingFlowProps) {
  const [sessionLevel, setSessionLevel] = useState<EducationLevel | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [forceGate, setForceGate] = useState(forceChooseLevel);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      setSessionLevel(readSessionEducationLevel(window.sessionStorage));
    } catch {
      setSessionLevel(null);
    }
    setSessionReady(true);
  }, []);

  const handleGuestSelect = (level: EducationLevel) => {
    try {
      writeSessionEducationLevel(window.sessionStorage, level);
    } catch {
      setStorageError(true);
      return;
    }

    setSessionLevel(level);
    setSessionReady(true);
    setForceGate(false);
    setStorageError(false);

    const url = new URL(window.location.href);
    url.searchParams.delete('chooseLevel');
    url.searchParams.delete('saveError');
    window.history.replaceState(window.history.state, '', url);
  };

  if (!sessionReady || forceGate || sessionLevel === null) {
    return (
      <LevelGate
        currentLevel={sessionLevel}
        isAuthenticated={false}
        saveError={storageError || saveError}
        onGuestSelect={handleGuestSelect}
      />
    );
  }

  return (
    <DeferredLandingPage
      level={sessionLevel}
      levelSource="session"
      catalog={catalog}
      informatics={informatics}
    />
  );
}
