'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/Header';

interface Props {
  children: React.ReactNode;
  footerDisclaimer: string;
  locale: string;
}

export default function LocaleChrome({ children, footerDisclaimer, locale }: Props) {
  const pathname = usePathname();
  const tFooter = useTranslations('footer');
  const isStreamSite = pathname?.startsWith(`/${locale}/stream/`) ?? false;

  if (isStreamSite) {
    return (
      <main className="min-h-screen px-3 py-3 md:px-4 md:py-4">
        {children}
      </main>
    );
  }

  return (
    <>
      <Header locale={locale} />
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-10">{children}</main>
      <footer className="mt-20 py-8 px-4 text-center" style={{ borderTop: '1px solid var(--border-faint)' }}>
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-4" style={{ color: 'var(--text-mid)' }}>
            {tFooter('contactUs')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tFooter('telegram')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--outline-subtle)', color: 'var(--text-hi)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#29abe2' }}>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              {tFooter('telegram')}
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tFooter('whatsapp')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--outline-subtle)', color: 'var(--text-hi)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25d366' }}>
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
              </svg>
              {tFooter('whatsapp')}
            </a>
          </div>
        </div>
        <p className="text-[11px] tracking-wide" style={{ color: 'var(--text-lo)', maxWidth: '640px', margin: '0 auto' }}>
          {footerDisclaimer}
        </p>
      </footer>
    </>
  );
}
