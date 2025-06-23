// components/cargo/ShipmentForm/ReviewStep.js
// 🎯 Purpose: Final review and confirmation before shipment submission
// 📋 Responsibilities:
//   - Complete shipment summary with all details
//   - Cost breakdown and final pricing
//   - Terms and conditions acceptance
//   - Edit shortcuts to previous steps
//   - Professional confirmation interface

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ReviewStep({ data, onUpdate, validation, costEstimate, t, isRTL }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Get display values
  const getCargoTypeDisplay = () => {
    const cargoTypes = {
      general: 'General Cargo',
      food: 'Food & Beverages',
      electronics: 'Electronics',
      clothing: 'Clothing & Textiles',
      furniture: 'Furniture',
      automotive: 'Automotive',
      construction: 'Construction Materials',
      pharmaceuticals: 'Pharmaceuticals',
      chemicals: 'Chemicals',
      agriculture: 'Agriculture',
      machinery: 'Machinery',
      documents: 'Documents',
      fragile: 'Fragile Items',
      hazardous: 'Hazardous Materials',
      refrigerated: 'Refrigerated Goods',
      oversized: 'Oversized Cargo'
    };
    return cargoTypes[data.cargoType] || data.cargoType;
  };

  const getPriorityDisplay = () => {
    const priorities = {
      standard: { name: 'Standard', icon: '📦', badge: 'Economy' },
      urgent: { name: 'Urgent', icon: '⚡', badge: 'Fast' },
      express: { name: 'Express', icon: '🚀', badge: 'Premium' }
    };
    return priorities[data.priority] || { name: data.priority, icon: '📦', badge: 'Standard' };
  };

  const getSpecialHandlingDisplay = () => {
    const handlingTypes = {
      fragile: 'Fragile Handling',
      temperature: 'Temperature Control',
      hazmat: 'Hazardous Materials',
      oversized: 'Oversized Cargo',
      security: 'High Security',
      white_glove: 'White Glove Service'
    };
    
    return (data.specialHandling || []).map(id => handlingTypes[id] || id);
  };

  const calculateTotalCost = () => {
    const baseCost = costEstimate?.totalCost || 0;
    const handlingCosts = {
      fragile: 25,
      temperature: 50,
      hazmat: 75,
      oversized: 100,
      security: 40,
      white_glove: 150
    };
    
    const specialHandlingCost = (data.specialHandling || []).reduce((total, handling) => {
      return total + (handlingCosts[handling] || 0);
    }, 0);
    
    const serviceCosts = {
      signature: 10,
      photo_proof: 5,
      tracking_updates: 15,
      weekend_delivery: 35
    };
    
    const serviceAddOnCost = Object.keys(serviceCosts).reduce((total, service) => {
      return total + (data[service] ? serviceCosts[service] : 0);
    }, 0);
    
    const insuranceCost = data.insuranceRequired ? 
      Math.round((parseFloat(data.cargoValue) || 0) * 0.005) : 0;
    
    return {
      baseCost,
      specialHandlingCost,
      serviceAddOnCost,
      insuranceCost,
      total: baseCost + specialHandlingCost + serviceAddOnCost + insuranceCost
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('notSpecified');
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const SectionCard = ({ title, icon, children, editAction }) => (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}>
        <View style={[styles.sectionTitleContainer, isRTL && styles.rtlSectionTitleContainer]}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{title}</Text>
        </View>
        {editAction && (
          <TouchableOpacity style={styles.editButton} onPress={editAction}>
            <Text style={styles.editButtonText}>{t('edit')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const InfoRow = ({ label, value, highlight = false }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{label}:</Text>
      <Text style={[
        styles.infoValue,
        highlight && styles.highlightValue,
        isRTL && styles.rtlText
      ]}>
        {value}
      </Text>
    </View>
  );

  const costs = calculateTotalCost();
  const priority = getPriorityDisplay();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
          {t('reviewShipment') || 'Review Your Shipment'}
        </Text>
        <Text style={[styles.stepSubtitle, isRTL && styles.rtlText]}>
          {t('reviewDescription') || 'Please review all details before confirming your shipment request.'}
        </Text>
      </View>

      {/* Cargo Details */}
      <SectionCard 
        title={t('cargoDetails') || 'Cargo Details'} 
        icon="📦"
        editAction={() => {/* Navigate to cargo details step */}}
      >
        <InfoRow 
          label={t('cargoType')} 
          value={getCargoTypeDisplay()} 
          highlight 
        />
        {data.description && (
          <InfoRow 
            label={t('description')} 
            value={data.description} 
          />
        )}
        <InfoRow 
          label={t('weight')} 
          value={`${data.weight || '0'} kg`} 
        />
        {data.dimensions?.length && (
          <InfoRow 
            label={t('dimensions')} 
            value={`${data.dimensions.length} × ${data.dimensions.width} × ${data.dimensions.height} cm`} 
          />
        )}
        {data.cargoValue && (
          <InfoRow 
            label={t('cargoValue')} 
            value={`$${parseFloat(data.cargoValue).toLocaleString()}`} 
          />
        )}
        {data.packaging && (
          <InfoRow 
            label={t('packaging')} 
            value={data.packaging} 
          />
        )}
        <InfoRow 
          label={t('quantity')} 
          value={data.quantity || 1} 
        />
      </SectionCard>

      {/* Pickup Location */}
      <SectionCard 
        title={t('pickupLocation') || 'Pickup Location'} 
        icon="📤"
        editAction={() => {/* Navigate to locations step */}}
      >
        <InfoRow 
          label={t('address')} 
          value={data.pickup?.address || t('notSpecified')} 
        />
        <InfoRow 
          label={t('city')} 
          value={data.pickup?.city || t('notSpecified')} 
        />
        {data.pickup?.postalCode && (
          <InfoRow 
            label={t('postalCode')} 
            value={data.pickup.postalCode} 
          />
        )}
        <InfoRow 
          label={t('contact')} 
          value={data.pickup?.contactName || t('notSpecified')} 
        />
        <InfoRow 
          label={t('phone')} 
          value={data.pickup?.contactPhone || t('notSpecified')} 
        />
        {data.pickup?.instructions && (
          <InfoRow 
            label={t('instructions')} 
            value={data.pickup.instructions} 
          />
        )}
      </SectionCard>

      {/* Delivery Location */}
      <SectionCard 
        title={t('deliveryLocation') || 'Delivery Location'} 
        icon="📥"
        editAction={() => {/* Navigate to locations step */}}
      >
        <InfoRow 
          label={t('address')} 
          value={data.delivery?.address || t('notSpecified')} 
        />
        <InfoRow 
          label={t('city')} 
          value={data.delivery?.city || t('notSpecified')} 
        />
        {data.delivery?.postalCode && (
          <InfoRow 
            label={t('postalCode')} 
            value={data.delivery.postalCode} 
          />
        )}
        <InfoRow 
          label={t('contact')} 
          value={data.delivery?.contactName || t('notSpecified')} 
        />
        <InfoRow 
          label={t('phone')} 
          value={data.delivery?.contactPhone || t('notSpecified')} 
        />
        {data.delivery?.instructions && (
          <InfoRow 
            label={t('instructions')} 
            value={data.delivery.instructions} 
          />
        )}
      </SectionCard>

      {/* Shipping Preferences */}
      <SectionCard 
        title={t('shippingPreferences') || 'Shipping Preferences'} 
        icon="⚙️"
        editAction={() => {/* Navigate to preferences step */}}
      >
        <InfoRow 
          label={t('preferredDate')} 
          value={formatDate(data.preferredDate)} 
          highlight 
        />
        <View style={styles.priorityRow}>
          <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>
            {t('priority')}:
          </Text>
          <View style={[styles.priorityDisplay, isRTL && styles.rtlPriorityDisplay]}>
            <Text style={styles.priorityIcon}>{priority.icon}</Text>
            <Text style={[styles.priorityName, isRTL && styles.rtlText]}>
              {priority.name}
            </Text>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>{priority.badge}</Text>
            </View>
          </View>
        </View>
        
        {getSpecialHandlingDisplay().length > 0 && (
          <InfoRow 
            label={t('specialHandling')} 
            value={getSpecialHandlingDisplay().join(', ')} 
          />
        )}
        
        {data.specialInstructions && (
          <InfoRow 
            label={t('specialInstructions')} 
            value={data.specialInstructions} 
          />
        )}
      </SectionCard>

      {/* Service Add-ons */}
      {(data.insuranceRequired || data.signature || data.photo_proof || data.tracking_updates || data.weekend_delivery) && (
        <SectionCard 
          title={t('serviceAddOns') || 'Service Add-Ons'} 
          icon="✨"
        >
          {data.insuranceRequired && (
            <InfoRow 
              label={t('cargoInsurance')} 
              value={t('included')} 
            />
          )}
          {data.signature && (
            <InfoRow 
              label={t('signatureRequired')} 
              value={t('included')} 
            />
          )}
          {data.photo_proof && (
            <InfoRow 
              label={t('photoProof')} 
              value={t('included')} 
            />
          )}
          {data.tracking_updates && (
            <InfoRow 
              label={t('smsTracking')} 
              value={t('included')} 
            />
          )}
          {data.weekend_delivery && (
            <InfoRow 
              label={t('weekendDelivery')} 
              value={t('included')} 
            />
          )}
        </SectionCard>
      )}

      {/* Cost Breakdown */}
      <SectionCard 
        title={t('costBreakdown') || 'Cost Breakdown'} 
        icon="💰"
      >
        <InfoRow 
          label={t('baseShippingCost')} 
          value={`$${costs.baseCost}`} 
        />
        
        {costs.specialHandlingCost > 0 && (
          <InfoRow 
            label={t('specialHandling')} 
            value={`+$${costs.specialHandlingCost}`} 
          />
        )}
        
        {costs.serviceAddOnCost > 0 && (
          <InfoRow 
            label={t('serviceAddOns')} 
            value={`+$${costs.serviceAddOnCost}`} 
          />
        )}
        
        {costs.insuranceCost > 0 && (
          <InfoRow 
            label={t('insurance')} 
            value={`+$${costs.insuranceCost}`} 
          />
        )}
        
        <View style={styles.totalCostRow}>
          <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
            {t('totalCost')}:
          </Text>
          <Text style={styles.totalValue}>
            ${costs.total.toLocaleString()}
          </Text>
        </View>
      </SectionCard>

      {/* Route Summary */}
      {costEstimate && (
        <SectionCard 
          title={t('routeSummary') || 'Route Summary'} 
          icon="🗺️"
        >
          <InfoRow 
            label={t('estimatedDistance')} 
            value={`${costEstimate.distance} km`} 
          />
          <InfoRow 
            label={t('estimatedDuration')} 
            value={`${Math.round(costEstimate.estimatedDuration / 60)} hours`} 
          />
          <InfoRow 
            label={t('estimatedDelivery')} 
            value={formatDate(data.preferredDate)} 
          />
        </SectionCard>
      )}

      {/* Terms and Conditions */}
      <View style={styles.termsSection}>
        <Text style={[styles.termsTitle, isRTL && styles.rtlText]}>
          {t('termsAndConditions') || 'Terms and Conditions'}
        </Text>
        
        <TouchableOpacity
          style={[styles.termsOption, isRTL && styles.rtlTermsOption]}
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <Switch
            value={termsAccepted}
            onValueChange={setTermsAccepted}
            trackColor={{ false: '#e9ecef', true: '#1B4965' }}
            thumbColor={termsAccepted ? '#fff' : '#adb5bd'}
          />
          <Text style={[styles.termsText, isRTL && styles.rtlText]}>
            {t('acceptTerms') || 'I accept the Terms and Conditions and Privacy Policy'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.termsOption, isRTL && styles.rtlTermsOption]}
          onPress={() => setMarketingConsent(!marketingConsent)}
        >
          <Switch
            value={marketingConsent}
            onValueChange={setMarketingConsent}
            trackColor={{ false: '#e9ecef', true: '#1B4965' }}
            thumbColor={marketingConsent ? '#fff' : '#adb5bd'}
          />
          <Text style={[styles.termsText, isRTL && styles.rtlText]}>
            {t('marketingConsent') || 'I agree to receive updates about my shipment and promotional offers'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Validation Summary */}
      {!validation.isValid && (
        <View style={styles.validationSummary}>
          <Text style={[styles.validationTitle, isRTL && styles.rtlText]}>
            ⚠️ {t('pleaseReviewErrors')}
          </Text>
          {Object.values(validation.errors).map((error, index) => (
            <Text key={index} style={[styles.validationError, isRTL && styles.rtlText]}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {/* Confirmation */}
      <View style={styles.confirmationSection}>
        <Text style={[styles.confirmationTitle, isRTL && styles.rtlText]}>
          {t('readyToSubmit') || 'Ready to Submit?'}
        </Text>
        <Text style={[styles.confirmationText, isRTL && styles.rtlText]}>
          {t('confirmationDescription') || 'By clicking "Create Shipment", you confirm that all information is accurate and agree to our terms.'}
        </Text>
        
        {!termsAccepted && (
          <View style={styles.termsWarning}>
            <Text style={[styles.termsWarningText, isRTL && styles.rtlText]}>
              {t('mustAcceptTerms') || 'Please accept the terms and conditions to continue.'}
            </Text>
          </View>
        )}
      </View>

      {/* Update marketing consent in data */}
      {React.useEffect(() => {
        onUpdate({ 
          termsAccepted,
          marketingConsent 
        });
      }, [termsAccepted, marketingConsent])}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header styles
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Section card styles
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  rtlSectionHeader: {
    flexDirection: 'row-reverse',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rtlSectionTitleContainer: {
    flexDirection: 'row-reverse',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#1B4965',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
  },

  // Info row styles
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    width: 120,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
    lineHeight: 20,
  },
  highlightValue: {
    fontWeight: '600',
    color: '#1B4965',
  },

  // Priority display styles
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  rtlPriorityDisplay: {
    flexDirection: 'row-reverse',
    marginLeft: 0,
    marginRight: 16,
  },
  priorityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginRight: 8,
  },
  priorityBadge: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Cost styles
  totalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4965',
  },

  // Terms styles
  termsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  termsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rtlTermsOption: {
    flexDirection: 'row-reverse',
  },
  termsText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },

  // Validation styles
  validationSummary: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#721c24',
    marginBottom: 8,
  },
  validationError: {
    fontSize: 14,
    color: '#721c24',
    marginBottom: 4,
    lineHeight: 20,
  },

  // Confirmation styles
  confirmationSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  termsWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    alignSelf: 'stretch',
  },
  termsWarningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
});