'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Atom, ChevronUp, Menu, BookOpen, Braces, Dna, FlaskConical, Globe, Lightbulb, Mail, Sigma, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { DemandPollBanner } from '@/features/survey/DemandPollBanner';
import { fetchWebsiteFeedback } from '@/features/website-feedback/api';
import { WebsiteFeedbackBoard } from '@/features/website-feedback/WebsiteFeedbackBoard';
import { WebsiteFeedbackForm } from '@/features/website-feedback/WebsiteFeedbackForm';
import { SubjectMarquee } from '@/features/subjects/SubjectMarquee';
import ScrollVelocity from '@/components/ScrollVelocity';
import ShinyText from '@/components/ShinyText';
import { ParticleLines, useParticleTitle } from './hero/HeroParticleTitle';
import { applyShellLevel, getShell } from '@/lib/theme/shellTheme';
import type { EducationLevel } from './educationLevel';
import type { InformaticsAvailability, LandingCatalog } from './getLandingData';
import { HeroStage } from './hero/HeroStage';
import { HowItWorks } from './HowItWorks';
import { TutorSection } from './TutorSection';
import { PricingSection } from './PricingSection';
import { FeaturesSection } from './FeaturesSection';
import { CommunitySection } from './CommunitySection';
import { FaqSection } from './FaqSection';
import { InstallAppSection } from './InstallAppSection';
import { useCountUp, useInView } from './countUp';
import { IntroCurtain, introPlayed } from './IntroCurtain';
import { SubjectSpotlight } from './SubjectSpotlight';
import type { Catalog } from '@/features/billing/billingApi';
import { ReportProblemButton } from '@/features/problemReports/ReportProblem';
import feedbackStyles from '@/features/website-feedback/feedback.module.css';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'contact@scipal.io.vn';

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

const HERO_TITLE: Record<EducationLevel, [Copy, Copy]> = {
  primary: [
    { vi: 'Bắt đầu từ', en: 'Start with' },
    { vi: 'điều bạn tò mò.', en: 'what you wonder.' },
  ],
  lower_secondary: [
    { vi: 'Hiểu bài sâu hơn', en: 'Understand more' },
    { vi: 'qua từng câu hỏi.', en: 'one question at a time.' },
  ],
  upper_secondary: [
    { vi: 'Hiểu từng bài,', en: 'Understand each lesson.' },
    { vi: 'tiến từng bước.', en: 'Move forward step by step.' },
  ],
};

/** Where each scene's subject sits, so the crop keeps them in frame when the panel is wider than the photo. */
const HERO_FOCUS: Record<EducationLevel, string> = {
  primary: '80% 35%',
  lower_secondary: '72% 30%',
  upper_secondary: '72% 35%',
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
      // Measure every section before writing any --p, so a frame forces at most one layout.
      const height = window.innerHeight;
      const boxes = sections.map((section) => section.getBoundingClientRect());
      sections.forEach((section, index) => {
        const box = boxes[index];
        if (box.bottom < 0 || box.top > height) return;
        const value = Math.min(1, Math.max(0, (height - box.top) / (height + box.height))).toFixed(3);
        section.style.setProperty('--p', value);
        section.querySelectorAll<HTMLElement>('[data-par]').forEach((node) => node.style.setProperty('--p', value));
      });
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

/** Colors the burst's sparks cycle through; all level tokens, so the burst follows the theme. */
const SPARK_COLORS = ['var(--sun)', 'var(--coral)', 'var(--sky)', 'var(--action)'];
const SPARKS = Array.from({ length: 16 }, (_, index) => ({
  angle: index * (360 / 16) + (index % 2) * 8,
  reach: 7 + (index % 3) * 3,
  color: SPARK_COLORS[index % SPARK_COLORS.length],
}));

/**
 * "Explore": a burst erupts from the button (shockwave, sparks, flash), then the page glides down to
 * the section under the hero. Reduced motion skips the burst and the glide and jumps straight there.
 */
function useExploreBurst() {
  const heroRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const explore = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('gioi-thieu');
    const hero = heroRef.current;
    if (!target) return;
    event.preventDefault();
    if (!hero || reducedMotion()) {
      target.scrollIntoView();
      return;
    }
    const heroBox = hero.getBoundingClientRect();
    const buttonBox = event.currentTarget.getBoundingClientRect();
    hero.style.setProperty('--bx', `${buttonBox.left + buttonBox.width / 2 - heroBox.left}px`);
    hero.style.setProperty('--by', `${buttonBox.top + buttonBox.height / 2 - heroBox.top}px`);
    // Restart the animation if it is clicked again mid-burst.
    hero.removeAttribute('data-burst');
    void hero.offsetWidth;
    hero.setAttribute('data-burst', '');
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [
      window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 420),
      window.setTimeout(() => hero.removeAttribute('data-burst'), 1400),
    ];
  };

  return { heroRef, explore };
}

