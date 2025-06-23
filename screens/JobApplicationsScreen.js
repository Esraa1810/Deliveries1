// screens/JobApplicationsScreen.js - Manage Applications for Cargo Owners
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
  RefreshControl,
  Dimensions
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Services
import JobMatchingService from '../services/JobMatchingService';
import NotificationService from '../services/NotificationService';

// Firebase
import { auth } from '../firebase';

const { width } = Dimensions.get('window');

export default function JobApplicationsScreen({ navigation, route }) {
  const { t, isRTL } = useLanguage();
  const { jobId, jobTitle } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadApplications();
    
    // Set up real-time listener
    const unsubscribe = JobMatchingService.subscribeToJobApplications(jobId, (newApplications) => {
      setApplications(newApplications);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [jobId]);

  const loadApplications = async () => {
    try {
      const apps = await JobMatchingService.getJobApplications(jobId);
      setApplications(apps);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptApplication = async (application) => {
    Alert.alert(
      t('acceptApplication'),
      `${t('confirmAcceptDriver')} ${application.driverInfo?.name}?\n\n${t('bidAmount')}: $${application.bidAmount}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('accept'),
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await JobMatchingService.acceptJobApplication(application.id, jobId);
              
              if (result.success) {
                // Send notification to accepted driver
                await NotificationService.notifyJobAccepted(application.driverId, {
                  title: application.jobInfo?.title,
                  jobId: jobId,
                  applicationId: application.id
                });

                // Send rejection notifications to other drivers
                const otherApplications = applications.filter(app => 
                  app.id !== application.id && app.status === 'pending'
                );
                
                for (const app of otherApplications) {
                  await NotificationService.notifyJobRejected(app.driverId, {
                    title: app.jobInfo?.title,
                    jobId: jobId,
                    applicationId: app.id
                  }, 'Another driver was selected for this job.');
                }

                Alert.alert(
                  t('success'),
                  `${application.driverInfo?.name} ${t('hasBeenAssigned')}`,
                  [
                    {
                      text: t('viewJob'),
                      onPress: () => navigation.navigate('TrackShipments')
                    },
                    {
                      text: t('ok'),
                      onPress: () => setShowApplicationModal(false)
                    }
                  ]
                );
              } else {
                Alert.alert(t('error'), result.error || t('failedToAcceptApplication'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('failedToAcceptApplication'));
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectApplication = async (application) => {
    Alert.alert(
      t('rejectApplication'),
      `${t('confirmRejectDriver')} ${application.driverInfo?.name}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reject'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await JobMatchingService.rejectJobApplication(
                application.id, 
                'Cargo owner selected a different driver'
              );
              
              if (result.success) {
                // Send notification to rejected driver
                await NotificationService.notifyJobRejected(application.driverId, {
                  title: application.jobInfo?.title,
                  jobId: jobId,
                  applicationId: application.id
                }, 'Thank you for your interest. We selected a different driver for this shipment.');

                Alert.alert(t('success'), t('applicationRejected'));
                setShowApplicationModal(false);
              } else {
                Alert.alert(t('error'), result.error || t('failedToRejectApplication'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('failedToRejectApplication'));
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9500';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${diffMins}m ${t('ago')}`;
    if (diffHours < 24) return `${diffHours}h ${t('ago')}`;
    if (diffDays < 7) return `${diffDays}d ${t('ago')}`;
    return date.toLocaleDateString();
  };

  const renderApplicationCard = (application) => (
    <TouchableOpacity
      key={application.id}
      style={[styles.applicationCard, isRTL && styles.rtlCard]}
      onPress={() => {
        setSelectedApplication(application);
        setShowApplicationModal(true);
      }}
    >
      {/* Driver Info Header */}
      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, isRTL && styles.rtlText]}>
            {application.driverInfo?.name || 'Unknown Driver'}
          </Text>
          <View style={[styles.driverMeta, isRTL && styles.rtlRow]}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingIcon}>⭐</Text>
              <Text style={styles.ratingText}>
                {application.driverInfo?.rating || 4.5}
              </Text>
            </View>
            <Text style={styles.completedJobs}>
              • {application.driverInfo?.completedJobs || 0} {t('jobs')}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(application.status)}</Text>
          <Text style={styles.statusText}>{t(application.status)}</Text>
        </View>
      </View>

      {/* Bid Amount */}
      <View style={[styles.bidSection, isRTL && styles.rtlContainer]}>
        <Text style={[styles.bidLabel, isRTL && styles.rtlText]}>{t('bidAmount')}:</Text>
        <Text style={[styles.bidAmount, isRTL && styles.rtlText]}>
          ${application.bidAmount?.toLocaleString() || 0}
        </Text>
      </View>

      {/* Vehicle Info */}
      <View style={[styles.vehicleInfo, isRTL && styles.rtlContainer]}>
        <Text style={[styles.vehicleType, isRTL && styles.rtlText]}>
          🚛 {application.driverInfo?.vehicleType || 'Standard Truck'}
        </Text>
      </View>

      {/* Message Preview */}
      {application.message && (
        <View style={styles.messagePreview}>
          <Text style={[styles.messageText, isRTL && styles.rtlText]} numberOfLines={2}>
            "{application.message}"
          </Text>
        </View>
      )}

      {/* Time and Actions */}
      <View style={[styles.cardFooter, isRTL && styles.rtlRow]}>
        <Text style={[styles.submittedTime, isRTL && styles.rtlText]}>
          {formatTimeAgo(application.submittedAt)}
        </Text>
        {application.status === 'pending' && (
          <View style={[styles.quickActions, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.quickRejectButton}
              onPress={() => handleRejectApplication(application)}
            >
              <Text style={styles.quickRejectText}>❌</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAcceptButton}
              onPress={() => handleAcceptApplication(application)}
            >
              <Text style={styles.quickAcceptText}>✅</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderApplicationModal = () => (
    <Modal
      visible={showApplicationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowApplicationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.applicationModal, isRTL && styles.rtlContainer]}>
          {selectedApplication && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
                <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                  {t('applicationDetails')}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowApplicationModal(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Driver Profile */}
              <View style={styles.driverProfile}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {selectedApplication.driverInfo?.name?.charAt(0) || 'D'}
                  </Text>
                </View>
                <Text style={[styles.driverFullName, isRTL && styles.rtlText]}>
                  {selectedApplication.driverInfo?.name || 'Unknown Driver'}
                </Text>
                <View style={[styles.driverStats, isRTL && styles.rtlRow]}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⭐</Text>
                    <Text style={styles.statValue}>
                      {selectedApplication.driverInfo?.rating || 4.5}
                    </Text>
                    <Text style={styles.statLabel}>{t('rating')}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📋</Text>
                    <Text style={styles.statValue}>
                      {selectedApplication.driverInfo?.completedJobs || 0}
                    </Text>
                    <Text style={styles.statLabel}>{t('jobs')}</Text>
                  </View>
                </View>
              </View>

              {/* Bid Details */}
              <View style={styles.bidDetails}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  💰 {t('bidDetails')}
                </Text>
                <View style={styles.bidCard}>
                  <Text style={[styles.bidAmountLarge, isRTL && styles.rtlText]}>
                    ${selectedApplication.bidAmount?.toLocaleString() || 0}
                  </Text>
                  <Text style={[styles.bidDescription, isRTL && styles.rtlText]}>
                    {t('proposedAmount')}
                  </Text>
                </View>
              </View>

              {/* Vehicle Details */}
              <View style={styles.vehicleDetails}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  🚛 {t('vehicleDetails')}
                </Text>
                <View style={styles.vehicleCard}>
                  <Text style={[styles.vehicleTypeDetail, isRTL && styles.rtlText]}>
                    {selectedApplication.driverInfo?.vehicleType || 'Standard Truck'}
                  </Text>
                  <Text style={[styles.vehicleCapacity, isRTL && styles.rtlText]}>
                    {t('capacity')}: {selectedApplication.driverInfo?.capacity || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Message */}
              {selectedApplication.message && (
                <View style={styles.messageSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    💬 {t('driverMessage')}
                  </Text>
                  <View style={styles.messageCard}>
                    <Text style={[styles.messageFullText, isRTL && styles.rtlText]}>
                      "{selectedApplication.message}"
                    </Text>
                  </View>
                </View>
              )}

              {/* Application Timeline */}
              <View style={styles.timelineSection}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  📅 {t('applicationTimeline')}
                </Text>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIcon}>
                    <Text style={styles.timelineIconText}>📝</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, isRTL && styles.rtlText]}>
                      {t('applicationSubmitted')}
                    </Text>
                    <Text style={[styles.timelineTime, isRTL && styles.rtlText]}>
                      {selectedApplication.submittedAt?.toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                {selectedApplication.status !== 'pending' && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineIcon, { backgroundColor: getStatusColor(selectedApplication.status) }]}>
                      <Text style={styles.timelineIconText}>
                        {getStatusIcon(selectedApplication.status)}
                      </Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, isRTL && styles.rtlText]}>
                        {t(`application${selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}`)}
                      </Text>
                      <Text style={[styles.timelineTime, isRTL && styles.rtlText]}>
                        {(selectedApplication.acceptedAt || selectedApplication.rejectedAt)?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              {selectedApplication.status === 'pending' && (
                <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectApplication(selectedApplication)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.rejectButtonText}>
                      {actionLoading ? t('processing') : `❌ ${t('reject')}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptApplication(selectedApplication)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.acceptButtonText}>
                      {actionLoading ? t('processing') : `✅ ${t('accept')}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Contact Driver */}
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => {
                  Alert.alert(t('contactDriver'), t('messagingFeatureComingSoon'));
                }}
              >
                <Text style={styles.contactButtonText}>
                  📞 {t('contactDriver')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
              {t('jobApplications')}
            </Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
              {jobTitle}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setRefreshing(true);
            loadApplications();
          }}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadApplications} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Applications Summary */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
            <Text style={styles.summaryNumber}>{applications.length}</Text>
            <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
              {t('totalApplications')}
            </Text>
          </View>
          <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
            <Text style={styles.summaryNumber}>
              {applications.filter(app => app.status === 'pending').length}
            </Text>
            <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
              {t('pending')}
            </Text>
          </View>
          <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
            <Text style={styles.summaryNumber}>
              {applications.filter(app => app.status === 'accepted').length}
            </Text>
            <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
              {t('accepted')}
            </Text>
          </View>
        </View>

        {/* Applications List */}
        <View style={styles.applicationsSection}>
          {applications.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                📋 {t('allApplications')}
              </Text>
              {applications.map(renderApplicationCard)}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                {t('noApplicationsYet')}
              </Text>
              <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                {t('driversWillApplyForJob')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>


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
  headerInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
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
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  summaryCard: {
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
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  applicationsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  applicationCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  completedJobs: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  bidSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bidLabel: {
    fontSize: 14,
    color: '#666',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  vehicleInfo: {
    marginBottom: 10,
  },
  vehicleType: {
    fontSize: 14,
    color: '#333',
  },
  messagePreview: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submittedTime: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAcceptButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAcceptText: {
    fontSize: 16,
  },
  quickRejectButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickRejectText: {
    fontSize: 16,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  applicationModal: {
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
  driverProfile: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 20,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  driverFullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  driverStats: {
    flexDirection: 'row',
    gap: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  bidDetails: {
    marginBottom: 20,
  },
  bidCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  bidAmountLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  bidDescription: {
    fontSize: 14,
    color: '#2E7D32',
  },
  vehicleDetails: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 15,
  },
  vehicleTypeDetail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 5,
  },
  vehicleCapacity: {
    fontSize: 14,
    color: '#1B4965',
  },
  messageSection: {
    marginBottom: 20,
  },
  messageCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  messageFullText: {
    fontSize: 16,
    color: '#E65100',
    lineHeight: 22,
  },
  timelineSection: {
    marginBottom: 25,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  timelineIconText: {
    fontSize: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});