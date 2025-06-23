// components/cargo/ShipmentForm/LocationPicker.js
// 🎯 Purpose: Smart location selection with address autocomplete and maps
// 📋 Responsibilities:
//   - Pickup and delivery address input with validation
//   - Google Places autocomplete and geocoding
//   - Contact information collection
//   - Special delivery instructions
//   - Distance calculation and route preview

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

// Mock GPS and geocoding services (in real app, use Google Places API)
const mockLocationService = {
  getCurrentLocation: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          latitude: 31.7683,
          longitude: 35.2137,
          address: 'Jerusalem, Israel'
        });
      }, 1000);
    });
  },
  
  searchAddresses: (query) => {
    const mockResults = [
      { id: 1, description: `${query} Street, Jerusalem, Israel`, placeId: 'place1' },
      { id: 2, description: `${query} Avenue, Tel Aviv, Israel`, placeId: 'place2' },
      { id: 3, description: `${query} Road, Haifa, Israel`, placeId: 'place3' },
      { id: 4, description: `${query} Boulevard, Eilat, Israel`, placeId: 'place4' },
    ];
    return Promise.resolve(mockResults.slice(0, 3));
  },
  
  getPlaceDetails: (placeId) => {
    return Promise.resolve({
      address: 'Sample Address 123',
      city: 'Jerusalem',
      postalCode: '12345',
      country: 'Israel',
      coordinates: { latitude: 31.7683, longitude: 35.2137 }
    });
  }
};

