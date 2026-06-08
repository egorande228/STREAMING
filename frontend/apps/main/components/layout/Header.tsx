'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

const LOCALES = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'zh', label: 'ZH', flag: '🇨🇳' },
  { code: 'ja', label: 'JA', flag: '🇯🇵' },
  { code: 'ko', label: 'KO', flag: '🇰🇷' },
  { code: 'mn', label: 'MN', flag: '🇲🇳' },
];

interface Props { locale: string; }

export default function Header({ locale }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const tNav = useTranslations('nav');

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/') || '/');
    setLangOpen(false);
  };

  const navItems = [
    { href: `/${locale}`,          label: tNav('home') },
    { href: `/${locale}/schedule`, label: tNav('schedule') },
    { href: `/${locale}/groups`,   label: tNav('groups') },
  ];

  const currentLang = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'rgba(8,8,8,0.88)',
        borderBottom: '1px solid var(--outline-subtle)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">

        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
              color: '#090909',
              boxShadow: '0 10px 20px rgba(246,196,0,0.2)',
            }}
          >
            WC
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.28em]" style={{ color: 'var(--text-mid)' }}>
              Matchday Hub
            </span>
            <span className="font-display font-bold text-lg tracking-tight italic" style={{ color: 'var(--text-hi)' }}>
              WORLD CUP <span style={{ color: 'var(--primary)' }}>2026</span>
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  color:      isActive ? 'var(--bg-base)' : 'var(--text-mid)',
                  background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' : 'transparent',
                  fontFamily: 'var(--font-body)',
                  boxShadow:  isActive ? '0 10px 22px rgba(246,196,0,0.16)' : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Lang */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200"
            style={{
              color:      'var(--text-hi)',
              background: 'var(--bg-card)',
              border: '1px solid var(--outline-subtle)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="font-semibold text-xs tracking-wide">{currentLang.label}</span>
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none" style={{ opacity: 0.5 }}>
              <path d="M1 1l3.5 3L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl shadow-2xl overflow-hidden z-50 w-36"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-subtle)' }}
              >
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLocale(l.code)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150"
                    style={{
                      color:      l.code === locale ? 'var(--bg-base)' : 'var(--text-mid)',
                      background: l.code === locale ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' : 'transparent',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="font-semibold text-xs tracking-wide">{l.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
