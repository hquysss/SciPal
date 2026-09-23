'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Mascot } from '@/components/mascot/Mascot';
import {
  MASCOT_CHARACTERS,
  SCIPAL_MASCOT_CONFIG,
  type MascotCharacter,
} from './mascot-config';

export interface SciPalMascotProps {
  /** Chọn nhân vật: 'scientist' (tiến sĩ) | 'owl' (cú mèo) | 'gearbot' (robot) */
  character?: MascotCharacter;
  /** Tùy chọn truyền mảng câu thoại riêng để ghi đè */
  customMessages?: {
    vi?: string[];
    en?: string[];
  };
  /** Kích thước đường kính hiển thị (px) */
  size?: number;
  className?: string;
}

export function SciPalMascot({
  character = SCIPAL_MASCOT_CONFIG.defaultCharacter,
  customMessages,
  size = SCIPAL_MASCOT_CONFIG.defaultSize,
  className = '',
}: SciPalMascotProps) {
  const { lang } = useLanguage();
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentChar, setCurrentChar] = useState<MascotCharacter>(character);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal state if character prop changes
  useEffect(() => {
    setCurrentChar(character);
  }, [character]);

  const charAssets = MASCOT_CHARACTERS[currentChar] || MASCOT_CHARACTERS.scientist;

  // Resolve messages with fallback
  const viMessages = customMessages?.vi?.length
    ? customMessages.vi
    : SCIPAL_MASCOT_CONFIG.messages.vi;
  const enMessages = customMessages?.en?.length
    ? customMessages.en
    : SCIPAL_MASCOT_CONFIG.messages.en;

  const messages = lang === 'en' ? enMessages : viMessages;
  const charLabel = lang === 'en' ? charAssets.label.en : charAssets.label.vi;

  function handleBoop() {
    setMessageIndex((prev) => (prev + 1) % messages.length);
    setBubbleOpen(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setBubbleOpen(false);
    }, SCIPAL_MASCOT_CONFIG.bubbleAutoCloseMs);
  }

  function handleBubbleClick() {
    // Next message or close
    setMessageIndex((prev) => (prev + 1) % messages.length);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setBubbleOpen(false);
    }, SCIPAL_MASCOT_CONFIG.bubbleAutoCloseMs);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <aside
      className={`katha-login-mascot ${className}`}
      aria-label={charLabel}
    >
      {/* Speech bubble */}
      {bubbleOpen && (
        <div
          className="katha-mascot-bubble"
          role="status"
          aria-live="polite"
          onClick={handleBubbleClick}
          title={lang === 'en' ? 'Click for next message' : 'Nhấp để xem câu tiếp theo'}
        >
          <p>{messages[messageIndex]}</p>
          <span className="katha-mascot-bubble-tail" aria-hidden="true" />
          <button
            type="button"
            className="katha-mascot-bubble-close"
            onClick={(e) => {
              e.stopPropagation();
              setBubbleOpen(false);
            }}
            aria-label={lang === 'en' ? 'Close message' : 'Đóng lời nhắn'}
            title={lang === 'en' ? 'Close' : 'Đóng'}
          >
            ×
          </button>
        </div>
      )}

      {/* Mascot character with pedestal shadow */}
      <div className="katha-mascot-stage">
        <Mascot
          directions={charAssets.directions}
          reactions={charAssets.reactions}
          size={size}
          className="katha-mascot-interactive"
          label={charLabel}
          ariaLabel={
            lang === 'en'
              ? `${charLabel} — Click to hear study advice`
              : `${charLabel} — Nhấp để lắng nghe lời khuyên học tập`
          }
          onBoop={handleBoop}
        />
        <div className="katha-mascot-pedestal" aria-hidden="true" />
      </div>
    </aside>
  );
}
