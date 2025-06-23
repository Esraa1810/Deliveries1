// screens/LanguageSelectionScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function LanguageSelectionScreen({ navigation, onLanguageSelected }) {
  const { t, changeLanguage, getAvailableLanguages, currentLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLanguageSelect = async (languageCode) => {
    setSelectedLanguage(languageCode);
    await changeLanguage(languageCode);
    
    // If this is called from app initialization
    if (onLanguageSelected) {
      onLanguageSelected(languageCode);
    } else {
      // If called from settings, go back
      navigation.goBack();
    }
  };

  const languages = getAvailableLanguages();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🌍</Text>
          </View>
          <Text style={styles.title}>{t('selectLanguage')}</Text>
          <Text style={styles.subtitle}>{t('choosePreferredLanguage')}</Text>
        </View>

        {/* Language Options */}
        <View style={styles.languageContainer}>
          {languages.map((language, index) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageButton,
                selectedLanguage === language.code && styles.selectedLanguageButton,
                { 
                  transform: [{ 
                    scale: selectedLanguage === language.code ? 1.02 : 1 
                  }] 
                }
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.8}
            >
              <View style={styles.languageContent}>
                <Text style={styles.flagIcon}>{language.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={[
                    styles.languageName,
                    selectedLanguage === language.code && styles.selectedLanguageText
                  ]}>
                    {language.nativeName}
                  </Text>
                  <Text style={[
                    styles.languageEnglishName,
                    selectedLanguage === language.code && styles.selectedLanguageSubText
                  ]}>
                    {language.name}
                  </Text>
                </View>
                {selectedLanguage === language.code && (
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => handleLanguageSelect(selectedLanguage)}
        >
          <Text style={styles.continueButtonText}>{t('continue')}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can change this later in settings
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B4965',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  languageContainer: {
    marginBottom: 40,
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedLanguageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  flagIcon: {
    fontSize: 40,
    marginRight: 20,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  selectedLanguageText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  languageEnglishName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  selectedLanguageSubText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  checkmarkContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: '#1B4965',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});