'use client';

import { SiCloudflare, SiFastify, SiGreensock, SiNextdotjs, SiPostgresql, SiReact, SiSupabase, SiTailwindcss, SiThreedotjs, SiTypescript, SiVercel, SiZod } from 'react-icons/si';
import { useLanguage } from '@scipal/hooks';
import { LogoLoop, type LogoItem } from '@/components/ui/logo-loop';
import styles from './landing.module.css';

/** What the web app and its server are built on. Names are read out; the logos are decoration. */
const TECH: readonly LogoItem[] = [
  { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'React', Icon: SiReact },
  { name: 'TypeScript', Icon: SiTypescript },
  { name: 'Tailwind CSS', Icon: SiTailwindcss },
  { name: 'Three.js', Icon: SiThreedotjs },
  { name: 'GSAP', Icon: SiGreensock },
  { name: 'Zod', Icon: SiZod },
  { name: 'Fastify', Icon: SiFastify },
  { name: 'Supabase', Icon: SiSupabase },
  { name: 'PostgreSQL', Icon: SiPostgresql },
  { name: 'Cloudflare', Icon: SiCloudflare },
  { name: 'Vercel', Icon: SiVercel },
];

export function TechStrip() {
  const { t } = useLanguage();
  return (
    <div className={styles.techStrip} data-landing-reveal>
      <LogoLoop logos={TECH} speed={50} logoHeight={32} gap={56} ariaLabel={t({ en: 'Technologies SciPal is built with', vi: 'Công nghệ xây dựng SciPal' })} />
    </div>
  );
}
