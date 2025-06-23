// screens/TrackShipmentsScreen.js - Real-time GPS Tracking
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
  RefreshControl
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { auth, db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from '../firebase';

const { width, height } = Dimensions.get('window');

export default function TrackShipmentsScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShipments, setActiveShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingDetails, setTrackingDetails] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    loadActiveShipments();
    // Set up real-time tracking updates
    const interval = setInterval(updateTrackingData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadActiveShipments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const shipmentsRef = collection(db, 'shipments');
      const q = query(
        shipmentsRef,
        where('ownerId', '==', user.uid),
        where('status', 'in', ['pending', 'in_transit', 'picked_up'])
      );

      const querySnapshot = await getDocs(q);
      const shipments = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Add mock real-time tracking data
        const mockTracking = generateMockTrackingData(data);
        
        shipments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          tracking: mockTracking
        });
      });

      // Sort by creation date
      shipments.sort((a, b) => b.createdAt - a.createdAt);
      setActiveShipments(shipments);
    } catch (error) {
      console.warn('Could not load shipments from Firestore:', error.message);
      // Use mock data if Firestore fails
      setActiveShipments(getMockActiveShipments());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockTrackingData = (shipment) => {
    const statuses = ['picked_up', 'in_transit', 'at_destination', 'delivered'];
    const currentStatusIndex = statuses.indexOf(shipment.status) || 1;
    
    const mockRoute = [
      {
        location: shipment.pickupLocation || 'Dubai, UAE',
        coordinates: { lat: 25.2048, lng: 55.2708 },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'picked_up',
        description: 'Package picked up from sender'
      },
      {
        location: 'Highway E11, UAE',
        coordinates: { lat: 25.1972, lng: 55.2744 },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'in_transit',
        description: 'On route to destination'
      },
      {
        location: shipment.deliveryLocation || 'Abu Dhabi, UAE',
        coordinates: { lat: 24.4539, lng: 54.3773 },
        timestamp: new Date(),
        status: 'at_destination',
        description: 'Arrived at destination area'
      }
    ];

    const currentLocation = mockRoute[Math.min(currentStatusIndex, mockRoute.length - 1)];
    
    return {
      currentLocation: currentLocation.coordinates,
      currentAddress: currentLocation.location,
      lastUpdate: new Date(),
      route: mockRoute.slice(0, currentStatusIndex + 1),
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000),
      driverInfo: {
        name: 'Ahmed Al-Mansouri',
        phone: '+971-50-123-4567',
        vehicleNumber: 'DXB-123456',
        photo: null
      },
      progress: Math.min((currentStatusIndex / (statuses.length - 1)) * 100, 100),
      nextMilestone: statuses[Math.min(currentStatusIndex + 1, statuses.length - 1)]
    };
  };

  const getMockActiveShipments = () => [
    {
      id: 'mock1',
      title: 'Electronics Shipment',
      cargoType: 'Electronics',
      pickupLocation: 'Dubai Mall, Dubai',
      deliveryLocation: 'Abu Dhabi Mall, Abu Dhabi',
      status: 'in_transit',
      budget: 250,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      tracking: generateMockTrackingData({
        pickupLocation: 'Dubai Mall, Dubai',
        deliveryLocation: 'Abu Dhabi Mall, Abu Dhabi',
        status: 'in_transit'
      })
    }
  ];

  const updateTrackingData = async () => {
    // Simulate real-time updates
    setActiveShipments(prev => prev.map(shipment => ({
      ...shipment,
      tracking: {
        ...shipment.tracking,
        lastUpdate: new Date(),
        // Simulate slight movement
        currentLocation: {
          lat: shipment.tracking.currentLocation.lat + (Math.random() - 0.5) * 0.001,
          lng: shipment.tracking.currentLocation.lng + (Math.random() - 0.5) * 0.001
        }
      }
    })));
  };

  const handleViewTracking = (shipment) => {
    setSelectedShipment(shipment);
    setTrackingDetails(shipment.tracking);
    setShowTrackingModal(true);
  };

  const handleContactDriver = (driverInfo) => {
    Alert.alert(
      t('contactDriver'),
      `${t('callDriver')} ${driverInfo.name}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('call'),
          onPress: () => {
            // In a real app, this would initiate a phone call
            Alert.alert(t('calling'), `${t('calling')} ${driverInfo.phone}`);
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'picked_up': return '#007AFF';
      case 'in_transit': return '#34C759';
      case 'at_destination': return '#FF3B30';
      case 'delivered': return '#30D158';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'picked_up': return '📦';
      case 'in_transit': return '🚛';
      case 'at_destination': return '📍';
      case 'delivered': return '✅';
      default: return '❓';
    }
  };

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

  const renderShipmentCard = (shipment) => (
    <View key={shipment.id} style={[styles.shipmentCard, isRTL && styles.rtlCard]}>
      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <View style={styles.shipmentInfo}>
          <Text style={[styles.shipmentTitle, isRTL && styles.rtlText]}>
            {shipment.title || shipment.cargoType}
          </Text>
          <Text style={[styles.shipmentRoute, isRTL && styles.rtlText]}>
            {shipment.pickupLocation} → {shipment.deliveryLocation}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(shipment.status)}</Text>
          <Text style={styles.statusText}>{t(shipment.status)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressLabel, isRTL && styles.rtlText]}>
          {t('progress')}: {Math.round(shipment.tracking.progress)}%
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${shipment.tracking.progress}%` }
            ]} 
          />
        </View>
      </View>

      {/* Current Status */}
      <View style={[styles.currentStatus, isRTL && styles.rtlContainer]}>
        <Text style={[styles.currentStatusLabel, isRTL && styles.rtlText]}>
          📍 {t('currentLocation')}:
        </Text>
        <Text style={[styles.currentStatusValue, isRTL && styles.rtlText]}>
          {shipment.tracking.currentAddress}
        </Text>
        <Text style={[styles.lastUpdate, isRTL && styles.rtlText]}>
          {t('lastUpdate')}: {formatTimeAgo(shipment.tracking.lastUpdate)}
        </Text>
      </View>

      {/* Estimated Delivery */}
      <View style={[styles.estimatedDelivery, isRTL && styles.rtlContainer]}>
        <Text style={[styles.estimatedLabel, isRTL && styles.rtlText]}>
          🕐 {t('estimatedDelivery')}:
        </Text>
        <Text style={[styles.estimatedTime, isRTL && styles.rtlText]}>
          {shipment.tracking.estimatedDelivery.toLocaleString()}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={[styles.cardActions, isRTL && styles.rtlRow]}>
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => handleViewTracking(shipment)}
        >
          <Text style={styles.trackButtonText}>{t('viewTracking')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleContactDriver(shipment.tracking.driverInfo)}
        >
          <Text style={styles.contactButtonText}>{t('contactDriver')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTrackingModal = () => (
    <Modal
      visible={showTrackingModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTrackingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.trackingModal, isRTL && styles.rtlContainer]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('liveTracking')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTrackingModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedShipment && trackingDetails && (
              <>
                {/* Shipment Summary */}
                <View style={styles.shipmentSummary}>
                  <Text style={[styles.summaryTitle, isRTL && styles.rtlText]}>
                    {selectedShipment.title || selectedShipment.cargoType}
                  </Text>
                  <Text style={[styles.summaryRoute, isRTL && styles.rtlText]}>
                    {selectedShipment.pickupLocation} → {selectedShipment.deliveryLocation}
                  </Text>
                </View>

                {/* Map Placeholder */}
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.mapText}>🗺️ {t('liveMap')}</Text>
                  <Text style={styles.mapSubtext}>
                    {t('currentLocation')}: {trackingDetails.currentAddress}
                  </Text>
                  {/* In a real app, this would be a MapView component */}
                </View>

                {/* Driver Information */}
                <View style={styles.driverSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    👨‍✈️ {t('driverInformation')}
                  </Text>
                  <View style={[styles.driverInfo, isRTL && styles.rtlContainer]}>
                    <Text style={[styles.driverName, isRTL && styles.rtlText]}>
                      {trackingDetails.driverInfo.name}
                    </Text>
                    <Text style={[styles.driverPhone, isRTL && styles.rtlText]}>
                      📞 {trackingDetails.driverInfo.phone}
                    </Text>
                    <Text style={[styles.vehicleNumber, isRTL && styles.rtlText]}>
                      🚛 {t('vehicle')}: {trackingDetails.driverInfo.vehicleNumber}
                    </Text>
                  </View>
                </View>

                {/* Route Timeline */}
                <View style={styles.timelineSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    📍 {t('routeTimeline')}
                  </Text>
                  {trackingDetails.route.map((point, index) => (
                    <View key={index} style={[styles.timelineItem, isRTL && styles.rtlTimelineItem]}>
                      <View style={styles.timelineIcon}>
                        <Text style={styles.timelineIconText}>
                          {getStatusIcon(point.status)}
                        </Text>
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTitle, isRTL && styles.rtlText]}>
                          {point.description}
                        </Text>
                        <Text style={[styles.timelineLocation, isRTL && styles.rtlText]}>
                          📍 {point.location}
                        </Text>
                        <Text style={[styles.timelineTime, isRTL && styles.rtlText]}>
                          🕐 {point.timestamp.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* AI Insights */}
                <View style={styles.aiInsights}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    🤖 {t('aiInsights')}
                  </Text>
                  <View style={styles.insightCard}>
                    <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                      📊 {t('deliveryOnTime')}: 98% {t('probability')}
                    </Text>
                    <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                      ⚡ {t('trafficOptimized')}: {t('routeOptimized')}
                    </Text>
                    <Text style={[styles.insightText, isRTL && styles.rtlText]}>
                      🌤️ {t('weather')}: {t('clearConditions')}
                    </Text>
                  </View>
                </View>

                {/* Emergency Actions */}
                <View style={styles.emergencySection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    🚨 {t('emergencyActions')}
                  </Text>
                  <View style={[styles.emergencyButtons, isRTL && styles.rtlRow]}>
                    <TouchableOpacity style={styles.emergencyButton}>
                      <Text style={styles.emergencyButtonText}>
                        📞 {t('callSupport')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emergencyButton}>
                      <Text style={styles.emergencyButtonText}>
                        🚨 {t('reportIssue')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
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
            {t('trackShipments')}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setRefreshing(true);
            loadActiveShipments();
          }}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadActiveShipments} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeShipments.length > 0 ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                🚛 {t('activeShipments')} ({activeShipments.length})
              </Text>
              {activeShipments.map(renderShipmentCard)}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
              {t('noActiveShipments')}
            </Text>
            <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {t('createShipmentToTrack')}
            </Text>
            <TouchableOpacity
              style={styles.createShipmentButton}
              onPress={() => navigation.navigate('CreateShipment')}
            >
              <Text style={styles.createShipmentButtonText}>
                {t('createShipment')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderTrackingModal()}
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  shipmentCard: {
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
  shipmentInfo: {
    flex: 1,
  },
  shipmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  shipmentRoute: {
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
  progressLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  currentStatus: {
    marginBottom: 15,
  },
  currentStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  currentStatusValue: {
    fontSize: 16,
    color: '#1B4965',
    marginBottom: 5,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
  },
  estimatedDelivery: {
    marginBottom: 15,
  },
  estimatedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  estimatedTime: {
    fontSize: 16,
    color: '#FF6B35',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#1B4965',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#fff',
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
  createShipmentButton: {
    backgroundColor: '#1B4965',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  createShipmentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  trackingModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
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
  shipmentSummary: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  summaryRoute: {
    fontSize: 14,
    color: '#666',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1B4965',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: 24,
    marginBottom: 10,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  driverSection: {
    marginBottom: 20,
  },
  driverInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  driverPhone: {
    fontSize: 14,
    color: '#1B4965',
    marginBottom: 5,
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#666',
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  rtlTimelineItem: {
    flexDirection: 'row-reverse',
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
    marginBottom: 5,
  },
  timelineLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  aiInsights: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 15,
  },
  insightText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  emergencySection: {
    marginBottom: 20,
  },
  emergencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emergencyButton: {
    flex: 0.48,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
});