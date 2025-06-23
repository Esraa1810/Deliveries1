// components/LanguageToggle.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function LanguageToggle({ style, lightMode = false }) {
  const { currentLanguage, changeLanguage, getAvailableLanguages, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  const languages = getAvailableLanguages();
  const currentLang = languages.find(lang => lang.code === currentLanguage);

  const showModal = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handleLanguageSelect = async (languageCode) => {
    await changeLanguage(languageCode);
    hideModal();
  };

  return (
    <>
      {/* Language Toggle Button */}
      <TouchableOpacity
        style={[
          styles.toggleButton,
          lightMode ? styles.lightToggleButton : styles.darkToggleButton,
          style
        ]}
        onPress={showModal}
        activeOpacity={0.7}
      >
        <Text style={styles.flagIcon}>{currentLang?.flag}</Text>
        <Text style={[
          styles.languageCode,
          lightMode ? styles.lightText : styles.darkText
        ]}>
          {currentLanguage.toUpperCase()}
        </Text>
        <Text style={[
          styles.dropdownArrow,
          lightMode ? styles.lightText : styles.darkText
        ]}>
          ▼
        </Text>
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={hideModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
            </View>

            <View style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === language.code && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionFlag}>{language.flag}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionNativeName,
                      currentLanguage === language.code && styles.selectedOptionText
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.optionEnglishName,
                      currentLanguage === language.code && styles.selectedOptionSubText
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {currentLanguage === language.code && (
                    <View style={styles.checkContainer}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Toggle Button Styles
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
  },
  lightToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  darkToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  flagIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  languageCode: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  lightText: {
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  dropdownArrow: {
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    maxWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  languageList: {
    paddingVertical: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  selectedLanguageOption: {
    backgroundColor: '#f0f7ff',
  },
  optionFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionNativeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  selectedOptionText: {
    color: '#1B4965',
    fontWeight: '600',
  },
  optionEnglishName: {
    fontSize: 12,
    color: '#666',
  },
  selectedOptionSubText: {
    color: '#1B4965',
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Compact version for use in tight spaces
export function CompactLanguageToggle({ style, lightMode = false }) {
  const { currentLanguage, changeLanguage, getAvailableLanguages } = useLanguage();
  const languages = getAvailableLanguages();
  const currentLang = languages.find(lang => lang.code === currentLanguage);

  const switchToNextLanguage = async () => {
    const currentIndex = languages.findIndex(lang => lang.code === currentLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    await changeLanguage(languages[nextIndex].code);
  };

  return (
    <TouchableOpacity
      style={[
        styles.compactToggle,
        lightMode ? styles.lightToggleButton : styles.darkToggleButton,
        style
      ]}
      onPress={switchToNextLanguage}
      activeOpacity={0.7}
    >
      <Text style={styles.flagIcon}>{currentLang?.flag}</Text>
    </TouchableOpacity>
  );
}

const compactStyles = StyleSheet.create({
  compactToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});