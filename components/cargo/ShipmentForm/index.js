// components/cargo/ShipmentForm/index.js
// 🎯 Purpose: Professional multi-step shipment creation form
// 📋 Responsibilities:
//   - Multi-step form with progress tracking
//   - Real-time validation and feedback
//   - Smart auto-completion and suggestions
//   - Cost estimation and recommendations
//   - Professional UI with accessibility support

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated
} from 'react-native';

// Language and Services
import { useLanguage } from '../../../contexts/LanguageContext';
import ShipmentService from '../../../services/cargo/ShipmentService';
import ShipmentValidation from '../../../services/cargo/ShipmentValidation';

// Form Components
import BasicDetails from './BasicDetails';
import LocationPicker from './LocationPicker';
import CargoDetails from './CargoDetails';
import PreferencesStep from './PreferencesStep';
import ReviewStep from './ReviewStep';

// Shared Components
import ProgressIndicator from '../../shared/ProgressIndicator';
import ValidationSummary from '../../shared/ValidationSummary';
import CostEstimator from '../../shared/CostEstimator';

const { width, height } = Dimensions.get('window');

const FORM_STEPS = [
  { key: 'basic', title: 'Basic Details', icon: '📦' },
  { key: 'locations', title: 'Locations', icon: '📍' },
  { key: 'cargo', title: 'Cargo Details', icon: '📏' },
  { key: 'preferences', title: 'Preferences', icon: '⚙️' },
  { key: 'review', title: 'Review', icon: '✅' }
];

