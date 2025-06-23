// components/cargo/ShipmentForm/PreferencesStep.js
// 🎯 Purpose: Shipping preferences and special requirements
// 📋 Responsibilities:
//   - Date and time preferences with smart scheduling
//   - Priority level selection with cost implications
//   - Special handling requirements
//   - Service add-ons and customization
//   - Terms and conditions acceptance

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const PRIORITY_LEVELS = [
  {
    id: 'standard',
    name: 'Standard',
    icon: '📦',
    description: 'Regular delivery within 3-5 business days',
    multiplier: 1.0,
    badge: 'Economy',
    color: '#28a745'
  },
  {
    id: 'urgent',
    name: 'Urgent',
    icon: '⚡',
    description: 'Expedited delivery within 1-2 business days',
    multiplier: 1.5,
    badge: 'Fast',
    color: '#ffc107'
  },
  {
    id: 'express',
    name: 'Express',
    icon: '🚀',
    description: 'Same-day or next-day delivery',
    multiplier: 2.0,
    badge: 'Premium',
    color: '#dc3545'
  }
];

const SPECIAL_HANDLING = [
  {
    id: 'fragile',
    name: 'Fragile Handling',
    icon: '🍶',
    description: 'Extra care for delicate items',
    cost: 25,
    required: ['fragile', 'electronics']
  },
  {
    id: 'temperature',
    name: 'Temperature Control',
    icon: '❄️',
    description: 'Refrigerated or heated transport',
    cost: 50,
    required: ['refrigerated', 'pharmaceuticals', 'food']
  },
  {
    id: 'hazmat',
    name: 'Hazardous Materials',
    icon: '⚠️',
    description: 'Certified hazmat handling',
    cost: 75,
    required: ['hazardous', 'chemicals']
  },
  {
    id: 'oversized',
    name: 'Oversized Cargo',
    icon: '📏',
    description: 'Special equipment for large items',
    cost: 100,
    required: ['oversized', 'machinery']
  },
  {
    id: 'security',
    name: 'High Security',
    icon: '🔒',
    description: 'Enhanced security measures',
    cost: 40,
    required: []
  },
  {
    id: 'white_glove',
    name: 'White Glove Service',
    icon: '🧤',
    description: 'Premium handling and setup',
    cost: 150,
    required: []
  }
];

const SERVICE_ADDONS = [
  {
    id: 'insurance',
    name: 'Cargo Insurance',
    icon: '🛡️',
    description: 'Full coverage protection',
    type: 'percentage',
    rate: 0.5
  },
  {
    id: 'signature',
    name: 'Signature Required',
    icon: '✍️',
    description: 'Recipient signature confirmation',
    type: 'fixed',
    cost: 10
  },
  {
    id: 'photo_proof',
    name: 'Photo Proof',
    icon: '📷',
    description: 'Photo documentation of delivery',
    type: 'fixed',
    cost: 5
  },
  {
    id: 'tracking_updates',
    name: 'SMS Tracking',
    icon: '📱',
    description: 'Real-time SMS notifications',
    type: 'fixed',
    cost: 15
  },
  {
    id: 'weekend_delivery',
    name: 'Weekend Delivery',
    icon: '📅',
    description: 'Saturday and Sunday delivery',
    type: 'fixed',
    cost: 35
  }
];

