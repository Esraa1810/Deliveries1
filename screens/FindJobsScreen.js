// screens/FindJobsScreen.js - Job Search for Truck Drivers
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { 
  auth, 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from '../firebase';

const { width } = Dimensions.get('window');

export default function FindJobsScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    cargoType: 'all',
    distance: 'all',
    budget: 'all',
    urgency: 'all'
  });

  useEffect(() => {
    loadAvailableJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchText, filters]);

  const loadAvailableJobs = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get user's vehicle type and location for better matching
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const jobsRef = collection(db, 'shipments');
      const q = query(
        jobsRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const availableJobs = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Add AI matching score based on driver profile
        const matchingScore = calculateMatchingScore(data, userData);
        
        availableJobs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          matchingScore,
          distance: calculateDistance(userData?.location, data.pickupLocation) || Math.floor(Math.random() * 200) + 10
        });
      });

      // Sort by matching score and creation date
      availableJobs.sort((a, b) => {
        if (a.matchingScore !== b.matchingScore) {
          return b.matchingScore - a.matchingScore;
        }
        return b.createdAt - a.createdAt;
      });

      setJobs(availableJobs);
    } catch (error) {
      console.warn('Could not load jobs from Firestore:', error.message);
      // Use mock data if Firestore fails
      setJobs(getMockJobs());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockJobs = () => [
    {
      id: 'job1',
      title: 'Electronics Shipment',
      cargoType: 'Electronics',
      pickupLocation: 'Dubai Mall, Dubai',
      deliveryLocation: 'Abu Dhabi Mall, Abu Dhabi',
      budget: 450,
      weight: '2 tons',
      urgency: 'standard',
      description: 'Fragile electronics requiring careful handling',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      distance: 145,
      matchingScore: 95,
      ownerId: 'cargo_user_1',
      ownerName: 'Ahmed Electronics Co.',
      ownerRating: 4.8,
      requirements: ['GPS Tracking', 'Insurance Coverage'],
      estimatedDuration: '3-4 hours'
    },
    {
      id: 'job2',
      title: 'Food & Beverages',
      cargoType: 'Food',
      pickupLocation: 'Al Ain Farms, Al Ain',
      deliveryLocation: 'Carrefour Warehouse, Sharjah',
      budget: 320,
      weight: '1.5 tons',
      urgency: 'urgent',
      description: 'Fresh produce delivery - temperature controlled',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      distance: 89,
      matchingScore: 88,
      ownerId: 'cargo_user_2',
      ownerName: 'Fresh Foods Distribution',
      ownerRating: 4.6,
      requirements: ['Refrigerated Vehicle', 'Food Safety Cert'],
      estimatedDuration: '2-3 hours'
    }
  ];

  const calculateMatchingScore = (job, driverData) => {
    let score = 50; // Base score
    
    // Vehicle type matching
    if (driverData?.vehicleType && job.requiredVehicleType) {
      if (driverData.vehicleType === job.requiredVehicleType) score += 20;
    }
    
    // Experience with cargo type
    if (driverData?.experience?.includes(job.cargoType)) score += 15;
    
    // Driver rating
    if (driverData?.rating >= 4.5) score += 10;
    else if (driverData?.rating >= 4.0) score += 5;
    
    // Random factor for demo
    score += Math.floor(Math.random() * 10);
    
    return Math.min(score, 100);
  };

  const calculateDistance = (from, to) => {
    // Mock distance calculation - in real app, use Google Maps API
    return Math.floor(Math.random() * 200) + 10;
  };

  const applyFilters = () => {
    let filtered = jobs;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchText.toLowerCase()) ||
        job.cargoType.toLowerCase().includes(searchText.toLowerCase()) ||
        job.pickupLocation.toLowerCase().includes(searchText.toLowerCase()) ||
        job.deliveryLocation.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Cargo type filter
    if (filters.cargoType !== 'all') {
      filtered = filtered.filter(job => job.cargoType === filters.cargoType);
    }

    // Distance filter
    if (filters.distance !== 'all') {
      const maxDistance = parseInt(filters.distance);
      filtered = filtered.filter(job => job.distance <= maxDistance);
    }

    // Budget filter
    if (filters.budget !== 'all') {
      const minBudget = parseInt(filters.budget);
      filtered = filtered.filter(job => job.budget >= minBudget);
    }

    // Urgency filter
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(job => job.urgency === filters.urgency);
    }

    setFilteredJobs(filtered);
  };

  const handleApplyForJob = async (job) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      Alert.alert(
        t('applyForJob'),
        `${t('applyConfirmation')} "${job.title}"?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('apply'),
            onPress: async () => {
              try {
                setLoading(true);

                // Create job application
                await addDoc(collection(db, 'jobApplications'), {
                  jobId: job.id,
                  driverId: user.uid,
                  cargoOwnerId: job.ownerId,
                  status: 'pending',
                  appliedAt: serverTimestamp(),
                  message: `Driver applied for: ${job.title}`,
                  jobDetails: {
                    title: job.title,
                    budget: job.budget,
                    pickupLocation: job.pickupLocation,
                    deliveryLocation: job.deliveryLocation
                  }
                });

                // Update job to show it has applications
                await updateDoc(doc(db, 'shipments', job.id), {
                  hasApplications: true,
                  applicationCount: (job.applicationCount || 0) + 1
                });

                Alert.alert(
                  t('success'),
                  t('applicationSubmitted'),
                  [{ text: t('ok'), onPress: () => setShowJobDetails(false) }]
                );

                // Refresh jobs list
                loadAvailableJobs();
              } catch (error) {
                Alert.alert(t('error'), t('applicationFailed'));
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), t('applicationFailed'));
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#FF3B30';
      case 'standard': return '#FF9500';
      case 'flexible': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'urgent': return '🚨';
      case 'standard': return '⏰';
      case 'flexible': return '📅';
      default: return '⏱️';
    }
  };

  const renderJobCard = (job) => (
    <TouchableOpacity
      key={job.id}
      style={[styles.jobCard, isRTL && styles.rtlCard]}
      onPress={() => {
        setSelectedJob(job);
        setShowJobDetails(true);
      }}
    >
      {/* AI Matching Badge */}
      {job.matchingScore >= 80 && (
        <View style={styles.matchingBadge}>
          <Text style={styles.matchingText}>🤖 {job.matchingScore}% {t('match')}</Text>
        </View>
      )}

      {/* Job Header */}
      <View style={[styles.jobHeader, isRTL && styles.rtlRow]}>
        <View style={styles.jobInfo}>
          <Text style={[styles.jobTitle, isRTL && styles.rtlText]}>{job.title}</Text>
          <Text style={[styles.cargoType, isRTL && styles.rtlText]}>
            📦 {job.cargoType} • {job.weight}
          </Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(job.urgency) }]}>
          <Text style={styles.urgencyIcon}>{getUrgencyIcon(job.urgency)}</Text>
          <Text style={styles.urgencyText}>{t(job.urgency)}</Text>
        </View>
      </View>

      {/* Route Information */}
      <View style={[styles.routeSection, isRTL && styles.rtlContainer]}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>📍 {t('pickup')}:</Text>
          <Text style={[styles.routeLocation, isRTL && styles.rtlText]}>
            {job.pickupLocation}
          </Text>
        </View>
        <View style={styles.routeArrow}>
          <Text style={[styles.arrowText, isRTL && { transform: [{ scaleX: -1 }] }]}>→</Text>
        </View>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>🎯 {t('delivery')}:</Text>
          <Text style={[styles.routeLocation, isRTL && styles.rtlText]}>
            {job.deliveryLocation}
          </Text>
        </View>
      </View>

      {/* Job Details */}
      <View style={[styles.jobDetails, isRTL && styles.rtlRow]}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>💰</Text>
          <Text style={[styles.detailText, isRTL && styles.rtlText]}>
            ${job.budget}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📏</Text>
          <Text style={[styles.detailText, isRTL && styles.rtlText]}>
            {job.distance} km
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏱️</Text>
          <Text style={[styles.detailText, isRTL && styles.rtlText]}>
            {job.estimatedDuration}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⭐</Text>
          <Text style={[styles.detailText, isRTL && styles.rtlText]}>
            {job.ownerRating}
          </Text>
        </View>
      </View>

      {/* Posted Time */}
      <Text style={[styles.postedTime, isRTL && styles.rtlText]}>
        {t('posted')} {formatTimeAgo(job.createdAt)}
      </Text>
    </TouchableOpacity>
  );

  const renderJobDetailsModal = () => (
    <Modal
      visible={showJobDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowJobDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.jobDetailsModal, isRTL && styles.rtlContainer]}>
          {selectedJob && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
                <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                  {t('jobDetails')}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowJobDetails(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Job Summary */}
              <View style={styles.jobSummary}>
                <Text style={[styles.summaryTitle, isRTL && styles.rtlText]}>
                  {selectedJob.title}
                </Text>
                <Text style={[styles.summaryDescription, isRTL && styles.rtlText]}>
                  {selectedJob.description}
                </Text>
              </View>

              {/* Owner Information */}
              <View style={styles.ownerSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  👤 {t('cargoOwner')}
                </Text>
                <View style={[styles.ownerInfo, isRTL && styles.rtlContainer]}>
                  <Text style={[styles.ownerName, isRTL && styles.rtlText]}>
                    {selectedJob.ownerName}
                  </Text>
                  <View style={[styles.ownerRating, isRTL && styles.rtlRow]}>
                    <Text style={styles.ratingIcon}>⭐</Text>
                    <Text style={styles.ratingText}>{selectedJob.ownerRating}/5.0</Text>
                  </View>
                </View>
              </View>

              {/* Route Details */}
              <View style={styles.routeDetails}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🗺️ {t('routeDetails')}
                </Text>
                <View style={styles.routeDetailItem}>
                  <Text style={[styles.routeDetailLabel, isRTL && styles.rtlText]}>
                    📍 {t('pickupLocation')}:
                  </Text>
                  <Text style={[styles.routeDetailValue, isRTL && styles.rtlText]}>
                    {selectedJob.pickupLocation}
                  </Text>
                </View>
                <View style={styles.routeDetailItem}>
                  <Text style={[styles.routeDetailLabel, isRTL && styles.rtlText]}>
                    🎯 {t('deliveryLocation')}:
                  </Text>
                  <Text style={[styles.routeDetailValue, isRTL && styles.rtlText]}>
                    {selectedJob.deliveryLocation}
                  </Text>
                </View>
                <View style={styles.routeDetailItem}>
                  <Text style={[styles.routeDetailLabel, isRTL && styles.rtlText]}>
                    📏 {t('distance')}:
                  </Text>
                  <Text style={[styles.routeDetailValue, isRTL && styles.rtlText]}>
                    {selectedJob.distance} km
                  </Text>
                </View>
                <View style={styles.routeDetailItem}>
                  <Text style={[styles.routeDetailLabel, isRTL && styles.rtlText]}>
                    ⏱️ {t('estimatedTime')}:
                  </Text>
                  <Text style={[styles.routeDetailValue, isRTL && styles.rtlText]}>
                    {selectedJob.estimatedDuration}
                  </Text>
                </View>
              </View>

              {/* Payment & Terms */}
              <View style={styles.paymentSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  💰 {t('paymentTerms')}
                </Text>
                <View style={[styles.paymentInfo, isRTL && styles.rtlContainer]}>
                  <Text style={[styles.paymentAmount, isRTL && styles.rtlText]}>
                    ${selectedJob.budget}
                  </Text>
                  <Text style={[styles.paymentTerms, isRTL && styles.rtlText]}>
                    {t('paymentOnDelivery')}
                  </Text>
                </View>
              </View>

              {/* Requirements */}
              {selectedJob.requirements && (
                <View style={styles.requirementsSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    📋 {t('requirements')}
                  </Text>
                  {selectedJob.requirements.map((req, index) => (
                    <View key={index} style={[styles.requirementItem, isRTL && styles.rtlRow]}>
                      <Text style={styles.requirementIcon}>✓</Text>
                      <Text style={[styles.requirementText, isRTL && styles.rtlText]}>
                        {req}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* AI Insights */}
              <View style={styles.aiInsights}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🤖 {t('aiInsights')}
                </Text>
                <View style={styles.insightCard}>
                  <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                    📊 {t('matchScore')}: {selectedJob.matchingScore}%
                  </Text>
                  <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                    💰 {t('avgPayment')}: ${Math.round(selectedJob.budget / selectedJob.distance * 100)} {t('perKm')}
                  </Text>
                  <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                    ⚡ {t('routeOptimal')}: {t('goodRoute')}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Alert.alert(t('contactOwner'), t('contactFeatureComingSoon'))}
                >
                  <Text style={styles.contactButtonText}>
                    📞 {t('contactOwner')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => handleApplyForJob(selectedJob)}
                >
                  <Text style={styles.applyButtonText}>
                    ✅ {t('applyForJob')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.filtersModal, isRTL && styles.rtlContainer]}>
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('filters')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Cargo Type Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isRTL && styles.rtlText]}>
                📦 {t('cargoType')}
              </Text>
              <View style={[styles.filterOptions, isRTL && styles.rtlRow]}>
                {['all', 'Electronics', 'Food', 'Furniture', 'Clothing'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      filters.cargoType === type && styles.activeFilter
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, cargoType: type }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.cargoType === type && styles.activeFilterText
                    ]}>
                      {type === 'all' ? t('all') : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isRTL && styles.rtlText]}>
                📏 {t('maxDistance')}
              </Text>
              <View style={[styles.filterOptions, isRTL && styles.rtlRow]}>
                {['all', '50', '100', '200', '500'].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      styles.filterOption,
                      filters.distance === dist && styles.activeFilter
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, distance: dist }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.distance === dist && styles.activeFilterText
                    ]}>
                      {dist === 'all' ? t('all') : `${dist}km`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Budget Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isRTL && styles.rtlText]}>
                💰 {t('minBudget')}
              </Text>
              <View style={[styles.filterOptions, isRTL && styles.rtlRow]}>
                {['all', '100', '200', '300', '500'].map(budget => (
                  <TouchableOpacity
                    key={budget}
                    style={[
                      styles.filterOption,
                      filters.budget === budget && styles.activeFilter
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, budget: budget }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.budget === budget && styles.activeFilterText
                    ]}>
                      {budget === 'all' ? t('all') : `$${budget}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Urgency Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isRTL && styles.rtlText]}>
                ⏰ {t('urgency')}
              </Text>
              <View style={[styles.filterOptions, isRTL && styles.rtlRow]}>
                {['all', 'urgent', 'standard', 'flexible'].map(urgency => (
                  <TouchableOpacity
                    key={urgency}
                    style={[
                      styles.filterOption,
                      filters.urgency === urgency && styles.activeFilter
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, urgency: urgency }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.urgency === urgency && styles.activeFilterText
                    ]}>
                      {urgency === 'all' ? t('all') : t(urgency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.filterButtons, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilters({
                  cargoType: 'all',
                  distance: 'all',
                  budget: 'all',
                  urgency: 'all'
                });
              }}
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

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${diffMins} ${t('minutesAgo')}`;
    if (diffHours < 24) return `${diffHours} ${t('hoursAgo')}`;
    return date.toLocaleDateString();
  };

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
            {t('findJobs')}
          </Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, isRTL && styles.rtlContainer]}>
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder={t('searchJobs')}
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadAvailableJobs();
          }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Results Summary */}
        <View style={[styles.resultsHeader, isRTL && styles.rtlContainer]}>
          <Text style={[styles.resultsText, isRTL && styles.rtlText]}>
            {t('foundJobs')}: {filteredJobs.length}
          </Text>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortButtonText}>📊 {t('sortBy')}</Text>
          </TouchableOpacity>
        </View>

        {/* Jobs List */}
        <View style={styles.jobsList}>
          {filteredJobs.length > 0 ? (
            filteredJobs.map(renderJobCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                {t('noJobsFound')}
              </Text>
              <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                {t('tryAdjustingFilters')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderJobDetailsModal()}
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
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sortButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  jobsList: {
    gap: 15,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rtlCard: {
    direction: 'rtl',
  },
  matchingBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 1,
  },
  matchingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  jobInfo: {
    flex: 1,
    marginRight: 15,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cargoType: {
    fontSize: 14,
    color: '#666',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  urgencyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeSection: {
    marginBottom: 15,
  },
  routeItem: {
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  routeLocation: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  routeArrow: {
    alignItems: 'center',
    marginVertical: 5,
  },
  arrowText: {
    fontSize: 20,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  postedTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  jobDetailsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  filtersModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  jobSummary: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  ownerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  ownerInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ownerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  routeDetails: {
    marginBottom: 20,
  },
  routeDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  routeDetailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  routeDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentInfo: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  paymentTerms: {
    fontSize: 14,
    color: '#666',
  },
  requirementsSection: {
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  requirementIcon: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 10,
    width: 20,
  },
  requirementText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  aiInsights: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
  },
  insightText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Filter Modal Styles
  filtersContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeFilter: {
    backgroundColor: '#1B4965',
    borderColor: '#1B4965',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});