export default function ShipmentForm({ onSubmit, onCancel, initialData = null }) {
  const { t, isRTL } = useLanguage();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData || {
    // Basic details
    cargoType: '',
    description: '',
    
    // Locations
    pickup: {
      address: '',
      city: '',
      postalCode: '',
      country: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      instructions: ''
    },
    delivery: {
      address: '',
      city: '',
      postalCode: '',
      country: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      instructions: ''
    },
    
    // Cargo details
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    cargoValue: '',
    packaging: '',
    quantity: 1,
    
    // Preferences
    preferredDate: '',
    deadlineDate: '',
    priority: 'standard',
    specialHandling: [],
    insuranceRequired: false,
    specialInstructions: '',
    
    // Advanced options
    temperatureControlled: false,
    fragileHandling: false,
    signatureRequired: true,
    photoProofRequired: false
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: {}, warnings: [], recommendations: [] });
  const [costEstimate, setCostEstimate] = useState(null);
  const [slideAnim] = useState(new Animated.Value(0));
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Effects
  useEffect(() => {
    validateCurrentStep();
    animateStepTransition();
  }, [currentStep, formData]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentStep >= 2) { // Start estimating from cargo details step
        calculateCostEstimate();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [formData.weight, formData.dimensions, formData.pickup, formData.delivery, formData.priority]);

  // Animation
  const animateStepTransition = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Validation
  const validateCurrentStep = useCallback(() => {
    const stepValidation = ShipmentValidation.validateShipment(formData, t);
    setValidation(stepValidation);
    
    // Show validation summary if there are issues
    if (stepValidation.warnings.length > 0 || Object.keys(stepValidation.errors).length > 0) {
      setShowValidationSummary(true);
    }
  }, [formData, t]);

  // Cost estimation
  const calculateCostEstimate = async () => {
    try {
      if (formData.pickup.city && formData.delivery.city && formData.weight) {
        // Mock cost calculation - in real app, this would call a pricing API
        const baseRate = 2.5;
        const distance = Math.random() * 500 + 50; // Mock distance
        const weight = parseFloat(formData.weight) || 1;
        const priorityMultiplier = formData.priority === 'urgent' ? 1.5 : formData.priority === 'express' ? 2 : 1;
        
        const estimatedCost = Math.round(distance * baseRate * (1 + weight * 0.01) * priorityMultiplier);
        
        setCostEstimate({
          baseCost: Math.round(distance * baseRate),
          weightSurcharge: Math.round(distance * baseRate * weight * 0.01),
          prioritySurcharge: Math.round(distance * baseRate * (priorityMultiplier - 1)),
          totalCost: estimatedCost,
          distance: Math.round(distance),
          estimatedDuration: Math.round(distance / 60 * 60), // minutes
          currency: '$'
        });
      }
    } catch (error) {
      console.error('Error calculating cost estimate:', error);
    }
  };

  // Form navigation
  const goToNextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      if (validateStepData()) {
        setCurrentStep(currentStep + 1);
        slideAnim.setValue(0);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      slideAnim.setValue(0);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex <= currentStep + 1) { // Allow going to next step or any previous step
      setCurrentStep(stepIndex);
      slideAnim.setValue(0);
    }
  };

  // Step validation
  const validateStepData = () => {
    const stepErrors = getStepErrors();
    if (Object.keys(stepErrors).length > 0) {
      Alert.alert(
        t('validationError'),
        t('pleaseFixErrors'),
        [{ text: t('ok') }]
      );
      return false;
    }
    return true;
  };

  const getStepErrors = () => {
    const allErrors = validation.errors;
    const stepFields = getStepFields(currentStep);
    
    return Object.keys(allErrors)
      .filter(key => stepFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = allErrors[key];
        return obj;
      }, {});
  };

  const getStepFields = (step) => {
    switch (step) {
      case 0: return ['cargoType', 'description'];
      case 1: return ['pickup.address', 'pickup.city', 'delivery.address', 'delivery.city'];
      case 2: return ['weight', 'dimensions', 'cargoValue'];
      case 3: return ['preferredDate', 'priority'];
      case 4: return []; // Review step - no specific fields
      default: return [];
    }
  };

  // Form submission
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Final validation
      const finalValidation = ShipmentValidation.validateShipment(formData, t);
      
      if (!finalValidation.isValid) {
        Alert.alert(
          t('validationError'),
          t('pleaseReviewAndFix'),
          [{ text: t('ok') }]
        );
        setLoading(false);
        return;
      }

      // Submit to service
      const result = await ShipmentService.createShipment({
        ...formData,
        estimatedCost: costEstimate?.totalCost || 0
      });

      if (result.success) {
        Alert.alert(
          t('success'),
          t('shipmentCreatedSuccessfully', { trackingNumber: result.trackingNumber }),
          [
            {
              text: t('ok'),
              onPress: () => onSubmit(result.shipment)
            }
          ]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error submitting shipment:', error);
      Alert.alert(
        t('error'),
        error.message || t('shipmentCreationFailed'),
        [{ text: t('ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Update form data
  const updateFormData = (updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Render current step
  const renderCurrentStep = () => {
    const stepProps = {
      data: formData,
      onUpdate: updateFormData,
      validation,
      t,
      isRTL
    };

    switch (currentStep) {
      case 0:
        return <BasicDetails {...stepProps} />;
      case 1:
        return <LocationPicker {...stepProps} />;
      case 2:
        return <CargoDetails {...stepProps} costEstimate={costEstimate} />;
      case 3:
        return <PreferencesStep {...stepProps} />;
      case 4:
        return <ReviewStep {...stepProps} costEstimate={costEstimate} />;
      default:
        return <BasicDetails {...stepProps} />;
    }
  };

  const currentStepData = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isRTL && styles.rtlContainer]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isRTL && styles.rtlHeaderContent]}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>
              {isRTL ? '→' : '←'} {t('cancel')}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
            <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
              {t(currentStepData.key + 'Step') || currentStepData.title}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <Text style={[styles.stepCounter, isRTL && styles.rtlText]}>
              {currentStep + 1}/{FORM_STEPS.length}
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator 
          steps={FORM_STEPS}
          currentStep={currentStep}
          onStepPress={goToStep}
          isRTL={isRTL}
          t={t}
        />
      </View>

      {/* Validation Summary */}
      {showValidationSummary && (
        <ValidationSummary
          validation={validation}
          onDismiss={() => setShowValidationSummary(false)}
          isRTL={isRTL}
          t={t}
        />
      )}

      {/* Cost Estimate */}
      {costEstimate && currentStep >= 2 && (
        <CostEstimator
          estimate={costEstimate}
          compact={true}
          isRTL={isRTL}
          t={t}
        />
      )}

      {/* Form Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.stepContainer,
            {
              opacity: slideAnim,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isRTL ? -50 : 50, 0],
                })
              }]
            }
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, isRTL && styles.rtlFooter]}>
        <View style={[styles.footerContent, isRTL && styles.rtlFooterContent]}>
          {/* Previous Button */}
          {!isFirstStep && (
            <TouchableOpacity 
              style={[styles.secondaryButton, isRTL && styles.rtlSecondaryButton]}
              onPress={goToPreviousStep}
            >
              <Text style={styles.secondaryButtonText}>
                {isRTL ? '→' : '←'} {t('back')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Validation Score */}
          <View style={styles.validationScore}>
            <Text style={[styles.scoreLabel, isRTL && styles.rtlText]}>
              {t('completeness')}
            </Text>
            <View style={styles.scoreBar}>
              <View 
                style={[
                  styles.scoreBarFill, 
                  { 
                    width: `${validation.completeness || 0}%`,
                    backgroundColor: validation.completeness > 80 ? '#27ae60' : 
                                   validation.completeness > 60 ? '#f39c12' : '#e74c3c'
                  }
                ]} 
              />
            </View>
            <Text style={[styles.scoreValue, isRTL && styles.rtlText]}>
              {validation.completeness || 0}%
            </Text>
          </View>

          {/* Next/Submit Button */}
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              !validation.isValid && styles.primaryButtonDisabled,
              isRTL && styles.rtlPrimaryButton
            ]}
            onPress={isLastStep ? handleSubmit : goToNextStep}
            disabled={loading || (!validation.isValid && isLastStep)}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? t('loading') : 
               isLastStep ? t('createShipment') : 
               t('continue') + (isRTL ? ' ←' : ' →')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Tips */}
        {validation.recommendations.length > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={[styles.tipsTitle, isRTL && styles.rtlText]}>
              💡 {t('recommendations')}
            </Text>
            {validation.recommendations.slice(0, 2).map((tip, index) => (
              <Text key={index} style={[styles.tipText, isRTL && styles.rtlText]}>
                • {tip}
              </Text>
            ))}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  rtlContainer: {
    direction: 'rtl',
  },
  
  // Header styles
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  rtlHeaderContent: {
    flexDirection: 'row-reverse',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerRight: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  stepCounter: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },

  // Content styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepContainer: {
    flex: 1,
    minHeight: height * 0.5,
  },

  // Footer styles
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rtlFooter: {
    direction: 'rtl',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rtlFooterContent: {
    flexDirection: 'row-reverse',
  },

  // Button styles
  primaryButton: {
    backgroundColor: '#1B4965',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1B4965',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#adb5bd',
    elevation: 0,
    shadowOpacity: 0,
  },
  rtlPrimaryButton: {
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  rtlSecondaryButton: {
    alignSelf: 'flex-end',
  },
  secondaryButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },

  // Validation score styles
  validationScore: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  scoreBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  scoreValue: {
    fontSize: 12,
    color: '#495057',
    marginTop: 4,
    fontWeight: '600',
  },

  // Tips styles
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#17a2b8',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 2,
  },
});