/**
 * While the hero photo is on screen the floating nav bar folds away (data-hero-nav on the app shell) and a
 * small toggle brings it back. Past the hero, the bar returns on its own.
 */
function useHeroNav(panelRef: React.RefObject<HTMLDivElement | null>) {
  const [inHero, setInHero] = useState(true);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInHero(entry.isIntersecting);
      if (!entry.isIntersecting) setPeek(false);
    }, { rootMargin: '-72px 0px 0px 0px' });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelRef]);

  useEffect(() => {
    const shell = document.querySelector('[data-app-shell]');
    if (!shell) return;
    if (inHero && !peek) shell.setAttribute('data-hero-nav', 'hidden');
    else shell.removeAttribute('data-hero-nav');
    return () => shell.removeAttribute('data-hero-nav');
  }, [inHero, peek]);

  return { inHero, peek, togglePeek: () => {
      // The bar keeps its own remembered "hidden" state on wide screens; clear it so peeking really shows the bar.
      if (!peek) document.querySelector<HTMLButtonElement>('header[data-bar-hidden] button[aria-pressed="true"]')?.click();
      setPeek((value) => !value);
    },
  };
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
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const [titleFirst, titleSecond] = HERO_TITLE[level];
  const liveSubjects = catalog?.kind === 'ready'
    ? catalog.subjects.filter((subject) => subject.education_level === level && subject.status === 'active').length
    : null;

  const [rating, setRating] = useState<{ average: number; total: number } | null>(null);
  const { heroRef, explore } = useExploreBurst();
  const panelRef = useRef<HTMLDivElement>(null);
  const heroNav = useHeroNav(panelRef);

  useEffect(() => {
    applyShellLevel(getShell(), level);
  }, [level]);
  useEffect(() => {
    const controller = new AbortController();
    fetchWebsiteFeedback(1, false, controller.signal)
      .then((page) => setRating(page.average !== null && page.total > 0 ? { average: page.average, total: page.total } : null))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  useRevealOnScroll(pageRef);
  useClipReveal(pageRef);
  useScrollProgress(pageRef);
  const particleTitle = useParticleTitle();

  const publishedLessons = catalog?.kind === 'ready' ? catalog.lessons ?? 0 : 0;
  const publishedQuestions = catalog?.kind === 'ready' ? catalog.questions ?? 0 : 0;
  const publishedExams = catalog?.kind === 'ready' ? catalog.exams ?? 0 : 0;
  const stats: Array<{ value: number; suffix?: string; text?: string; label: Copy }> = [
    ...(liveSubjects ? [{ value: liveSubjects, label: { en: 'Subjects open now', vi: 'Môn đang mở' } }] : []),
    ...(publishedLessons > 0 ? [{ value: publishedLessons, label: { en: 'Lessons published', vi: 'Bài học đã xuất bản' } }] : []),
    ...(publishedQuestions > 0 ? [{ value: publishedQuestions, label: { en: 'Practice and exam questions', vi: 'Câu hỏi luyện tập và thi' } }] : []),
    ...(publishedExams > 0 ? [{ value: publishedExams, label: { en: 'Exams', vi: 'Đề thi' } }] : []),
    ...(rating
      ? [{
          value: rating.average,
          text: rating.average.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' / 5',
          label: { en: `Average of ${rating.total} reviews`, vi: `Điểm trung bình từ ${rating.total} đánh giá` },
        }]
      : []),
  ];

  return (
    <>
      {intro && <IntroCurtain level={level} onReady={() => setReady(true)} />}
      {heroNav.inHero && (
        <button
          type="button"
          className={styles.navPeek}
          data-open={heroNav.peek ? '' : undefined}
          onClick={heroNav.togglePeek}
          aria-pressed={heroNav.peek}
          aria-label={heroNav.peek ? t({ en: 'Hide navigation bar', vi: 'Ẩn thanh điều hướng' }) : t({ en: 'Show navigation bar', vi: 'Hiện thanh điều hướng' })}
        >
          {heroNav.peek ? <ChevronUp size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      )}
      <div className={styles.page} data-level={level} data-scipal-level={level} data-ready={ready ? '' : undefined} lang={lang} ref={pageRef}>
        <main className={styles.shell}>
          {/* ---------- hero ---------- */}
          <section className={styles.hero} aria-labelledby="landing-title" data-scroll-progress ref={heroRef}>
            <div className={styles.heroBurst} aria-hidden="true">
              <b />
              <b />
              {SPARKS.map((spark, index) => (
                <i
                  key={index}
                  style={{ '--a': `${spark.angle}deg`, '--r': `${spark.reach}rem`, '--c': spark.color } as React.CSSProperties}
                />
              ))}
            </div>
            <div className={styles.heroFrame}>
              <div className={styles.heroPanel} ref={panelRef}>
                <div className={styles.heroPhoto}>
                  <Image
                    src={`/images/hero/${level}.jpg`}
                    alt=""
                    fill
                    priority
                    quality={90}
                    sizes="100vw"
                    className={styles.heroPanelImg}
                    style={{ objectPosition: HERO_FOCUS[level] }}
                  />
                </div>
                <div className={styles.heroArt}>
                  <HeroStage level={level} />
                </div>
              </div>
              <div className={styles.heroRow}>
                <div className={styles.heroCard}>
                  <div className={styles.heroCopy}>
                    <div className={styles.heroTitleWrap} data-particles={particleTitle ? '' : undefined}>
                      <h1 id="landing-title" tabIndex={-1} className={styles.heroTitle}>
                        <ClipLines lines={[t(titleFirst), t(titleSecond)]} />
                      </h1>
                      {particleTitle && <ParticleLines lines={[t(titleFirst), t(titleSecond)]} />}
                    </div>
                    <p className={styles.heroSubline}>
                      {t({
                        en: 'Learn in Vietnamese and English, so English becomes your second language.',
                        vi: 'Học song ngữ Việt–Anh để tiếng Anh dần trở thành ngôn ngữ thứ hai của bạn.',
                      })}
                    </p>
                  </div>
                  <div className={styles.heroFoot}>
                    <ChangeLevel onChangeLevel={onChangeLevel} className={styles.pillGhost} />
                  </div>
                </div>
                <Link href="#gioi-thieu" className={styles.heroExplore} onClick={explore}>
                  <span className={styles.heroExploreText}>
                    {t({ en: 'Explore', vi: 'Khám phá' })}
                    <span className={styles.exploreArrow}>
                      <ArrowRight size={22} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* ---------- stats ---------- */}
          <section className={styles.stats} aria-labelledby="stats-title">
            <h2 id="stats-title" className={styles.statsTitle}>{t({ en: 'SciPal today', vi: 'SciPal hiện có' })}</h2>
            <dl className={styles.statGrid}>
              {stats.map((stat) => (
                <div key={stat.label.en} className={styles.stat} data-landing-reveal>
                  <dt className={styles.srOnly}>{t(stat.label)}</dt>
                  <dd>
                    {stat.text ? <span className={styles.statValue}>{stat.text}</span> : <StatValue value={stat.value} suffix={stat.suffix} />}
                    <span className={styles.statLabel} aria-hidden="true">{t(stat.label)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ---------- ghost heading ---------- */}
          <section className={styles.trust} id="gioi-thieu" aria-labelledby="trust-title" data-scroll-progress>
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

          {/* ---------- running line ---------- */}
          <div className={styles.runningLine} aria-hidden="true">
            <ScrollVelocity
              texts={[t({ en: 'Bilingual lessons · Vietnam’s 2018 curriculum', vi: 'Học song ngữ · Theo Chương trình GDPT 2018' })]}
              velocity={40}
              numCopies={4}
              separator="✦"
              gap={48}
              fontSize="clamp(2.25rem, 6vw, 5rem)"
              fontWeight={800}
              color="var(--line)"
              parallaxClassName=""
              scrollerClassName=""
              scrollerStyle={{ filter: 'none', textTransform: 'uppercase', letterSpacing: '-0.03em' }}
            />
          </div>

          {/* ---------- existing feature sections on a lifted sheet ---------- */}
          <div className={styles.sheet}>
            <HowItWorks level={level} />
            <TutorSection href="/tutor" level={level} />
            <FeaturesSection />
            <CommunitySection />
            <InstallAppSection />
            {pricing && <PricingSection catalog={pricing} />}
            <FaqSection />
          </div>

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
                <h2 id="start-title" className={styles.finalTitle}>{t({ en: 'Take your first lesson, free.', vi: 'Học bài đầu tiên, miễn phí.' })}</h2>
                <p className={styles.finalLead}>
                  {t({
                    en: 'No card and no install needed for your first lesson.',
                    vi: 'Không cần thẻ, không cần cài app để học bài đầu tiên.',
                  })}
                </p>
              </div>
              <div className={styles.finalActions}>
                <Link href="/subjects" className={styles.pillLight}>
                  <ShinyText color="currentColor" shineColor="var(--sun)" speed={1.6} delay={3.5} shineWidth={50}>
                    {t({ en: 'Start learning', vi: 'Bắt đầu học' })}
                  </ShinyText>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/tutor" className={styles.pillGhost}>
                  <Sparkles size={16} aria-hidden="true" />
                  {t({ en: 'Ask the AI Professor', vi: 'Hỏi Giáo sư AI' })}
                </Link>
              </div>
            </div>
            <div className={styles.poll}>
              <DemandPollBanner />
            </div>
          </section>

          {/* ---------- reviews ---------- */}
          <section className={styles.reviews} id="danh-gia" aria-labelledby="reviews-title">
            <h2 id="reviews-title" className={styles.reviewsTitle} data-landing-reveal>
              {t({ en: 'Rate SciPal', vi: 'Bạn chấm SciPal mấy sao?' })}
            </h2>
            <div className={styles.reviewsGrid} data-landing-reveal>
              <div className={feedbackStyles.compactForm}>
                <WebsiteFeedbackForm onSaved={() => setReviewsVersion((v) => v + 1)} />
              </div>
              <WebsiteFeedbackBoard key={reviewsVersion} compact />
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
              <p>{t({ en: 'Learn in Vietnamese and English, working towards English as your second language.', vi: 'Học song ngữ Việt–Anh, hướng đến việc tiếng Anh trở thành ngôn ngữ thứ hai của bạn.' })}</p>
            </div>
            <nav className={styles.footerCol} aria-label={t({ en: 'Learn', vi: 'Học tập' })}>
              <h3>{t({ en: 'Learn', vi: 'Học tập' })}</h3>
              <ul>
                <li><Link href="/subjects">{t({ en: 'Subjects', vi: 'Môn học' })}</Link></li>
                <li><Link href="/glossary">{t({ en: 'Glossary', vi: 'Từ điển thuật ngữ' })}</Link></li>
                <li><Link href="/tutor">{t({ en: 'AI Professor', vi: 'Giáo sư AI' })}</Link></li>
                <li><Link href="/progress">{t({ en: 'My progress', vi: 'Tiến độ của tôi' })}</Link></li>
                <li><Link href="/classes">{t({ en: 'Classes', vi: 'Lớp học' })}</Link></li>
              </ul>
            </nav>
            <nav className={styles.footerCol} aria-label={t({ en: 'Contact SciPal', vi: 'Liên hệ SciPal' })}>
              <h3>{t({ en: 'Contact us', vi: 'Liên hệ' })}</h3>
              <ul>
                <li><Link href="/help">{t({ en: 'Help center', vi: 'Trung tâm trợ giúp' })}</Link></li>
                {pricing && <li><Link href="/pricing">{t({ en: 'Pricing', vi: 'Bảng giá' })}</Link></li>}
                <li>
                  <a href={CONTACT_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                    <Image src="/facebook-icon.svg" width={16} height={16} alt="" aria-hidden="true" />
                    SciPal
                  </a>
                </li>
                <li>
                  <a href={'mailto:' + CONTACT_EMAIL}>
                    <Mail size={16} aria-hidden="true" />
                    contact@scipal.io.vn
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
              <Link href="/terms" className={styles.footerPolicy}>
                {t({ en: 'Terms', vi: 'Điều khoản' })}
              </Link>
              <ReportProblemButton className={styles.footerPolicy} />
              <Link href="#danh-gia" className={styles.footerPolicy}>{t({ en: 'Review SciPal', vi: 'Đánh giá SciPal' })}</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
