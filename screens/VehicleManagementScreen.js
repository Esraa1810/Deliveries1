// screens/VehicleManagementScreen.js - Vehicle Profile & Maintenance
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
  getDoc,
  serverTimestamp,
  orderBy
} from '../firebase';

const { width } = Dimensions.get('window');

export default function VehicleManagementScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [inspectionData, setInspectionData] = useState(null);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showInspection, setShowInspection] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({});
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: '',
    description: '',
    cost: '',
    mileage: '',
    date: new Date()
  });
  const [fuelForm, setFuelForm] = useState({
    amount: '',
    cost: '',
    mileage: '',
    station: '',
    date: new Date()
  });

  useEffect(() => {
    loadVehicleData();
  }, []);

  const loadVehicleData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get vehicle information
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setVehicleData(userData.vehicle || getMockVehicleData());
        setEditForm(userData.vehicle || getMockVehicleData());
      }

      // Get maintenance records
      const maintenanceRef = collection(db, 'vehicleMaintenance');
      const maintenanceQuery = query(
        maintenanceRef,
        where('driverId', '==', user.uid),
        orderBy('date', 'desc')
      );
      
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const maintenance = maintenanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));

      // Get fuel records
      const fuelRef = collection(db, 'fuelRecords');
      const fuelQuery = query(
        fuelRef,
        where('driverId', '==', user.uid),
        orderBy('date', 'desc')
      );
      
      const fuelSnapshot = await getDocs(fuelQuery);
      const fuel = fuelSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));

      setMaintenanceRecords(maintenance.length > 0 ? maintenance : getMockMaintenanceRecords());
      setFuelRecords(fuel.length > 0 ? fuel : getMockFuelRecords());

      // Generate inspection data
      setInspectionData(generateInspectionData());

    } catch (error) {
      console.warn('Could not load vehicle data from Firestore:', error.message);
      // Use mock data if Firestore fails
      setVehicleData(getMockVehicleData());
      setEditForm(getMockVehicleData());
      setMaintenanceRecords(getMockMaintenanceRecords());
      setFuelRecords(getMockFuelRecords());
      setInspectionData(generateInspectionData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockVehicleData = () => ({
    make: 'Mercedes-Benz',
    model: 'Actros 1845',
    year: 2020,
    plateNumber: 'DXB-T-12345',
    vin: 'WDB9340341L123456',
    color: 'White',
    fuelType: 'Diesel',
    capacity: '26 tons',
    mileage: 145000,
    insuranceExpiry: new Date(2025, 11, 15),
    registrationExpiry: new Date(2025, 8, 30),
    lastService: new Date(2024, 4, 15),
    nextService: new Date(2024, 7, 15)
  });

  const getMockMaintenanceRecords = () => [
    {
      id: 'maint1',
      type: 'Oil Change',
      description: 'Engine oil and filter replacement',
      cost: 250,
      mileage: 144800,
      date: new Date(2024, 4, 15),
      serviceProvider: 'Al Habtoor Motors'
    },
    {
      id: 'maint2',
      type: 'Tire Replacement',
      description: 'Front tires replaced - Michelin XZE2+',
      cost: 800,
      mileage: 142000,
      date: new Date(2024, 2, 10),
      serviceProvider: 'Michelin Service Center'
    }
  ];

  const getMockFuelRecords = () => [
    {
      id: 'fuel1',
      amount: 280,
      cost: 350,
      mileage: 144950,
      station: 'ADNOC Station - Sheikh Zayed Road',
      date: new Date(),
      fuelEfficiency: 8.5
    },
    {
      id: 'fuel2',
      amount: 290,
      cost: 362,
      mileage: 144200,
      station: 'ENOC Station - Emirates Road',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      fuelEfficiency: 8.2
    }
  ];

  const generateInspectionData = () => ({
    lastInspection: new Date(2024, 3, 20),
    nextInspection: new Date(2024, 9, 20),
    status: 'Valid',
    items: [
      { name: 'Engine', status: 'Good', lastChecked: new Date(2024, 4, 15) },
      { name: 'Brakes', status: 'Good', lastChecked: new Date(2024, 4, 15) },
      { name: 'Tires', status: 'Excellent', lastChecked: new Date(2024, 2, 10) },
      { name: 'Lights', status: 'Good', lastChecked: new Date(2024, 4, 15) },
      { name: 'Exhaust', status: 'Fair', lastChecked: new Date(2024, 1, 5) }
    ]
  });

  const handleUpdateVehicle = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);
      
      await updateDoc(doc(db, 'users', user.uid), {
        vehicle: editForm,
        vehicleUpdatedAt: serverTimestamp()
      });

      setVehicleData(editForm);
      setShowEditVehicle(false);
      Alert.alert(t('success'), t('vehicleUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('vehicleUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async () => {
    try {
      if (!maintenanceForm.type || !maintenanceForm.cost) {
        Alert.alert(t('error'), t('fillRequiredFields'));
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);

      const newRecord = {
        ...maintenanceForm,
        driverId: user.uid,
        cost: parseFloat(maintenanceForm.cost),
        mileage: parseInt(maintenanceForm.mileage) || vehicleData.mileage,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'vehicleMaintenance'), newRecord);
      
      setMaintenanceRecords(prev => [{ id: Date.now().toString(), ...newRecord, date: new Date() }, ...prev]);
      setMaintenanceForm({ type: '', description: '', cost: '', mileage: '', date: new Date() });
      setShowAddMaintenance(false);
      Alert.alert(t('success'), t('maintenanceRecordAdded'));
    } catch (error) {
      Alert.alert(t('error'), t('maintenanceRecordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddFuel = async () => {
    try {
      if (!fuelForm.amount || !fuelForm.cost) {
        Alert.alert(t('error'), t('fillRequiredFields'));
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);

      const newRecord = {
        ...fuelForm,
        driverId: user.uid,
        amount: parseFloat(fuelForm.amount),
        cost: parseFloat(fuelForm.cost),
        mileage: parseInt(fuelForm.mileage) || vehicleData.mileage,
        fuelEfficiency: calculateFuelEfficiency(fuelForm.amount, fuelForm.mileage),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'fuelRecords'), newRecord);
      
      setFuelRecords(prev => [{ id: Date.now().toString(), ...newRecord, date: new Date() }, ...prev]);
      setFuelForm({ amount: '', cost: '', mileage: '', station: '', date: new Date() });
      setShowAddFuel(false);
      Alert.alert(t('success'), t('fuelRecordAdded'));
    } catch (error) {
      Alert.alert(t('error'), t('fuelRecordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const calculateFuelEfficiency = (amount, currentMileage) => {
    if (fuelRecords.length === 0) return 0;
    const lastRecord = fuelRecords[0];
    const distance = currentMileage - lastRecord.mileage;
    return distance > 0 ? (distance / amount).toFixed(1) : 0;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9500';
      case 'poor': return '#FF5722';
      default: return '#9E9E9E';
    }
  };

  const getExpiryStatus = (expiryDate) => {
    const now = new Date();
    const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', color: '#FF5722', text: t('expired') };
    if (diffDays <= 30) return { status: 'expiring', color: '#FF9500', text: `${diffDays} ${t('daysLeft')}` };
    return { status: 'valid', color: '#4CAF50', text: t('valid') };
  };

  const renderVehicleInfoCard = () => (
    <View style={styles.vehicleCard}>
      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          🚛 {t('vehicleInformation')}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditVehicle(true)}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.vehicleDetails}>
        <Text style={[styles.vehicleName, isRTL && styles.rtlText]}>
          {vehicleData.make} {vehicleData.model} ({vehicleData.year})
        </Text>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>{t('plateNumber')}:</Text>
            <Text style={[styles.detailValue, isRTL && styles.rtlText]}>{vehicleData.plateNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>{t('capacity')}:</Text>
            <Text style={[styles.detailValue, isRTL && styles.rtlText]}>{vehicleData.capacity}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>{t('mileage')}:</Text>
            <Text style={[styles.detailValue, isRTL && styles.rtlText]}>{vehicleData.mileage.toLocaleString()} km</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>{t('fuelType')}:</Text>
            <Text style={[styles.detailValue, isRTL && styles.rtlText]}>{vehicleData.fuelType}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderExpiryAlertsCard = () => {
    const insuranceStatus = getExpiryStatus(vehicleData.insuranceExpiry);
    const registrationStatus = getExpiryStatus(vehicleData.registrationExpiry);

    return (
      <View style={styles.alertsCard}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          ⚠️ {t('expiryAlerts')}
        </Text>
        
        <View style={styles.alertsList}>
          <View style={[styles.alertItem, isRTL && styles.rtlRow]}>
            <View style={styles.alertInfo}>
              <Text style={[styles.alertLabel, isRTL && styles.rtlText]}>{t('insurance')}</Text>
              <Text style={[styles.alertDate, isRTL && styles.rtlText]}>
                {vehicleData.insuranceExpiry.toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.alertStatus, { backgroundColor: insuranceStatus.color }]}>
              <Text style={styles.alertStatusText}>{insuranceStatus.text}</Text>
            </View>
          </View>
          
          <View style={[styles.alertItem, isRTL && styles.rtlRow]}>
            <View style={styles.alertInfo}>
              <Text style={[styles.alertLabel, isRTL && styles.rtlText]}>{t('registration')}</Text>
              <Text style={[styles.alertDate, isRTL && styles.rtlText]}>
                {vehicleData.registrationExpiry.toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.alertStatus, { backgroundColor: registrationStatus.color }]}>
              <Text style={styles.alertStatusText}>{registrationStatus.text}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderQuickActionsCard = () => (
    <View style={styles.actionsCard}>
      <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
        ⚡ {t('quickActions')}
      </Text>
      
      <View style={[styles.actionsGrid, isRTL && styles.rtlRow]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowAddMaintenance(true)}
        >
          <Text style={styles.actionIcon}>🔧</Text>
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>{t('addMaintenance')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowAddFuel(true)}
        >
          <Text style={styles.actionIcon}>⛽</Text>
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>{t('addFuel')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowInspection(true)}
        >
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>{t('inspection')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert(t('documents'), t('documentsFeatureComingSoon'))}
        >
          <Text style={styles.actionIcon}>📄</Text>
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>{t('documents')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMaintenanceCard = () => (
    <View style={styles.recordsCard}>
      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          🔧 {t('maintenanceHistory')}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddMaintenance(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      {maintenanceRecords.slice(0, 3).map(record => (
        <View key={record.id} style={[styles.recordItem, isRTL && styles.rtlRow]}>
          <View style={styles.recordInfo}>
            <Text style={[styles.recordType, isRTL && styles.rtlText]}>{record.type}</Text>
            <Text style={[styles.recordDescription, isRTL && styles.rtlText]}>{record.description}</Text>
            <Text style={[styles.recordDate, isRTL && styles.rtlText]}>
              {record.date.toLocaleDateString()} • {record.mileage.toLocaleString()} km
            </Text>
          </View>
          <Text style={[styles.recordCost, isRTL && styles.rtlText]}>
            ${record.cost}
          </Text>
        </View>
      ))}
      
      {maintenanceRecords.length > 3 && (
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>{t('viewAllMaintenance')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFuelCard = () => {
    const avgEfficiency = fuelRecords.length > 0
      ? fuelRecords.reduce((sum, record) => sum + (record.fuelEfficiency || 0), 0) / fuelRecords.length
      : 0;

    return (
      <View style={styles.recordsCard}>
        <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
          <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
            ⛽ {t('fuelTracking')}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddFuel(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.fuelStats}>
          <View style={styles.fuelStatItem}>
            <Text style={[styles.fuelStatLabel, isRTL && styles.rtlText]}>{t('avgEfficiency')}</Text>
            <Text style={[styles.fuelStatValue, isRTL && styles.rtlText]}>{avgEfficiency.toFixed(1)} km/L</Text>
          </View>
          <View style={styles.fuelStatItem}>
            <Text style={[styles.fuelStatLabel, isRTL && styles.rtlText]}>{t('monthlySpend')}</Text>
            <Text style={[styles.fuelStatValue, isRTL && styles.rtlText]}>
              ${fuelRecords.filter(r => r.date.getMonth() === new Date().getMonth())
                .reduce((sum, r) => sum + r.cost, 0).toFixed(0)}
            </Text>
          </View>
        </View>
        
        {fuelRecords.slice(0, 3).map(record => (
          <View key={record.id} style={[styles.recordItem, isRTL && styles.rtlRow]}>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordType, isRTL && styles.rtlText]}>
                {record.amount}L • ${record.cost}
              </Text>
              <Text style={[styles.recordDescription, isRTL && styles.rtlText]}>{record.station}</Text>
              <Text style={[styles.recordDate, isRTL && styles.rtlText]}>
                {record.date.toLocaleDateString()} • {record.mileage.toLocaleString()} km
              </Text>
            </View>
            <Text style={[styles.recordEfficiency, isRTL && styles.rtlText]}>
              {record.fuelEfficiency || 0} km/L
            </Text>
          </View>
        ))}
      </View>
    );
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
            {t('myVehicle')}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setRefreshing(true);
            loadVehicleData();
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
            loadVehicleData();
          }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {vehicleData && (
          <>
            {renderVehicleInfoCard()}
            {renderExpiryAlertsCard()}
            {renderQuickActionsCard()}
            {renderMaintenanceCard()}
            {renderFuelCard()}
          </>
        )}
      </ScrollView>

      {/* Edit Vehicle Modal */}
      <Modal
        visible={showEditVehicle}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditVehicle(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('editVehicle')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditVehicle(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('make')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={editForm.make}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, make: text }))}
                  placeholder={t('vehicleMake')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('model')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={editForm.model}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, model: text }))}
                  placeholder={t('vehicleModel')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('plateNumber')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={editForm.plateNumber}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, plateNumber: text }))}
                  placeholder={t('plateNumber')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('capacity')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={editForm.capacity}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, capacity: text }))}
                  placeholder={t('vehicleCapacity')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('currentMileage')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={editForm.mileage?.toString()}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, mileage: parseInt(text) || 0 }))}
                  placeholder={t('currentMileage')}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateVehicle}
              >
                <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Maintenance Modal */}
      <Modal
        visible={showAddMaintenance}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMaintenance(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('addMaintenance')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddMaintenance(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('maintenanceType')} *</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={maintenanceForm.type}
                  onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, type: text }))}
                  placeholder={t('oilChange')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('description')}</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, isRTL && styles.rtlText]}
                  value={maintenanceForm.description}
                  onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, description: text }))}
                  placeholder={t('maintenanceDescription')}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('cost')} *</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={maintenanceForm.cost}
                  onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, cost: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('mileage')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={maintenanceForm.mileage}
                  onChangeText={(text) => setMaintenanceForm(prev => ({ ...prev, mileage: text }))}
                  placeholder={vehicleData?.mileage?.toString()}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddMaintenance}
              >
                <Text style={styles.saveButtonText}>{t('addRecord')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Fuel Modal */}
      <Modal
        visible={showAddFuel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFuel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('addFuelRecord')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddFuel(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('fuelAmount')} (L) *</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={fuelForm.amount}
                  onChangeText={(text) => setFuelForm(prev => ({ ...prev, amount: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('totalCost')} *</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={fuelForm.cost}
                  onChangeText={(text) => setFuelForm(prev => ({ ...prev, cost: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('gasStation')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={fuelForm.station}
                  onChangeText={(text) => setFuelForm(prev => ({ ...prev, station: text }))}
                  placeholder={t('stationName')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t('currentMileage')}</Text>
                <TextInput
                  style={[styles.formInput, isRTL && styles.rtlText]}
                  value={fuelForm.mileage}
                  onChangeText={(text) => setFuelForm(prev => ({ ...prev, mileage: text }))}
                  placeholder={vehicleData?.mileage?.toString()}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddFuel}
              >
                <Text style={styles.saveButtonText}>{t('addRecord')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Inspection Modal */}
      <Modal
        visible={showInspection}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInspection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.inspectionModal, isRTL && styles.rtlContainer]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                {t('vehicleInspection')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInspection(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.inspectionContent}>
              {inspectionData && (
                <>
                  <View style={styles.inspectionSummary}>
                    <Text style={[styles.inspectionStatus, isRTL && styles.rtlText]}>
                      ✅ {t('inspectionStatus')}: {t(inspectionData.status.toLowerCase())}
                    </Text>
                    <Text style={[styles.inspectionDate, isRTL && styles.rtlText]}>
                      {t('lastInspection')}: {inspectionData.lastInspection.toLocaleDateString()}
                    </Text>
                    <Text style={[styles.inspectionDate, isRTL && styles.rtlText]}>
                      {t('nextInspection')}: {inspectionData.nextInspection.toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.inspectionItems}>
                    <Text style={[styles.inspectionItemsTitle, isRTL && styles.rtlText]}>
                      {t('inspectionItems')}
                    </Text>
                    {inspectionData.items.map((item, index) => (
                      <View key={index} style={[styles.inspectionItem, isRTL && styles.rtlRow]}>
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, isRTL && styles.rtlText]}>{t(item.name.toLowerCase())}</Text>
                          <Text style={[styles.itemChecked, isRTL && styles.rtlText]}>
                            {t('lastChecked')}: {item.lastChecked.toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={[
                          styles.itemStatus,
                          { backgroundColor: getStatusColor(item.status) }
                        ]}>
                          <Text style={styles.itemStatusText}>{t(item.status.toLowerCase())}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.scheduleInspectionButton}
                    onPress={() => Alert.alert(t('scheduleInspection'), t('inspectionSchedulingComingSoon'))}
                  >
                    <Text style={styles.scheduleInspectionText}>
                      📅 {t('scheduleInspection')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#1B4965',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  vehicleDetails: {},
  vehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 15,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  alertsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  alertInfo: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 14,
    color: '#666',
  },
  alertStatus: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  alertStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionButton: {
    width: (width - 70) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  recordsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  addButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recordInfo: {
    flex: 1,
  },
  recordType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recordDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  recordEfficiency: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  fuelStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  fuelStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fuelStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  fuelStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1B4965',
    fontWeight: '500',
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
  editModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  addModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 20,
  },
  inspectionModal: {
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
  editForm: {
    padding: 20,
  },
  addForm: {
    padding: 20,
  },
  inspectionContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inspectionSummary: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  inspectionStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  inspectionDate: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  inspectionItems: {
    marginBottom: 20,
  },
  inspectionItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inspectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemChecked: {
    fontSize: 12,
    color: '#666',
  },
  itemStatus: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  itemStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduleInspectionButton: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  scheduleInspectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});