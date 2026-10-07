import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { DeferredLandingPage } from '@/features/landing/DeferredLandingPage';
import { LevelGate } from '@/features/landing/LevelGate';
import { GuestLandingFlow } from '@/features/landing/GuestLandingFlow';
import { INTRO_COOKIE, parseEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { getLandingData } from '@/features/landing/getLandingData';
import { fetchCatalog } from '@/features/billing/billingApi';
import { fetchSiteSettings } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'SciPal' },
  description: 'Khám phá khoa học qua câu hỏi và học liệu song ngữ theo cấp học trên SciPal.',
  openGraph: {
    title: 'SciPal',
    description: 'Khám phá khoa học qua câu hỏi và học liệu song ngữ theo cấp học.',
    type: 'website',
  },
};

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [cookieStore, params] = await Promise.all([cookies(), searchParams]);
  let supabase: ReturnType<typeof createServerClient> | null = null;
  try {
    supabase = createServerClient(cookieStore);
  } catch {
    supabase = null;
  }

  let verifiedUserId: string | null = null;
  const authPromise = (async () => {
    if (!supabase) return;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) verifiedUserId = user.id;
    } catch {
      verifiedUserId = null;
    }
  })();
  const landingPromise = getLandingData(cookieStore, supabase ?? undefined);
  const [, landingData, catalog, site] = await Promise.all([authPromise, landingPromise, fetchCatalog(), fetchSiteSettings()]);
  // Pricing switched off by an admin: the landing page leaves the plans out.
  const pricing = site.features.pricing ? catalog : null;

  const isAuthenticated = verifiedUserId !== null;
  const showIntro = cookieStore.get(INTRO_COOKIE)?.value !== '1';
  let accountLevel: EducationLevel | null = null;
  if (isAuthenticated && supabase && verifiedUserId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_education_level')
      .eq('id', verifiedUserId)
      .maybeSingle();
    if (!error) accountLevel = parseEducationLevel(data?.preferred_education_level);
  }

  const chooseLevel = params.chooseLevel === '1' || (Array.isArray(params.chooseLevel) && params.chooseLevel[0] === '1');
  const saveError = params.saveError === '1' || (Array.isArray(params.saveError) && params.saveError[0] === '1');

  if (!isAuthenticated) {
    return (
      <GuestLandingFlow
        forceChooseLevel={chooseLevel}
        catalog={landingData.catalog}
        informatics={landingData.informatics}
        pricing={pricing}
        saveError={saveError}
        showIntro={showIntro}
      />
    );
  }

  if (accountLevel === null || chooseLevel) {
    return (
      <LevelGate
        currentLevel={accountLevel}
        isAuthenticated
        saveError={saveError}
      />
    );
  }

  return (
      <DeferredLandingPage
      level={accountLevel}
      levelSource="account"
      catalog={landingData.catalog}
      informatics={landingData.informatics}
      pricing={pricing}
      showIntro={showIntro}
    />
  );
}
