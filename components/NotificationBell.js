// components/NotificationBell.js - Real-time Notification Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Services
import NotificationService from '../services/NotificationService';

// Firebase
import { auth } from '../firebase';

const { width } = Dimensions.get('window');

const NotificationBell = ({ navigation, style }) => {
  const { t, isRTL } = useLanguage();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bellAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Set up real-time listener
      const unsubscribe = NotificationService.subscribeToNotifications(
        user.uid,
        (newNotifications) => {
          setNotifications(newNotifications);
          const unread = newNotifications.filter(n => !n.read).length;
          
          // Animate bell if new notifications
          if (unread > unreadCount) {
            animateBell();
          }
          
          setUnreadCount(unread);
        }
      );

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const animateBell = () => {
    Animated.sequence([
      Animated.timing(bellAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellAnimation, {
        toValue: -1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setShowModal(false);

    // Navigate based on notification type
    switch (notification.type) {
      case 'job_application':
        if (navigation) {
          navigation.navigate('JobApplicationsScreen', {
            jobId: notification.data.jobId,
            jobTitle: notification.data.jobTitle || 'Job Applications'
          });
        }
        break;
      case 'job_accepted':
      case 'job_status':
        if (navigation) {
          navigation.navigate('ActiveJobs');
        }
        break;
      case 'payment':
        if (navigation) {
          navigation.navigate('Earnings');
        }
        break;
      case 'driver_invitation':
        if (navigation) {
          navigation.navigate('FindJobs');
        }
        break;
      default:
        // Default action or no action
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await NotificationService.markAllAsRead(user.uid);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
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

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification,
        isRTL && styles.rtlNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={[styles.notificationContent, isRTL && styles.rtlRow]}>
        <View style={styles.notificationIcon}>
          <Text style={styles.notificationIconText}>
            {getNotificationIcon(notification.type)}
          </Text>
        </View>
        
        <View style={styles.notificationText}>
          <Text style={[
            styles.notificationTitle,
            !notification.read && styles.unreadTitle,
            isRTL && styles.rtlText
          ]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[
            styles.notificationBody,
            isRTL && styles.rtlText
          ]} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        
        <View style={styles.notificationMeta}>
          <Text style={[styles.notificationTime, isRTL && styles.rtlText]}>
            {formatTimeAgo(notification.createdAt)}
          </Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNotificationModal = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.notificationModal, isRTL && styles.rtlContainer]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('notifications')}
              {unreadCount > 0 && (
                <Text style={styles.unreadBadge}> ({unreadCount})</Text>
              )}
            </Text>
            <View style={[styles.headerActions, isRTL && styles.rtlRow]}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={handleMarkAllAsRead}
                  disabled={loading}
                >
                  <Text style={styles.markAllButtonText}>
                    {loading ? '...' : t('markAllRead')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications List */}
          <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
            {notifications.length > 0 ? (
              notifications.map(renderNotificationItem)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔔</Text>
                <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                  {t('noNotifications')}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* View All Button */}
          {notifications.length > 5 && navigation && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('DriverNotifications'); // or CargoNotifications based on user type
              }}
            >
              <Text style={styles.viewAllButtonText}>
                {t('viewAllNotifications')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => setShowModal(true)}
      >
        <Animated.View
          style={[
            styles.bellContainer,
            {
              transform: [
                {
                  rotate: bellAnimation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {renderNotificationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bellButton: {
    padding: 8,
  },
  bellContainer: {
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
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
  rtlContainer: {
    direction: 'rtl',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  unreadBadge: {
    color: '#FF3B30',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllButton: {
    backgroundColor: '#1B4965',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  notificationsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  notificationItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1B4965',
  },
  rtlNotification: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderRightColor: '#1B4965',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 18,
  },
  notificationText: {
    flex: 1,
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#1B4965',
  },
  notificationBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  viewAllButton: {
    backgroundColor: '#1B4965',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default NotificationBell;