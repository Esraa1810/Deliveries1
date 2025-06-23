// services/cargo/ShipmentValidation.js 
// 🎯 Purpose: Professional validation service for shipment data
// 📋 Responsibilities:
//   - Validate all shipment form fields and business rules
//   - Check compliance with shipping regulations
//   - Provide warnings and recommendations for optimization
//   - Calculate validation scores and completeness metrics
//   - Support multi-language error messages

import { useLanguage } from '../../contexts/LanguageContext';

class ShipmentValidation {
  constructor() {
    this.requiredFields = [
      'cargoType',
      'weight',
      'pickup',
      'delivery',
      'preferredDate'
    ];
    
    this.cargoTypes = [
      'general',
      'food',
      'electronics',
      'clothing',
      'furniture',
      'automotive',
      'construction',
      'chemicals',
      'pharmaceuticals',
      'agriculture',
      'machinery',
      'documents',
      'fragile',
      'hazardous',
      'refrigerated',
      'oversized'
    ];

    this.priorities = ['standard', 'urgent', 'express'];
    this.weightLimits = { min: 1, max: 40000 }; // kg
    this.valueLimits = { min: 1, max: 1000000 }; // currency
  }

  // Main validation method
  validateShipment(shipmentData, t = null) {
    const errors = {};
    const warnings = [];
    const recommendations = [];

    // Basic field validation
    this.validateRequiredFields(shipmentData, errors, t);
    this.validateCargoDetails(shipmentData, errors, warnings, t);
    this.validateLocations(shipmentData, errors, warnings, t);
    this.validateDates(shipmentData, errors, warnings, t);
    this.validateBusiness(shipmentData, warnings, recommendations, t);
    this.validateCompliance(shipmentData, errors, warnings, t);

    // Advanced validations
    this.validateRouteComplexity(shipmentData, warnings, recommendations, t);
    this.validateSeasonality(shipmentData, warnings, recommendations, t);
    this.validateCapacity(shipmentData, warnings, recommendations, t);

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      recommendations,
      score: this.calculateValidationScore(errors, warnings),
      completeness: this.calculateCompleteness(shipmentData)
    };
  }

  // Validate required fields
  validateRequiredFields(data, errors, t) {
    this.requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        const fieldName = this.getFieldDisplayName(field, t);
        errors[field] = t ? t('fieldRequired', { field: fieldName }) : `${fieldName} is required`;
      }
    });

    // Nested required fields
    if (data.pickup && !data.pickup.address) {
      errors['pickup.address'] = t ? t('pickupAddressRequired') : 'Pickup address is required';
    }

    if (data.delivery && !data.delivery.address) {
      errors['delivery.address'] = t ? t('deliveryAddressRequired') : 'Delivery address is required';
    }
  }

  // Validate cargo details
  validateCargoDetails(data, errors, warnings, t) {
    // Cargo type validation
    if (data.cargoType && !this.cargoTypes.includes(data.cargoType)) {
      errors.cargoType = t ? t('invalidCargoType') : 'Invalid cargo type';
    }

    // Weight validation
    if (data.weight) {
      const weight = parseFloat(data.weight);
      if (isNaN(weight) || weight <= 0) {
        errors.weight = t ? t('invalidWeight') : 'Weight must be a positive number';
      } else if (weight < this.weightLimits.min) {
        warnings.push(t ? t('weightTooLow') : 'Weight seems unusually low');
      } else if (weight > this.weightLimits.max) {
        errors.weight = t ? t('weightTooHigh') : 'Weight exceeds maximum limit (40,000 kg)';
      } else if (weight > 25000) {
        warnings.push(t ? t('heavyCargoWarning') : 'Heavy cargo may require special handling');
      }
    }

    // Dimensions validation
    if (data.dimensions) {
      const { length, width, height } = data.dimensions;
      if (length && width && height) {
        const volume = length * width * height;
        if (volume > 100) { // cubic meters
          warnings.push(t ? t('largeVolumeWarning') : 'Large volume cargo may require special vehicle');
        }
      }
    }

    // Value validation
    if (data.cargoValue) {
      const value = parseFloat(data.cargoValue);
      if (isNaN(value) || value <= 0) {
        errors.cargoValue = t ? t('invalidCargoValue') : 'Cargo value must be a positive number';
      } else if (value > this.valueLimits.max) {
        warnings.push(t ? t('highValueWarning') : 'High-value cargo requires special insurance');
      }
    }

    // Priority validation
    if (data.priority && !this.priorities.includes(data.priority)) {
      errors.priority = t ? t('invalidPriority') : 'Invalid priority level';
    }
  }

  // Validate pickup and delivery locations
  validateLocations(data, errors, warnings, t) {
    // Same location check
    if (data.pickup && data.delivery) {
      if (this.isSameLocation(data.pickup, data.delivery)) {
        errors.locations = t ? t('samePickupDelivery') : 'Pickup and delivery cannot be the same location';
      }

      // Distance validation
      const distance = this.estimateDistance(data.pickup, data.delivery);
      if (distance < 5) {
        warnings.push(t ? t('shortDistanceWarning') : 'Very short distance - consider local delivery service');
      } else if (distance > 2000) {
        warnings.push(t ? t('longDistanceWarning') : 'Long distance shipment may require additional planning');
      }
    }

    // Address completeness
    this.validateAddress(data.pickup, 'pickup', errors, warnings, t);
    this.validateAddress(data.delivery, 'delivery', errors, warnings, t);
  }

  // Validate address completeness
  validateAddress(address, type, errors, warnings, t) {
    if (!address) return;

    const required = ['address', 'city'];
    const recommended = ['postalCode', 'country', 'contactName', 'contactPhone'];

    required.forEach(field => {
      if (!address[field]) {
        errors[`${type}.${field}`] = t ? t('fieldRequired', { field }) : `${field} is required`;
      }
    });

    let missingRecommended = 0;
    recommended.forEach(field => {
      if (!address[field]) {
        missingRecommended++;
      }
    });

    if (missingRecommended > 2) {
      warnings.push(t ? 
        t('incompleteAddressWarning', { type }) : 
        `${type} address is incomplete - add more details for better service`);
    }
  }

  // Validate dates
  validateDates(data, errors, warnings, t) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (data.preferredDate) {
      const preferredDate = new Date(data.preferredDate);
      
      if (isNaN(preferredDate.getTime())) {
        errors.preferredDate = t ? t('invalidDate') : 'Invalid date format';
      } else if (preferredDate < now) {
        errors.preferredDate = t ? t('pastDateError') : 'Date cannot be in the past';
      } else if (preferredDate < tomorrow) {
        warnings.push(t ? t('urgentDateWarning') : 'Same-day or next-day delivery may have limited availability');
      }
    }

    if (data.deadlineDate) {
      const deadlineDate = new Date(data.deadlineDate);
      const preferredDate = new Date(data.preferredDate);
      
      if (deadlineDate < preferredDate) {
        errors.deadlineDate = t ? t('deadlineBeforePreferred') : 'Deadline cannot be before preferred date';
      }
    }
  }

  // Business logic validation
  validateBusiness(data, warnings, recommendations, t) {
    // Insurance recommendations
    if (data.cargoValue > 10000 && !data.insuranceRequired) {
      recommendations.push(t ? 
        t('insuranceRecommendation') : 
        'Consider adding insurance for high-value cargo');
    }

    // Special handling recommendations
    const specialCargoTypes = ['fragile', 'hazardous', 'refrigerated', 'pharmaceuticals'];
    if (specialCargoTypes.includes(data.cargoType) && (!data.specialHandling || data.specialHandling.length === 0)) {
      recommendations.push(t ? 
        t('specialHandlingRecommendation') : 
        'Special handling may be required for this cargo type');
    }

    // Priority recommendations
    if (data.priority === 'standard' && data.cargoType === 'pharmaceuticals') {
      recommendations.push(t ? 
        t('urgentPharmaceuticals') : 
        'Consider urgent priority for pharmaceutical products');
    }

    // Volume recommendations
    if (data.weight > 1000 && data.priority === 'express') {
      warnings.push(t ? 
        t('heavyExpressWarning') : 
        'Heavy cargo with express priority may be expensive');
    }
  }

  // Compliance validation
  validateCompliance(data, errors, warnings, t) {
    // Hazardous material compliance
    if (data.cargoType === 'hazardous') {
      if (!data.hazmatClass) {
        errors.hazmatClass = t ? t('hazmatClassRequired') : 'Hazardous material class is required';
      }
      if (!data.hazmatDeclaration) {
        errors.hazmatDeclaration = t ? t('hazmatDeclarationRequired') : 'Hazardous material declaration is required';
      }
    }

    // International shipping compliance
    if (data.pickup?.country !== data.delivery?.country) {
      if (!data.customsDocuments) {
        warnings.push(t ? t('customsDocumentsWarning') : 'International shipment may require customs documents');
      }
    }

    // Pharmaceutical compliance
    if (data.cargoType === 'pharmaceuticals') {
      if (!data.temperatureControlled) {
        recommendations.push(t ? t('temperatureControlRecommendation') : 'Temperature-controlled transport recommended for pharmaceuticals');
      }
    }
  }

  // Advanced route complexity validation
  validateRouteComplexity(data, warnings, recommendations, t) {
    if (!data.pickup || !data.delivery) return;

    const complexity = this.calculateRouteComplexity(data.pickup, data.delivery);
    
    if (complexity.level === 'complex') {
      warnings.push(t ? t('complexRouteWarning') : 'Complex route may require additional time and cost');
      
      if (complexity.factors.includes('international')) {
        recommendations.push(t ? t('internationalShippingRecommendation') : 'Consider using a freight forwarder for international shipments');
      }
      
      if (complexity.factors.includes('urban_traffic')) {
        recommendations.push(t ? t('urbanTrafficRecommendation') : 'Schedule pickup/delivery outside peak hours for urban areas');
      }
    }
  }

  // Seasonality validation
  validateSeasonality(data, warnings, recommendations, t) {
    const seasonalInfo = this.getSeasonalInfo(data.cargoType, data.preferredDate);
    
    if (seasonalInfo.isPeak) {
      warnings.push(t ? 
        t('peakSeasonWarning', { season: seasonalInfo.season }) : 
        `Peak season for ${data.cargoType} - expect higher prices and longer delays`);
      
      recommendations.push(t ? 
        t('peakSeasonRecommendation') : 
        'Book early during peak season for better rates and availability');
    }

    if (seasonalInfo.weatherRisk) {
      warnings.push(t ? 
        t('weatherRiskWarning', { risk: seasonalInfo.weatherRisk }) : 
        `Weather risk: ${seasonalInfo.weatherRisk} - plan accordingly`);
    }
  }

  // Capacity validation
  validateCapacity(data, warnings, recommendations, t) {
    const vehicleRequirement = this.calculateVehicleRequirement(data);
    
    if (vehicleRequirement.specialVehicle) {
      warnings.push(t ? 
        t('specialVehicleWarning', { type: vehicleRequirement.type }) : 
        `Special vehicle required: ${vehicleRequirement.type}`);
    }

    if (vehicleRequirement.efficiency < 0.6) {
      recommendations.push(t ? 
        t('capacityOptimizationRecommendation') : 
        'Consider grouping with other shipments for better efficiency');
    }
  }

  // Utility methods
  isSameLocation(loc1, loc2) {
    if (!loc1 || !loc2) return false;
    
    return loc1.address?.toLowerCase().trim() === loc2.address?.toLowerCase().trim() &&
           loc1.city?.toLowerCase().trim() === loc2.city?.toLowerCase().trim();
  }

  estimateDistance(pickup, delivery) {
    // Mock distance calculation
    if (!pickup?.coordinates || !delivery?.coordinates) {
      return Math.random() * 500 + 50; // Random distance between 50-550 km
    }
    
    // Simple haversine formula
    const R = 6371;
    const dLat = this.deg2rad(delivery.coordinates.latitude - pickup.coordinates.latitude);
    const dLon = this.deg2rad(delivery.coordinates.longitude - pickup.coordinates.longitude);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(pickup.coordinates.latitude)) * 
              Math.cos(this.deg2rad(delivery.coordinates.latitude)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  calculateRouteComplexity(pickup, delivery) {
    const factors = [];
    
    if (pickup.country !== delivery.country) {
      factors.push('international');
    }
    
    if (['urban', 'metropolitan'].includes(pickup.type) || 
        ['urban', 'metropolitan'].includes(delivery.type)) {
      factors.push('urban_traffic');
    }
    
    const distance = this.estimateDistance(pickup, delivery);
    if (distance > 1000) {
      factors.push('long_distance');
    }
    
    return {
      level: factors.length > 1 ? 'complex' : 'simple',
      factors,
      score: factors.length
    };
  }

  getSeasonalInfo(cargoType, preferredDate) {
    const month = new Date(preferredDate).getMonth();
    const seasonalData = {
      agriculture: { peakMonths: [6, 7, 8], weatherRisk: 'harvest_season' },
      food: { peakMonths: [10, 11, 0], weatherRisk: 'temperature_sensitive' },
      retail: { peakMonths: [10, 11, 0], weatherRisk: null },
      construction: { peakMonths: [3, 4, 5, 6, 7, 8], weatherRisk: 'weather_dependent' }
    };
    
    const typeData = seasonalData[cargoType] || { peakMonths: [], weatherRisk: null };
    
    return {
      isPeak: typeData.peakMonths.includes(month),
      season: this.getSeasonName(month),
      weatherRisk: typeData.weatherRisk
    };
  }

  getSeasonName(month) {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  calculateVehicleRequirement(data) {
    const weight = parseFloat(data.weight) || 0;
    const volume = data.dimensions ? 
      (data.dimensions.length * data.dimensions.width * data.dimensions.height) : 
      weight * 0.5; // Estimate volume from weight
    
    let vehicleType = 'standard';
    let specialVehicle = false;
    
    if (data.cargoType === 'refrigerated') {
      vehicleType = 'refrigerated_truck';
      specialVehicle = true;
    } else if (weight > 10000) {
      vehicleType = 'heavy_truck';
      specialVehicle = true;
    } else if (volume > 50) {
      vehicleType = 'large_truck';
      specialVehicle = true;
    }
    
    // Calculate capacity efficiency
    const standardCapacity = { weight: 3000, volume: 20 };
    const efficiency = Math.min(
      weight / standardCapacity.weight,
      volume / standardCapacity.volume
    );
    
    return {
      type: vehicleType,
      specialVehicle,
      efficiency: Math.min(efficiency, 1)
    };
  }

  calculateValidationScore(errors, warnings) {
    const errorPenalty = Object.keys(errors).length * 20;
    const warningPenalty = warnings.length * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }

  calculateCompleteness(data) {
    const allFields = [
      'cargoType', 'weight', 'dimensions', 'cargoValue',
      'pickup.address', 'pickup.city', 'pickup.postalCode', 'pickup.contactName', 'pickup.contactPhone',
      'delivery.address', 'delivery.city', 'delivery.postalCode', 'delivery.contactName', 'delivery.contactPhone',
      'preferredDate', 'deadlineDate', 'priority', 'specialInstructions',
      'insuranceRequired', 'specialHandling'
    ];
    
    const completedFields = allFields.filter(field => {
      const value = this.getNestedValue(data, field);
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((completedFields.length / allFields.length) * 100);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  getFieldDisplayName(field, t) {
    const fieldNames = {
      cargoType: t ? t('cargoType') : 'Cargo Type',
      weight: t ? t('cargoWeight') : 'Weight',
      pickup: t ? t('pickupLocation') : 'Pickup Location',
      delivery: t ? t('deliveryLocation') : 'Delivery Location',
      preferredDate: t ? t('preferredDate') : 'Preferred Date'
    };
    
    return fieldNames[field] || field;
  }

  // Quick validation for real-time feedback
  validateField(fieldName, value, allData = {}, t = null) {
    const tempData = { ...allData, [fieldName]: value };
    const validation = this.validateShipment(tempData, t);
    
    return {
      isValid: !validation.errors[fieldName],
      error: validation.errors[fieldName],
      warnings: validation.warnings.filter(w => w.includes(fieldName)),
      recommendations: validation.recommendations.filter(r => r.includes(fieldName))
    };
  }
}

export default new ShipmentValidation();