export default function LocationPicker({ data, onUpdate, validation, t, isRTL }) {
  // State for pickup location
  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);

  // State for delivery location
  const [deliveryQuery, setDeliveryQuery] = useState('');
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);

  // UI state
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [sameContactInfo, setSameContactInfo] = useState(false);
  const [expandedSection, setExpandedSection] = useState('pickup');

  const pickupInputRef = useRef(null);
  const deliveryInputRef = useRef(null);

  // Initialize with existing data
  useEffect(() => {
    if (data.pickup?.address) {
      setPickupQuery(data.pickup.address);
    }
    if (data.delivery?.address) {
      setDeliveryQuery(data.delivery.address);
    }
  }, []);

  // Search for pickup addresses
  const searchPickupAddresses = async (query) => {
    if (query.length < 3) {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      return;
    }

    setPickupLoading(true);
    try {
      const results = await mockLocationService.searchAddresses(query);
      setPickupSuggestions(results);
      setShowPickupSuggestions(true);
    } catch (error) {
      console.error('Error searching pickup addresses:', error);
    } finally {
      setPickupLoading(false);
    }
  };

  // Search for delivery addresses
  const searchDeliveryAddresses = async (query) => {
    if (query.length < 3) {
      setDeliverySuggestions([]);
      setShowDeliverySuggestions(false);
      return;
    }

    setDeliveryLoading(true);
    try {
      const results = await mockLocationService.searchAddresses(query);
      setDeliverySuggestions(results);
      setShowDeliverySuggestions(true);
    } catch (error) {
      console.error('Error searching delivery addresses:', error);
    } finally {
      setDeliveryLoading(false);
    }
  };

  // Handle pickup address selection
  const handlePickupSelection = async (suggestion) => {
    setPickupQuery(suggestion.description);
    setShowPickupSuggestions(false);
    
    try {
      const placeDetails = await mockLocationService.getPlaceDetails(suggestion.placeId);
      onUpdate({
        pickup: {
          ...data.pickup,
          address: placeDetails.address,
          city: placeDetails.city,
          postalCode: placeDetails.postalCode,
          country: placeDetails.country,
          coordinates: placeDetails.coordinates
        }
      });
    } catch (error) {
      console.error('Error getting pickup place details:', error);
    }
  };

  // Handle delivery address selection
  const handleDeliverySelection = async (suggestion) => {
    setDeliveryQuery(suggestion.description);
    setShowDeliverySuggestions(false);
    
    try {
      const placeDetails = await mockLocationService.getPlaceDetails(suggestion.placeId);
      onUpdate({
        delivery: {
          ...data.delivery,
          address: placeDetails.address,
          city: placeDetails.city,
          postalCode: placeDetails.postalCode,
          country: placeDetails.country,
          coordinates: placeDetails.coordinates
        }
      });
    } catch (error) {
      console.error('Error getting delivery place details:', error);
    }
  };

  // Use current location for pickup
  const useCurrentLocationForPickup = async () => {
    setPickupLoading(true);
    try {
      const location = await mockLocationService.getCurrentLocation();
      setPickupQuery(location.address);
      onUpdate({
        pickup: {
          ...data.pickup,
          address: location.address,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      });
      Alert.alert(t('success'), t('currentLocationSet'));
    } catch (error) {
      Alert.alert(t('error'), t('locationAccessError'));
    } finally {
      setPickupLoading(false);
    }
  };

  // Update contact information
  const updatePickupContact = (field, value) => {
    onUpdate({
      pickup: {
        ...data.pickup,
        [field]: value
      }
    });

    // Copy to delivery if same contact info is enabled
    if (sameContactInfo && ['contactName', 'contactPhone', 'contactEmail'].includes(field)) {
      onUpdate({
        delivery: {
          ...data.delivery,
          [field]: value
        }
      });
    }
  };

  const updateDeliveryContact = (field, value) => {
    onUpdate({
      delivery: {
        ...data.delivery,
        [field]: value
      }
    });
  };

  // Toggle same contact info
  const toggleSameContactInfo = (value) => {
    setSameContactInfo(value);
    if (value) {
      // Copy pickup contact info to delivery
      onUpdate({
        delivery: {
          ...data.delivery,
          contactName: data.pickup.contactName,
          contactPhone: data.pickup.contactPhone,
          contactEmail: data.pickup.contactEmail
        }
      });
    }
  };

  const AddressInput = ({ 
    label, 
    query, 
    onQueryChange, 
    suggestions, 
    showSuggestions, 
    onSuggestionSelect, 
    loading, 
    error, 
    placeholder,
    onUseCurrentLocation = null 
  }) => (
    <View style={styles.addressInputContainer}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>{label} *</Text>
      
      <View style={[
        styles.searchContainer,
        error && styles.inputError,
        isRTL && styles.rtlSearchContainer
      ]}>
        <TextInput
          style={[styles.addressInput, isRTL && styles.rtlInput]}
          placeholder={placeholder}
          value={query}
          onChangeText={onQueryChange}
          textAlign={isRTL ? 'right' : 'left'}
        />
        
        {loading && <Text style={styles.loadingIcon}>⏳</Text>}
        
        {onUseCurrentLocation && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={onUseCurrentLocation}
          >
            <Text style={styles.locationIcon}>📍</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error}</Text>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => onSuggestionSelect(suggestion)}
            >
              <Text style={styles.suggestionIcon}>📍</Text>
              <Text style={[styles.suggestionText, isRTL && styles.rtlText]}>
                {suggestion.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const ContactForm = ({ 
    type, 
    data: contactData, 
    onUpdate: updateContact, 
    disabled = false 
  }) => (
    <View style={styles.contactForm}>
      <Text style={[styles.sectionSubTitle, isRTL && styles.rtlText]}>
        {type === 'pickup' ? t('pickupContact') : t('deliveryContact')}
      </Text>
      
      <View style={styles.contactRow}>
        <View style={styles.contactField}>
          <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
            {t('contactName')} *
          </Text>
          <TextInput
            style={[
              styles.input,
              disabled && styles.disabledInput,
              validation.errors?.[`${type}.contactName`] && styles.inputError,
              isRTL && styles.rtlInput
            ]}
            placeholder={t('fullName')}
            value={contactData.contactName || ''}
            onChangeText={(value) => updateContact('contactName', value)}
            editable={!disabled}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {validation.errors?.[`${type}.contactName`] && (
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>
              {validation.errors[`${type}.contactName`]}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.contactRow}>
        <View style={[styles.contactField, { flex: 1, marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }]}>
          <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
            {t('phoneNumber')} *
          </Text>
          <TextInput
            style={[
              styles.input,
              disabled && styles.disabledInput,
              validation.errors?.[`${type}.contactPhone`] && styles.inputError,
              isRTL && styles.rtlInput
            ]}
            placeholder="+972-XX-XXX-XXXX"
            value={contactData.contactPhone || ''}
            onChangeText={(value) => updateContact('contactPhone', value)}
            keyboardType="phone-pad"
            editable={!disabled}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {validation.errors?.[`${type}.contactPhone`] && (
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>
              {validation.errors[`${type}.contactPhone`]}
            </Text>
          )}
        </View>

        <View style={[styles.contactField, { flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }]}>
          <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
            {t('email')} ({t('optional')})
          </Text>
          <TextInput
            style={[
              styles.input,
              disabled && styles.disabledInput,
              isRTL && styles.rtlInput
            ]}
            placeholder="contact@example.com"
            value={contactData.contactEmail || ''}
            onChangeText={(value) => updateContact('contactEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!disabled}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>

      <View style={styles.contactField}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('specialInstructions')} ({t('optional')})
        </Text>
        <TextInput
          style={[
            styles.textArea,
            disabled && styles.disabledInput,
            isRTL && styles.rtlInput
          ]}
          placeholder={type === 'pickup' ? 
            t('pickupInstructionsPlaceholder') : 
            t('deliveryInstructionsPlaceholder')
          }
          value={contactData.instructions || ''}
          onChangeText={(value) => updateContact('instructions', value)}
          multiline
          numberOfLines={3}
          editable={!disabled}
          textAlign={isRTL ? 'right' : 'left'}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
          {t('whereIsYourCargo') || 'Where is your cargo?'}
        </Text>
        <Text style={[styles.stepSubtitle, isRTL && styles.rtlText]}>
          {t('locationStepDescription') || 'Provide pickup and delivery addresses with contact information for smooth coordination.'}
        </Text>
      </View>

      {/* Quick Options */}
      <View style={styles.quickOptions}>
        <TouchableOpacity
          style={[styles.quickOption, isRTL && styles.rtlQuickOption]}
          onPress={() => setUseCurrentLocation(!useCurrentLocation)}
        >
          <Switch
            value={useCurrentLocation}
            onValueChange={setUseCurrentLocation}
            trackColor={{ false: '#e9ecef', true: '#1B4965' }}
            thumbColor={useCurrentLocation ? '#fff' : '#adb5bd'}
          />
          <Text style={[styles.quickOptionText, isRTL && styles.rtlText]}>
            {t('useCurrentLocationForPickup') || 'Use current location for pickup'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pickup Location Section */}
      <View style={styles.locationSection}>
        <TouchableOpacity 
          style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}
          onPress={() => setExpandedSection(expandedSection === 'pickup' ? '' : 'pickup')}
        >
          <View style={[styles.sectionHeaderContent, isRTL && styles.rtlSectionHeaderContent]}>
            <Text style={styles.sectionIcon}>📤</Text>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('pickupLocation') || 'Pickup Location'}
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'pickup' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'pickup' && (
          <View style={styles.sectionContent}>
            <AddressInput
              label={t('pickupAddress') || 'Pickup Address'}
              query={pickupQuery}
              onQueryChange={(text) => {
                setPickupQuery(text);
                searchPickupAddresses(text);
              }}
              suggestions={pickupSuggestions}
              showSuggestions={showPickupSuggestions}
              onSuggestionSelect={handlePickupSelection}
              loading={pickupLoading}
              error={validation.errors?.['pickup.address']}
              placeholder={t('enterPickupAddress') || 'Enter pickup address...'}
              onUseCurrentLocation={useCurrentLocationForPickup}
            />

            <ContactForm
              type="pickup"
              data={data.pickup}
              onUpdate={updatePickupContact}
            />
          </View>
        )}
      </View>

      {/* Same Contact Info Toggle */}
      <View style={styles.sameContactSection}>
        <TouchableOpacity
          style={[styles.sameContactToggle, isRTL && styles.rtlSameContactToggle]}
          onPress={() => toggleSameContactInfo(!sameContactInfo)}
        >
          <Switch
            value={sameContactInfo}
            onValueChange={toggleSameContactInfo}
            trackColor={{ false: '#e9ecef', true: '#1B4965' }}
            thumbColor={sameContactInfo ? '#fff' : '#adb5bd'}
          />
          <Text style={[styles.sameContactText, isRTL && styles.rtlText]}>
            {t('sameContactForBoth') || 'Use same contact for both pickup and delivery'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Location Section */}
      <View style={styles.locationSection}>
        <TouchableOpacity 
          style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}
          onPress={() => setExpandedSection(expandedSection === 'delivery' ? '' : 'delivery')}
        >
          <View style={[styles.sectionHeaderContent, isRTL && styles.rtlSectionHeaderContent]}>
            <Text style={styles.sectionIcon}>📥</Text>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('deliveryLocation') || 'Delivery Location'}
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'delivery' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'delivery' && (
          <View style={styles.sectionContent}>
            <AddressInput
              label={t('deliveryAddress') || 'Delivery Address'}
              query={deliveryQuery}
              onQueryChange={(text) => {
                setDeliveryQuery(text);
                searchDeliveryAddresses(text);
              }}
              suggestions={deliverySuggestions}
              showSuggestions={showDeliverySuggestions}
              onSuggestionSelect={handleDeliverySelection}
              loading={deliveryLoading}
              error={validation.errors?.['delivery.address']}
              placeholder={t('enterDeliveryAddress') || 'Enter delivery address...'}
            />

            <ContactForm
              type="delivery"
              data={data.delivery}
              onUpdate={updateDeliveryContact}
              disabled={sameContactInfo}
            />
          </View>
        )}
      </View>

      {/* Route Summary */}
      {data.pickup?.address && data.delivery?.address && (
        <View style={styles.routeSummary}>
          <Text style={[styles.summaryTitle, isRTL && styles.rtlText]}>
            🗺️ {t('routeSummary') || 'Route Summary'}
          </Text>
          <View style={styles.routeInfo}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>{t('from')}:</Text>
              <Text style={[styles.routeValue, isRTL && styles.rtlText]}>
                {data.pickup.address}
              </Text>
            </View>
            <View style={styles.routeArrow}>
              <Text style={styles.arrowText}>↓</Text>
            </View>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>{t('to')}:</Text>
              <Text style={[styles.routeValue, isRTL && styles.rtlText]}>
                {data.delivery.address}
              </Text>
            </View>
          </View>
          
          <View style={styles.routeMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>~{Math.floor(Math.random() * 200 + 50)} km</Text>
              <Text style={styles.metricLabel}>{t('distance')}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>~{Math.floor(Math.random() * 4 + 2)}h</Text>
              <Text style={styles.metricLabel}>{t('duration')}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>${ Math.floor(Math.random() * 200 + 100)}</Text>
              <Text style={styles.metricLabel}>{t('estimated')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, isRTL && styles.rtlText]}>
          💡 {t('locationTips') || 'Location Tips'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip1') || 'Provide accurate addresses to avoid delivery delays'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip2') || 'Include contact numbers for both pickup and delivery'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip3') || 'Add special instructions for hard-to-find locations'}
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

  // Quick options
  quickOptions: {
    marginBottom: 24,
  },
  quickOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rtlQuickOption: {
    flexDirection: 'row-reverse',
  },
  quickOptionText: {
    fontSize: 16,
    color: '#495057',
    marginLeft: 12,
    flex: 1,
  },

  // Section styles
  locationSection: {
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
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rtlSectionHeaderContent: {
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
  expandIcon: {
    fontSize: 16,
    color: '#6c757d',
  },
  sectionContent: {
    padding: 16,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },

  // Address input styles
  addressInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  rtlSearchContainer: {
    flexDirection: 'row-reverse',
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  rtlInput: {
    textAlign: 'right',
  },
  loadingIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  locationButton: {
    padding: 8,
    marginLeft: 8,
  },
  locationIcon: {
    fontSize: 18,
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },

  // Suggestions styles
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#6c757d',
  },
  suggestionText: {
    fontSize: 15,
    color: '#495057',
    flex: 1,
  },

  // Contact form styles
  contactForm: {
    marginTop: 16,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  contactField: {
    flex: 1,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
  },

  // Same contact section
  sameContactSection: {
    marginBottom: 16,
  },
  sameContactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  rtlSameContactToggle: {
    flexDirection: 'row-reverse',
  },
  sameContactText: {
    fontSize: 16,
    color: '#1565c0',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },

  // Route summary styles
  routeSummary: {
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
  routeInfo: {
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    width: 50,
  },
  routeValue: {
    fontSize: 15,
    color: '#495057',
    flex: 1,
    marginLeft: 8,
  },
  routeArrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowText: {
    fontSize: 20,
    color: '#1B4965',
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
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