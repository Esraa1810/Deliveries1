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
  Modal,
  Animated
} from 'react-native';
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc } from '../firebase';

const { width } = Dimensions.get('window');

export default function TruckDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [driverStatus, setDriverStatus] = useState('available');
  const [sidebarAnimation] = useState(new Animated.Value(-250));
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    rating: 4.8,
    totalDistance: 0
  });

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setDriverStatus(data.status || 'available');
          setSelectedLanguage(data.language || 'EN');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const jobsRef = collection(db, 'jobs');
        const q = query(
          jobsRef, 
          where('driverId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const totalJobs = jobs.length;
        const activeJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'accepted').length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const totalEarnings = jobs
          .filter(j => j.status === 'completed')
          .reduce((sum, j) => sum + (j.earnings || 0), 0);
        const totalDistance = jobs
          .filter(j => j.status === 'completed')
          .reduce((sum, j) => sum + (j.distance || 0), 0);

        setStats({
          totalJobs,
          activeJobs,
          completedJobs,
          totalEarnings,
          totalDistance,
          rating: userData?.rating || 4.8
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? -250 : 0;
    setSidebarVisible(!sidebarVisible);
    
    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const updateDriverStatus = async (newStatus) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          status: newStatus,
          lastStatusUpdate: new Date()
        });
        setDriverStatus(newStatus);
        Alert.alert('Status Updated', `You are now ${newStatus}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const updateLanguage = async (lang) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          language: lang
        });
        setSelectedLanguage(lang);
        setLanguageMenuVisible(false);
        Alert.alert('Language Updated', `Language changed to ${lang}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update language. Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadDashboardStats();
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
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#27ae60';
      case 'busy': return '#f39c12';
      case 'offline': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const StatCard = ({ title, value, icon, color = '#1B4965', suffix = '' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}{suffix}</Text>
    </View>
  );

  const QuickActionCard = ({ title, description, icon, onPress, color = '#1B4965' }) => (
    <TouchableOpacity 
      style={[styles.actionCard, { borderColor: color }]} 
      onPress={onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={[styles.actionArrow, { color }]}>→</Text>
    </TouchableOpacity>
  );

  const SidebarMenu = () => (
    <Modal
      visible={sidebarVisible}
      transparent={true}
      animationType="none"
      onRequestClose={toggleSidebar}
    >
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={toggleSidebar}
        />
        <Animated.View style={[styles.sidebar, { left: sidebarAnimation }]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.sidebarUserName}>{userData?.name || 'Driver'}</Text>
                <Text style={styles.sidebarUserRole}>Professional Driver</Text>
                <View style={styles.sidebarRating}>
                  <Text style={styles.sidebarRatingIcon}>⭐</Text>
                  <Text style={styles.sidebarRatingText}>{stats.rating}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.sidebarContent}>
            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              // Stay on dashboard - no navigation needed
            }}>
              <Text style={styles.sidebarIcon}>📊</Text>
              <Text style={styles.sidebarItemText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              navigation.navigate('FindJobs');
            }}>
              <Text style={styles.sidebarIcon}>🔍</Text>
              <Text style={styles.sidebarItemText}>Find Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              navigation.navigate('ActiveJobs');
            }}>
              <Text style={styles.sidebarIcon}>🚛</Text>
              <Text style={styles.sidebarItemText}>Active Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              Alert.alert('Feature Coming Soon', 'Job history will be available soon!');
            }}>
              <Text style={styles.sidebarIcon}>📋</Text>
              <Text style={styles.sidebarItemText}>Job History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              navigation.navigate('Earnings');
            }}>
              <Text style={styles.sidebarIcon}>💰</Text>
              <Text style={styles.sidebarItemText}>Earnings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              navigation.navigate('VehicleManagement');
            }}>
              <Text style={styles.sidebarIcon}>🚚</Text>
              <Text style={styles.sidebarItemText}>My Vehicle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              Alert.alert('Feature Coming Soon', 'Document management will be available soon!');
            }}>
              <Text style={styles.sidebarIcon}>📄</Text>
              <Text style={styles.sidebarItemText}>Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              Alert.alert('Feature Coming Soon', 'Route tracking will be available soon!');
            }}>
              <Text style={styles.sidebarIcon}>🗺️</Text>
              <Text style={styles.sidebarItemText}>Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              navigation.navigate('DriverSettings');
            }}>
              <Text style={styles.sidebarIcon}>⚙️</Text>
              <Text style={styles.sidebarItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              Alert.alert('Feature Coming Soon', 'Support will be available soon!');
            }}>
              <Text style={styles.sidebarIcon}>🆘</Text>
              <Text style={styles.sidebarItemText}>Support</Text>
            </TouchableOpacity>

            <View style={styles.sidebarDivider} />

            <TouchableOpacity style={styles.sidebarItem} onPress={() => {
              toggleSidebar();
              handleSignOut();
            }}>
              <Text style={styles.sidebarIcon}>🚪</Text>
              <Text style={[styles.sidebarItemText, { color: '#e74c3c' }]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const LanguageMenu = () => (
    <Modal
      visible={languageMenuVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setLanguageMenuVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        onPress={() => setLanguageMenuVisible(false)}
      >
        <View style={styles.languageMenu}>
          <TouchableOpacity 
            style={[styles.languageItem, selectedLanguage === 'EN' && styles.selectedLanguageItem]} 
            onPress={() => updateLanguage('EN')}
          >
            <Text style={styles.languageFlag}>🇺🇸</Text>
            <Text style={styles.languageText}>English</Text>
            {selectedLanguage === 'EN' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.languageItem, selectedLanguage === 'ES' && styles.selectedLanguageItem]} 
            onPress={() => updateLanguage('ES')}
          >
            <Text style={styles.languageFlag}>🇪🇸</Text>
            <Text style={styles.languageText}>Español</Text>
            {selectedLanguage === 'ES' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.languageItem, selectedLanguage === 'FR' && styles.selectedLanguageItem]} 
            onPress={() => updateLanguage('FR')}
          >
            <Text style={styles.languageFlag}>🇫🇷</Text>
            <Text style={styles.languageText}>Français</Text>
            {selectedLanguage === 'FR' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.languageItem, selectedLanguage === 'DE' && styles.selectedLanguageItem]} 
            onPress={() => updateLanguage('DE')}
          >
            <Text style={styles.languageFlag}>🇩🇪</Text>
            <Text style={styles.languageText}>Deutsch</Text>
            {selectedLanguage === 'DE' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4965" />
      
      {/* Clean Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>TruckConnect</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => setLanguageMenuVisible(true)}
            >
              <Text style={styles.languageButtonText}>{selectedLanguage}</Text>
              <Text style={styles.languageIcon}>🌐</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('DriverSettings')}
            >
              <Text style={styles.editProfileIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{userData?.name || 'Driver'}</Text>
          <View style={styles.statusIndicatorRow}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(driverStatus) }]} />
              <Text style={styles.statusText}>{getStatusText(driverStatus)}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingIcon}>⭐</Text>
              <Text style={styles.ratingText}>{stats.rating}</Text>
            </View>
          </View>
        </View>

        {/* Driver Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[styles.statusButton, driverStatus === 'available' && styles.activeStatusButton]}
                onPress={() => updateDriverStatus('available')}
              >
                <Text style={[styles.statusButtonText, driverStatus === 'available' && styles.activeStatusButtonText]}>
                  Available
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusButton, driverStatus === 'busy' && styles.activeStatusButton]}
                onPress={() => updateDriverStatus('busy')}
              >
                <Text style={[styles.statusButtonText, driverStatus === 'busy' && styles.activeStatusButtonText]}>
                  Busy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusButton, driverStatus === 'offline' && styles.activeStatusButton]}
                onPress={() => updateDriverStatus('offline')}
              >
                <Text style={[styles.statusButtonText, driverStatus === 'offline' && styles.activeStatusButtonText]}>
                  Offline
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statusDescription}>
              {driverStatus === 'available' && "You're online and ready to accept new shipment requests."}
              {driverStatus === 'busy' && "You're currently handling deliveries and unavailable for new jobs."}
              {driverStatus === 'offline' && "You're offline and won't receive new job notifications."}
            </Text>
          </View>
        </View>

        {/* Dashboard Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Jobs"
              value={stats.totalJobs.toString()}
              icon="📋"
              color="#1B4965"
            />
            <StatCard
              title="Active Jobs"
              value={stats.activeJobs.toString()}
              icon="🚛"
              color="#f39c12"
            />
            <StatCard
              title="Completed"
              value={stats.completedJobs.toString()}
              icon="✅"
              color="#27ae60"
            />
            <StatCard
              title="Total Earnings"
              value={`$${stats.totalEarnings.toLocaleString()}`}
              icon="💰"
              color="#8e44ad"
            />
            <StatCard
              title="Distance Driven"
              value={stats.totalDistance.toLocaleString()}
              suffix=" miles"
              icon="🛣️"
              color="#3498db"
            />
            <StatCard
              title="Driver Rating"
              value={stats.rating.toString()}
              suffix="/5.0"
              icon="⭐"
              color="#f39c12"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <QuickActionCard
              title="Find Jobs"
              description="Browse available cargo shipments"
              icon="🔍"
              color="#1B4965"
              onPress={() => navigation.navigate('FindJobs')}
            />
            <QuickActionCard
              title="Load Scanner"
              description="Scan QR codes for pickup/delivery"
              icon="📷"
              color="#27ae60"
              onPress={() => Alert.alert('Feature Coming Soon', 'QR scanner will be available soon!')}
            />
            <QuickActionCard
              title="Fuel Tracker"
              description="Log fuel expenses and mileage"
              icon="⛽"
              color="#e67e22"
              onPress={() => navigation.navigate('VehicleManagement')}
            />
            <QuickActionCard
              title="Vehicle Inspection"
              description="Daily vehicle safety checklist"
              icon="🔧"
              color="#2c3e50"
              onPress={() => navigation.navigate('VehicleManagement')}
            />
          </View>
        </View>

        {/* Recent Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <View style={styles.jobsCard}>
            <View style={styles.jobsHeader}>
              <Text style={styles.jobsIcon}>📦</Text>
              <Text style={styles.jobsTitle}>No recent jobs</Text>
            </View>
            <Text style={styles.jobsDescription}>
              Start browsing available shipments to see your job history here.
            </Text>
            <TouchableOpacity 
              style={styles.jobsButton}
              onPress={() => navigation.navigate('FindJobs')}
            >
              <Text style={styles.jobsButtonText}>Find First Job</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={[styles.section, { marginBottom: 30 }]}>
          <Text style={styles.sectionTitle}>Need Assistance?</Text>
          <View style={styles.supportCard}>
            <Text style={styles.supportIcon}>🆘</Text>
            <Text style={styles.supportTitle}>Driver Support Center</Text>
            <Text style={styles.supportDescription}>
              Get help with jobs, payments, or technical issues anytime.
            </Text>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SidebarMenu />
      <LanguageMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1B4965',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  languageIcon: {
    fontSize: 14,
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileIcon: {
    fontSize: 18,
  },
  // Sidebar Styles
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    width: 250,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sidebarHeader: {
    backgroundColor: '#1B4965',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sidebarUserRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  sidebarRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sidebarRatingIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  sidebarRatingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sidebarIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  sidebarItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  // Language Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  languageMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedLanguageItem: {
    backgroundColor: '#f0f8ff',
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  languageText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeStatusButton: {
    backgroundColor: '#1B4965',
    borderColor: '#1B4965',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  activeStatusButtonText: {
    color: '#fff',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionArrow: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  jobsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
  jobsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobsIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  jobsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  jobsDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  jobsButton: {
    backgroundColor: '#1B4965',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  jobsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  supportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
  supportIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});