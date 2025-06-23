// components/cargo/ShipmentForm/BasicDetails.js
// 🎯 Purpose: First step of shipment form - basic cargo information
// 📋 Responsibilities:
//   - Cargo type selection with smart suggestions
//   - Description input with character counter
//   - Real-time validation feedback
//   - Professional category suggestions based on business type

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const CARGO_CATEGORIES = [
  {
    id: 'general',
    name: 'General Cargo',
    icon: '📦',
    description: 'Standard goods and merchandise',
    examples: ['Retail products', 'Office supplies', 'General merchandise']
  },
  {
    id: 'food',
    name: 'Food & Beverages',
    icon: '🍎',
    description: 'Food products and beverages',
    examples: ['Fresh produce', 'Packaged foods', 'Beverages'],
    specialRequirements: ['Temperature control may be required']
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: '📱',
    description: 'Electronic devices and components',
    examples: ['Computers', 'Mobile phones', 'Electronic components'],
    specialRequirements: ['Fragile handling', 'Anti-static packaging']
  },
  {
    id: 'clothing',
    name: 'Clothing & Textiles',
    icon: '👕',
    description: 'Apparel and textile products',
    examples: ['Clothing', 'Fabrics', 'Shoes', 'Accessories']
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: '🪑',
    description: 'Furniture and home goods',
    examples: ['Tables', 'Chairs', 'Home decor'],
    specialRequirements: ['Careful handling', 'Assembly instructions']
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: '🚗',
    description: 'Vehicle parts and accessories',
    examples: ['Car parts', 'Tires', 'Automotive accessories']
  },
  {
    id: 'construction',
    name: 'Construction Materials',
    icon: '🏗️',
    description: 'Building and construction materials',
    examples: ['Tools', 'Hardware', 'Building materials'],
    specialRequirements: ['Heavy cargo handling']
  },
  {
    id: 'pharmaceuticals',
    name: 'Pharmaceuticals',
    icon: '💊',
    description: 'Medical and pharmaceutical products',
    examples: ['Medicines', 'Medical devices', 'Health products'],
    specialRequirements: ['Temperature control', 'Regulatory compliance', 'Urgent priority recommended']
  },
  {
    id: 'chemicals',
    name: 'Chemicals',
    icon: '🧪',
    description: 'Chemical products and materials',
    examples: ['Industrial chemicals', 'Cleaning products'],
    specialRequirements: ['Hazardous material handling', 'Special permits required']
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: '🌾',
    description: 'Agricultural products and equipment',
    examples: ['Seeds', 'Fertilizers', 'Farm equipment']
  },
  {
    id: 'machinery',
    name: 'Machinery',
    icon: '⚙️',
    description: 'Industrial machinery and equipment',
    examples: ['Manufacturing equipment', 'Industrial machines'],
    specialRequirements: ['Heavy cargo', 'Special equipment']
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: '📄',
    description: 'Important documents and papers',
    examples: ['Legal documents', 'Contracts', 'Certificates'],
    specialRequirements: ['Secure handling', 'Signature required']
  },
  {
    id: 'fragile',
    name: 'Fragile Items',
    icon: '🍶',
    description: 'Delicate and breakable items',
    examples: ['Glassware', 'Artwork', 'Ceramics'],
    specialRequirements: ['Fragile handling', 'Special packaging']
  },
  {
    id: 'hazardous',
    name: 'Hazardous Materials',
    icon: '⚠️',
    description: 'Dangerous or hazardous substances',
    examples: ['Flammable liquids', 'Toxic substances'],
    specialRequirements: ['Hazmat certification', 'Special permits', 'Trained drivers']
  },
  {
    id: 'refrigerated',
    name: 'Refrigerated Goods',
    icon: '❄️',
    description: 'Temperature-sensitive products',
    examples: ['Frozen foods', 'Pharmaceuticals', 'Fresh produce'],
    specialRequirements: ['Refrigerated transport', 'Temperature monitoring']
  },
  {
    id: 'oversized',
    name: 'Oversized Cargo',
    icon: '📏',
    description: 'Large or unusually sized items',
    examples: ['Large machinery', 'Vehicles', 'Construction equipment'],
    specialRequirements: ['Special permits', 'Route planning', 'Escort vehicles']
  }
];

