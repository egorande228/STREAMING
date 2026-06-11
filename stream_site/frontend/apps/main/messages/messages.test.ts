import { describe, expect, it } from 'vitest';
import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ja from './ja.json';
import ko from './ko.json';
import mn from './mn.json';
import pt from './pt.json';
import ru from './ru.json';
import zh from './zh.json';
import streamAr from '../../stream/messages/ar.json';
import streamDe from '../../stream/messages/de.json';
import streamEn from '../../stream/messages/en.json';
import streamEs from '../../stream/messages/es.json';
import streamFr from '../../stream/messages/fr.json';
import streamJa from '../../stream/messages/ja.json';
import streamKo from '../../stream/messages/ko.json';
import streamMn from '../../stream/messages/mn.json';
import streamPt from '../../stream/messages/pt.json';
import streamRu from '../../stream/messages/ru.json';
import streamZh from '../../stream/messages/zh.json';

type Messages = Record<string, unknown>;

function listKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Messages)
    .flatMap(([key, nested]) => listKeys(nested, prefix ? `${prefix}.${key}` : key))
    .sort();
}

const mainLocales: Record<string, Messages> = { en, ru, es, pt, ar, fr, de, zh, ja, ko, mn };
const streamLocales: Record<string, Messages> = {
  en: streamEn,
  ru: streamRu,
  es: streamEs,
  pt: streamPt,
  ar: streamAr,
  fr: streamFr,
  de: streamDe,
  zh: streamZh,
  ja: streamJa,
  ko: streamKo,
  mn: streamMn,
};

describe('message catalogs', () => {
  const expectedKeys = listKeys(en);

  it('keeps the same key structure across all main locales', () => {
    for (const [locale, messages] of Object.entries(mainLocales)) {
      expect(listKeys(messages), `main locale ${locale}`).toEqual(expectedKeys);
    }
  });

  it('keeps stream locale catalogs in sync with main', () => {
    for (const [locale, messages] of Object.entries(streamLocales)) {
      expect(messages, `stream locale ${locale}`).toEqual(mainLocales[locale]);
    }
  });
});
