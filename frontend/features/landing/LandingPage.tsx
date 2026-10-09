'use client';

import { useEffect, useRef, useState } from 'react';
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
import { useCountUp, useInView } from './countUp';
import { IntroCurtain, introPlayed } from './IntroCurtain';
import { SubjectSpotlight } from './SubjectSpotlight';
import type { Catalog } from '@/features/billing/billingApi';
import { ReportProblemButton } from '@/features/problemReports/ReportProblem';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'tuilangus@gmail.com';

export interface LandingPageProps {
  level: EducationLevel;
  /** A guest changes level on this page (the gate opens in place); signed-in users follow a link. */
  onChangeLevel?: () => void;
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
  /** The plan catalog; the pricing section is left out when it could not be read. */
  pricing?: Catalog | null;
  /** Play the intro curtain (first visit of the browser session). */
  showIntro?: boolean;
}

type Copy = { en: string; vi: string };

const CTA_FLOATS = [Atom, Sigma, FlaskConical, Braces, Dna, BookOpen, Globe, Lightbulb];

const LEVEL_LABEL: Record<EducationLevel, Copy> = {
  primary: { en: 'Primary · Grades 1–5', vi: 'Tiểu học · Lớp 1–5' },
  lower_secondary: { en: 'Lower secondary · Grades 6–9', vi: 'THCS · Lớp 6–9' },
  upper_secondary: { en: 'Upper secondary · Grades 10–12', vi: 'THPT · Lớp 10–12' },
};

const LEVEL_GRADES: Record<EducationLevel, number> = { primary: 5, lower_secondary: 4, upper_secondary: 3 };

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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useRevealOnScroll(pageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    const title = document.getElementById('landing-title');
    if (window.location.hash === '#landing-title' && title) {
      title.focus({ preventScroll: true });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (!page) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches || !('IntersectionObserver' in window)) return;

    const targets = Array.from(page.querySelectorAll<HTMLElement>('[data-landing-reveal]'));
    const clearReveal = (target: Element) => target.classList.remove(styles.revealPending, styles.revealed);
    const settling = new WeakMap<Element, () => void>();

    // Once the entrance has played, drop the reveal classes: while they stay, their transition
    // list replaces the element's own, and hover lifts and shadows would jump instead of ease.
    const settle = (target: Element) => {
      const onEnd = (event: Event) => {
        if (event.target !== target || (event as TransitionEvent).propertyName !== 'opacity') return;
        done();
      };
      const stop = () => {
        target.removeEventListener('transitionend', onEnd);
        window.clearTimeout(fallback);
        settling.delete(target);
      };
      const done = () => {
        stop();
        clearReveal(target);
      };
      target.addEventListener('transitionend', onEnd);
      const fallback = window.setTimeout(done, 1400);
      settling.set(target, stop);
    };

    // Every time a sheet comes into view it rises again: leaving the screen (either way) puts it
    // back under the page, so scrolling up or down replays the entrance.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target;
        if (!entry.isIntersecting) {
          settling.get(target)?.();
          target.removeAttribute('data-landing-motion-visible');
          target.classList.remove(styles.revealed);
          target.classList.add(styles.revealPending);
          return;
        }
        const enough = entry.intersectionRatio >= 0.12 || entry.intersectionRect.height >= window.innerHeight * 0.3;
        if (!enough || !target.classList.contains(styles.revealPending)) return;
        target.setAttribute('data-landing-motion-visible', 'true');
        target.classList.add(styles.revealed);
        settle(target);
      });
    }, { threshold: [0, 0.12, 0.3] });

    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', String((index % 3) * 80) + 'ms');
      // Already on screen at load: leave it as is, fully visible, until it first leaves.
      if (target.getBoundingClientRect().top >= window.innerHeight * 0.95) target.classList.add(styles.revealPending);
      observer.observe(target);
    });

    const revealPending = () => {
      if (!motionPreference.matches) return;
      observer.disconnect();
      targets.forEach((target) => {
        clearReveal(target);
        target.removeAttribute('data-landing-motion-visible');
      });
    };
    motionPreference.addEventListener('change', revealPending);

    return () => {
      observer.disconnect();
      motionPreference.removeEventListener('change', revealPending);
    };
  }, [pageRef]);
}

/**
 * Clip-mask reveals: lines and ghost words under [data-clip] slide up out of their mask the
 * first time they enter the screen. Only headings below the fold are armed, so nothing that
 * is already visible at load blinks out and back.
 */
function useClipReveal(pageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page || reducedMotion() || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        entry.target.classList.add(styles.clipIn);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    page.querySelectorAll<HTMLElement>('[data-clip]').forEach((target) => {
      if (target.getBoundingClientRect().top < window.innerHeight * 0.95) return;
      target.classList.add(styles.clipArmed);
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, [pageRef]);
}

/**
 * Writes each [data-scroll-progress] section's scroll progress (0 entering, 1 leaving) into --p on the
 * section and on its [data-par] words. --p is registered as non-inherited, so a frame only restyles those
 * few elements, not the whole subtree. Sections off screen are skipped.
 */
function useScrollProgress(pageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page || reducedMotion()) return;
    const sections = Array.from(page.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const section of sections) {
        const box = section.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) continue;
        const value = Math.min(1, Math.max(0, (window.innerHeight - box.top) / (window.innerHeight + box.height))).toFixed(3);
        section.style.setProperty('--p', value);
        section.querySelectorAll<HTMLElement>('[data-par]').forEach((node) => node.style.setProperty('--p', value));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pageRef]);
}

