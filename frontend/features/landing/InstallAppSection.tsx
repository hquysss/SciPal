'use client';

import { CheckCircle2, Download, Menu, RefreshCw, Share, Smartphone, SquarePlus, Store, WifiOff } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { useInstall, type InstallMode } from '@/lib/pwa/installMode';
import { MICROSOFT_STORE_URL } from '@/lib/pwa/stores';
import styles from './install.module.css';

// "Tải xuống" on the landing page: SciPal installs from the site itself (a PWA), no app store.
// The action follows the device: a one-tap install, the iPhone steps, or the browser menu.

type Bilingual = { vi: string; en: string };

const PERKS: Array<{ icon: typeof Smartphone; text: Bilingual }> = [
  { icon: Smartphone, text: { vi: 'Mở toàn màn hình như một ứng dụng, ngay từ màn hình chính', en: 'Opens full screen like an app, right from the home screen' } },
  { icon: WifiOff, text: { vi: 'Bài đã mở hoặc đã tải về vẫn đọc được khi mất mạng', en: 'Lessons you opened or saved still read offline' } },
  { icon: RefreshCw, text: { vi: 'Luôn là bản mới nhất, không cần cập nhật', en: 'Always the latest version, no updates to install' } },
];

function Steps({ steps }: { steps: Array<{ icon: typeof Share; text: Bilingual }> }) {
  const { t } = useLanguage();
  return (
    <ol className={styles.steps}>
      {steps.map(({ icon: Icon, text }, index) => (
        <li key={text.en}>
          <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
          <Icon aria-hidden="true" size={18} className={styles.stepIcon} />
          <span>{t(text)}</span>
        </li>
      ))}
    </ol>
  );
}

/** The Microsoft Store listing, for Windows once SciPal is published there. */
function StoreLink({ href }: { href: string }) {
  const { t } = useLanguage();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t({ vi: 'Tải từ Microsoft Store', en: 'Get it from Microsoft Store' })} className={styles.store}>
      <Store aria-hidden="true" size={20} />
      <span>
        <small>{t({ vi: 'Tải từ', en: 'Get it from' })}</small>
        Microsoft Store
      </span>
    </a>
  );
}

export function InstallActionView({ mode, onInstall, storeUrl = null }: { mode: InstallMode; onInstall: () => void; storeUrl?: string | null }) {
  const { t } = useLanguage();
  const store = storeUrl && mode !== 'installed' ? <StoreLink href={storeUrl} /> : null;
  if (mode === 'installed') {
    return (
      <p role="status" className={styles.installed}>
        <CheckCircle2 aria-hidden="true" size={20} />
        {t({ vi: 'SciPal đã có trên máy này. Mở từ màn hình chính nhé!', en: 'SciPal is on this device. Open it from the home screen!' })}
      </p>
    );
  }
  if (mode === 'prompt') {
    return (
      <div className={styles.actions}>
        <button type="button" onClick={onInstall} className={styles.install}>
          <Download aria-hidden="true" size={20} />
          {t({ vi: 'Tải SciPal về máy', en: 'Install SciPal' })}
        </button>
        {store}
      </div>
    );
  }
  if (mode === 'ios') {
    return (
      <Steps
        steps={[
          { icon: Share, text: { vi: 'Trong Safari, bấm nút Chia sẻ', en: 'In Safari, tap the Share button' } },
          { icon: SquarePlus, text: { vi: 'Chọn “Thêm vào MH chính”', en: 'Choose “Add to Home Screen”' } },
          { icon: Smartphone, text: { vi: 'Mở SciPal từ màn hình chính', en: 'Open SciPal from the home screen' } },
        ]}
      />
    );
  }
  return (
    <div className={styles.actions}>
      {store}
      <Steps
      steps={[
        { icon: Menu, text: { vi: 'Mở menu của trình duyệt (⋮ hoặc ⋯)', en: 'Open the browser menu (⋮ or ⋯)' } },
        { icon: Download, text: { vi: 'Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”', en: 'Choose “Install app” or “Add to Home Screen”' } },
        { icon: Smartphone, text: { vi: 'Mở SciPal từ màn hình chính', en: 'Open SciPal from the home screen' } },
      ]}
      />
    </div>
  );
}

/** A phone showing SciPal on its home screen, working offline. Decorative. */
function PhoneMock() {
  const { t } = useLanguage();
  return (
    <div className={styles.phone} aria-hidden="true">
      <div className={styles.screen}>
        <span className={styles.notch} />
        <span className={styles.clock}>9:41</span>
        <div className={styles.apps}>
          {Array.from({ length: 7 }, (_, i) => <span key={i} className={styles.appGhost} />)}
          <span className={styles.appScipal}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={56} height={56} />
            <span>SciPal</span>
          </span>
        </div>
        <span className={styles.offlinePill}>
          <WifiOff size={14} />
          {t({ vi: 'Vẫn học được khi offline', en: 'Still works offline' })}
        </span>
      </div>
    </div>
  );
}

export function InstallAppSection() {
  const { t } = useLanguage();
  const { mode, windows, install } = useInstall();

  return (
    <section className={styles.section} id="tai-ung-dung" aria-labelledby="install-title">
      <div className={styles.stage} data-landing-reveal>
        <span className={styles.glow} />
        <PhoneMock />
      </div>
      <div className={styles.intro} data-landing-reveal>
        <p className={styles.eyebrow}>{t({ vi: 'Ứng dụng SciPal', en: 'The SciPal app' })}</p>
        <h2 id="install-title" className={styles.title}>
          {t({ vi: 'Mang SciPal theo bên mình', en: 'Take SciPal with you' })}
        </h2>
        <p className={styles.lead}>
          {t({
            vi: 'Cài lên điện thoại, máy tính bảng hay máy tính chỉ trong vài giây: không cần CH Play hay App Store, không tốn phí.',
            en: 'Install it on a phone, tablet or computer in seconds: no app store, no cost.',
          })}
        </p>
        <ul className={styles.perks}>
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text.en}>
              <span className={styles.perkIcon} aria-hidden="true"><Icon size={18} /></span>
              <span>{t(text)}</span>
            </li>
          ))}
        </ul>
        <InstallActionView mode={mode} onInstall={() => void install()} storeUrl={windows ? MICROSOFT_STORE_URL : null} />
      </div>
    </section>
  );
}
