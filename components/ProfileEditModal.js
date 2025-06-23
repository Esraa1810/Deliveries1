// components/ProfileEditModal.js - Clean Version for Production
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { auth, db, doc, updateDoc, setDoc } from '../firebase';

const { width, height } = Dimensions.get('window');

export default function ProfileEditModal({ visible, onClose, userData, onUpdate }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    businessType: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    website: ''
  });

  useEffect(() => {
    if (visible && userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        companyName: userData.companyName || '',
        businessType: userData.businessType || '',
        address: userData.address || '',
        city: userData.city || '',
        country: userData.country || 'UAE',
        taxId: userData.taxId || '',
        website: userData.website || ''
      });
      setActiveSection('personal');
    }
  }, [visible, userData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email address is required');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...formData,
        uid: user.uid,
        updatedAt: new Date(),
        lastLogin: new Date()
      }, { merge: true });

      // Update local state
      onUpdate && onUpdate(formData);

      Alert.alert(
        'Success',
        'Your profile has been updated successfully',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDescription, isRTL && styles.rtlText]}>
              Personal information and contact details
            </Text>
            
            {/* Test visibility */}
            <Text style={{color: 'red', fontSize: 16, marginBottom: 10}}>
             {/* TEST: Can you see this text?*/}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.name || ''}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.email || ''}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.phone || ''}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
                keyboardType="phone-pad"
              />
            </View>
            
            {/* Another test */}
            <Text style={{color: 'blue', fontSize: 14, marginTop: 10}}>
              Form data: {JSON.stringify(formData, null, 2)}
            </Text>
          </View>
        );

      case 'business':
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDescription, isRTL && styles.rtlText]}>
              Company and business information
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Company Name
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.companyName || ''}
                onChangeText={(value) => handleInputChange('companyName', value)}
                placeholder="Enter your company name"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Business Type
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.businessType || ''}
                onChangeText={(value) => handleInputChange('businessType', value)}
                placeholder="e.g., Logistics, Trading, Manufacturing"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Tax ID / Commercial Registration
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.taxId || ''}
                onChangeText={(value) => handleInputChange('taxId', value)}
                placeholder="Enter your tax ID or CR number"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Website
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.website || ''}
                onChangeText={(value) => handleInputChange('website', value)}
                placeholder="https://yourcompany.com"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>
        );

      case 'address':
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDescription, isRTL && styles.rtlText]}>
              Business address and location
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Business Address
              </Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput, isRTL && styles.rtlInput]}
                value={formData.address || ''}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder="Enter your complete business address"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
                multiline={true}
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                City
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.city || ''}
                onChangeText={(value) => handleInputChange('city', value)}
                placeholder="Enter city"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                Country
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlInput]}
                value={formData.country || ''}
                onChangeText={(value) => handleInputChange('country', value)}
                placeholder="Enter country"
                placeholderTextColor="#999"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContainer, isRTL && styles.rtlContainer]}>
          {/* Header */}
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                Edit Profile
              </Text>
              <Text style={[styles.modalSubtitle, isRTL && styles.rtlText]}>
                Update your business information
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Section Tabs */}
          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'personal' && styles.activeSectionTab]}
              onPress={() => setActiveSection('personal')}
            >
              <Text style={[
                styles.sectionTabText,
                activeSection === 'personal' && styles.activeSectionTabText,
                isRTL && styles.rtlText
              ]}>
                Personal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'business' && styles.activeSectionTab]}
              onPress={() => setActiveSection('business')}
            >
              <Text style={[
                styles.sectionTabText,
                activeSection === 'business' && styles.activeSectionTabText,
                isRTL && styles.rtlText
              ]}>
                Business
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'address' && styles.activeSectionTab]}
              onPress={() => setActiveSection('address')}
            >
              <Text style={[
                styles.sectionTabText,
                activeSection === 'address' && styles.activeSectionTabText,
                isRTL && styles.rtlText
              ]}>
                Address
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {renderSection()}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={[styles.modalActions, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.95,
    height: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  rtlContainer: {
    direction: 'rtl',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSectionTab: {
    backgroundColor: '#1B4965',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeSectionTabText: {
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    minHeight: 300,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionContent: {
    minHeight: 250,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
    fontSize: 16,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    minHeight: 52,
  },
  rtlInput: {
    textAlign: 'right',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cancelButton: {
    flex: 0.45,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 0.45,
    backgroundColor: '#1B4965',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1B4965',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  rtlText: {
    textAlign: 'right',
  },
});