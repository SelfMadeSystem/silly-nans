/**
 * This file contains utility functions to help with language detection and selection.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
import { useEffect, useState } from 'react';

/**
 * Gets the index of the earliest language in the list that starts with the given language.
 * @param languages The list of languages
 * @param lang The language to search for
 * @returns The index of the earliest language in the list that starts with the given language
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function getEarliestLanguageIndex(languages: readonly string[] | undefined, lang: string): number {
  if (!languages) return -1;
  return languages.findIndex(language => language.startsWith(lang));
}

/**
 * Gets the preferred language from a list of languages. Determines the preferred
 * language by checking which language comes first in the list. If neither language
 * is in the list, it defaults to French, since this is a French hackathon. (kinda
 * ironic I'm writing this in English, but I'm more comfortable with English)
 * @param languages The list of languages
 * @returns The preferred language from the list of languages
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function getPreferredLanguageFromList(languages: readonly string[] | undefined): 'fr' | 'en' {
  if (!languages) return 'en';
  const frIndex = getEarliestLanguageIndex(languages, 'fr');
  const enIndex = getEarliestLanguageIndex(languages, 'en');
  if (enIndex === -1) return 'fr';
  if (frIndex === -1) return 'en';
  return frIndex < enIndex ? 'fr' : 'en';
}

/**
 * Gets the preferred language from the navigator.
 * @returns The preferred language from the navigator, defaults to French if navigator is not available
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function getPreferredLanguage() {
  if (!navigator) return 'fr';
  const languages = navigator.languages;
  return getPreferredLanguageFromList(languages);
}

/**
 * React hook to get or set the preferred language.
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-14
 */
export function usePreferredLanguage(): ['fr' | 'en', React.Dispatch<React.SetStateAction<'fr' | 'en'>>] {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
    else setLang(getPreferredLanguage());
  }, []);

  const setLangAndStore: React.Dispatch<React.SetStateAction<'fr' | 'en'>> = newLang => {
    if (newLang === 'fr' || newLang === 'en') {
      setLang(newLang);
      localStorage.setItem('lang', newLang);
    } else {
      setLang(prevLang => {
        const lang = newLang(prevLang);
        localStorage.setItem('lang', lang);
        return lang;
      });
    }
  };

  return [lang, setLangAndStore];
}
