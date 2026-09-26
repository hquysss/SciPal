'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { LandingHeroNotes } from './LandingHeroNotes';
import { DemandPollBanner } from '@/features/survey/DemandPollBanner';
import { SubjectGrid } from '@/features/subjects/SubjectGrid';
import type { EducationLevel } from './educationLevel';
import type { InformaticsAvailability, LandingCatalog } from './getLandingData';
import { TutorDemoCard } from './TutorDemoCard';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'tuilangus@gmail.com';

export interface LandingPageProps {
  level: EducationLevel;
  levelSource: 'account' | 'session';
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
}

function levelLabel(level: EducationLevel, lang: 'en' | 'vi') {
  if (level === 'primary') return lang === 'en' ? 'Primary · Grades 1–5' : 'Tiểu học · Lớp 1–5';
  if (level === 'lower_secondary') return lang === 'en' ? 'Lower secondary · Grades 6–9' : 'THCS · Lớp 6–9';
  return lang === 'en' ? 'Upper secondary · Grades 10–12' : 'THPT · Lớp 10–12';
}

function DevelopmentPreview({ level }: { level: Exclude<EducationLevel, 'upper_secondary'> }) {
  const { t, lang } = useLanguage();
  const isPrimary = level === 'primary';

  return (
    <article className={styles.developmentPreview} aria-labelledby="level-preview-title">
      <div className={styles.previewTopline}>
        <span className={styles.previewIndex}>FIELD NOTE / 01</span>
        <span className={styles.previewStatus}>
          {t({ en: 'In development', vi: 'Đang chuẩn bị' })}
        </span>
      </div>
      <div className={styles.previewRule} aria-hidden="true" />
      <p className={styles.previewGrade}>{levelLabel(level, lang)}</p>
      <h2 id="level-preview-title">
        {isPrimary
          ? t({ en: 'Learning materials for primary school are in development.', vi: 'Học liệu Tiểu học đang được chuẩn bị.' })
          : t({ en: 'Learning materials for lower secondary are in development.', vi: 'Học liệu THCS đang được chuẩn bị.' })}
      </h2>
      <p className={styles.previewDescription}>
        {isPrimary
          ? t({
              en: 'SciPal is preparing a clear, bilingual place to explore the questions young learners ask.',
              vi: 'SciPal đang chuẩn bị một không gian song ngữ, dễ hiểu để khám phá những câu hỏi của các em.',
            })
          : t({
              en: 'SciPal is preparing bilingual science materials that connect questions, evidence, and explanations.',
              vi: 'SciPal đang chuẩn bị học liệu khoa học song ngữ, kết nối câu hỏi, bằng chứng và lời giải thích.',
            })}
      </p>
      <div className={styles.previewDiagram} aria-hidden="true">
        <span className={styles.diagramDot} />
        <span className={styles.diagramLine} />
        <span className={styles.diagramDot} />
        <span className={styles.diagramLine} />
        <span className={styles.diagramDot} />
      </div>
      <div className={styles.previewExample}>
        <span className={styles.exampleLabel}>
          {t({ en: 'A question to explore', vi: 'Một câu hỏi để khám phá' })}
        </span>
        <span className={styles.previewExampleUnavailable}>
          {t({
            en: 'Why do shadows change during the day?',
            vi: 'Vì sao bóng thay đổi trong ngày?',
          })}
        </span>
      </div>
    </article>
  );
}
export function LandingPage({
  level,
  levelSource,
  catalog,
  informatics,
}: LandingPageProps) {
  const { t, lang } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);
  const isUpperSecondary = level === 'upper_secondary';
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
      target.style.setProperty('--reveal-delay', String((index % 4) * 55) + 'ms');
      target.classList.add(styles.revealPending);
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  const mainAction = (
    <a href="#mon-hoc" className={styles.primaryAction}>
      {t({ en: 'Explore subjects', vi: 'Xem các môn học' })}
      <ArrowRight size={18} aria-hidden="true" />
    </a>
  );

  return (
    <div className={styles.page} data-level={level} data-scipal-level={level} lang={lang} ref={pageRef}>
      <div className={styles.ambient} aria-hidden="true" />
      <main className={styles.shell}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <span className={styles.eyebrowIcon} aria-hidden="true"><Sparkles size={15} /></span>
              {isUpperSecondary
                ? t({ en: 'A science study space for high school students', vi: 'Không gian học khoa học cho học sinh THPT' })
                : t({ en: 'A learning path is taking shape', vi: 'Lối vào học tập đang được chuẩn bị' })}
            </p>
            <p className={styles.levelEyebrow}>{levelLabel(level, lang)}</p>
            <h1 id="landing-title" tabIndex={-1} className={styles.heroTitle} data-language={lang}>
              {level === 'upper_secondary' ? (
                <>
                  {t({ en: 'Make sense of science,', vi: 'Hiểu khoa học' })}
                  <span className={styles.heroTitleAccent}>
                    {t({ en: 'one question at a time.', vi: 'từ câu hỏi đầu tiên.' })}
                  </span>
                </>
              ) : level === 'primary' ? (
                <>
                  {t({ en: 'Start with what', vi: 'Bắt đầu từ điều' })}
                  <span className={styles.heroTitleAccent}>
                    {t({ en: 'you are curious about.', vi: 'em tò mò.' })}
                  </span>
                </>
              ) : (
                <>
                  {t({ en: 'Build understanding', vi: 'Từng câu hỏi' })}
                  <span className={styles.heroTitleAccent}>
                    {t({ en: 'one question at a time.', vi: 'mở rộng hiểu biết.' })}
                  </span>
                </>
              )}
            </h1>
            <p className={styles.heroDescription}>
              {isUpperSecondary
                ? t({
                    en: 'Explore science through questions, evidence, and bilingual lessons. Choose a subject to see what is available.',
                    vi: 'Khám phá khoa học qua câu hỏi, bằng chứng và bài học song ngữ. Chọn một môn để xem học liệu hiện có.',
                  })
                : level === 'primary'
                  ? t({
                      en: 'Learning materials for primary school are in development. Explore the subjects SciPal is preparing.',
                      vi: 'Học liệu Tiểu học đang được chuẩn bị. Khám phá các môn SciPal đang xây dựng.',
                    })
                  : t({
                      en: 'Learning materials for lower secondary are in development. Explore the subjects SciPal is preparing.',
                      vi: 'Học liệu THCS đang được chuẩn bị. Khám phá các môn SciPal đang xây dựng.',
                    })}
            </p>
            <div className={styles.heroActions}>
              {mainAction}
              <a href="#cach-hoc" className={styles.secondaryAction}>
                {t({ en: 'See how learning works', vi: 'Xem cách học' })}
              </a>
            </div>
            <LandingHeroNotes />
          </div>

          <div className={styles.heroDemo} id="tutor-demo">
            {isUpperSecondary
              ? <TutorDemoCard />
              : <DevelopmentPreview level={level} />}
          </div>
        </section>

        <section className={styles.contentSection} id="mon-hoc" aria-labelledby="subjects-title">
          <div className={styles.sectionHeading} data-landing-reveal>
            <div>
              <p className={styles.sectionEyebrow}>
                {t({ en: 'Choose where to begin', vi: 'Chọn nơi bắt đầu' })}
              </p>
              <h2 id="subjects-title" className={styles.sectionTitle}>
                {t({ en: 'Subjects for your learning path', vi: 'Môn học theo cấp của bạn' })}
              </h2>
              <p className={styles.sectionDescription}>
                {t({
                  en: 'Each subject shows whether its published learning materials are ready.',
                  vi: 'Mỗi môn cho biết học liệu đã xuất bản có sẵn hay vẫn đang được chuẩn bị.',
                })}
              </p>
            </div>
            <div className={styles.levelPreference}>
              <span>
                {levelSource === 'account'
                  ? t({ en: 'Saved to your account', vi: 'Đã lưu vào tài khoản' })
                  : t({ en: 'Saved in this tab', vi: 'Đã lưu trong tab này' })}
              </span>
              <Link href="/?chooseLevel=1" className={styles.changeLevelAction}>
                {t({ en: 'Change level', vi: 'Đổi cấp học' })}
              </Link>
            </div>
          </div>
          <SubjectGrid level={level} catalog={catalog} informatics={informatics} />
        </section>

        <section className={styles.learningSection} id="cach-hoc" aria-labelledby="learning-title">
          <div className={styles.sectionHeading} data-landing-reveal>
            <p className={styles.sectionEyebrow}>
              {t({ en: 'A field note for learning', vi: 'Một trang sổ tay học tập' })}
            </p>
            <h2 id="learning-title" className={styles.sectionTitle}>
              {t({ en: 'From a question to an explanation', vi: 'Từ câu hỏi tới lời giải thích' })}
            </h2>
            <p className={styles.sectionDescription}>
              {t({
                en: 'Notice what changes, connect it to evidence, then look up a useful term.',
                vi: 'Quan sát điều thay đổi, kết nối với bằng chứng rồi tra một thuật ngữ hữu ích.',
              })}
            </p>
          </div>
          <div className={styles.journeyList}>
            <article className={styles.journeyStep} data-landing-reveal>
              <span className={styles.stepNumber}>01</span>
              <div className={styles.journeyCopy}>
                <p className={styles.stepLabel}>{t({ en: 'Start with a question', vi: 'Bắt đầu từ một câu hỏi' })}</p>
                <p className={styles.stepDescription}>
                  {t({
                    en: 'Why does a vertical object cast a shorter shadow when the Sun appears higher?',
                    vi: 'Vì sao bóng của một vật thẳng đứng ngắn lại khi Mặt Trời lên cao?',
                  })}
                </p>
              </div>
            </article>

            <article className={styles.journeyStep} data-landing-reveal>
              <span className={styles.stepNumber}>02</span>
              <div className={styles.journeyCopy}>
                <p className={styles.stepLabel}>{t({ en: 'Observe and explain', vi: 'Quan sát và giải thích' })}</p>
                <p className={styles.previewLabel}>{t({ en: 'Bilingual preview', vi: 'Bản xem trước song ngữ' })}</p>
                <div className={styles.excerptPair}>
                  <p lang="vi">Khi Mặt Trời lên cao hơn, bóng của một vật thẳng đứng thường ngắn lại.</p>
                  <p lang="en">As the Sun appears higher, a vertical object's shadow usually grows shorter.</p>
                </div>
              </div>
            </article>

            <article className={styles.journeyStep} data-landing-reveal>
              <span className={styles.stepNumber}>03</span>
              <div className={styles.journeyCopy}>
                <p className={styles.stepLabel}>{t({ en: 'Look up a new term', vi: 'Tra một thuật ngữ mới' })}</p>
                <p className={styles.stepDescription}>
                  {t({
                    en: 'Keep a useful definition close when a lesson introduces an unfamiliar idea.',
                    vi: 'Tra định nghĩa khi bài học giới thiệu một ý tưởng chưa quen.',
                  })}
                </p>
                <Link href="/glossary" className={styles.glossaryLink}>
                  {t({ en: 'Explore the bilingual glossary', vi: 'Khám phá từ điển song ngữ' })}
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.startPanel} data-landing-reveal aria-labelledby="start-title">
          <div className={styles.startCopy}>
            <p className={styles.startEyebrow}>
              {t({ en: 'Your next idea starts here', vi: 'Ý tưởng tiếp theo bắt đầu từ đây' })}
            </p>
            <h2 id="start-title">
              {t({ en: 'Ready to explore a question?', vi: 'Sẵn sàng khám phá một câu hỏi?' })}
            </h2>
            <p>
              {t({
                en: 'Choose from the subjects for your level, or explore a term in the bilingual glossary.',
                vi: 'Chọn một môn theo cấp học của bạn hoặc tra thuật ngữ trong từ điển song ngữ.',
              })}
            </p>
          </div>
          <div className={styles.startActions}>
            <a href="#mon-hoc" className={styles.startAction}>
              {t({ en: 'Explore your subjects', vi: 'Xem các môn theo cấp' })}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link href="/glossary" className={styles.startAction}>
              {t({ en: 'Explore the glossary', vi: 'Khám phá từ điển' })}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {isUpperSecondary && (
          <section className={styles.pollSection} aria-label={t({
            en: 'Subject demand poll',
            vi: 'Khảo sát nhu cầu môn học',
          })}>
            <DemandPollBanner />
          </section>
        )}
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
