// screens/CargoDashboard.js - Simplified without Profile Tab
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

// Components
import ProfileEditModal from '../components/ProfileEditModal';

// Firebase
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from '../firebase';

const { width } = Dimensions.get('window');

export default function CargoDashboard({ navigation, route }) {
  const { t, isRTL } = useLanguage();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    completedShipments: 0,
    totalRevenue: 0
  });

  const [recentShipments, setRecentShipments] = useState([]);

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
  }, []);

  // Listen for refresh trigger from CreateShipmentScreen
  useEffect(() => {
    if (route?.params?.shouldRefresh) {
      console.log('Refreshing dashboard due to new shipment');
      loadDashboardStats();
      // Reset the param to prevent multiple refreshes
      navigation.setParams({ shouldRefresh: false });
    }
  }, [route?.params?.shouldRefresh]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ ...userDoc.data(), uid: user.uid });
          } else {
            // Use mock user data if Firestore doc doesn't exist
            setUserData({
              uid: user.uid,
              email: user.email,
              name: user.displayName || 'Cargo Owner',
              phone: '',
              companyName: '',
              businessType: '',
              address: '',
              city: '',
              country: 'UAE'
            });
          }
        } catch (firestoreError) {
          console.warn('Could not load user from Firestore, using mock data:', firestoreError.message);
          // Use the mock user data
          setUserData({
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Cargo Owner',
            phone: '',
            companyName: '',
            businessType: '',
            address: '',
            city: '',
            country: 'UAE'
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        // Query shipments for current user (simplified query without orderBy)
        const shipmentsRef = collection(db, 'shipments');
        const q = query(
          shipmentsRef, 
          where('ownerId', '==', user.uid)
          // Remove orderBy temporarily until index is created
        );
        
        const querySnapshot = await getDocs(q);
        const shipments = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          shipments.push({
            id: doc.id,
            ...data,
            // Convert Firestore timestamps to dates
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        });

        // Sort manually in JavaScript (since we can't use orderBy without index)
        shipments.sort((a, b) => b.createdAt - a.createdAt);

        // Calculate stats
        const totalShipments = shipments.length;
        const pendingShipments = shipments.filter(s => s.status === 'pending').length;
        const completedShipments = shipments.filter(s => s.status === 'delivered').length;
        const totalRevenue = shipments
          .filter(s => s.status === 'delivered')
          .reduce((sum, s) => sum + (s.budget || 0), 0);

        setStats({
          totalShipments,
          pendingShipments,
          completedShipments,
          totalRevenue
        });

        // Set recent shipments (limit to 5 for dashboard)
        setRecentShipments(shipments.slice(0, 5));

      } catch (firestoreError) {
        console.warn('Could not load shipments from Firestore:', firestoreError.message);
        // Use empty state for now
        setStats({
          totalShipments: 0,
          pendingShipments: 0,
          completedShipments: 0,
          totalRevenue: 0
        });
        setRecentShipments([]);
      }

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Alert.alert(t('error'), 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadDashboardStats();
  };

  const handleProfileUpdate = (updatedData) => {
    setUserData(prev => ({ ...prev, ...updatedData }));
  };

  const handleProfileMenuPress = () => {
    Alert.alert(
      'Profile Options',
      'Choose an action',
      [
        { text: 'Edit Profile', onPress: () => setShowProfileModal(true) },
        { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.replace('Register');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleCreateShipment = () => {
    navigation.navigate('CreateShipment');
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create_shipment':
        handleCreateShipment();
        break;
      case 'find_trucks':
        navigation.navigate('FindTrucks');
        break;
      case 'track_shipments':
        navigation.navigate('TrackShipments');
        break;
      case 'payments':
        navigation.navigate('Payments');
        break;
      default:
        Alert.alert('Feature Coming Soon', 'This feature will be available soon!');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9500';
      case 'in_transit':
        return '#007aff';
      case 'delivered':
        return '#34c759';
      default:
        return '#8e8e93';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'pending':
        return t('pending');
      case 'in_transit':
        return t('inTransit');
      case 'delivered':
        return t('delivered');
      default:
        return status;
    }
  };

  const renderStatsCards = () => (
    <View style={[styles.statsContainer, isRTL && styles.rtlContainer]}>
      <View style={[styles.statsRow, isRTL && styles.rtlRow]}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalShipments}</Text>
          <Text style={[styles.statLabel, isRTL && styles.rtlText]}>
            Total Shipments
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingShipments}</Text>
          <Text style={[styles.statLabel, isRTL && styles.rtlText]}>
            Pending
          </Text>
        </View>
      </View>
      
      <View style={[styles.statsRow, isRTL && styles.rtlRow]}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completedShipments}</Text>
          <Text style={[styles.statLabel, isRTL && styles.rtlText]}>
            Completed
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${stats.totalRevenue.toLocaleString()}</Text>
          <Text style={[styles.statLabel, isRTL && styles.rtlText]}>
            Total Revenue
          </Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={[styles.quickActionsContainer, isRTL && styles.rtlContainer]}>
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('create_shipment')}
      >
        <Text style={styles.quickActionIcon}>📦</Text>
        <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
          Create Shipment
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('find_trucks')}
      >
        <Text style={styles.quickActionIcon}>🚛</Text>
        <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
          Find Trucks
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('track_shipments')}
      >
        <Text style={styles.quickActionIcon}>📍</Text>
        <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
          Track Shipments
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('payments')}
      >
        <Text style={styles.quickActionIcon}>💳</Text>
        <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
          Payments
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentActivity = () => {
    if (recentShipments.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📦</Text>
          <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
            No Recent Activity
          </Text>
          <Text style={[styles.emptyStateDescription, isRTL && styles.rtlText]}>
            Create your first shipment to get started
          </Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={handleCreateShipment}
          >
            <Text style={styles.emptyStateButtonText}>
              Create First Shipment
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.activityContainer, isRTL && styles.rtlContainer]}>
        {recentShipments.map((shipment) => (
          <View key={shipment.id} style={[styles.activityItem, isRTL && styles.rtlActivityItem]}>
            <View style={[styles.activityHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.activityTitle, isRTL && styles.rtlText]}>
                {shipment.title || shipment.cargoType}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
                <Text style={styles.statusText}>{formatStatus(shipment.status)}</Text>
              </View>
            </View>
            
            <Text style={[styles.activityRoute, isRTL && styles.rtlText]}>
              {shipment.pickupLocation} → {shipment.deliveryLocation}
            </Text>
            
            <View style={[styles.activityFooter, isRTL && styles.rtlRow]}>
              <Text style={styles.activityValue}>${shipment.budget?.toLocaleString() || '0'}</Text>
              <Text style={styles.activityDate}>
                {shipment.createdAt?.toLocaleDateString() || 'Unknown date'}
              </Text>
            </View>
          </View>
        ))}
        
        {recentShipments.length >= 5 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setActiveTab('shipments')}
          >
            <Text style={[styles.viewAllText, isRTL && styles.rtlText]}>
              View All Shipments
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B4965" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <View style={styles.section}>
              {renderStatsCards()}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                Quick Actions
              </Text>
              {renderQuickActions()}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                Recent Activity
              </Text>
              {renderRecentActivity()}
            </View>
          </>
        );

      case 'analytics':
        return (
          <View style={styles.section}>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderTitle}>Analytics Dashboard</Text>
              <Text style={styles.placeholderText}>
                Revenue charts and shipment trends will be displayed here.
              </Text>
            </View>
          </View>
        );

      case 'shipments':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              All Shipments
            </Text>
            {recentShipments.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>📦</Text>
                <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                  No Shipments Yet
                </Text>
                <Text style={[styles.emptyStateDescription, isRTL && styles.rtlText]}>
                  Create your first shipment to get started.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={handleCreateShipment}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Create First Shipment
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.activityContainer, isRTL && styles.rtlContainer]}>
                {recentShipments.map((shipment) => (
                  <View key={shipment.id} style={[styles.activityItem, isRTL && styles.rtlActivityItem]}>
                    <View style={[styles.activityHeader, isRTL && styles.rtlRow]}>
                      <Text style={[styles.activityTitle, isRTL && styles.rtlText]}>
                        {shipment.title || shipment.cargoType}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
                        <Text style={styles.statusText}>{formatStatus(shipment.status)}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.activityRoute, isRTL && styles.rtlText]}>
                      {shipment.pickupLocation} → {shipment.deliveryLocation}
                    </Text>
                    
                    <Text style={[styles.activityDescription, isRTL && styles.rtlText]}>
                      {shipment.description}
                    </Text>
                    
                    <View style={[styles.activityFooter, isRTL && styles.rtlRow]}>
                      <Text style={styles.activityValue}>${shipment.budget?.toLocaleString() || '0'}</Text>
                      <Text style={styles.activityDate}>
                        {shipment.createdAt?.toLocaleDateString() || 'Unknown date'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isRTL && styles.rtlHeaderContent]}>
          <View style={isRTL && styles.rtlHeaderText}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userData?.name || 'Cargo Owner'}</Text>
            {userData?.companyName && (
              <Text style={styles.companyName}>{userData.companyName}</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <LanguageToggle style={styles.languageToggle} />
            <TouchableOpacity style={styles.profileButton} onPress={handleProfileMenuPress}>
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation - Removed Profile Tab */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'dashboard' && styles.activeTabText
            ]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'analytics' && styles.activeTabText
            ]}>
              Analytics
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shipments' && styles.activeTab]}
            onPress={() => setActiveTab('shipments')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'shipments' && styles.activeTabText
            ]}>
              Shipments
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreateShipment}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={userData}
        onUpdate={handleProfileUpdate}
      />
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
  header: {
    backgroundColor: '#1B4965',
    paddingTop: 50,
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rtlHeaderContent: {
    flexDirection: 'row-reverse',
  },
  rtlHeaderText: {
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageToggle: {
    marginRight: 10,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  companyName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  
  // Tab Navigation
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
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  // Stats Cards
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
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
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  
  // Recent Activity
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rtlActivityItem: {
    direction: 'rtl',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  activityRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  
  // Empty State
  emptyStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1B4965',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // View All Button
  viewAllButton: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewAllText: {
    color: '#1B4965',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Placeholder for Analytics
  placeholderContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});