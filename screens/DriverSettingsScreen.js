// screens/DriverSettingsScreen.js - Driver App Settings
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  Modal,
  TextInput,
  Linking
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { 
  auth, 
  db, 
  doc, 
  updateDoc, 
  getDoc,
  signOut
} from '../firebase';

export default function DriverSettingsScreen({ navigation }) {
  const { t, isRTL, changeLanguage, currentLanguage } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    autoAcceptJobs: false,
    darkMode: false,
    soundAlerts: true,
    vibration: true,
    dataUsage: 'wifi'
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContact: '',
    licenseNumber: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

 const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setProfileForm({
            name: data.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            emergencyContact: data.emergencyContact || '',
            licenseNumber: data.licenseNumber || ''
          });
          setSettings(prev => ({
            ...prev,
            ...data.settings
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        
        await updateDoc(doc(db, 'users', user.uid), {
          settings: newSettings
        });
      }
    } catch (error) {
      Alert.alert(t('error'), t('settingsUpdateFailed'));
    }
  };

  const updateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        name: profileForm.name,
        phone: profileForm.phone,
        emergencyContact: profileForm.emergencyContact,
        licenseNumber: profileForm.licenseNumber
      });

      setUserData(prev => ({
        ...prev,
        ...profileForm
      }));

      setShowProfileModal(false);
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('profileUpdateFailed'));
    }
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setShowLanguageModal(false);
    Alert.alert(t('success'), t('languageChanged'));
  };

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('signOutConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.replace('Register');
            } catch (error) {
              Alert.alert(t('error'), t('signOutFailed'));
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      t('deleteAccountWarning'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('deleteAccount'), t('deleteAccountFeatureComingSoon'));
          }
        }
      ]
    );
  };

  const renderSettingItem = (icon, title, description, value, onToggle, type = 'switch') => (
    <View style={[styles.settingItem, isRTL && styles.rtlRow]}>
      <View style={styles.settingIcon}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isRTL && styles.rtlText]}>{title}</Text>
        {description && (
          <Text style={[styles.settingDescription, isRTL && styles.rtlText]}>{description}</Text>
        )}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0E0', true: '#1B4965' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <TouchableOpacity onPress={onToggle} style={styles.settingArrow}>
          <Text style={[styles.arrowText, isRTL && { transform: [{ scaleX: -1 }] }]}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMenuSection = (title, items) => (
    <View style={styles.menuSection}>
      <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{title}</Text>
      <View style={styles.menuItems}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              isRTL && styles.rtlRow,
              index === items.length - 1 && styles.lastMenuItem
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>{item.title}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.value && (
                <Text style={[styles.menuValue, isRTL && styles.rtlText]}>{item.value}</Text>
              )}
              <Text style={[styles.menuArrow, isRTL && { transform: [{ scaleX: -1 }] }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇦🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isRTL && styles.rtlRow]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={[
              styles.backButtonText,
              isRTL && { transform: [{ scaleX: -1 }] }
            ]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {t('settings')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'D'}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, isRTL && styles.rtlText]}>
                {userData?.name || t('driver')}
              </Text>
              <Text style={[styles.profileEmail, isRTL && styles.rtlText]}>
                {userData?.email || t('noEmail')}
              </Text>
              <View style={[styles.profileRating, isRTL && styles.rtlRow]}>
                <Text style={styles.ratingIcon}>⭐</Text>
                <Text style={styles.ratingText}>{userData?.rating || 4.8}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setShowProfileModal(true)}
            >
              <Text style={styles.editProfileText}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('appSettings')}
          </Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              '🔔',
              t('notifications'),
              t('receiveJobAlerts'),
              settings.notifications,
              (value) => updateSetting('notifications', value)
            )}
            {renderSettingItem(
              '📍',
              t('locationSharing'),
              t('shareLocationWithCustomers'),
              settings.locationSharing,
              (value) => updateSetting('locationSharing', value)
            )}
            {renderSettingItem(
              '🔊',
              t('soundAlerts'),
              t('playSoundsForNotifications'),
              settings.soundAlerts,
              (value) => updateSetting('soundAlerts', value)
            )}
            {renderSettingItem(
              '📳',
              t('vibration'),
              t('vibrateForNotifications'),
              settings.vibration,
              (value) => updateSetting('vibration', value)
            )}
            {renderSettingItem(
              '🚛',
              t('autoAcceptJobs'),
              t('automaticallyAcceptMatchingJobs'),
              settings.autoAcceptJobs,
              (value) => updateSetting('autoAcceptJobs', value)
            )}
          </View>
        </View>

        {/* Account & Security */}
        {renderMenuSection(t('accountSecurity'), [
          {
            icon: '👤',
            title: t('editProfile'),
            onPress: () => setShowProfileModal(true)
          },
          {
            icon: '🔑',
            title: t('changePassword'),
            onPress: () => setShowPasswordModal(true)
          },
          {
            icon: '🛡️',
            title: t('privacySettings'),
            onPress: () => Alert.alert(t('privacySettings'), t('privacyFeatureComingSoon'))
          },
          {
            icon: '📱',
            title: t('twoFactorAuth'),
            onPress: () => Alert.alert(t('twoFactorAuth'), t('twoFactorFeatureComingSoon'))
          }
        ])}

        {/* Preferences */}
        {renderMenuSection(t('preferences'), [
          {
            icon: '🌐',
            title: t('language'),
            value: languages.find(l => l.code === currentLanguage)?.name,
            onPress: () => setShowLanguageModal(true)
          },
          {
            icon: '📊',
            title: t('dataUsage'),
            value: t(settings.dataUsage),
            onPress: () => Alert.alert(t('dataUsage'), t('dataUsageFeatureComingSoon'))
          },
          {
            icon: '💾',
            title: t('storage'),
            onPress: () => Alert.alert(t('storage'), t('storageFeatureComingSoon'))
          }
        ])}

        {/* Support & Legal */}
        {renderMenuSection(t('supportLegal'), [
          {
            icon: '❓',
            title: t('helpCenter'),
            onPress: () => Alert.alert(t('helpCenter'), t('helpCenterFeatureComingSoon'))
          },
          {
            icon: '💬',
            title: t('contactSupport'),
            onPress: () => Alert.alert(t('contactSupport'), t('supportFeatureComingSoon'))
          },
          {
            icon: '⭐',
            title: t('rateApp'),
            onPress: () => Alert.alert(t('rateApp'), t('rateAppFeatureComingSoon'))
          },
          {
            icon: '📄',
            title: t('termsOfService'),
            onPress: () => Alert.alert(t('termsOfService'), t('termsFeatureComingSoon'))
          },
          {
            icon: '🔒',
            title: t('privacyPolicy'),
            onPress: () => Alert.alert(t('privacyPolicy'), t('privacyFeatureComingSoon'))
          }
        ])}

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={[styles.sectionTitle, styles.dangerTitle, isRTL && styles.rtlText]}>
            {t('dangerZone')}
          </Text>
          <View style={styles.dangerButtons}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutText}>🚪 {t('signOut')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteText}>🗑️ {t('deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, isRTL && styles.rtlText]}>
            TruckConnect Driver v1.0.0
          </Text>
          <Text style={[styles.appInfoText, isRTL && styles.rtlText]}>
            © 2024 TruckConnect. {t('allRightsReserved')}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.languageModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('selectLanguage')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLanguageModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {languages.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    currentLanguage === lang.code && styles.selectedLanguage,
                    isRTL && styles.rtlRow
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[styles.languageName, isRTL && styles.rtlText]}>
                    {lang.name}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('editProfile')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.profileForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('fullName')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={profileForm.name}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, name: text }))}
                  placeholder={t('enterFullName')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('phoneNumber')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={profileForm.phone}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, phone: text }))}
                  placeholder={t('enterPhoneNumber')}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('emergencyContact')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={profileForm.emergencyContact}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, emergencyContact: text }))}
                  placeholder={t('emergencyContactNumber')}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('licenseNumber')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={profileForm.licenseNumber}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, licenseNumber: text }))}
                  placeholder={t('drivingLicenseNumber')}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={updateProfile}
              >
                <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.passwordModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('changePassword')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContent}>
              <Text style={[styles.passwordInfo, isRTL && styles.rtlText]}>
                {t('passwordChangeInfo')}
              </Text>
              
              <TouchableOpacity
                style={styles.passwordButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  Alert.alert(t('passwordReset'), t('passwordResetFeatureComingSoon'));
                }}
              >
                <Text style={styles.passwordButtonText}>
                  📧 {t('sendResetEmail')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  rtlContainer: {
    direction: 'rtl',
  },
  header: {
    backgroundColor: '#1B4965',
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileText: {
    fontSize: 16,
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingIconText: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  settingArrow: {
    padding: 5,
  },
  arrowText: {
    fontSize: 18,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  menuSection: {
    marginBottom: 25,
  },
  menuItems: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  menuArrow: {
    fontSize: 16,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  dangerSection: {
    marginBottom: 25,
  },
  dangerTitle: {
    color: '#FF3B30',
  },
  dangerButtons: {
    gap: 10,
  },
  signOutButton: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  languageModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingTop: 20,
  },
  profileModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  passwordModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageList: {
    padding: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedLanguage: {
    backgroundColor: '#E3F2FD',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  profileForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  saveButton: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordContent: {
    padding: 20,
  },
  passwordInfo: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordButton: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }})
