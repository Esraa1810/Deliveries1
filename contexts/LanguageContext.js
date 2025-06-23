// contexts/LanguageContext.js - Updated with separated translation files
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

// Import translations from separated files
import { 
  translations, 
  supportedLanguages, 
  getLanguageInfo, 
  isRTLLanguage, 
  getLanguageCodes,
  DEFAULT_LANGUAGE,
  RTL_LANGUAGES 
} from '../translations';

// Language Context
const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE);
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language on app start
  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check saved language preference
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      if (savedLanguage && getLanguageCodes().includes(savedLanguage)) {
        await changeLanguage(savedLanguage);
      } else {
        // Auto-detect from device
        const deviceLanguage = Localization.locale.split('-')[0];
        const supportedLanguage = getLanguageCodes().includes(deviceLanguage) 
          ? deviceLanguage 
          : DEFAULT_LANGUAGE;
        await changeLanguage(supportedLanguage);
      }
    } catch (error) {
      console.error('Error initializing language:', error);
      await changeLanguage(DEFAULT_LANGUAGE); // Fallback to default
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language) => {
    try {
      // Validate language code
      if (!getLanguageCodes().includes(language)) {
        console.warn(`Unsupported language code: ${language}. Falling back to ${DEFAULT_LANGUAGE}`);
        language = DEFAULT_LANGUAGE;
      }

      setCurrentLanguage(language);
      
      // Set RTL using helper function
      const shouldBeRTL = isRTLLanguage(language);
      setIsRTL(shouldBeRTL);
      
      // Apply RTL to the app
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      
      // Save language preference
      await AsyncStorage.setItem('selectedLanguage', language);
      
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Translation function with fallback
  const t = (key, params = {}) => {
    try {
      let translation = translations[currentLanguage]?.[key] 
        || translations[DEFAULT_LANGUAGE]?.[key] 
        || key;
      
      // Replace parameters in translation
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
      
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return key; // Return the key as fallback
    }
  };

  // Get available languages with their display info
  const getAvailableLanguages = () => supportedLanguages;

  // Get current language info
  const getCurrentLanguageInfo = () => getLanguageInfo(currentLanguage);

  // Check if current language is RTL
  const isCurrentLanguageRTL = () => isRTLLanguage(currentLanguage);

  // Get translation for specific language (useful for multi-language content)
  const getTranslationForLanguage = (key, languageCode, params = {}) => {
    try {
      let translation = translations[languageCode]?.[key] 
        || translations[DEFAULT_LANGUAGE]?.[key] 
        || key;
      
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
      
      return translation;
    } catch (error) {
      console.error('Translation error for language:', languageCode, error);
      return key;
    }
  };

  // Check if translation exists
  const hasTranslation = (key) => {
    return translations[currentLanguage]?.[key] !== undefined;
  };

  // Get all translations for current language (useful for debugging)
  const getAllTranslations = () => {
    return translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  };

  const value = {
    // State
    currentLanguage,
    isRTL,
    isLoading,
    
    // Translation functions
    t,
    getTranslationForLanguage,
    hasTranslation,
    getAllTranslations,
    
    // Language management
    changeLanguage,
    getAvailableLanguages,
    getCurrentLanguageInfo,
    isCurrentLanguageRTL,
    
    // Utility
    supportedLanguages,
    RTL_LANGUAGES,
    DEFAULT_LANGUAGE,
    
    // Legacy support (for existing code)
    translations: translations[currentLanguage] || translations[DEFAULT_LANGUAGE]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};