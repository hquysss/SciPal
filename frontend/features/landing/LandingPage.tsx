'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Atom, BookOpen, Braces, Dna, FlaskConical, Globe, Lightbulb, Mail, Sigma, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { DemandPollBanner } from '@/features/survey/DemandPollBanner';
import { SubjectMarquee } from '@/features/subjects/SubjectMarquee';
import { applyShellLevel, getShell } from '@/lib/theme/shellTheme';
import type { EducationLevel } from './educationLevel';
import type { InformaticsAvailability, LandingCatalog } from './getLandingData';
import { HeroStage } from './hero/HeroStage';
import { HowItWorks } from './HowItWorks';
import { TutorSection } from './TutorSection';
import { PricingSection } from './PricingSection';
import { InstallAppSection } from './InstallAppSection';
import type { Catalog } from '@/features/billing/billingApi';
import { ReportProblemButton } from '@/features/problemReports/ReportProblem';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'tuilangus@gmail.com';

export interface LandingPageProps {
  level: EducationLevel;
  levelSource: 'account' | 'session';
  /** A guest changes level on this page (the gate opens in place); signed-in users follow a link. */
  onChangeLevel?: () => void;
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
  /** The plan catalog; the pricing section is left out when it could not be read. */
  pricing?: Catalog | null;
}

type Copy = { en: string; vi: string };

/** Subject glyphs drifting up through the closing call to action (decoration only). */
const CTA_FLOATS = [Atom, Sigma, FlaskConical, Braces, Dna, BookOpen, Globe, Lightbulb];

const LEVEL_LABEL: Record<EducationLevel, Copy> = {
  primary: { en: 'Primary · Grades 1–5', vi: 'Tiểu học · Lớp 1–5' },
  lower_secondary: { en: 'Lower secondary · Grades 6–9', vi: 'THCS · Lớp 6–9' },
  upper_secondary: { en: 'Upper secondary · Grades 10–12', vi: 'THPT · Lớp 10–12' },
};

const HERO_TITLE: Record<EducationLevel, [Copy, Copy]> = {
  primary: [
    { vi: 'Bắt đầu từ', en: 'Start with' },
    { vi: 'điều bạn tò mò.', en: 'what you wonder.' },
  ],
  lower_secondary: [
    { vi: 'Mỗi câu hỏi', en: 'Every question' },
    { vi: 'là một bước hiểu thêm.', en: 'grows understanding.' },
  ],
  upper_secondary: [
    { vi: 'Hiểu từng bài,', en: 'Understand each lesson.' },
    { vi: 'tiến từng bước.', en: 'Move forward step by step.' },
  ],
};