export default function BasicDetails({ data, onUpdate, validation, t, isRTL }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    // Find selected category
    const category = CARGO_CATEGORIES.find(c => c.id === data.cargoType);
    setSelectedCategory(category);
  }, [data.cargoType]);

  // Filter categories based on search
  const filteredCategories = CARGO_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.examples.some(example => 
      example.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Popular categories (for quick selection)
  const popularCategories = CARGO_CATEGORIES.filter(c => 
    ['general', 'food', 'electronics', 'clothing'].includes(c.id)
  );

  const handleCategorySelect = (category) => {
    onUpdate({
      cargoType: category.id,
      cargoTypeName: category.name
    });
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handleDescriptionChange = (text) => {
    onUpdate({ description: text });
  };

  const CategoryCard = ({ category, onPress, isSelected = false }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        isSelected && styles.selectedCategoryCard,
        isRTL && styles.rtlCategoryCard
      ]}
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryHeader, isRTL && styles.rtlCategoryHeader]}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <View style={styles.categoryInfo}>
          <Text style={[
            styles.categoryName,
            isSelected && styles.selectedCategoryName,
            isRTL && styles.rtlText
          ]}>
            {category.name}
          </Text>
          <Text style={[styles.categoryDescription, isRTL && styles.rtlText]}>
            {category.description}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </View>
      
      {category.examples && (
        <View style={styles.categoryExamples}>
          <Text style={[styles.examplesLabel, isRTL && styles.rtlText]}>
            {t('examples') || 'Examples'}:
          </Text>
          <Text style={[styles.examplesText, isRTL && styles.rtlText]}>
            {category.examples.slice(0, 3).join(', ')}
          </Text>
        </View>
      )}
      
      {category.specialRequirements && (
        <View style={styles.specialRequirements}>
          <Text style={styles.requirementIcon}>⚠️</Text>
          <Text style={[styles.requirementText, isRTL && styles.rtlText]}>
            {category.specialRequirements[0]}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, isRTL && styles.rtlText]}>
          {t('whatAreYouShipping') || 'What are you shipping?'}
        </Text>
        <Text style={[styles.stepSubtitle, isRTL && styles.rtlText]}>
          {t('selectCargoTypeDescription') || 'Select the type of cargo you want to ship. This helps us match you with the right drivers and equipment.'}
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('cargoType') || 'Cargo Type'} *
        </Text>
        <View style={[
          styles.searchInputContainer,
          validation.errors?.cargoType && styles.inputError,
          isRTL && styles.rtlInputContainer
        ]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlInput]}
            placeholder={t('searchOrSelectCargoType') || 'Search or select cargo type...'}
            value={selectedCategory ? selectedCategory.name : searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSuggestions(text.length > 0);
              if (selectedCategory) {
                setSelectedCategory(null);
                onUpdate({ cargoType: '', cargoTypeName: '' });
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {selectedCategory && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSelectedCategory(null);
                setSearchQuery('');
                onUpdate({ cargoType: '', cargoTypeName: '' });
              }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {validation.errors?.cargoType && (
          <Text style={[styles.errorText, isRTL && styles.rtlText]}>
            {validation.errors.cargoType}
          </Text>
        )}
      </View>

      {/* Popular Categories */}
      {!selectedCategory && !showSuggestions && (
        <View style={styles.popularSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('popularCategories') || 'Popular Categories'}
          </Text>
          <View style={styles.popularGrid}>
            {popularCategories.map(category => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={handleCategorySelect}
              />
            ))}
          </View>
        </View>
      )}

      {/* Search Results */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {filteredCategories.length} {t('categoriesFound') || 'categories found'}
          </Text>
          {filteredCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={handleCategorySelect}
            />
          ))}
        </View>
      )}

      {/* All Categories */}
      {!showSuggestions && !selectedCategory && (
        <View style={styles.allCategoriesSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('allCategories') || 'All Categories'}
          </Text>
          {CARGO_CATEGORIES.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={handleCategorySelect}
            />
          ))}
        </View>
      )}

      {/* Selected Category Details */}
      {selectedCategory && (
        <View style={styles.selectedCategorySection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('selectedCategory') || 'Selected Category'}
          </Text>
          <CategoryCard
            category={selectedCategory}
            onPress={() => {}}
            isSelected={true}
          />
        </View>
      )}

      {/* Description Input */}
      <View style={styles.descriptionContainer}>
        <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
          {t('cargoDescription') || 'Cargo Description'} 
          <Text style={styles.optionalLabel}> ({t('optional') || 'optional'})</Text>
        </Text>
        <TextInput
          style={[
            styles.descriptionInput,
            validation.errors?.description && styles.inputError,
            isRTL && styles.rtlInput
          ]}
          placeholder={t('describeYourCargo') || 'Describe your cargo in more detail...'}
          value={data.description || ''}
          onChangeText={handleDescriptionChange}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlign={isRTL ? 'right' : 'left'}
          textAlignVertical="top"
        />
        <View style={[styles.characterCounter, isRTL && styles.rtlCharacterCounter]}>
          <Text style={styles.characterCountText}>
            {(data.description || '').length}/500
          </Text>
        </View>
        {validation.errors?.description && (
          <Text style={[styles.errorText, isRTL && styles.rtlText]}>
            {validation.errors.description}
          </Text>
        )}
      </View>

      {/* Helpful Tips */}
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, isRTL && styles.rtlText]}>
          💡 {t('helpfulTips') || 'Helpful Tips'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip1') || 'Be as specific as possible to get accurate quotes'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip2') || 'Special requirements affect pricing and availability'}
        </Text>
        <Text style={[styles.tipText, isRTL && styles.rtlText]}>
          • {t('tip3') || 'Consider packaging requirements for fragile items'}
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

  // Search styles
  searchContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6c757d',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingHorizontal: 12,
    height: 50,
  },
  rtlInputContainer: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  rtlInput: {
    textAlign: 'right',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#adb5bd',
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

  // Category styles
  popularSection: {
    marginBottom: 24,
  },
  allCategoriesSection: {
    marginBottom: 24,
  },
  selectedCategorySection: {
    marginBottom: 24,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCategoryCard: {
    borderColor: '#1B4965',
    backgroundColor: '#f0f7ff',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rtlCategoryHeader: {
    flexDirection: 'row-reverse',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  selectedCategoryName: {
    color: '#1B4965',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Examples and requirements
  categoryExamples: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  examplesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  examplesText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  specialRequirements: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  requirementIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },

  // Description styles
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
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