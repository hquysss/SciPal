'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { DemandPollBanner } from '@/features/survey/DemandPollBanner';
import { SubjectGrid } from '@/features/subjects/SubjectGrid';
import { applyShellLevel, getShell } from '@/lib/theme/shellTheme';
import type { EducationLevel } from './educationLevel';
import type { InformaticsAvailability, LandingCatalog } from './getLandingData';
import { HeroStage } from './hero/HeroStage';
import { HowItWorks } from './HowItWorks';
import { TutorSection } from './TutorSection';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'tuilangus@gmail.com';

export interface LandingPageProps {
  level: EducationLevel;
  levelSource: 'account' | 'session';
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
}

type Copy = { en: string; vi: string };

const LEVEL_LABEL: Record<EducationLevel, Copy> = {
  primary: { en: 'Primary · Grades 1–5', vi: 'Tiểu học · Lớp 1–5' },
  lower_secondary: { en: 'Lower secondary · Grades 6–9', vi: 'THCS · Lớp 6–9' },
  upper_secondary: { en: 'Upper secondary · Grades 10–12', vi: 'THPT · Lớp 10–12' },
};

const HERO_TITLE: Record<EducationLevel, [Copy, Copy]> = {
  primary: [
    { vi: 'Bắt đầu từ', en: 'Start with' },
    { vi: 'điều em tò mò.', en: 'what you wonder.' },
  ],
  lower_secondary: [
    { vi: 'Từng câu hỏi', en: 'Every question' },
    { vi: 'mở rộng hiểu biết.', en: 'grows understanding.' },
  ],
  upper_secondary: [
    { vi: 'Hiểu khoa học', en: 'Make sense of science,' },
    { vi: 'từ câu hỏi đầu tiên.', en: 'one question at a time.' },
  ],
};

function useRevealOnScroll(pageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    const title = document.getElementById('landing-title');
    if (window.location.hash === '#landing-title' && title) {
      title.focus({ preventScroll: true });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (
      !page ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    const targets = Array.from(page.querySelectorAll<HTMLElement>('[data-landing-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.revealed);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    targets.forEach((target, index) => {
      if (target.getBoundingClientRect().top < window.innerHeight * 0.95) {
        target.classList.add(styles.revealed);
        return;
      }
      target.style.setProperty('--reveal-delay', String((index % 3) * 80) + 'ms');
      target.classList.add(styles.revealPending);
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, [pageRef]);
}

export function LandingPage({ level, levelSource, catalog, informatics }: LandingPageProps) {
  const { t, lang } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);
  const [titleFirst, titleSecond] = HERO_TITLE[level];

  useEffect(() => {
    applyShellLevel(getShell(), level);
  }, [level]);
  useRevealOnScroll(pageRef);

  return (
    <div className={styles.page} data-level={level} data-scipal-level={level} lang={lang} ref={pageRef}>
      <main className={styles.shell}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.levelLabel}>{t(LEVEL_LABEL[level])}</p>
            <h1 id="landing-title" tabIndex={-1} className={styles.heroTitle}>
              {t(titleFirst)}
              <span className={styles.heroTitleAccent}>{t(titleSecond)}</span>
            </h1>
            <p className={styles.heroSubline}>
              {t({
                en: 'Bilingual lessons that follow your curriculum.',
                vi: 'Bài học song ngữ, theo đúng chương trình của em.',
              })}
            </p>
            <div className={styles.heroActions}>
              <a href="#mon-hoc" className={styles.primaryAction}>
                {t({ en: 'Explore subjects', vi: 'Xem môn học' })}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link href="/?chooseLevel=1" className={styles.secondaryAction}>
                {t({ en: 'Change level', vi: 'Đổi cấp' })}
              </Link>
            </div>
          </div>
          <div className={styles.heroArt}>
            <HeroStage level={level} />
          </div>
        </section>

        <section className={styles.subjects} id="mon-hoc" aria-labelledby="subjects-title">
          <div className={styles.sectionHeading} data-landing-reveal>
            <h2 id="subjects-title" className={styles.sectionTitle}>
              {t({ en: 'Your subjects', vi: 'Môn học của bạn' })}
            </h2>
            <Link href="/?chooseLevel=1" className={styles.inlineLink}>
              {t({ en: 'Change level', vi: 'Đổi cấp' })}
            </Link>
            <p className={styles.srOnly}>
              {levelSource === 'account'
                ? t({ en: 'Your level is saved to your account.', vi: 'Cấp học đã lưu vào tài khoản.' })
                : t({ en: 'Your level is saved in this tab.', vi: 'Cấp học được lưu trong tab này.' })}
            </p>
          </div>
          <div className={styles.subjectGrid} data-landing-reveal>
            <SubjectGrid level={level} catalog={catalog} informatics={informatics} />
          </div>
        </section>

        <HowItWorks />
        <TutorSection />

        <section className={styles.finalCta} aria-labelledby="start-title" data-landing-reveal>
          <h2 id="start-title" className={styles.finalTitle}>{t({ en: 'Ready?', vi: 'Sẵn sàng chưa?' })}</h2>
          <a href="#mon-hoc" className={styles.finalAction}>
            {t({ en: 'Start learning', vi: 'Bắt đầu học' })}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>

        <section className={styles.poll} aria-label={t({ en: 'Subject demand poll', vi: 'Khảo sát nhu cầu môn học' })}>
          <DemandPollBanner />
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}>
            <Image src="/logo.svg" width={39} height={39} alt="" aria-hidden="true" />
            <span>
              <strong>SciPal</strong>
              <small>{t({ en: 'Learning made easy with SciPal.', vi: 'Học tập dễ dàng cùng SciPal.' })}</small>
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
          <p className={styles.footerCopyright}>© SciPal</p>
        </div>
      </footer>
    </div>
  );
}
