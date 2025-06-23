// screens/DriverNotificationsScreen.js - Notifications for Truck Drivers
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
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Services
import NotificationService from '../services/NotificationService';
import Job

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
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
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
  markAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#fff',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  notificationsSection: {
    marginBottom: 20,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftColor: '#1B4965',
    backgroundColor: '#F8F9FF',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#1B4965',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: 8,
    marginTop: 6,
  },
  applicationsSection: {
    marginBottom: 20,
  },
  applicationsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationJobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  applicationRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  applicationBid: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  applicationStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  applicationStatusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  applicationStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  applicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicationTime: {
    fontSize: 12,
    color: '#999',
  },
  viewJobButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewJobButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  notificationModal: {
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
  notificationDetails: {
    alignItems: 'center',
    marginBottom: 25,
  },
  notificationIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  notificationIconLargeText: {
    fontSize: 32,
  },
  notificationTitleLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  notificationBodyLarge: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 15,
  },
  notificationTimeLarge: {
    fontSize: 14,
    color: '#999',
  },
  additionalData: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  additionalDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dataKey: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
  },
  modalActions: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#1B4965',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});// screens/DriverNotificationsScreen.js - Notifications for Truck Drivers
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
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Services
import NotificationService from '../services/NotificationService';
import JobMatchingService from '../services/JobMatchingService';

// Firebase
import { auth } from '../firebase';

const { width } = Dimensions.get('window');