export default function PreferencesStep({ data, onUpdate, validation, t, isRTL }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [recommendedHandling, setRecommendedHandling] = useState([]);
  const [totalAddOnCost, setTotalAddOnCost] = useState(0);

  useEffect(() => {
    updateRecommendedHandling();
    calculateAddOnCosts();
  }, [data.cargoType, data.specialHandling, data.cargoValue]);

  // Update recommended special handling based on cargo type
  const updateRecommendedHandling = () => {
    const recommended = SPECIAL_HANDLING.filter(handling =>
      handling.required.includes(data.cargoType)
    );
    setRecommendedHandling(recommended);
  };

  // Calculate total add-on costs
  const calculateAddOnCosts = () => {
    let total = 0;
    
    // Special handling costs
    (data.specialHandling || []).forEach(handlingId => {
      const handling = SPECIAL_HANDLING.find(h => h.id === handlingId);
      if (handling) {
        total += handling.cost;
      }
    });
    
    // Service add-on costs
    SERVICE_ADDONS.forEach(addon => {
      if (data[addon.id]) {
        if (addon.type === 'fixed') {
          total += addon.cost;
        } else if (addon.type === 'percentage') {
          const cargoValue = parseFloat(data.cargoValue) || 0;
          total += Math.round(cargoValue * (addon.rate / 100));
        }
      }
    });
    
    setTotalAddOnCost(total);
  };

  // Generate date options
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      let label = date.toLocaleDateString();
      if (isToday) label = `${t('today')} (${label})`;
      else if (isTomorrow) label = `${t('tomorrow')} (${label})`;
      
      options.push({
        date: date.toISOString().split('T')[0],
        label,
        isToday,
        isTomorrow,
        isWeekend,
        available: !isWeekend || data.weekend_delivery
      });
    }
    
    return options;
  };

  // Handle special handling toggle
  const toggleSpecialHandling = (handlingId) => {
    const currentHandling = data.specialHandling || [];
    const newHandling = currentHandling.includes(handlingId)
      ? currentHandling.filter(id => id !== handlingId)
      : [...currentHandling, handlingId];
    
    onUpdate({ specialHandling: newHandling });
  };

  // Handle service add-on toggle
  const toggleServiceAddon = (addonId) => {
    onUpdate({ [addonId]: !data[addonId] });
  };

  // Get priority multiplier cost
  const getPriorityMultiplier = (priorityId) => {
    const priority = PRIORITY_LEVELS.find(p => p.id === priorityId);
    return priority ? priority.multiplier : 1;
  };

  const DateSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('preferredDate') || 'Preferred Pickup Date'} *
      </Text>
      
      <View style={styles.dateGrid}>
        {getDateOptions().slice(0, 6).map((option, index) => (
          <TouchableOpacity
            key={option.date}
            style={[
              styles.dateOption,
              data.preferredDate === option.date && styles.selectedDate,
              !option.available && styles.unavailableDate
            ]}
            onPress={() => option.available && onUpdate({ preferredDate: option.date })}
            disabled={!option.available}
          >
            <Text style={[
              styles.dateLabel,
              data.preferredDate === option.date && styles.selectedDateText,
              !option.available && styles.unavailableDateText,
              isRTL && styles.rtlText
            ]}>
              {option.label}
            </Text>
            {option.isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>{t('today')}</Text>
              </View>
            )}
            {!option.available && (
              <Text style={styles.unavailableText}>
                {t('weekendDeliveryRequired')}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {validation.errors?.preferredDate && (
        <Text style={[styles.errorText, isRTL && styles.rtlText]}>
          {validation.errors.preferredDate}
        </Text>
      )}
    </View>
  );

  const PrioritySelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('priorityLevel') || 'Priority Level'}
      </Text>
      
      <View style={styles.priorityContainer}>
        {PRIORITY_LEVELS.map(priority => (
          <TouchableOpacity
            key={priority.id}
            style={[
              styles.priorityCard,
              data.priority === priority.id && styles.selectedPriority,
              isRTL && styles.rtlPriorityCard
            ]}
            onPress={() => onUpdate({ priority: priority.id })}
          >
            <View style={[styles.priorityHeader, isRTL && styles.rtlPriorityHeader]}>
              <Text style={styles.priorityIcon}>{priority.icon}</Text>
              <View style={styles.priorityInfo}>
                <Text style={[
                  styles.priorityName,
                  data.priority === priority.id && styles.selectedPriorityText,
                  isRTL && styles.rtlText
                ]}>
                  {priority.name}
                </Text>
                <Text style={[styles.priorityDescription, isRTL && styles.rtlText]}>
                  {priority.description}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
                <Text style={styles.priorityBadgeText}>{priority.badge}</Text>
              </View>
            </View>
            
            <View style={styles.priorityCost}>
              <Text style={[styles.costLabel, isRTL && styles.rtlText]}>
                {t('costMultiplier')}: +{Math.round((priority.multiplier - 1) * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SpecialHandlingSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('specialHandling') || 'Special Handling Requirements'}
      </Text>
      
      {recommendedHandling.length > 0 && (
        <View style={styles.recommendedSection}>
          <Text style={[styles.recommendedTitle, isRTL && styles.rtlText]}>
            ⭐ {t('recommendedForYourCargo')}
          </Text>
          {recommendedHandling.map(handling => (
            <TouchableOpacity
              key={handling.id}
              style={[
                styles.handlingOption,
                styles.recommendedHandling,
                (data.specialHandling || []).includes(handling.id) && styles.selectedHandling,
                isRTL && styles.rtlHandlingOption
              ]}
              onPress={() => toggleSpecialHandling(handling.id)}
            >
              <View style={[styles.handlingHeader, isRTL && styles.rtlHandlingHeader]}>
                <Text style={styles.handlingIcon}>{handling.icon}</Text>
                <View style={styles.handlingInfo}>
                  <Text style={[styles.handlingName, isRTL && styles.rtlText]}>
                    {handling.name}
                  </Text>
                  <Text style={[styles.handlingDescription, isRTL && styles.rtlText]}>
                    {handling.description}
                  </Text>
                </View>
                <View style={styles.handlingCost}>
                  <Text style={styles.costText}>+${handling.cost}</Text>
                </View>
                <Switch
                  value={(data.specialHandling || []).includes(handling.id)}
                  onValueChange={() => toggleSpecialHandling(handling.id)}
                  trackColor={{ false: '#e9ecef', true: '#1B4965' }}
                  thumbColor={(data.specialHandling || []).includes(handling.id) ? '#fff' : '#adb5bd'}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <Text style={[styles.sectionSubTitle, isRTL && styles.rtlText]}>
        {t('allHandlingOptions')}
      </Text>
      {SPECIAL_HANDLING.map(handling => (
        <TouchableOpacity
          key={handling.id}
          style={[
            styles.handlingOption,
            (data.specialHandling || []).includes(handling.id) && styles.selectedHandling,
            isRTL && styles.rtlHandlingOption
          ]}
          onPress={() => toggleSpecialHandling(handling.id)}
        >
          <View style={[styles.handlingHeader, isRTL && styles.rtlHandlingHeader]}>
            <Text style={styles.handlingIcon}>{handling.icon}</Text>
            <View style={styles.handlingInfo}>
              <Text style={[styles.handlingName, isRTL && styles.rtlText]}>
                {handling.name}
              </Text>
              <Text style={[styles.handlingDescription, isRTL && styles.rtlText]}>
                {handling.description}
              </Text>
            </View>
            <View style={styles.handlingCost}>
              <Text style={styles.costText}>+${handling.cost}</Text>
            </View>
            <Switch
              value={(data.specialHandling || []).includes(handling.id)}
              onValueChange={() => toggleSpecialHandling(handling.id)}
              trackColor={{ false: '#e9ecef', true: '#1B4965' }}
              thumbColor={(data.specialHandling || []).includes(handling.id) ? '#fff' : '#adb5bd'}
            />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const ServiceAddOns = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('serviceAddOns') || 'Service Add-Ons'}
      </Text>
      
      {SERVICE_ADDONS.map(addon => (
        <TouchableOpacity
          key={addon.id}
          style={[
            styles.addonOption,
            data[addon.id] && styles.selectedAddon,
            isRTL && styles.rtlAddonOption
          ]}
          onPress={() => toggleServiceAddon(addon.id)}
        >
          <View style={[styles.addonHeader, isRTL && styles.rtlAddonHeader]}>
            <Text style={styles.addonIcon}>{addon.icon}</Text>
            <View style={styles.addonInfo}>
              <Text style={[styles.addonName, isRTL && styles.rtlText]}>
                {addon.name}
              </Text>
              <Text style={[styles.addonDescription, isRTL && styles.rtlText]}>
                {addon.description}
              </Text>
            </View>
            <View style={styles.addonCost}>
              <Text style={styles.costText}>
                {addon.type === 'fixed' ? `+$${addon.cost}` : `+${addon.rate}%`}
              </Text>
            </View>
            <Switch
              value={data[addon.id] || false}
              onValueChange={() => toggleServiceAddon(addon.id)}
              trackColor={{ false: '#e9ecef', true: '#1B4965' }}
              thumbColor={data[addon.id] ? '#fff' : '#adb5bd'}
            />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const SpecialInstructions = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('specialInstructions') || 'Special Instructions'} ({t('optional')})
      </Text>
      <TextInput
        style={[
          styles.textArea,
          isRTL && styles.rtlInput
        ]}
        placeholder={t('specialInstructionsPlaceholder') || 'Any special requirements or instructions for the driver...'}
        value={data.specialInstructions || ''}
        onChangeText={(value) => onUpdate({ specialInstructions: value })}
        multiline
        numberOfLines={4}
        maxLength={500}
        textAlign={isRTL ? 'right' : 'left'}
        textAlignVertical="top"
      />
      <View style={[styles.characterCounter, isRTL && styles.rtlCharacterCounter]}>
        <Text style={styles.characterCountText}>
          {(data.specialInstructions || '').length}/500
        </Text>
      </View>
    </View>
  );

  const CostSummary = () => (
    <View style={styles.costSummary}>
      <Text style={[styles.summaryTitle, isRTL && styles.rtlText]}>
        💰 {t('additionalCosts')}
      </Text>
      
      <View style={styles.summaryDetails}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
            {t('priorityLevel')}:
          </Text>
          <Text style={styles.summaryValue}>
            +{Math.round((getPriorityMultiplier(data.priority) - 1) * 100)}%
          </Text>
        </View>
        
        {(data.specialHandling || []).length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
              {t('specialHandling')}:
            </Text>
            <Text style={styles.summaryValue}>
              +${(data.specialHandling || []).reduce((total, handlingId) => {
                const handling = SPECIAL_HANDLING.find(h => h.id === handlingId);
                return total + (handling ? handling.cost : 0);
              }, 0)}
            </Text>
          </View>
        )}
        
        {totalAddOnCost > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
              {t('serviceAddOns')}:
            </Text>
            <Text style={styles.summaryValue}>
              +${totalAddOnCost}
            </Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
            {t('totalAdditional')}:
          </Text>
          <Text style={styles.totalValue}>
            +${totalAddOnCost}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
          {t('shippingPreferences') || 'Shipping Preferences'}
        </Text>
        <Text style={[styles.stepSubtitle, isRTL && styles.rtlText]}>
          {t('preferencesDescription') || 'Choose your delivery preferences and any special requirements for your shipment.'}
        </Text>
      </View>

      <DateSelector />
      <PrioritySelector />
      <SpecialHandlingSelector />
      <ServiceAddOns />
      <SpecialInstructions />
      <CostSummary />

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, isRTL && styles.rtlText]}>
          💡 {t('preferenceTips') || 'Preference Tips'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipFlexibleDates') || 'Flexible dates can save you money'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipSpecialHandling') || 'Special handling protects valuable cargo'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipInstructions') || 'Clear instructions help drivers provide better service'}
        </Text>
      </View>
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

  // Input group styles
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },

  // Date selector styles
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateOption: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDate: {
    borderColor: '#1B4965',
    backgroundColor: '#f0f7ff',
  },
  unavailableDate: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  selectedDateText: {
    color: '#1B4965',
  },
  unavailableDateText: {
    color: '#adb5bd',
  },
  todayBadge: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unavailableText: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },

  // Priority selector styles
  priorityContainer: {
    gap: 8,
  },
  priorityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedPriority: {
    borderColor: '#1B4965',
    backgroundColor: '#f0f7ff',
  },
  rtlPriorityCard: {
    alignItems: 'flex-end',
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rtlPriorityHeader: {
    flexDirection: 'row-reverse',
  },
  priorityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedPriorityText: {
    color: '#1B4965',
  },
  priorityDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityCost: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  costLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },

  // Special handling styles
  recommendedSection: {
    marginBottom: 16,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f39c12',
    marginBottom: 8,
  },
  handlingOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  recommendedHandling: {
    borderColor: '#f39c12',
    backgroundColor: '#fffbf0',
  },
  selectedHandling: {
    borderColor: '#1B4965',
    backgroundColor: '#f0f7ff',
  },
  rtlHandlingOption: {
    alignItems: 'flex-end',
  },
  handlingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rtlHandlingHeader: {
    flexDirection: 'row-reverse',
  },
  handlingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  handlingInfo: {
    flex: 1,
  },
  handlingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  handlingDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  handlingCost: {
    marginRight: 12,
  },
  costText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4965',
  },

  // Service add-ons styles
  addonOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  selectedAddon: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  rtlAddonOption: {
    alignItems: 'flex-end',
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rtlAddonHeader: {
    flexDirection: 'row-reverse',
  },
  addonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addonDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  addonCost: {
    marginRight: 12,
  },

  // Special instructions styles
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
  },
  rtlInput: {
    textAlign: 'right',
  },
  characterCounter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  rtlCharacterCounter: {
    justifyContent: 'flex-start',
  },
  characterCountText: {
    fontSize: 12,
    color: '#6c757d',
  },

  // Cost summary styles
  costSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryDetails: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  totalRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B4965',
  },

  // Tips styles
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 4,
  },
});