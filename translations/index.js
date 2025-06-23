// translations/index.js - Main translation index file
import en from './en';
import ar from './ar';
import he from './he';

// Export all translations as a single object
export const translations = {
  en,
  ar,
  he
};

// Export individual languages for specific imports if needed
export { en, ar, he };

// Export supported language information
export const supportedLanguages = [
  { 
    code: 'en', 
    name: 'English', 
    flag: '🇺🇸', 
    nativeName: 'English',
    direction: 'ltr'
  },
  { 
    code: 'ar', 
    name: 'Arabic', 
    flag: '🇸🇦', 
    nativeName: 'العربية',
    direction: 'rtl'
  },
  { 
    code: 'he', 
    name: 'Hebrew', 
    flag: '🇮🇱', 
    nativeName: 'עברית',
    direction: 'rtl'
  }
];

// Helper function to get language info
export const getLanguageInfo = (languageCode) => {
  return supportedLanguages.find(lang => lang.code === languageCode) || supportedLanguages[0];
};

// Helper function to check if language is RTL
export const isRTLLanguage = (languageCode) => {
  const lang = getLanguageInfo(languageCode);
  return lang.direction === 'rtl';
};

// Helper function to get available language codes
export const getLanguageCodes = () => {
  return supportedLanguages.map(lang => lang.code);
};

// Default language
export const DEFAULT_LANGUAGE = 'en';

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he'];