export default function DriverNotificationsScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' or 'applications'

  useEffect(() => {
    loadNotifications();
    loadApplications();
    
    // Set up real-time listeners
    const user = auth.currentUser;
    if (user) {
      const unsubscribeNotifications = NotificationService.subscribeToNotifications(
        user.uid, 
        (newNotifications) => {
          setNotifications(newNotifications);
          setUnreadCount(newNotifications.filter(n => !n.read).length);
          setLoading(false);
        }
      );

      const unsubscribeApplications = JobMatchingService.subscribeToDriverApplications(
        user.uid,
        (newApplications) => {
          setApplications(newApplications);
        }
      );

      return () => {
        if (unsubscribeNotifications) unsubscribeNotifications();
        if (unsubscribeApplications) unsubscribeApplications();
      };
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userNotifications = await NotificationService.getUserNotifications(user.uid);
        setNotifications(userNotifications);
        setUnreadCount(userNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadApplications = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const driverApplications = await JobMatchingService.getDriverApplications(user.uid);
        setApplications(driverApplications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleNotificationPress = async (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);

    // Mark as read if unread
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Handle notification actions based on type
    if (notification.type === 'job_accepted') {
      navigation.navigate('ActiveJobs');
    } else if (notification.type === 'job_application') {
      // Navigate to job details or applications
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await NotificationService.markAllAsRead(user.uid);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedToMarkAsRead'));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_application': return '📝';
      case 'job_accepted': return '🎉';
      case 'job_rejected': return '❌';
      case 'job_status': return '📦';
      case 'payment': return '💰';
      case 'message': return '💬';
      case 'driver_invitation': return '📩';
      case 'system': return '⚙️';
      case 'verification': return '✅';
      default: return '🔔';
    }
  };

  const getApplicationStatusColor = (status) => {
    switch (status) {
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9500';
      default: return '#9E9E9E';
    }
  };

  const getApplicationStatusIcon = (status) => {
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

  const renderNotificationCard = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadNotification,
        isRTL && styles.rtlCard
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={[styles.notificationHeader, isRTL && styles.rtlRow]}>
        <View style={styles.notificationIcon}>
          <Text style={styles.notificationIconText}>
            {getNotificationIcon(notification.type)}
          </Text>
        </View>
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !notification.read && styles.unreadTitle,
            isRTL && styles.rtlText
          ]}>
            {notification.title}
          </Text>
          <Text style={[styles.notificationBody, isRTL && styles.rtlText]} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={[styles.notificationTime, isRTL && styles.rtlText]}>
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderApplicationCard = (application) => (
    <View key={application.id} style={[styles.applicationCard, isRTL && styles.rtlCard]}>
      <View style={[styles.applicationHeader, isRTL && styles.rtlRow]}>
        <View style={styles.applicationInfo}>
          <Text style={[styles.applicationJobTitle, isRTL && styles.rtlText]}>
            {application.jobInfo?.title || 'Job Application'}
          </Text>
          <Text style={[styles.applicationRoute, isRTL && styles.rtlText]}>
            {application.jobInfo?.pickupLocation} → {application.jobInfo?.deliveryLocation}
          </Text>
          <Text style={[styles.applicationBid, isRTL && styles.rtlText]}>
            {t('yourBid')}: ${application.bidAmount?.toLocaleString() || 0}
          </Text>
        </View>
        <View style={[
          styles.applicationStatusBadge,
          { backgroundColor: getApplicationStatusColor(application.status) }
        ]}>
          <Text style={styles.applicationStatusIcon}>
            {getApplicationStatusIcon(application.status)}
          </Text>
          <Text style={styles.applicationStatusText}>
            {t(application.status)}
          </Text>
        </View>
      </View>

      <View style={[styles.applicationFooter, isRTL && styles.rtlRow]}>
        <Text style={[styles.applicationTime, isRTL && styles.rtlText]}>
          {t('submitted')}: {formatTimeAgo(application.submittedAt)}
        </Text>
        {application.status === 'accepted' && (
          <TouchableOpacity
            style={styles.viewJobButton}
            onPress={() => navigation.navigate('ActiveJobs')}
          >
            <Text style={styles.viewJobButtonText}>{t('viewJob')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNotificationModal = () => (
    <Modal
      visible={showNotificationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowNotificationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.notificationModal, isRTL && styles.rtlContainer]}>
          {selectedNotification && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
                <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                  {t('notificationDetails')}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowNotificationModal(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Notification Content */}
              <View style={styles.notificationDetails}>
                <View style={styles.notificationIconLarge}>
                  <Text style={styles.notificationIconLargeText}>
                    {getNotificationIcon(selectedNotification.type)}
                  </Text>
                </View>
                
                <Text style={[styles.notificationTitleLarge, isRTL && styles.rtlText]}>
                  {selectedNotification.title}
                </Text>
                
                <Text style={[styles.notificationBodyLarge, isRTL && styles.rtlText]}>
                  {selectedNotification.body}
                </Text>

                <Text style={[styles.notificationTimeLarge, isRTL && styles.rtlText]}>
                  {selectedNotification.createdAt?.toLocaleString()}
                </Text>
              </View>

              {/* Additional Data */}
              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <View style={styles.additionalData}>
                  <Text style={[styles.additionalDataTitle, isRTL && styles.rtlText]}>
                    {t('additionalInfo')}
                  </Text>
                  {Object.entries(selectedNotification.data).map(([key, value]) => (
                    <View key={key} style={[styles.dataRow, isRTL && styles.rtlRow]}>
                      <Text style={[styles.dataKey, isRTL && styles.rtlText]}>
                        {t(key) || key}:
                      </Text>
                      <Text style={[styles.dataValue, isRTL && styles.rtlText]}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                {selectedNotification.type === 'job_accepted' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setShowNotificationModal(false);
                      navigation.navigate('ActiveJobs');
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      🚛 {t('viewActiveJobs')}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {selectedNotification.type === 'driver_invitation' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setShowNotificationModal(false);
                      navigation.navigate('FindJobs');
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      🔍 {t('viewJob')}
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedNotification.type === 'payment' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setShowNotificationModal(false);
                      navigation.navigate('Earnings');
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      💰 {t('viewEarnings')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {t('notifications')}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
              <Text style={styles.markAllButtonText}>{t('markAllRead')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => setActiveTab('notifications')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'notifications' && styles.activeTabText,
              isRTL && styles.rtlText
            ]}>
              🔔 {t('notifications')}
              {unreadCount > 0 && (
                <Text style={styles.tabBadge}> ({unreadCount})</Text>
              )}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
            onPress={() => setActiveTab('applications')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'applications' && styles.activeTabText,
              isRTL && styles.rtlText
            ]}>
              📋 {t('myApplications')} ({applications.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
              loadApplications();
            }} 
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'notifications' ? (
          <>
            {notifications.length > 0 ? (
              <View style={styles.notificationsSection}>
                {notifications.map(renderNotificationCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔔</Text>
                <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                  {t('noNotifications')}
                </Text>
                <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                  {t('notificationsWillAppearHere')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {applications.length > 0 ? (
              <View style={styles.applicationsSection}>
                <View style={styles.applicationsSummary}>
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
                  <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
                    <Text style={styles.summaryNumber}>
                      {applications.filter(app => app.status === 'rejected').length}
                    </Text>
                    <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                      {t('rejected')}
                    </Text>
                  </View>
                </View>
                
                {applications.map(renderApplicationCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                  {t('noApplications')}
                </Text>
                <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                  {t('applyForJobsToSeeHere')}
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
          </>
        )}
      </ScrollView>

      {renderNotificationModal()}
    </View>
  );
}