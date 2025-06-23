// screens/FindTrucksScreen.js - AI-Powered Truck Matching
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp } from '../firebase';

export default function FindTrucksScreen({ navigation, route }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    truckType: '',
    maxPrice: '',
    location: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [userShipments, setUserShipments] = useState([]);

  useEffect(() => {
    loadAvailableTrucks();
    loadUserShipments();
  }, []);

  useEffect(() => {
    filterTrucks();
  }, [searchQuery, selectedFilters, availableTrucks]);

  const loadUserShipments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const shipmentsRef = collection(db, 'shipments');
      const q = query(shipmentsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const shipments = [];
      querySnapshot.forEach((doc) => {
        shipments.push({ id: doc.id, ...doc.data() });
      });
      
      setUserShipments(shipments);
    } catch (error) {
      console.error('Error loading user shipments:', error);
    }
  };

  const loadAvailableTrucks = async () => {
    try {
      // Mock truck data with AI scoring
      const mockTrucks = [
        {
          id: 'truck1',
          driverName: 'Ahmed Al-Mansouri',
          driverRating: 4.8,
          truckType: 'Refrigerated Truck',
          capacity: '15 tons',
          pricePerKm: 2.5,
          location: 'Dubai, UAE',
          currentLocation: { lat: 25.2048, lng: 55.2708 },
          availability: 'Available Now',
          completedJobs: 245,
          languages: ['Arabic', 'English'],
          specializations: ['Food & Beverage', 'Pharmaceuticals'],
          aiScore: 0.95,
          estimatedArrival: '2 hours',
          insuranceCoverage: '$50,000',
          verified: true
        },
        {
          id: 'truck2',
          driverName: 'Mohammad Hassan',
          driverRating: 4.6,
          truckType: 'Box Truck',
          capacity: '10 tons',
          pricePerKm: 2.0,
          location: 'Abu Dhabi, UAE',
          currentLocation: { lat: 24.4539, lng: 54.3773 },
          availability: 'Available in 4 hours',
          completedJobs: 189,
          languages: ['Arabic', 'English'],
          specializations: ['Electronics', 'General Cargo'],
          aiScore: 0.87,
          estimatedArrival: '6 hours',
          insuranceCoverage: '$30,000',
          verified: true
        },
        {
          id: 'truck3',
          driverName: 'David Smith',
          driverRating: 4.9,
          truckType: 'Flatbed Truck',
          capacity: '20 tons',
          pricePerKm: 3.0,
          location: 'Sharjah, UAE',
          currentLocation: { lat: 25.3463, lng: 55.4209 },
          availability: 'Available Now',
          completedJobs: 312,
          languages: ['English', 'Hindi'],
          specializations: ['Construction Materials', 'Heavy Machinery'],
          aiScore: 0.92,
          estimatedArrival: '1.5 hours',
          insuranceCoverage: '$75,000',
          verified: true
        },
        {
          id: 'truck4',
          driverName: 'Raj Patel',
          driverRating: 4.4,
          truckType: 'Van',
          capacity: '3 tons',
          pricePerKm: 1.5,
          location: 'Dubai, UAE',
          currentLocation: { lat: 25.1972, lng: 55.2744 },
          availability: 'Available Now',
          completedJobs: 156,
          languages: ['English', 'Hindi', 'Gujarati'],
          specializations: ['Documents', 'Small Packages'],
          aiScore: 0.78,
          estimatedArrival: '45 minutes',
          insuranceCoverage: '$20,000',
          verified: false
        }
      ];

      // Simulate AI recommendation based on user's shipment history
      const recommendations = generateAIRecommendations(mockTrucks, userShipments);
      
      setAvailableTrucks(mockTrucks);
      setAiRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = (trucks, shipments) => {
    // AI Algorithm: Score trucks based on user's shipping patterns
    const userPatterns = analyzeShippingPatterns(shipments);
    
    return trucks.map(truck => ({
      ...truck,
      aiRecommendationScore: calculateAIScore(truck, userPatterns),
      recommendationReason: getRecommendationReason(truck, userPatterns)
    })).sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore);
  };

  const analyzeShippingPatterns = (shipments) => {
    if (shipments.length === 0) return {};
    
    const patterns = {
      commonCargoTypes: {},
      averageBudget: 0,
      preferredLocations: {},
      urgencyPattern: 'normal'
    };

    shipments.forEach(shipment => {
      // Analyze cargo types
      if (shipment.cargoType) {
        patterns.commonCargoTypes[shipment.cargoType] = 
          (patterns.commonCargoTypes[shipment.cargoType] || 0) + 1;
      }
      
      // Calculate average budget
      if (shipment.budget) {
        patterns.averageBudget += shipment.budget;
      }
    });

    patterns.averageBudget = patterns.averageBudget / shipments.length;
    return patterns;
  };

  const calculateAIScore = (truck, patterns) => {
    let score = truck.aiScore; // Base AI score
    
    // Boost score based on user patterns
    if (truck.driverRating > 4.5) score += 0.1;
    if (truck.verified) score += 0.1;
    if (truck.availability === 'Available Now') score += 0.1;
    
    // Adjust based on user's budget pattern
    if (patterns.averageBudget && truck.pricePerKm < patterns.averageBudget / 100) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  };

  const getRecommendationReason = (truck, patterns) => {
    const reasons = [];
    
    if (truck.driverRating > 4.7) reasons.push('High rating');
    if (truck.verified) reasons.push('Verified driver');
    if (truck.availability === 'Available Now') reasons.push('Available immediately');
    if (truck.completedJobs > 200) reasons.push('Experienced driver');
    
    return reasons.join(', ') || 'Good match for your needs';
  };

  const filterTrucks = () => {
    let filtered = [...availableTrucks];

    if (searchQuery) {
      filtered = filtered.filter(truck =>
        truck.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.truckType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.specializations.some(spec => 
          spec.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedFilters.truckType) {
      filtered = filtered.filter(truck => truck.truckType === selectedFilters.truckType);
    }

    if (selectedFilters.maxPrice) {
      filtered = filtered.filter(truck => truck.pricePerKm <= parseFloat(selectedFilters.maxPrice));
    }

    if (selectedFilters.location) {
      filtered = filtered.filter(truck => 
        truck.location.toLowerCase().includes(selectedFilters.location.toLowerCase())
      );
    }

    setFilteredTrucks(filtered);
  };

  const handleHireTruck = async (truck) => {
    Alert.alert(
      t('hireTruck'),
      `${t('confirmHire')} ${truck.driverName}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              const user = auth.currentUser;
              const hireRequest = {
                truckId: truck.id,
                driverName: truck.driverName,
                cargoOwnerId: user.uid,
                cargoOwnerEmail: user.email,
                truckType: truck.truckType,
                pricePerKm: truck.pricePerKm,
                status: 'pending',
                createdAt: serverTimestamp(),
                estimatedCost: 0, // Will be calculated based on route
                route: null
              };

              await addDoc(collection(db, 'hireRequests'), hireRequest);
              
              Alert.alert(
                t('success'),
                t('hireRequestSent'),
                [
                  {
                    text: t('ok'),
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error hiring truck:', error);
              Alert.alert(t('error'), t('failedToHireTruck'));
            }
          }
        }
      ]
    );
  };

  const renderTruckCard = (truck) => (
    <View key={truck.id} style={[styles.truckCard, isRTL && styles.rtlCard]}>
      {/* AI Recommendation Badge */}
      {aiRecommendations.findIndex(rec => rec.id === truck.id) < 3 && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 AI {t('recommended')}</Text>
        </View>
      )}

      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, isRTL && styles.rtlText]}>
            {truck.driverName}
          </Text>
          <View style={[styles.ratingContainer, isRTL && styles.rtlRow]}>
            <Text style={styles.rating}>⭐ {truck.driverRating}</Text>
            <Text style={styles.completedJobs}>
              ({truck.completedJobs} {t('jobs')})
            </Text>
            {truck.verified && <Text style={styles.verifiedBadge}>✅</Text>}
          </View>
        </View>
        <View style={styles.availability}>
          <Text style={styles.availabilityText}>{truck.availability}</Text>
        </View>
      </View>

      <View style={[styles.truckDetails, isRTL && styles.rtlContainer]}>
        <Text style={[styles.truckType, isRTL && styles.rtlText]}>
          🚛 {truck.truckType} - {truck.capacity}
        </Text>
        <Text style={[styles.location, isRTL && styles.rtlText]}>
          📍 {truck.location}
        </Text>
        <Text style={[styles.price, isRTL && styles.rtlText]}>
          💰 ${truck.pricePerKm}/{t('km')}
        </Text>
        <Text style={[styles.arrival, isRTL && styles.rtlText]}>
          🕐 {t('estimatedArrival')}: {truck.estimatedArrival}
        </Text>
      </View>

      <View style={styles.specializations}>
        <Text style={[styles.specializationsTitle, isRTL && styles.rtlText]}>
          {t('specializations')}:
        </Text>
        <View style={styles.specializationTags}>
          {truck.specializations.map((spec, index) => (
            <View key={index} style={styles.specializationTag}>
              <Text style={styles.specializationText}>{spec}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.languages}>
        <Text style={[styles.languagesTitle, isRTL && styles.rtlText]}>
          🗣️ {t('languages')}: {truck.languages.join(', ')}
        </Text>
      </View>

      <View style={[styles.cardActions, isRTL && styles.rtlRow]}>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => {/* Navigate to detailed view */}}
        >
          <Text style={styles.viewDetailsText}>{t('viewDetails')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.hireButton}
          onPress={() => handleHireTruck(truck)}
        >
          <Text style={styles.hireButtonText}>{t('hireTruck')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.filtersContainer, isRTL && styles.rtlContainer]}>
          <Text style={[styles.filtersTitle, isRTL && styles.rtlText]}>
            {t('filters')}
          </Text>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, isRTL && styles.rtlText]}>
              {t('truckType')}
            </Text>
            <View style={styles.filterOptions}>
              {['Box Truck', 'Flatbed Truck', 'Refrigerated Truck', 'Van'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    selectedFilters.truckType === type && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedFilters(prev => ({
                    ...prev,
                    truckType: prev.truckType === type ? '' : type
                  }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilters.truckType === type && styles.filterOptionTextSelected,
                    isRTL && styles.rtlText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, isRTL && styles.rtlText]}>
              {t('maxPricePerKm')}
            </Text>
            <TextInput
              style={[styles.filterInput, isRTL && styles.rtlInput]}
              value={selectedFilters.maxPrice}
              onChangeText={(text) => setSelectedFilters(prev => ({
                ...prev,
                maxPrice: text
              }))}
              placeholder="e.g., 3.0"
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => setSelectedFilters({ truckType: '', maxPrice: '', location: '' })}
            >
              <Text style={styles.clearFiltersText}>{t('clearFilters')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>{t('applyFilters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B4965" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isRTL && styles.rtlRow]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={[
              styles.backButtonText,
              isRTL && { transform: [{ scaleX: -1 }] }
            ]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {t('findTrucks')}
          </Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlInput]}
            placeholder={t('searchTrucks')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Recommendations Section */}
        {aiRecommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              🤖 {t('aiRecommendations')}
            </Text>
            {aiRecommendations.slice(0, 2).map(renderTruckCard)}
          </View>
        )}

        {/* All Available Trucks */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('availableTrucks')} ({filteredTrucks.length})
          </Text>
          {filteredTrucks.map(renderTruckCard)}
        </View>

        {filteredTrucks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🚛</Text>
            <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {t('noTrucksFound')}
            </Text>
          </View>
        )}
      </ScrollView>

      {renderFiltersModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1B4965',
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  truckCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  aiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#FF6B35',
    marginRight: 10,
  },
  completedJobs: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  verifiedBadge: {
    fontSize: 12,
  },
  availability: {
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  availabilityText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  truckDetails: {
    marginBottom: 15,
  },
  truckType: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    color: '#1B4965',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  arrival: {
    fontSize: 14,
    color: '#FF6B35',
  },
  specializations: {
    marginBottom: 15,
  },
  specializationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  specializationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specializationTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 5,
  },
  specializationText: {
    fontSize: 12,
    color: '#1976D2',
  },
  languages: {
    marginBottom: 15,
  },
  languagesTitle: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#333',
    fontWeight: '600',
  },
  hireButton: {
    flex: 1,
    backgroundColor: '#1B4965',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hireButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  filterOptionSelected: {
    backgroundColor: '#1B4965',
    borderColor: '#1B4965',
  },
  filterOptionText: {
    color: '#333',
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 15,
    marginRight: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#333',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#1B4965',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rtlCard: {
    direction: 'rtl',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rtlInput: {
    textAlign: 'right',
  },
});