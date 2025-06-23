// screens/ActiveJobsScreen.js - Current Job Management for Truck Drivers
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
  Dimensions,
  RefreshControl,
  Linking
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
  serverTimestamp,
  getDoc,
  orderBy
} from '../firebase';

const { width, height } = Dimensions.get('window');

export default function ActiveJobsScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  useEffect(() => {
    loadActiveJobs();
    // Set up real-time updates
    const interval = setInterval(loadActiveJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveJobs = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get jobs assigned to this driver
      const jobsRef = collection(db, 'jobApplications');
      const q = query(
        jobsRef,
        where('driverId', '==', user.uid),
        where('status', 'in', ['accepted', 'in_progress', 'picked_up', 'en_route']),
        orderBy('acceptedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const jobs = [];

      for (const docSnap of querySnapshot.docs) {
        const applicationData = docSnap.data();
        
        // Get the actual shipment details
        const shipmentDoc = await getDoc(doc(db, 'shipments', applicationData.jobId));
        if (shipmentDoc.exists()) {
          const shipmentData = shipmentDoc.data();
          
          jobs.push({
            id: docSnap.id,
            applicationId: docSnap.id,
            jobId: applicationData.jobId,
            ...applicationData,
            ...shipmentData,
            acceptedAt: applicationData.acceptedAt?.toDate() || new Date(),
            estimatedCompletion: new Date(Date.now() + 4 * 60 * 60 * 1000), // Mock 4 hours
            progress: calculateProgress(applicationData.status),
            currentLocation: generateCurrentLocation(applicationData.status)
          });
        }
      }

      setActiveJobs(jobs);
    } catch (error) {
      console.warn('Could not load active jobs from Firestore:', error.message);
      // Use mock data if Firestore fails
      setActiveJobs(getMockActiveJobs());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockActiveJobs = () => [
    {
      id: 'active1',
      jobId: 'job1',
      title: 'Electronics Delivery',
      cargoType: 'Electronics',
      pickupLocation: 'Dubai Mall, Dubai',
      deliveryLocation: 'Abu Dhabi Mall, Abu Dhabi',
      status: 'en_route',
      budget: 450,
      weight: '2 tons',
      acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000),
      progress: 65,
      currentLocation: 'Highway E11, near Al Shahama',
      cargoOwner: {
        name: 'Ahmed Electronics',
        phone: '+971-50-123-4567',
        rating: 4.8
      },
      instructions: 'Handle with care. Fragile items inside.',
      paymentMethod: 'Cash on Delivery'
    }
  ];

  const calculateProgress = (status) => {
    switch (status) {
      case 'accepted': return 25;
      case 'picked_up': return 50;
      case 'en_route': return 75;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  const generateCurrentLocation = (status) => {
    switch (status) {
      case 'accepted': return 'Heading to pickup location';
      case 'picked_up': return 'At pickup location';
      case 'en_route': return 'En route to destination';
      case 'delivered': return 'Delivered successfully';
      default: return 'Location updating...';
    }
  };

  const handleUpdateJobStatus = async (job, newStatus) => {
    try {
      Alert.alert(
        t('updateStatus'),
        `${t('updateStatusTo')} "${t(newStatus)}"?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('confirm'),
            onPress: async () => {
              setLoading(true);
              
              // Update job application status
              await updateDoc(doc(db, 'jobApplications', job.applicationId), {
                status: newStatus,
                lastUpdate: serverTimestamp(),
                [`${newStatus}At`]: serverTimestamp()
              });

              // Update shipment status if needed
              await updateDoc(doc(db, 'shipments', job.jobId), {
                status: newStatus,
                driverLocation: job.currentLocation,
                lastUpdate: serverTimestamp()
              });

              Alert.alert(t('success'), t('statusUpdated'));
              loadActiveJobs();
              setShowStatusUpdate(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), t('statusUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleContactCargoOwner = (cargoOwner) => {
    Alert.alert(
      t('contactCargoOwner'),
      cargoOwner.name,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('call'),
          onPress: () => {
            Linking.openURL(`tel:${cargoOwner.phone}`);
          }
        },
        {
          text: t('message'),
          onPress: () => {
            Alert.alert(t('message'), t('messagingFeatureComingSoon'));
          }
        }
      ]
    );
  };

  const handleNavigateToLocation = (location) => {
    Alert.alert(
      t('navigation'),
      `${t('navigateTo')} ${location}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('openMaps'),
          onPress: () => {
            const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
            Linking.openURL(url);
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#FF9500';
      case 'picked_up': return '#007AFF';
      case 'en_route': return '#34C759';
      case 'delivered': return '#30D158';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return '✅';
      case 'picked_up': return '📦';
      case 'en_route': return '🚛';
      case 'delivered': return '🎯';
      default: return '⏳';
    }
  };

  const getNextStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'accepted':
        return ['picked_up'];
      case 'picked_up':
        return ['en_route'];
      case 'en_route':
        return ['delivered'];
      default:
        return [];
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
      {/* Job Header */}
      <View style={[styles.jobHeader, isRTL && styles.rtlRow]}>
        <View style={styles.jobInfo}>
          <Text style={[styles.jobTitle, isRTL && styles.rtlText]}>
            {job.title}
          </Text>
          <Text style={[styles.cargoType, isRTL && styles.rtlText]}>
            📦 {job.cargoType} • {job.weight}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(job.status)}</Text>
          <Text style={styles.statusText}>{t(job.status)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressHeader, isRTL && styles.rtlRow]}>
          <Text style={[styles.progressLabel, isRTL && styles.rtlText]}>
            {t('progress')}
          </Text>
          <Text style={[styles.progressPercent, isRTL && styles.rtlText]}>
            {job.progress}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${job.progress}%`,
                backgroundColor: getStatusColor(job.status)
              }
            ]} 
          />
        </View>
      </View>

      {/* Route Information */}
      <View style={[styles.routeSection, isRTL && styles.rtlContainer]}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>📍 {t('from')}:</Text>
          <Text style={[styles.routeLocation, isRTL && styles.rtlText]}>
            {job.pickupLocation}
          </Text>
        </View>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>🎯 {t('to')}:</Text>
          <Text style={[styles.routeLocation, isRTL && styles.rtlText]}>
            {job.deliveryLocation}
          </Text>
        </View>
      </View>

      {/* Current Status */}
      <View style={[styles.currentStatus, isRTL && styles.rtlContainer]}>
        <Text style={[styles.currentStatusLabel, isRTL && styles.rtlText]}>
          📍 {t('currentLocation')}:
        </Text>
        <Text style={[styles.currentStatusValue, isRTL && styles.rtlText]}>
          {job.currentLocation}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => {
            setSelectedJob(job);
            setShowStatusUpdate(true);
          }}
        >
          <Text style={styles.statusButtonText}>📋 {t('updateStatus')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleContactCargoOwner(job.cargoOwner)}
        >
          <Text style={styles.contactButtonText}>📞 {t('contact')}</Text>
        </TouchableOpacity>
      </View>

      {/* Estimated Completion */}
      <Text style={[styles.estimatedTime, isRTL && styles.rtlText]}>
        ⏰ {t('estimatedCompletion')}: {job.estimatedCompletion.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
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
                <View style={[styles.summaryStatus, isRTL && styles.rtlRow]}>
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedJob.status) }]}>
                    <Text style={styles.statusIndicatorText}>{getStatusIcon(selectedJob.status)}</Text>
                  </View>
                  <Text style={[styles.statusIndicatorLabel, isRTL && styles.rtlText]}>
                    {t(selectedJob.status)}
                  </Text>
                </View>
              </View>

              {/* Cargo Owner Information */}
              <View style={styles.ownerSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  👤 {t('cargoOwner')}
                </Text>
                <View style={[styles.ownerCard, isRTL && styles.rtlContainer]}>
                  <View style={[styles.ownerInfo, isRTL && styles.rtlRow]}>
                    <View style={styles.ownerDetails}>
                      <Text style={[styles.ownerName, isRTL && styles.rtlText]}>
                        {selectedJob.cargoOwner.name}
                      </Text>
                      <Text style={[styles.ownerPhone, isRTL && styles.rtlText]}>
                        📞 {selectedJob.cargoOwner.phone}
                      </Text>
                      <View style={[styles.ownerRating, isRTL && styles.rtlRow]}>
                        <Text style={styles.ratingIcon}>⭐</Text>
                        <Text style={styles.ratingText}>{selectedJob.cargoOwner.rating}/5.0</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.callOwnerButton}
                      onPress={() => handleContactCargoOwner(selectedJob.cargoOwner)}
                    >
                      <Text style={styles.callOwnerText}>📞</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Route Timeline */}
              <View style={styles.timelineSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🗺️ {t('routeTimeline')}
                </Text>
                <View style={styles.timeline}>
                  {[
                    { status: 'accepted', label: t('jobAccepted'), time: selectedJob.acceptedAt },
                    { status: 'picked_up', label: t('cargoPickedUp'), time: new Date() },
                    { status: 'en_route', label: t('enRoute'), time: new Date() },
                    { status: 'delivered', label: t('delivered'), time: selectedJob.estimatedCompletion }
                  ].map((item, index) => (
                    <View key={index} style={[styles.timelineItem, isRTL && styles.rtlTimelineItem]}>
                      <View style={[
                        styles.timelineIcon,
                        {
                          backgroundColor: selectedJob.progress >= (index + 1) * 25 
                            ? getStatusColor(item.status) 
                            : '#E0E0E0'
                        }
                      ]}>
                        <Text style={styles.timelineIconText}>
                          {selectedJob.progress >= (index + 1) * 25 ? '✓' : (index + 1)}
                        </Text>
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineLabel, isRTL && styles.rtlText]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.timelineTime, isRTL && styles.rtlText]}>
                          {selectedJob.progress >= (index + 1) * 25 
                            ? item.time.toLocaleTimeString()
                            : t('pending')
                          }
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Navigation Section */}
              <View style={styles.navigationSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🧭 {t('navigation')}
                </Text>
                <View style={[styles.navigationButtons, isRTL && styles.rtlRow]}>
                  <TouchableOpacity
                    style={styles.navigationButton}
                    onPress={() => handleNavigateToLocation(selectedJob.pickupLocation)}
                  >
                    <Text style={styles.navigationButtonText}>
                      📍 {t('navigateToPickup')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navigationButton}
                    onPress={() => handleNavigateToLocation(selectedJob.deliveryLocation)}
                  >
                    <Text style={styles.navigationButtonText}>
                      🎯 {t('navigateToDelivery')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Job Instructions */}
              {selectedJob.instructions && (
                <View style={styles.instructionsSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    📋 {t('specialInstructions')}
                  </Text>
                  <View style={styles.instructionsCard}>
                    <Text style={[styles.instructionsText, isRTL && styles.rtlText]}>
                      {selectedJob.instructions}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Information */}
              <View style={styles.paymentSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  💰 {t('paymentInformation')}
                </Text>
                <View style={[styles.paymentCard, isRTL && styles.rtlContainer]}>
                  <View style={[styles.paymentRow, isRTL && styles.rtlRow]}>
                    <Text style={[styles.paymentLabel, isRTL && styles.rtlText]}>
                      {t('amount')}:
                    </Text>
                    <Text style={[styles.paymentAmount, isRTL && styles.rtlText]}>
                      ${selectedJob.budget}
                    </Text>
                  </View>
                  <View style={[styles.paymentRow, isRTL && styles.rtlRow]}>
                    <Text style={[styles.paymentLabel, isRTL && styles.rtlText]}>
                      {t('method')}:
                    </Text>
                    <Text style={[styles.paymentMethod, isRTL && styles.rtlText]}>
                      {selectedJob.paymentMethod || t('cashOnDelivery')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Emergency Actions */}
              <View style={styles.emergencySection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🚨 {t('emergencyActions')}
                </Text>
                <View style={[styles.emergencyButtons, isRTL && styles.rtlRow]}>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => Alert.alert(t('reportIssue'), t('issueReportingComingSoon'))}
                  >
                    <Text style={styles.emergencyButtonText}>
                      ⚠️ {t('reportIssue')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => Linking.openURL('tel:911')}
                  >
                    <Text style={styles.emergencyButtonText}>
                      🚨 {t('emergency')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderStatusUpdateModal = () => (
    <Modal
      visible={showStatusUpdate}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStatusUpdate(false)}
    >
      <View style={styles.statusModalOverlay}>
        <View style={[styles.statusUpdateModal, isRTL && styles.rtlContainer]}>
          <Text style={[styles.statusModalTitle, isRTL && styles.rtlText]}>
            {t('updateJobStatus')}
          </Text>
          
          {selectedJob && (
            <>
              <Text style={[styles.currentStatusText, isRTL && styles.rtlText]}>
                {t('currentStatus')}: {t(selectedJob.status)}
              </Text>
              
              <View style={styles.statusOptions}>
                {getNextStatusOptions(selectedJob.status).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, { backgroundColor: getStatusColor(status) }]}
                    onPress={() => handleUpdateJobStatus(selectedJob, status)}
                  >
                    <Text style={styles.statusOptionIcon}>{getStatusIcon(status)}</Text>
                    <Text style={styles.statusOptionText}>{t(status)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.cancelStatusButton}
                onPress={() => setShowStatusUpdate(false)}
              >
                <Text style={styles.cancelStatusText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
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
            {t('activeJobs')}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setRefreshing(true);
            loadActiveJobs();
          }}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadActiveJobs();
          }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeJobs.length > 0 ? (
          <>
            {/* Summary Stats */}
            <View style={styles.statsSection}>
              <Text style={[styles.statsTitle, isRTL && styles.rtlText]}>
                📊 {t('todaysProgress')}
              </Text>
              <View style={[styles.statsRow, isRTL && styles.rtlRow]}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{activeJobs.length}</Text>
                  <Text style={styles.statLabel}>{t('activeJobs')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>
                    {activeJobs.filter(j => j.status === 'delivered').length}
                  </Text>
                  <Text style={styles.statLabel}>{t('completed')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>
                    ${activeJobs.reduce((sum, job) => sum + job.budget, 0)}
                  </Text>
                  <Text style={styles.statLabel}>{t('earnings')}</Text>
                </View>
              </View>
            </View>

            {/* Active Jobs List */}
            <View style={styles.jobsSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                🚛 {t('yourActiveJobs')}
              </Text>
              {activeJobs.map(renderJobCard)}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
              {t('noActiveJobs')}
            </Text>
            <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {t('findJobsToStartWorking')}
            </Text>
            <TouchableOpacity
              style={styles.findJobsButton}
              onPress={() => navigation.navigate('FindJobs')}
            >
              <Text style={styles.findJobsButtonText}>
                🔍 {t('findJobs')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderJobDetailsModal()}
      {renderStatusUpdateModal()}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsSection: {
    marginBottom: 25,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  jobsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  jobCard: {
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
  rtlCard: {
    direction: 'rtl',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
    marginBottom: 3,
  },
  routeLocation: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  currentStatus: {
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  currentStatusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  currentStatusValue: {
    fontSize: 14,
    color: '#1B4965',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#1B4965',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  estimatedTime: {
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
    marginBottom: 20,
  },
  findJobsButton: {
    backgroundColor: '#1B4965',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  findJobsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 10,
  },
  summaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusIndicatorText: {
    fontSize: 14,
    color: '#fff',
  },
  statusIndicatorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerSection: {
    marginBottom: 20,
  },
  ownerCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
  },
  ownerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ownerPhone: {
    fontSize: 14,
    color: '#1B4965',
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
  callOwnerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callOwnerText: {
    fontSize: 18,
  },
  timelineSection: {
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  rtlTimelineItem: {
    flexDirection: 'row-reverse',
  },
  timelineIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  timelineIconText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
  navigationSection: {
    marginBottom: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  navigationButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  instructionsText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 15,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  emergencySection: {
    marginBottom: 20,
  },
  emergencyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Status Update Modal
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusUpdateModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  currentStatusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusOptions: {
    gap: 12,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
  },
  statusOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelStatusButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelStatusText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
});