// components/cargo/ShipmentForm/CargoDetails.js
// 🎯 Purpose: Cargo specifications input with smart calculations
// 📋 Responsibilities:
//   - Weight and dimensions input with unit conversion
//   - Cargo value estimation and insurance calculation
//   - Packaging type selection with recommendations
//   - Real-time cost estimation updates
//   - Volume optimization suggestions

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

const WEIGHT_UNITS = [
  { id: 'kg', name: 'Kilograms', symbol: 'kg', factor: 1 },
  { id: 'lbs', name: 'Pounds', symbol: 'lbs', factor: 0.453592 },
  { id: 'tons', name: 'Tons', symbol: 't', factor: 1000 }
];

const DIMENSION_UNITS = [
  { id: 'cm', name: 'Centimeters', symbol: 'cm', factor: 1 },
  { id: 'm', name: 'Meters', symbol: 'm', factor: 100 },
  { id: 'in', name: 'Inches', symbol: 'in', factor: 2.54 },
  { id: 'ft', name: 'Feet', symbol: 'ft', factor: 30.48 }
];

const PACKAGING_TYPES = [
  {
    id: 'boxes',
    name: 'Boxes/Cartons',
    icon: '📦',
    description: 'Standard cardboard boxes',
    suitableFor: ['electronics', 'clothing', 'general'],
    protection: 'medium'
  },
  {
    id: 'pallets',
    name: 'Palletized',
    icon: '🏗️',
    description: 'Goods secured on pallets',
    suitableFor: ['construction', 'machinery', 'bulk'],
    protection: 'high'
  },
  {
    id: 'crates',
    name: 'Wooden Crates',
    icon: '📦',
    description: 'Heavy-duty wooden crates',
    suitableFor: ['machinery', 'fragile', 'valuable'],
    protection: 'very_high'
  },
  {
    id: 'bags',
    name: 'Bags/Sacks',
    icon: '🛍️',
    description: 'Flexible packaging',
    suitableFor: ['agriculture', 'food', 'textiles'],
    protection: 'low'
  },
  {
    id: 'drums',
    name: 'Drums/Barrels',
    icon: '🛢️',
    description: 'Cylindrical containers',
    suitableFor: ['chemicals', 'liquids', 'hazardous'],
    protection: 'high'
  },
  {
    id: 'custom',
    name: 'Custom Packaging',
    icon: '📋',
    description: 'Specialized packaging',
    suitableFor: ['oversized', 'fragile', 'unique'],
    protection: 'variable'
  }
];