/** A link to #landing-title puts focus on the heading, then drops the hash from the address. */
function useFocusTitleFromHash() {
  useEffect(() => {
    const title = document.getElementById('landing-title');
    if (window.location.hash === '#landing-title' && title) {
      title.focus({ preventScroll: true });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
}

/** "Đổi cấp": a button that opens the gate in place for guests, a link for signed-in users. */
function ChangeLevel({ onChangeLevel, className }: { onChangeLevel?: () => void; className: string }) {
  const { t } = useLanguage();
  const label = t({ en: 'Change level', vi: 'Đổi cấp' });
  return onChangeLevel ? (
    <button type="button" onClick={onChangeLevel} className={className}>
      {label}
    </button>
  ) : (
    <Link href="/?chooseLevel=1" className={className}>
      {label}
    </Link>
  );
}

export function LandingPage({ level, levelSource, catalog, onChangeLevel, pricing = null }: LandingPageProps) {
  const { t, lang } = useLanguage();
  const [titleFirst, titleSecond] = HERO_TITLE[level];

  useEffect(() => {
    applyShellLevel(getShell(), level);
  }, [level]);
  useFocusTitleFromHash();

  return (
    <div className={styles.page} data-level={level} data-scipal-level={level} lang={lang}>
      <main className={styles.shell}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.levelLabel}>{t(LEVEL_LABEL[level])}</p>
            <h1 id="landing-title" tabIndex={-1} className={styles.heroTitle}>
              <span className={styles.heroLine}>{t(titleFirst)}</span>
              <span className={styles.heroLine}>
                <span className={styles.heroTitleAccent}>{t(titleSecond)}</span>
              </span>
            </h1>
            <p className={styles.heroSubline}>
              {t({
                en: 'Learn in Vietnamese and English with Vietnam’s 2018 national curriculum.',
                vi: 'Học song ngữ Anh–Việt theo Chương trình GDPT 2018.',
              })}
            </p>
            <div className={styles.heroActions}>
              <a href="#mon-hoc" className={styles.primaryAction}>
                {t({ en: 'Explore subjects', vi: 'Xem môn học' })}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <ChangeLevel onChangeLevel={onChangeLevel} className={styles.secondaryAction} />
            </div>
          </div>
          <div className={styles.heroArt}>
            <HeroStage level={level} />
          </div>
        </section>

        <section className={styles.subjects} id="mon-hoc" aria-labelledby="subjects-title">
          <div className={styles.sectionHeading}>
            <h2 id="subjects-title" className={styles.sectionTitle}>
              {t({ en: 'Your subjects', vi: 'Môn học của bạn' })}
            </h2>
            <ChangeLevel onChangeLevel={onChangeLevel} className={styles.inlineLink} />
            <p className={styles.srOnly}>
              {levelSource === 'account'
                ? t({ en: 'Your level is saved to your account.', vi: 'Cấp học đã lưu vào tài khoản.' })
                : t({ en: 'Your level is saved in this tab.', vi: 'Cấp học được lưu trong tab này.' })}
            </p>
          </div>
          <div className={styles.subjectGrid}>
            <SubjectMarquee level={level} catalog={catalog} />
          </div>
        </section>

        <HowItWorks level={level} />
        <TutorSection href="/tutor" level={level} />
        <InstallAppSection />
        {pricing && <PricingSection catalog={pricing} />}

        <section className={styles.finalCta} aria-labelledby="start-title">
          <div className={styles.ctaFloats} aria-hidden="true">
            {CTA_FLOATS.map((Icon, index) => (
              <span key={index} data-cta-float="" style={{ '--i': index } as React.CSSProperties}>
                <Icon size={26} strokeWidth={1.6} />
              </span>
            ))}
          </div>
          <div className={styles.finalBody}>
            <h2 id="start-title" className={styles.finalTitle}>{t({ en: 'Ready?', vi: 'Sẵn sàng chưa?' })}</h2>
            <p className={styles.finalLead}>
              {t({
                en: 'Every lesson is free. Pick a subject and start today.',
                vi: 'Mọi bài học đều miễn phí. Chọn một môn và bắt đầu ngay hôm nay.',
              })}
            </p>
            <div className={styles.finalActions}>
              <a href="#mon-hoc" className={styles.finalAction}>
                {t({ en: 'Start learning', vi: 'Bắt đầu học' })}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link href="/tutor" className={styles.finalGhost}>
                <Sparkles size={17} aria-hidden="true" />
                {t({ en: 'Ask the SciPal Professor', vi: 'Hỏi Giáo sư SciPal' })}
              </Link>
            </div>
          </div>
          <div className={styles.poll}>
            <DemandPollBanner />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}>
            <Image src="/logo.svg" width={39} height={39} alt="" aria-hidden="true" />
            <span>
              <strong>SciPal</strong>
              <small>{t({ en: 'Bilingual lessons for Vietnam’s 2018 curriculum.', vi: 'Học song ngữ theo Chương trình GDPT 2018.' })}</small>
            </span>
          </Link>
          <div className={styles.footerContact}>
            <p className={styles.footerContactTitle}>{t({ en: 'Contact us', vi: 'Liên hệ' })}</p>
            <nav className={styles.footerLinks} aria-label={t({ en: 'Contact SciPal', vi: 'Liên hệ SciPal' })}>
              <a href={CONTACT_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                <Image src="/facebook-icon.svg" width={18} height={18} alt="" aria-hidden="true" />
                <span>Facebook</span>
              </a>
              <a href={'mailto:' + CONTACT_EMAIL}>
                <Mail size={17} aria-hidden="true" />
                <span>Email</span>
              </a>
            </nav>
          </div>
          <p className={styles.footerCopyright}>
            <Link href="/privacy" className={styles.footerPolicy}>
              {t({ en: 'Privacy', vi: 'Quyền riêng tư' })}
            </Link>
            <span aria-hidden="true"> · </span>
            <ReportProblemButton className={styles.footerPolicy} />
            <span aria-hidden="true"> · </span>© SciPal
          </p>
        </div>
      </footer>
    </div>
  );
}
