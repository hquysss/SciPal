'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Languages,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { DemandPollBanner } from '@/features/survey/DemandPollBanner';
import { SubjectGrid } from '@/features/subjects/SubjectGrid';
import { TutorDemoCard } from './TutorDemoCard';
import styles from './landing.module.css';

const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/nguoivietchimtayto/';
const CONTACT_EMAIL = 'tuilangus@gmail.com';

const featureCards = [
  {
    icon: Languages,
    title: { en: 'Learn in two languages', vi: 'Học bằng hai ngôn ngữ' },
    description: {
      en: 'Compare Vietnamese and English lesson content and terminology as you study.',
      vi: 'Đối chiếu nội dung bài học và thuật ngữ bằng tiếng Việt, tiếng Anh.',
    },
  },
  {
    icon: BookOpen,
    title: { en: 'Explore natural sciences', vi: 'Khám phá khoa học tự nhiên' },
    description: {
      en: 'Check each subject to see what is currently ready to learn.',
      vi: 'Xem trạng thái từng môn để biết nội dung nào đang sẵn sàng.',
    },
  },
  {
    icon: Search,
    title: { en: 'Look up science terms', vi: 'Tra cứu thuật ngữ khoa học' },
    description: {
      en: 'Use the glossary to find scientific terms in Vietnamese and English.',
      vi: 'Tra thuật ngữ khoa học bằng tiếng Việt và tiếng Anh trong từ điển.',
    },
  },
  {
    icon: Sparkles,
    title: { en: 'Chat with your AI Tutor', vi: 'Trò chuyện cùng gia sư AI' },
    description: {
      en: 'See a helpful explanation and follow-up question.',
      vi: 'Xem lời giải thích và câu hỏi gợi mở.',
    },
  },
] as const;

const learningSteps = [
  {
    icon: Compass,
    number: '01',
    title: { en: 'Choose an open subject', vi: 'Chọn môn đang sẵn sàng' },
    description: {
      en: 'Each subject card shows which course content is currently available.',
      vi: 'Thẻ từng môn cho biết học liệu nào hiện đang sẵn sàng.',
    },
  },
  {
    icon: BookOpen,
    number: '02',
    title: { en: 'Study each topic', vi: 'Học theo từng chủ đề' },
    description: {
      en: 'Open a lesson and follow its content at your own pace.',
      vi: 'Mở bài học và theo dõi nội dung theo nhịp của bạn.',
    },
  },
  {
    icon: Search,
    number: '03',
    title: { en: 'Look up what is new', vi: 'Tra cứu điều còn băn khoăn' },
    description: {
      en: 'Check the bilingual glossary whenever you meet an unfamiliar term.',
      vi: 'Mở từ điển song ngữ khi gặp thuật ngữ chưa quen.',
    },
  },
] as const;