export default function CargoDetails({ data, onUpdate, validation, costEstimate, t, isRTL }) {
  const [weightUnit, setWeightUnit] = useState('kg');
  const [dimensionUnit, setDimensionUnit] = useState('cm');
  const [showVolumeCalculator, setShowVolumeCalculator] = useState(false);
  const [showInsuranceCalculator, setShowInsuranceCalculator] = useState(false);
  const [calculatedVolume, setCalculatedVolume] = useState(0);
  const [recommendedPackaging, setRecommendedPackaging] = useState([]);

  useEffect(() => {
    calculateVolume();
    updateRecommendations();
  }, [data.dimensions, data.cargoType, data.weight]);

  // Calculate volume from dimensions
  const calculateVolume = () => {
    const { length, width, height } = data.dimensions || {};
    if (length && width && height) {
      const volume = (parseFloat(length) * parseFloat(width) * parseFloat(height)) / 1000000; // cubic meters
      setCalculatedVolume(volume);
      
      // Update form data
      onUpdate({
        calculatedVolume: volume
      });
    }
  };

  // Update packaging recommendations based on cargo type
  const updateRecommendations = () => {
    const suitable = PACKAGING_TYPES.filter(pkg => 
      pkg.suitableFor.includes(data.cargoType)
    );
    setRecommendedPackaging(suitable);
  };

  // Convert weight to kg
  const convertWeightToKg = (weight, unit) => {
    const unitData = WEIGHT_UNITS.find(u => u.id === unit);
    return parseFloat(weight) * unitData.factor;
  };

  // Convert dimensions to cm
  const convertDimensionToCm = (dimension, unit) => {
    const unitData = DIMENSION_UNITS.find(u => u.id === unit);
    return parseFloat(dimension) * unitData.factor;
  };

  // Handle weight input
  const handleWeightChange = (value) => {
    onUpdate({
      weight: value,
      weightInKg: convertWeightToKg(value, weightUnit)
    });
  };

  // Handle dimension changes
  const handleDimensionChange = (field, value) => {
    const newDimensions = {
      ...data.dimensions,
      [field]: value,
      [`${field}InCm`]: convertDimensionToCm(value, dimensionUnit)
    };
    
    onUpdate({
      dimensions: newDimensions
    });
  };

  // Calculate insurance cost
  const calculateInsuranceCost = (cargoValue) => {
    const value = parseFloat(cargoValue) || 0;
    const rate = 0.002; // 0.2% of cargo value
    return Math.round(value * rate);
  };

  // Get packaging recommendation score
  const getPackagingScore = (packaging) => {
    const scores = {
      'very_high': 95,
      'high': 80,
      'medium': 65,
      'low': 40,
      'variable': 70
    };
    return scores[packaging.protection] || 50;
  };

  // Estimate shipping cost based on weight and volume
  const getShippingEstimate = () => {
    const weight = parseFloat(data.weight) || 0;
    const volume = calculatedVolume || 0;
    
    // Volumetric weight calculation (1 cubic meter = 200kg)
    const volumetricWeight = volume * 200;
    const chargeableWeight = Math.max(weight, volumetricWeight);
    
    const baseRate = 5; // per kg
    const estimated = Math.round(chargeableWeight * baseRate);
    
    return {
      chargeableWeight: Math.round(chargeableWeight),
      isVolumetric: volumetricWeight > weight,
      estimated
    };
  };

  const WeightInput = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('cargoWeight') || 'Cargo Weight'} *
      </Text>
      
      <View style={[styles.inputWithUnit, isRTL && styles.rtlInputWithUnit]}>
        <TextInput
          style={[
            styles.numberInput,
            validation.errors?.weight && styles.inputError,
            isRTL && styles.rtlInput
          ]}
          placeholder="0"
          value={data.weight || ''}
          onChangeText={handleWeightChange}
          keyboardType="numeric"
          textAlign={isRTL ? 'right' : 'left'}
        />
        
        <View style={styles.unitSelector}>
          {WEIGHT_UNITS.map(unit => (
            <TouchableOpacity
              key={unit.id}
              style={[
                styles.unitButton,
                weightUnit === unit.id && styles.selectedUnit
              ]}
              onPress={() => setWeightUnit(unit.id)}
            >
              <Text style={[
                styles.unitText,
                weightUnit === unit.id && styles.selectedUnitText
              ]}>
                {unit.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {validation.errors?.weight && (
        <Text style={[styles.errorText, isRTL && styles.rtlText]}>
          {validation.errors.weight}
        </Text>
      )}
      
      {data.weight && (
        <Text style={[styles.conversionText, isRTL && styles.rtlText]}>
          = {convertWeightToKg(data.weight, weightUnit).toFixed(1)} kg
        </Text>
      )}
    </View>
  );

  const DimensionsInput = () => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputHeader, isRTL && styles.rtlInputHeader]}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('dimensions') || 'Dimensions'} ({t('optional')})
        </Text>
        <TouchableOpacity
          style={styles.calculatorButton}
          onPress={() => setShowVolumeCalculator(!showVolumeCalculator)}
        >
          <Text style={styles.calculatorIcon}>📐</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.dimensionsContainer}>
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionInput}>
            <Text style={[styles.dimensionLabel, isRTL && styles.rtlText]}>
              {t('length')}
            </Text>
            <TextInput
              style={[styles.numberInput, isRTL && styles.rtlInput]}
              placeholder="0"
              value={data.dimensions?.length || ''}
              onChangeText={(value) => handleDimensionChange('length', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
          
          <Text style={styles.dimensionSeparator}>×</Text>
          
          <View style={styles.dimensionInput}>
            <Text style={[styles.dimensionLabel, isRTL && styles.rtlText]}>
              {t('width')}
            </Text>
            <TextInput
              style={[styles.numberInput, isRTL && styles.rtlInput]}
              placeholder="0"
              value={data.dimensions?.width || ''}
              onChangeText={(value) => handleDimensionChange('width', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
          
          <Text style={styles.dimensionSeparator}>×</Text>
          
          <View style={styles.dimensionInput}>
            <Text style={[styles.dimensionLabel, isRTL && styles.rtlText]}>
              {t('height')}
            </Text>
            <TextInput
              style={[styles.numberInput, isRTL && styles.rtlInput]}
              placeholder="0"
              value={data.dimensions?.height || ''}
              onChangeText={(value) => handleDimensionChange('height', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
        
        <View style={styles.unitSelector}>
          {DIMENSION_UNITS.map(unit => (
            <TouchableOpacity
              key={unit.id}
              style={[
                styles.unitButton,
                dimensionUnit === unit.id && styles.selectedUnit
              ]}
              onPress={() => setDimensionUnit(unit.id)}
            >
              <Text style={[
                styles.unitText,
                dimensionUnit === unit.id && styles.selectedUnitText
              ]}>
                {unit.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {calculatedVolume > 0 && (
        <View style={styles.volumeDisplay}>
          <Text style={[styles.volumeText, isRTL && styles.rtlText]}>
            📦 {t('volume')}: {calculatedVolume.toFixed(3)} m³
          </Text>
          {getShippingEstimate().isVolumetric && (
            <Text style={[styles.volumetricWarning, isRTL && styles.rtlText]}>
              ⚠️ {t('volumetricWeightApplies')}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const CargoValueInput = () => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputHeader, isRTL && styles.rtlInputHeader]}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('cargoValue') || 'Cargo Value'} ({t('optional')})
        </Text>
        <TouchableOpacity
          style={styles.calculatorButton}
          onPress={() => setShowInsuranceCalculator(!showInsuranceCalculator)}
        >
          <Text style={styles.calculatorIcon}>💰</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.inputWithUnit, isRTL && styles.rtlInputWithUnit]}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={[
            styles.numberInput,
            validation.errors?.cargoValue && styles.inputError,
            isRTL && styles.rtlInput
          ]}
          placeholder="0.00"
          value={data.cargoValue || ''}
          onChangeText={(value) => onUpdate({ cargoValue: value })}
          keyboardType="numeric"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>
      
      {validation.errors?.cargoValue && (
        <Text style={[styles.errorText, isRTL && styles.rtlText]}>
          {validation.errors.cargoValue}
        </Text>
      )}
      
      {showInsuranceCalculator && data.cargoValue && (
        <View style={styles.insuranceCalculator}>
          <Text style={[styles.calculatorTitle, isRTL && styles.rtlText]}>
            🛡️ {t('insuranceCalculation')}
          </Text>
          <View style={styles.calculatorRow}>
            <Text style={[styles.calculatorLabel, isRTL && styles.rtlText]}>
              {t('recommendedInsurance')}:
            </Text>
            <Text style={styles.calculatorValue}>
              ${calculateInsuranceCost(data.cargoValue)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addInsuranceButton}
            onPress={() => onUpdate({ 
              insuranceRequired: true,
              insuranceCost: calculateInsuranceCost(data.cargoValue)
            })}
          >
            <Text style={styles.addInsuranceText}>
              {t('addInsurance')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const PackagingSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
        {t('packagingType') || 'Packaging Type'} ({t('optional')})
      </Text>
      
      {recommendedPackaging.length > 0 && (
        <View style={styles.recommendedSection}>
          <Text style={[styles.recommendedTitle, isRTL && styles.rtlText]}>
            ⭐ {t('recommendedForCargoType')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendedPackaging.map(packaging => (
              <TouchableOpacity
                key={packaging.id}
                style={[
                  styles.packagingCard,
                  data.packaging === packaging.id && styles.selectedPackaging
                ]}
                onPress={() => onUpdate({ packaging: packaging.id })}
              >
                <Text style={styles.packagingIcon}>{packaging.icon}</Text>
                <Text style={[styles.packagingName, isRTL && styles.rtlText]}>
                  {packaging.name}
                </Text>
                <View style={styles.protectionBadge}>
                  <Text style={styles.protectionText}>
                    {getPackagingScore(packaging)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <Text style={[styles.sectionSubTitle, isRTL && styles.rtlText]}>
        {t('allPackagingOptions')}
      </Text>
      <View style={styles.packagingGrid}>
        {PACKAGING_TYPES.map(packaging => (
          <TouchableOpacity
            key={packaging.id}
            style={[
              styles.packagingOption,
              data.packaging === packaging.id && styles.selectedPackagingOption,
              isRTL && styles.rtlPackagingOption
            ]}
            onPress={() => onUpdate({ packaging: packaging.id })}
          >
            <View style={[styles.packagingHeader, isRTL && styles.rtlPackagingHeader]}>
              <Text style={styles.packagingIcon}>{packaging.icon}</Text>
              <View style={styles.packagingInfo}>
                <Text style={[styles.packagingName, isRTL && styles.rtlText]}>
                  {packaging.name}
                </Text>
                <Text style={[styles.packagingDescription, isRTL && styles.rtlText]}>
                  {packaging.description}
                </Text>
              </View>
              {data.packaging === packaging.id && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ShippingEstimate = () => {
    const estimate = getShippingEstimate();
    
    return (
      <View style={styles.estimateContainer}>
        <Text style={[styles.estimateTitle, isRTL && styles.rtlText]}>
          📊 {t('shippingEstimate')}
        </Text>
        
        <View style={styles.estimateDetails}>
          <View style={styles.estimateRow}>
            <Text style={[styles.estimateLabel, isRTL && styles.rtlText]}>
              {t('chargeableWeight')}:
            </Text>
            <Text style={styles.estimateValue}>
              {estimate.chargeableWeight} kg
              {estimate.isVolumetric && (
                <Text style={styles.volumetricNote}> ({t('volumetric')})</Text>
              )}
            </Text>
          </View>
          
          <View style={styles.estimateRow}>
            <Text style={[styles.estimateLabel, isRTL && styles.rtlText]}>
              {t('estimatedCost')}:
            </Text>
            <Text style={styles.estimateValue}>
              ${estimate.estimated}
            </Text>
          </View>
        </View>
        
        {costEstimate && (
          <View style={styles.totalEstimate}>
            <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
              {t('totalEstimatedCost')}:
            </Text>
            <Text style={styles.totalValue}>
              ${costEstimate.totalCost}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
          {t('cargoSpecifications') || 'Cargo Specifications'}
        </Text>
        <Text style={[styles.stepSubtitle, isRTL && styles.rtlText]}>
          {t('cargoDetailsDescription') || 'Provide accurate measurements and value to get the best shipping quotes and ensure proper handling.'}
        </Text>
      </View>

      <WeightInput />
      <DimensionsInput />
      <CargoValueInput />
      <PackagingSelector />

      {/* Quantity */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('quantity') || 'Quantity'}
        </Text>
        <View style={[styles.quantityContainer, isRTL && styles.rtlQuantityContainer]}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdate({ 
              quantity: Math.max(1, (data.quantity || 1) - 1) 
            })}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityValue}>
            {data.quantity || 1}
          </Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdate({ 
              quantity: (data.quantity || 1) + 1 
            })}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ShippingEstimate />

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, isRTL && styles.rtlText]}>
          💡 {t('measurementTips') || 'Measurement Tips'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipAccurateMeasurements') || 'Accurate measurements ensure correct pricing'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipVolumetricWeight') || 'Large items may be charged by volume, not weight'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipInsurance') || 'Insurance is recommended for valuable items'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tipPackaging') || 'Proper packaging protects your cargo during transport'}
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
    marginBottom: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rtlInputHeader: {
    flexDirection: 'row-reverse',
  },
  calculatorButton: {
    padding: 8,
  },
  calculatorIcon: {
    fontSize: 20,
  },

  // Input with unit styles
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rtlInputWithUnit: {
    flexDirection: 'row-reverse',
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  rtlInput: {
    textAlign: 'right',
    marginRight: 0,
    marginLeft: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
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
  conversionText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Unit selector styles
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  selectedUnit: {
    backgroundColor: '#1B4965',
  },
  unitText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  selectedUnitText: {
    color: '#fff',
  },

  // Dimensions styles
  dimensionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  dimensionInput: {
    flex: 1,
  },
  dimensionLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  dimensionSeparator: {
    fontSize: 18,
    color: '#6c757d',
    marginHorizontal: 8,
    marginBottom: 12,
  },
  volumeDisplay: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  volumeText: {
    fontSize: 16,
    color: '#1565c0',
    fontWeight: '600',
  },
  volumetricWarning: {
    fontSize: 14,
    color: '#ef6c00',
    marginTop: 4,
  },

  // Insurance calculator styles
  insuranceCalculator: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  calculatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculatorLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  calculatorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4965',
  },
  addInsuranceButton: {
    backgroundColor: '#1B4965',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  addInsuranceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Packaging styles
  recommendedSection: {
    marginBottom: 16,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f39c12',
    marginBottom: 8,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    marginTop: 8,
  },
  packagingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    minWidth: 120,
  },
  selectedPackaging: {
    borderColor: '#f39c12',
    backgroundColor: '#fff8e1',
  },
  packagingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  packagingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  }})