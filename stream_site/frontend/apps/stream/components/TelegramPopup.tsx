'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'tg_popup_last_shown';
const INTERVAL_MS = 60 * 1000; // 1 minute

export default function TelegramPopup({ botUrl }: { botUrl: string }) {
  const t = useTranslations('streamPage');
  const tUi = useTranslations('ui');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function maybeShow() {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Date.now() - last >= INTERVAL_MS) {
        setVisible(true);
      }
    }

    maybeShow();
    const timer = setInterval(maybeShow, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex max-w-xs flex-col gap-3 rounded-2xl p-5 shadow-2xl"
      style={{
        background: 'linear-gradient(160deg, rgba(14,16,15,0.98) 0%, rgba(8,10,9,0.99) 100%)',
        border: '1px solid rgba(41,171,226,0.35)',
        boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(41,171,226,0.10)',
      }}
    >
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs transition-opacity hover:opacity-70"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-mid)' }}
        aria-label={tUi('close')}
      >
        ✕
      </button>

      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(41,171,226,0.15)', border: '1px solid rgba(41,171,226,0.30)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#29abe2">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
          </svg>
        </span>
        <div>
          <div className="text-sm font-black uppercase" style={{ color: 'var(--text-hi)' }}>
            {t('telegramBot')}
          </div>
          <div className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-mid)' }}>
            {t('matchAlerts')}
          </div>
        </div>
      </div>

      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wide transition-opacity hover:opacity-85"
        style={{ background: '#29abe2', color: '#060a0c' }}
      >
        {t('openBot')} ↗
      </a>
    </div>
  );
}