export function LandingPage() {
  const { t, lang } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (
      !page ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    const revealTargets = Array.from(
      page.querySelectorAll<HTMLElement>('[data-landing-reveal]'),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.revealed);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    );

    revealTargets.forEach((target, index) => {
      const isInitiallyVisible =
        target.getBoundingClientRect().top < window.innerHeight * 0.95;

      if (isInitiallyVisible) {
        target.classList.add(styles.revealed);
        return;
      }

      target.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
      target.classList.add(styles.revealPending);
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.ambient} aria-hidden="true" />
      <main className={styles.shell}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <span className={styles.eyebrowIcon} aria-hidden="true">
                <Sparkles size={15} />
              </span>
              {t({
                en: 'Study space for high school students',
                vi: 'Không gian học tập dành cho học sinh THPT',
              })}
            </p>
            <h1 id="landing-title" className={styles.heroTitle} data-language={lang}>
              {t({ en: 'Understand science.', vi: 'Hiểu khoa học.' })}
              <span>{t({ en: 'Explore with confidence.', vi: 'Tự tin khám phá.' })}</span>
            </h1>
            <p className={styles.heroDescription}>
              {t({
                en: 'A bilingual study space for Vietnamese high school students, with course content growing across subjects.',
                vi: 'Không gian học tập song ngữ dành cho học sinh THPT Việt Nam, với học liệu đang được mở rộng theo từng môn.',
              })}
            </p>

            <div className={styles.heroActions}>
              <a href="#mon-hoc" className={styles.primaryAction}>
                {t({ en: 'Explore subjects', vi: 'Khám phá môn học' })}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a href="#cach-hoc" className={styles.secondaryAction}>
                {t({ en: 'How SciPal works', vi: 'Cách SciPal hoạt động' })}
              </a>
            </div>

            <div className={styles.heroNotes}>
              <span>
                <Languages size={16} aria-hidden="true" />
                {t({ en: 'Vietnamese · English', vi: 'Tiếng Việt · English' })}
              </span>
              <span>
                <BookOpen size={16} aria-hidden="true" />
                {t({ en: 'high-school subjects', vi: 'môn học THPT' })}
              </span>
            </div>
          </div>

          <div className={styles.heroDemo} id="tutor-demo">
            <TutorDemoCard />
          </div>
        </section>

        <section className={styles.contentSection} id="mon-hoc" aria-labelledby="subjects-title">
          <div className={styles.sectionHeading} data-landing-reveal>
            <p className={styles.sectionEyebrow}>
              {t({ en: 'Explore the subject', vi: 'Khám phá môn học' })}
            </p>
            <h2 id="subjects-title" className={styles.sectionTitle}>
              {t({ en: 'Choose a subject to explore', vi: 'Chọn môn học để khám phá' })}
            </h2>
            <p className={styles.sectionDescription}>
              {t({
                en: 'See the current course availability for each subject and open the lessons that are ready.',
                vi: 'Xem trạng thái học liệu của từng môn và mở các bài học đã sẵn sàng.',
              })}
            </p>
          </div>
          <SubjectGrid />
        </section>

        <section className={styles.contentSection} aria-labelledby="features-title">
          <div className={styles.sectionHeading} data-landing-reveal>
            <p className={styles.sectionEyebrow}>
              {t({ en: 'A closer look at SciPal', vi: 'Khám phá SciPal' })}
            </p>
            <h2 id="features-title" className={styles.sectionTitle}>
              {t({ en: 'Built around the way you learn', vi: 'Bắt đầu từ cách bạn học' })}
            </h2>
          </div>
          <div className={styles.featureGrid}>
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className={styles.featureCard} data-landing-reveal key={feature.title.en}>
                  <span className={styles.featureIcon} aria-hidden="true">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>
                  <h3>{t(feature.title)}</h3>
                  <p>{t(feature.description)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className={styles.learningSection}
          id="cach-hoc"
          aria-labelledby="learning-title"
        >
          <div className={styles.sectionHeading} data-landing-reveal>
            <p className={styles.sectionEyebrow}>
              {t({ en: 'A simple path forward', vi: 'Lộ trình học tập gọn nhẹ' })}
            </p>
            <h2 id="learning-title" className={styles.sectionTitle}>
              {t({ en: 'Learn one step at a time', vi: 'Học từng bước một' })}
            </h2>
            <p className={styles.sectionDescription}>
              {t({
                en: 'Move from a lesson to a useful term without leaving your learning flow.',
                vi: 'Đi từ bài học đến thuật ngữ cần tra mà không đứt mạch học.',
              })}
            </p>
          </div>
          <div className={styles.stepGrid}>
            {learningSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article className={styles.stepCard} data-landing-reveal key={step.number}>
                  <div className={styles.stepTopline}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <span className={styles.stepIcon} aria-hidden="true">
                      <Icon size={20} />
                    </span>
                  </div>
                  <h3>{t(step.title)}</h3>
                  <p>{t(step.description)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.startPanel} data-landing-reveal aria-labelledby="start-title">
          <div className={styles.startCopy}>
            <p className={styles.startEyebrow}>
              {t({ en: 'Your next idea starts here', vi: 'Ý tưởng tiếp theo bắt đầu từ đây' })}
            </p>
            <h2 id="start-title">
              {t({ en: 'Ready to explore something new?', vi: 'Sẵn sàng khám phá điều mới?' })}
            </h2>
            <p>
              {t({
                en: 'Browse the subjects and choose a topic that sparks your curiosity.',
                vi: 'Khám phá các môn học và chọn chủ đề khiến bạn tò mò.',
              })}
            </p>
          </div>
          <a href="#mon-hoc" className={styles.startAction}>
            {t({ en: 'Browse subjects', vi: 'Xem các môn học' })}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>

        <section className={styles.pollSection} data-landing-reveal aria-label={t({
          en: 'Subject demand poll',
          vi: 'Khảo sát môn học tiếp theo',
        })}>
          <DemandPollBanner />
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}>
            <span className={styles.footerMark} aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <span>
              <strong>SciPal</strong>
              <small>{t({ en: 'Learning made easy with SciPal.', vi: 'Học tập dễ dàng cùng với SciPal.' })}</small>
            </span>
          </Link>
          <div className={styles.footerContact}>
            <p className={styles.footerContactTitle}>
              {t({ en: 'Contact us', vi: 'Liên hệ' })}
            </p>
            <nav className={styles.footerLinks} aria-label={t({
              en: 'Contact SciPal',
              vi: 'Liên hệ SciPal',
            })}>
              <a href={CONTACT_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                <Image
                  src="/facebook-icon.svg"
                  width={18}
                  height={18}
                  alt=""
                  aria-hidden="true"
                />
                <span>Facebook</span>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail size={17} aria-hidden="true" />
                <span>{t({ en: 'Email', vi: 'Email' })}</span>
              </a>
            </nav>
          </div>
          <p className={styles.footerCopyright}>© SciPal</p>
        </div>
      </footer>
    </div>
  );
}
