// screens/RegisterScreen.js - Updated with Translations and Language Toggle
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

// Firebase imports
import { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile
} from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from '../firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
    companyName: '',
    phoneNumber: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Auth Configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '902623042071-a5l7oj4sq8rifjnmbnv154rd22n4djps.apps.googleusercontent.com',
    iosClientId: '902623042071-a5l7oj4sq8rifjnmbnv154rd22n4djps.apps.googleusercontent.com',
    androidClientId: '902623042071-a5l7oj4sq8rifjnmbnv154rd22n4djps.apps.googleusercontent.com',
    webClientId: '902623042071-a5l7oj4sq8rifjnmbnv154rd22n4djps.apps.googleusercontent.com',
  });

  // Handle Google Sign-In Response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.params.id_token);
    }
  }, [response]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      length: password.length >= 8,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChar: hasSpecialChar,
      isValid: password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers
    };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('invalidEmail');
    }

    const passwordValidation = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    } else if (!passwordValidation.isValid) {
      newErrors.password = t('passwordTooWeak');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordsNotMatch');
    }

    if (!formData.userType) {
      newErrors.userType = t('roleRequired');
    }

    if (formData.userType === 'cargo' && !formData.companyName.trim()) {
      newErrors.companyName = t('companyNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if email already exists
  const checkEmailExists = async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async (idToken) => {
    setLoading(true);
    
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      const uid = userCred.user.uid;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        // New user - show role selection
        setFormData(prev => ({
          ...prev,
          name: userCred.user.displayName || '',
          email: userCred.user.email || '',
        }));
        Alert.alert(
          t('welcome'),
          t('roleRequired'),
          [{ text: 'OK', onPress: () => setLoading(false) }]
        );
      } else {
        // Existing user
        const userData = userDoc.data();
        navigation.replace(userData.userType === 'cargo' ? 'CargoDashboard' : 'TruckDashboard');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Alert.alert(t('error'), error.message);
      setLoading(false);
    }
  };

  // Handle email/password registration
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: t('invalidEmail') });
        setLoading(false);
        return;
      }

      // Create user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      // Update user profile
      await updateProfile(userCred.user, {
        displayName: formData.name.trim()
      });

      // Save user data to Firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        userType: formData.userType,
        companyName: formData.companyName.trim() || null,
        phoneNumber: formData.phoneNumber.trim() || null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        profileComplete: true
      });

      Alert.alert(
        t('success'),
        `${t('welcome')} ${formData.name}!`,
        [
          {
            text: t('continue'),
            onPress: () => navigation.replace(
              formData.userType === 'cargo' ? 'CargoDashboard' : 'TruckDashboard'
            )
          }
        ]
      );

    } catch (error) {
      console.error('Registration Error:', error);
      let errorMessage = t('error');

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('invalidEmail');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('invalidEmail');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('passwordTooWeak');
      }

      Alert.alert(t('error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B4965" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isRTL && styles.rtlContainer]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Language Toggle */}
      <View style={styles.languageToggleContainer}>
        <LanguageToggle lightMode={true} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🚚</Text>
          </View>
          <Text style={[styles.title, isRTL && styles.rtlText]}>{t('createAccount')}</Text>
          <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
            {t('welcome')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('fullName')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.name && styles.inputError,
                isRTL && styles.rtlInput
              ]}
              placeholder={t('fullName')}
              value={formData.name}
              onChangeText={text => {
                setFormData({ ...formData, name: text });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              autoCapitalize="words"
              autoCorrect={false}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.name && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('email')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError,
                isRTL && styles.rtlInput
              ]}
              placeholder={t('email')}
              value={formData.email}
              onChangeText={text => {
                setFormData({ ...formData, email: text });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.email && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('password')} *
            </Text>
            <View style={[styles.passwordContainer, isRTL && styles.rtlPasswordContainer]}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.password && styles.inputError,
                  isRTL && styles.rtlInput
                ]}
                placeholder={t('password')}
                value={formData.password}
                onChangeText={text => {
                  setFormData({ ...formData, password: text });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('confirmPassword')} *
            </Text>
            <View style={[styles.passwordContainer, isRTL && styles.rtlPasswordContainer]}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.confirmPassword && styles.inputError,
                  isRTL && styles.rtlInput
                ]}
                placeholder={t('confirmPassword')}
                value={formData.confirmPassword}
                onChangeText={text => {
                  setFormData({ ...formData, confirmPassword: text });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.confirmPassword}</Text>}
          </View>

          {/* User Type Selection */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('selectRole')} *
            </Text>
            <View style={[styles.roleContainer, isRTL && styles.rtlRoleContainer]}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.userType === 'cargo' && styles.selectedRole
                ]}
                onPress={() => {
                  setFormData({ ...formData, userType: 'cargo' });
                  if (errors.userType) setErrors({ ...errors, userType: null });
                }}
              >
                <Text style={styles.roleIcon}>🚚</Text>
                <Text style={[
                  styles.roleText,
                  formData.userType === 'cargo' && styles.selectedRoleText,
                  isRTL && styles.rtlText
                ]}>
                  {t('cargoOwner')}
                </Text>
                <Text style={[
                  styles.roleDescription,
                  formData.userType === 'cargo' && styles.selectedRoleText,
                  isRTL && styles.rtlText
                ]}>
                  {t('shipGoodsManageCargo')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.userType === 'truck' && styles.selectedRole
                ]}
                onPress={() => {
                  setFormData({ ...formData, userType: 'truck' });
                  if (errors.userType) setErrors({ ...errors, userType: null });
                }}
              >
                <Text style={styles.roleIcon}>🚛</Text>
                <Text style={[
                  styles.roleText,
                  formData.userType === 'truck' && styles.selectedRoleText,
                  isRTL && styles.rtlText
                ]}>
                  {t('truckDriver')}
                </Text>
                <Text style={[
                  styles.roleDescription,
                  formData.userType === 'truck' && styles.selectedRoleText,
                  isRTL && styles.rtlText
                ]}>
                  {t('transportCargoEarn')}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.userType && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.userType}</Text>}
          </View>

          {/* Company Name (for cargo owners) */}
          {formData.userType === 'cargo' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('companyName')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errors.companyName && styles.inputError,
                  isRTL && styles.rtlInput
                ]}
                placeholder={t('companyName')}
                value={formData.companyName}
                onChangeText={text => {
                  setFormData({ ...formData, companyName: text });
                  if (errors.companyName) setErrors({ ...errors, companyName: null });
                }}
                autoCapitalize="words"
                textAlign={isRTL ? 'right' : 'left'}
              />
              {errors.companyName && <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errors.companyName}</Text>}
            </View>
          )}

          {/* Phone Number (optional) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('phoneNumber')} ({t('*')})
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              placeholder={t('phoneNumber')}
              value={formData.phoneNumber}
              onChangeText={text => setFormData({ ...formData, phoneNumber: text })}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>{t('createAccount')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request}
          >
            <Text style={styles.googleIcon}>🔍</Text>
            <Text style={styles.googleButtonText}>{t('continueWithGoogle')}</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={[styles.loginLinkText, isRTL && styles.rtlText]}>
              {t('alreadyHaveAccount')} <Text style={styles.loginLinkBold}>{t('signIn')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  languageToggleContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#1B4965',
    fontWeight: '500',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  rtlInput: {
    textAlign: 'right',
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rtlPasswordContainer: {
    flexDirection: 'row-reverse',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rtlRoleContainer: {
    flexDirection: 'row-reverse',
  },
  roleButton: {
    flex: 0.48,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedRole: {
    borderColor: '#1B4965',
    backgroundColor: '#f0f7ff',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedRoleText: {
    color: '#1B4965',
  },
  registerButton: {
    backgroundColor: '#1B4965',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1B4965',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 30,
  },
  loginLinkText: {
    color: '#666',
    fontSize: 16,
  },
  loginLinkBold: {
    color: '#1B4965',
    fontWeight: 'bold',
  },
});