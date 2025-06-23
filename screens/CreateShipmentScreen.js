// screens/CreateShipmentScreen.js - Multi-step Shipment Creation with Data Persistence
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from '../firebase';

export default function CreateShipmentScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [shipmentData, setShipmentData] = useState({
    // Basic Details
    title: '',
    description: '',
    urgency: 'normal',
    
    // Cargo Details
    cargoType: '',
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    value: '',
    specialInstructions: '',
    
    // Locations
    pickupLocation: '',
    deliveryLocation: '',
    pickupDate: new Date(),
    deliveryDate: new Date(),
    
    // Preferences
    truckType: '',
    budget: '',
    insurance: false,
    trackingRequired: true,
    
    // Additional
    contactInfo: {
      phone: '',
      email: '',
    },
  });

  const steps = [
    { 
      key: 'basic', 
      title: t('basicDetails'), 
      icon: '📝',
    },
    { 
      key: 'cargo', 
      title: t('cargoInfo'), 
      icon: '📦',
    },
    { 
      key: 'locations', 
      title: t('locations'), 
      icon: '📍',
    },
    { 
      key: 'preferences', 
      title: t('preferences'), 
      icon: '⚙️',
    },
    { 
      key: 'review', 
      title: t('review'), 
      icon: '✅',
    },
  ];

  const updateShipmentData = (field, value) => {
    setShipmentData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateStep = (stepIndex) => {
    const step = steps[stepIndex];
    switch (step.key) {
      case 'basic':
        return shipmentData.title && shipmentData.description;
      case 'cargo':
        return shipmentData.cargoType && shipmentData.weight;
      case 'locations':
        return shipmentData.pickupLocation && shipmentData.deliveryLocation;
      case 'preferences':
        return shipmentData.truckType && shipmentData.budget;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      Alert.alert(t('incompleteInfo'), t('fillRequiredFields'));
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(t('error'), 'You must be logged in to create a shipment.');
        setLoading(false);
        return;
      }

      // Create shipment document
      const shipmentDoc = {
        // Basic info
        title: shipmentData.title,
        description: shipmentData.description,
        urgency: shipmentData.urgency,
        
        // Cargo details
        cargoType: shipmentData.cargoType,
        weight: parseFloat(shipmentData.weight) || 0,
        value: parseFloat(shipmentData.value) || 0,
        specialInstructions: shipmentData.specialInstructions,
        
        // Locations
        pickupLocation: shipmentData.pickupLocation,
        deliveryLocation: shipmentData.deliveryLocation,
        pickupDate: shipmentData.pickupDate,
        deliveryDate: shipmentData.deliveryDate,
        
        // Preferences
        truckType: shipmentData.truckType,
        budget: parseFloat(shipmentData.budget) || 0,
        insurance: shipmentData.insurance,
        trackingRequired: shipmentData.trackingRequired,
        
        // Metadata
        ownerId: user.uid,
        ownerEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Additional fields
        assignedDriverId: null,
        estimatedDeliveryDate: null,
        actualDeliveryDate: null,
        tracking: {
          currentLocation: null,
          lastUpdate: null,
          route: []
        }
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'shipments'), shipmentDoc);
      
      console.log('Shipment created with ID:', docRef.id);
      
      Alert.alert(
        t('success'),
        t('shipmentCreated') + ' ' + t('shipmentCreatedMessage'),
        [
          {
            text: t('viewDashboard'),
            onPress: () => {
              // Pass a refresh flag to trigger dashboard reload
              navigation.navigate('CargoDashboard', { 
                shouldRefresh: true,
                newShipmentId: docRef.id 
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating shipment:', error);
      Alert.alert(t('error'), 'Failed to create shipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={[styles.progressContainer, isRTL && styles.rtlContainer]}>
      {steps.map((step, index) => (
        <View key={step.key} style={styles.progressStep}>
          <View style={[
            styles.progressCircle,
            index <= currentStep ? styles.progressCircleActive : styles.progressCircleInactive
          ]}>
            <Text style={[
              styles.progressIcon,
              index <= currentStep ? styles.progressIconActive : styles.progressIconInactive
            ]}>
              {step.icon}
            </Text>
          </View>
          <Text style={[
            styles.progressLabel,
            index <= currentStep ? styles.progressLabelActive : styles.progressLabelInactive,
            isRTL && styles.rtlText
          ]}>
            {step.title}
          </Text>
          {index < steps.length - 1 && (
            <View style={[
              styles.progressLine,
              index < currentStep ? styles.progressLineActive : styles.progressLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].key) {
      case 'basic':
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('shipmentTitle')} *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.title}
                onChangeText={(value) => updateShipmentData('title', value)}
                placeholder={t('shipmentTitle')}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('description')} *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
                value={shipmentData.description}
                onChangeText={(value) => updateShipmentData('description', value)}
                placeholder={t('description')}
                multiline
                numberOfLines={4}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        );

      case 'cargo':
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('cargoType')} *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.cargoType}
                onChangeText={(value) => updateShipmentData('cargoType', value)}
                placeholder="e.g., Electronics, Furniture, Food"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('cargoWeight')} (kg) *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.weight}
                onChangeText={(value) => updateShipmentData('weight', value)}
                placeholder="Enter weight in kg"
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('cargoValue')} ($)
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.value}
                onChangeText={(value) => updateShipmentData('value', value)}
                placeholder="Estimated value"
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        );

      case 'locations':
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('pickupLocation')} *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.pickupLocation}
                onChangeText={(value) => updateShipmentData('pickupLocation', value)}
                placeholder="Enter pickup address"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('deliveryLocation')} *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.deliveryLocation}
                onChangeText={(value) => updateShipmentData('deliveryLocation', value)}
                placeholder="Enter delivery address"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        );

      case 'preferences':
        return (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('truckDetails')} *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.truckType}
                onChangeText={(value) => updateShipmentData('truckType', value)}
                placeholder="e.g., Box Truck, Flatbed, Refrigerated"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.rtlText]}>
                {t('budget')} ($) *
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={shipmentData.budget}
                onChangeText={(value) => updateShipmentData('budget', value)}
                placeholder="Your budget for this shipment"
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={styles.reviewContainer}>
            <Text style={[styles.reviewTitle, isRTL && styles.rtlText]}>
              {t('review')} {t('shipmentDetails')}
            </Text>
            
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewSectionTitle, isRTL && styles.rtlText]}>
                {t('basicDetails')}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('shipmentTitle')}: {shipmentData.title}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('description')}: {shipmentData.description}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewSectionTitle, isRTL && styles.rtlText]}>
                {t('cargoInfo')}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('cargoType')}: {shipmentData.cargoType}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('cargoWeight')}: {shipmentData.weight} kg
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('cargoValue')}: ${shipmentData.value}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewSectionTitle, isRTL && styles.rtlText]}>
                {t('locations')}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('pickupLocation')}: {shipmentData.pickupLocation}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('deliveryLocation')}: {shipmentData.deliveryLocation}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewSectionTitle, isRTL && styles.rtlText]}>
                {t('preferences')}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('truckDetails')}: {shipmentData.truckType}
              </Text>
              <Text style={[styles.reviewItem, isRTL && styles.rtlText]}>
                {t('budget')}: ${shipmentData.budget}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rtlHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={[
            styles.backButtonText, 
            isRTL && { transform: [{ scaleX: -1 }] }
          ]}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {t('createShipment')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Current Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
            {steps[currentStep].title}
          </Text>
          
          {renderStepContent()}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.navigationContainer, isRTL && styles.rtlNavigationContainer]}>
        <TouchableOpacity 
          style={styles.backNavButton} 
          onPress={handleBack}
        >
          <Text style={styles.backNavButtonText}>
            {currentStep === 0 ? t('cancel') : t('back')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.nextButton,
            (!validateStep(currentStep) || loading) && styles.nextButtonDisabled
          ]} 
          onPress={handleNext}
          disabled={!validateStep(currentStep) || loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? t('loading') : (currentStep === steps.length - 1 ? t('createShipment') : t('continue'))}
          </Text>
        </TouchableOpacity>
      </View>
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
  
  // Header
  header: {
    backgroundColor: '#1B4965',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
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
  
  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: '#1B4965',
  },
  progressCircleInactive: {
    backgroundColor: '#e0e0e0',
  },
  progressIcon: {
    fontSize: 18,
  },
  progressIconActive: {
    color: '#fff',
  },
  progressIconInactive: {
    color: '#999',
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#1B4965',
    fontWeight: 'bold',
  },
  progressLabelInactive: {
    color: '#999',
  },
  progressLine: {
    position: 'absolute',
    top: 20,
    left: '70%',
    right: '-30%',
    height: 2,
  },
  progressLineActive: {
    backgroundColor: '#1B4965',
  },
  progressLineInactive: {
    backgroundColor: '#e0e0e0',
  },
  
  // Content
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  
  // Form Styles
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  rtlInput: {
    textAlign: 'right',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  // Review Styles
  reviewContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 10,
  },
  reviewItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    paddingLeft: 10,
  },
  
  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  rtlNavigationContainer: {
    flexDirection: 'row-reverse',
  },
  backNavButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1B4965',
    borderRadius: 8,
    marginRight: 10,
  },
  backNavButtonText: {
    color: '#1B4965',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#1B4965',
    borderRadius: 8,
    marginLeft: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});