/** A stat that counts up from zero each time it scrolls into view; the final value is what readers get. */
function StatValue({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useCountUp(value, useInView(ref));
  return (
    <>
      <span className={styles.srOnly}>{value + suffix}</span>
      <span ref={ref} className={styles.statValue} aria-hidden="true">{shown + suffix}</span>
    </>
  );
}

/** Lines that slide up out of a mask, one after another. */
function ClipLines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => (
    <span key={index} className={styles.clipLine} style={{ '--i': index } as React.CSSProperties}>
      <span>{line}</span>
    </span>
  ));
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

export function LandingPage({ level, catalog, onChangeLevel, pricing = null, showIntro = false }: LandingPageProps) {
  const { t, lang } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);
  const [intro] = useState(() => showIntro && !introPlayed());
  const [ready, setReady] = useState(!intro);
  const [titleFirst, titleSecond] = HERO_TITLE[level];
  const liveSubjects = catalog?.kind === 'ready'
    ? catalog.subjects.filter((subject) => subject.education_level === level && subject.status === 'active').length
    : null;

  useEffect(() => {
    applyShellLevel(getShell(), level);
  }, [level]);
  useRevealOnScroll(pageRef);
  useClipReveal(pageRef);
  useScrollProgress(pageRef);

  const stats: Array<{ value: number; suffix?: string; label: Copy }> = [
    ...(liveSubjects ? [{ value: liveSubjects, label: { en: 'Subjects open now', vi: 'Môn đang mở' } }] : []),
    { value: LEVEL_GRADES[level], label: { en: 'Grades at this level', vi: 'Khối lớp trong cấp' } },
    { value: 2, label: { en: 'Languages in every lesson', vi: 'Ngôn ngữ trong mỗi bài' } },
    { value: 100, suffix: '%', label: { en: 'Free lessons', vi: 'Bài học miễn phí' } },
  ];

  return (
    <>
      {intro && <IntroCurtain level={level} onReady={() => setReady(true)} />}
      <div className={styles.page} data-level={level} data-scipal-level={level} data-ready={ready ? '' : undefined} lang={lang} ref={pageRef}>
        <main className={styles.shell}>
          {/* ---------- hero ---------- */}
          <section className={styles.hero} aria-labelledby="landing-title" data-scroll-progress>
            <div className={styles.heroTop}>
              <p className={styles.eyebrowLight}>{t(LEVEL_LABEL[level])}</p>
              <h1 id="landing-title" tabIndex={-1} className={styles.heroTitle}>
                <ClipLines lines={[t(titleFirst), t(titleSecond)]} />
              </h1>
            </div>
            <div className={styles.heroBottom}>
              <div className={styles.heroCopy}>
                <p className={styles.heroSubline}>
                  {t({
                    en: 'Learn in Vietnamese and English with Vietnam’s 2018 national curriculum.',
                    vi: 'Học song ngữ Anh–Việt theo Chương trình GDPT 2018.',
                  })}
                </p>
                <div className={styles.heroActions}>
                  <Link href="#mon-hoc" className={styles.pillLight}>
                    {t({ en: 'Explore subjects', vi: 'Xem môn học' })}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <ChangeLevel onChangeLevel={onChangeLevel} className={styles.pillGhost} />
                </div>
              </div>
              <div className={styles.heroArt}>
                <HeroStage level={level} />
              </div>
            </div>
          </section>

          {/* ---------- ghost heading ---------- */}
          <section className={styles.trust} aria-labelledby="trust-title" data-scroll-progress>
            <div className={styles.trustTop}>
              <div className={styles.pct} data-landing-reveal>
                <strong>100%</strong>
                <small>{t({ en: 'Lessons free to learn', vi: 'Bài học miễn phí' })}</small>
              </div>
              <article className={styles.badge} data-landing-reveal>
                <span className={styles.badgeIndex}>#2018</span>
                <div>
                  <h3>{t({ en: 'Built on the national curriculum', vi: 'Theo Chương trình GDPT 2018' })}</h3>
                  <p>
                    {t({
                      en: 'Every lesson follows Vietnam’s 2018 curriculum, with each term and explanation in both Vietnamese and English.',
                      vi: 'Mỗi bài bám sát Chương trình GDPT 2018, kèm thuật ngữ và lời giải thích bằng cả tiếng Việt lẫn tiếng Anh.',
                    })}
                  </p>
                </div>
              </article>
            </div>
            <SubjectSpotlight level={level} catalog={catalog} />
          </section>

          {/* ---------- subjects ---------- */}
          <section className={styles.subjects} id="mon-hoc" aria-labelledby="subjects-title">
            <div className={styles.sectionHeading} data-landing-reveal>
              <div>
                <p className={styles.eyebrow}>{t(LEVEL_LABEL[level])}</p>
                <h2 id="subjects-title" className={styles.sectionTitle} data-clip>
                  <ClipLines lines={[t({ en: 'Your subjects', vi: 'Môn học của bạn' })]} />
                </h2>
              </div>
              <ChangeLevel onChangeLevel={onChangeLevel} className={styles.inlineLink} />
            </div>
            <div className={styles.subjectGrid} data-landing-reveal data-subject-grid>
              <SubjectMarquee level={level} catalog={catalog} />
            </div>
          </section>

          {/* ---------- existing feature sections on a lifted sheet ---------- */}
          <div className={styles.sheet}>
            <HowItWorks level={level} />
            <TutorSection href="/tutor" level={level} />
            <InstallAppSection />
            {pricing && <PricingSection catalog={pricing} />}
          </div>

          {/* ---------- stats ---------- */}
          <section className={styles.stats} aria-labelledby="stats-title">
            <p className={styles.eyebrowLight}>{t({ en: 'By the numbers', vi: 'Những con số' })}</p>
            <h2 id="stats-title" className={styles.sectionTitle} data-clip>
              <ClipLines lines={[t({ en: 'Learning that', vi: 'Học tập' }), t({ en: 'adds up', vi: 'có số liệu' })]} />
            </h2>
            <dl className={styles.statGrid}>
              {stats.map((stat) => (
                <div key={stat.label.en} className={styles.stat} data-landing-reveal>
                  <dt className={styles.srOnly}>{t(stat.label)}</dt>
                  <dd>
                    <StatValue value={stat.value} suffix={stat.suffix} />
                    <span className={styles.statLabel} aria-hidden="true">{t(stat.label)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ---------- final call to action ---------- */}
          <section className={styles.finalCta} aria-labelledby="start-title" data-landing-reveal>
            <div className={styles.ctaFloats} aria-hidden="true">
              {CTA_FLOATS.map((Icon, index) => (
                <span key={index} data-cta-float style={{ '--i': index } as React.CSSProperties}>
                  <Icon size={28} strokeWidth={1.5} />
                </span>
              ))}
            </div>
            <div className={styles.finalBody}>
              <div>
                <p className={styles.eyebrowLight}>{t({ en: 'Get started', vi: 'Bắt đầu' })}</p>
                <h2 id="start-title" className={styles.finalTitle}>{t({ en: 'Ready?', vi: 'Sẵn sàng chưa?' })}</h2>
                <p className={styles.finalLead}>
                  {t({
                    en: 'Every lesson is free. Pick a subject and start today.',
                    vi: 'Mọi bài học đều miễn phí. Chọn một môn và bắt đầu ngay hôm nay.',
                  })}
                </p>
              </div>
              <div className={styles.finalActions}>
                <Link href="/subjects" className={styles.pillLight}>
                  {t({ en: 'Start learning', vi: 'Bắt đầu học' })}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/tutor" className={styles.pillGhost}>
                  <Sparkles size={16} aria-hidden="true" />
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
          <div className={styles.footerCols}>
            <div className={styles.footerBrandCol}>
              <Link href="/" className={styles.footerBrand}>
                <Image src="/logo.svg" width={32} height={32} alt="" aria-hidden="true" />
                <strong>SciPal</strong>
              </Link>
              <p>{t({ en: 'Bilingual lessons for Vietnam’s 2018 curriculum.', vi: 'Học song ngữ theo Chương trình GDPT 2018.' })}</p>
            </div>
            <nav className={styles.footerCol} aria-label={t({ en: 'Learn', vi: 'Học tập' })}>
              <h3>{t({ en: 'Learn', vi: 'Học tập' })}</h3>
              <ul>
                <li><Link href="/subjects">{t({ en: 'Subjects', vi: 'Môn học' })}</Link></li>
                <li><Link href="/glossary">{t({ en: 'Glossary', vi: 'Từ điển thuật ngữ' })}</Link></li>
                <li><Link href="/tutor">{t({ en: 'SciPal Professor', vi: 'Giáo sư SciPal' })}</Link></li>
              </ul>
            </nav>
            <nav className={styles.footerCol} aria-label={t({ en: 'Contact SciPal', vi: 'Liên hệ SciPal' })}>
              <h3>{t({ en: 'Contact us', vi: 'Liên hệ' })}</h3>
              <ul>
                <li>
                  <a href={CONTACT_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                    <Image src="/facebook-icon.svg" width={16} height={16} alt="" aria-hidden="true" />
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={'mailto:' + CONTACT_EMAIL}>
                    <Mail size={16} aria-hidden="true" />
                    Email
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className={styles.footerBar}>
            <p>© SciPal</p>
            <p className={styles.footerLegal}>
              <Link href="/privacy" className={styles.footerPolicy}>
                {t({ en: 'Privacy', vi: 'Quyền riêng tư' })}
              </Link>
              <ReportProblemButton className={styles.footerPolicy} />
              <Link href="/feedback" className={styles.footerPolicy}>{t({ en: 'Review SciPal', vi: 'Đánh giá SciPal' })}</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
