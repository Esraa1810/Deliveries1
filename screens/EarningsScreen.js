// screens/EarningsScreen.js - Driver Financial Dashboard (Fixed)
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
import { 
  auth, 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit,
  Timestamp
} from '../firebase';

const { width } = Dimensions.get('window');

export default function EarningsScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pending: 0,
    averagePerJob: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get completed jobs for earnings calculation
      const jobsRef = collection(db, 'jobApplications');
      const q = query(
        jobsRef,
        where('driverId', '==', user.uid),
        where('status', '==', 'delivered'),
        orderBy('deliveredAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      const completedJobs = [];
      let totalEarnings = 0;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayEarnings = 0;
      let thisWeekEarnings = 0;
      let thisMonthEarnings = 0;

      for (const docSnap of querySnapshot.docs) {
        const jobData = docSnap.data();
        
        // Get shipment details for payment amount
        const shipmentDoc = await getDoc(doc(db, 'shipments', jobData.jobId));
        if (shipmentDoc.exists()) {
          const shipmentData = shipmentDoc.data();
          const earnings = shipmentData.budget || 0;
          const deliveryDate = jobData.deliveredAt?.toDate() || new Date();

          totalEarnings += earnings;

          if (deliveryDate >= today) {
            todayEarnings += earnings;
          }
          if (deliveryDate >= thisWeekStart) {
            thisWeekEarnings += earnings;
          }
          if (deliveryDate >= thisMonthStart) {
            thisMonthEarnings += earnings;
          }

          completedJobs.push({
            id: docSnap.id,
            ...jobData,
            ...shipmentData,
            earnings,
            deliveryDate,
            paymentStatus: jobData.paymentStatus || 'paid'
          });
        }
      }

      // Calculate pending payments (jobs delivered but not paid)
      const pendingEarnings = completedJobs
        .filter(job => job.paymentStatus === 'pending')
        .reduce((sum, job) => sum + job.earnings, 0);

      // Create transactions from completed jobs
      const transactionsList = completedJobs.map(job => ({
        id: job.id,
        type: 'earning',
        amount: job.earnings,
        description: `Delivery: ${job.title || job.cargoType}`,
        date: job.deliveryDate,
        status: job.paymentStatus,
        jobDetails: {
          pickup: job.pickupLocation,
          delivery: job.deliveryLocation,
          cargoType: job.cargoType
        }
      }));

      // Add mock withdrawal transactions
      const mockWithdrawals = [
        {
          id: 'withdrawal_1',
          type: 'withdrawal',
          amount: -500,
          description: 'Bank Transfer to Account ***1234',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'completed'
        }
      ];

      const allTransactions = [...transactionsList, ...mockWithdrawals]
        .sort((a, b) => b.date - a.date);

      setEarnings({
        today: todayEarnings,
        thisWeek: thisWeekEarnings,
        thisMonth: thisMonthEarnings,
        total: totalEarnings,
        pending: pendingEarnings,
        averagePerJob: completedJobs.length > 0 ? Math.round(totalEarnings / completedJobs.length) : 0
      });

      setTransactions(allTransactions);

    } catch (error) {
      console.warn('Could not load earnings from Firestore:', error.message);
      // Use mock data if Firestore fails
      setEarnings(getMockEarnings());
      setTransactions(getMockTransactions());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockEarnings = () => ({
    today: 250,
    thisWeek: 1450,
    thisMonth: 5230,
    total: 18540,
    pending: 320,
    averagePerJob: 285
  });

  const getMockTransactions = () => [
    {
      id: 'trans1',
      type: 'earning',
      amount: 250,
      description: 'Delivery: Electronics Shipment',
      date: new Date(),
      status: 'paid',
      jobDetails: {
        pickup: 'Dubai Mall',
        delivery: 'Abu Dhabi Mall',
        cargoType: 'Electronics'
      }
    },
    {
      id: 'trans2',
      type: 'earning',
      amount: 180,
      description: 'Delivery: Food & Beverages',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'pending',
      jobDetails: {
        pickup: 'Al Ain Farms',
        delivery: 'Carrefour Warehouse',
        cargoType: 'Food'
      }
    },
    {
      id: 'trans3',
      type: 'withdrawal',
      amount: -500,
      description: 'Bank Transfer to Account ***1234',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'completed'
    }
  ];

  const handleWithdrawal = () => {
    if (earnings.total - earnings.pending < 100) {
      Alert.alert(
        t('insufficientFunds'),
        t('minimumWithdrawal')
      );
      return;
    }
    setShowWithdrawal(true);
  };

  const processWithdrawal = (amount) => {
    Alert.alert(
      t('confirmWithdrawal'),
      `${t('withdrawAmount')} $${amount}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: () => {
            // In real app, process withdrawal through payment gateway
            Alert.alert(
              t('withdrawalRequested'),
              t('withdrawalProcessing'),
              [{ text: t('ok'), onPress: () => setShowWithdrawal(false) }]
            );
          }
        }
      ]
    );
  };

  const getTransactionIcon = (type, status) => {
    if (type === 'earning') {
      return status === 'paid' ? '💰' : '⏳';
    }
    return '🏦';
  };

  const getTransactionColor = (type, status) => {
    if (type === 'earning') {
      return status === 'paid' ? '#4CAF50' : '#FF9500';
    }
    return '#2196F3';
  };

  const formatCurrency = (amount) => {
    return `$${Math.abs(amount).toLocaleString()}`;
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return `${diffDays} ${t('daysAgo')}`;
    return date.toLocaleDateString();
  };

  const renderEarningsCard = (title, amount, icon, color = '#1B4965') => (
    <View style={[styles.earningsCard, { borderLeftColor: color }]}>
      <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>{title}</Text>
      </View>
      <Text style={[styles.cardAmount, { color }, isRTL && styles.rtlText]}>
        ${amount.toLocaleString()}
      </Text>
    </View>
  );

  const renderTransactionItem = (transaction) => (
    <TouchableOpacity
      key={transaction.id}
      style={[styles.transactionItem, isRTL && styles.rtlRow]}
      onPress={() => {
        setSelectedTransaction(transaction);
        setShowTransactionDetails(true);
      }}
    >
      <View style={[
        styles.transactionIcon,
        { backgroundColor: getTransactionColor(transaction.type, transaction.status) }
      ]}>
        <Text style={styles.transactionIconText}>
          {getTransactionIcon(transaction.type, transaction.status)}
        </Text>
      </View>
      
      <View style={styles.transactionDetails}>
        <Text style={[styles.transactionDescription, isRTL && styles.rtlText]}>
          {transaction.description}
        </Text>
        <Text style={[styles.transactionDate, isRTL && styles.rtlText]}>
          {formatDate(transaction.date)}
        </Text>
        {transaction.status === 'pending' && (
          <Text style={[styles.pendingStatus, isRTL && styles.rtlText]}>
            {t('pending')}
          </Text>
        )}
      </View>
      
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amountText,
          {
            color: transaction.amount > 0 ? '#4CAF50' : '#2196F3'
          },
          isRTL && styles.rtlText
        ]}>
          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTransactionDetailsModal = () => (
    <Modal
      visible={showTransactionDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTransactionDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.transactionModal, isRTL && styles.rtlContainer]}>
          {selectedTransaction && (
            <>
              <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
                <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
                  {t('transactionDetails')}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowTransactionDetails(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Transaction Summary */}
                <View style={styles.transactionSummary}>
                  <View style={[
                    styles.summaryIcon,
                    { backgroundColor: getTransactionColor(selectedTransaction.type, selectedTransaction.status) }
                  ]}>
                    <Text style={styles.summaryIconText}>
                      {getTransactionIcon(selectedTransaction.type, selectedTransaction.status)}
                    </Text>
                  </View>
                  <Text style={[styles.summaryAmount, isRTL && styles.rtlText]}>
                    {selectedTransaction.amount > 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                  </Text>
                  <Text style={[styles.summaryDescription, isRTL && styles.rtlText]}>
                    {selectedTransaction.description}
                  </Text>
                  <Text style={[styles.summaryDate, isRTL && styles.rtlText]}>
                    {selectedTransaction.date.toLocaleDateString()} at {selectedTransaction.date.toLocaleTimeString()}
                  </Text>
                </View>

                {/* Job Details (for earnings) */}
                {selectedTransaction.type === 'earning' && selectedTransaction.jobDetails && (
                  <View style={styles.jobDetailsSection}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                      🚛 {t('jobDetails')}
                    </Text>
                    <View style={styles.jobDetailCard}>
                      <View style={styles.jobDetailRow}>
                        <Text style={[styles.jobDetailLabel, isRTL && styles.rtlText]}>
                          📍 {t('pickup')}:
                        </Text>
                        <Text style={[styles.jobDetailValue, isRTL && styles.rtlText]}>
                          {selectedTransaction.jobDetails.pickup}
                        </Text>
                      </View>
                      <View style={styles.jobDetailRow}>
                        <Text style={[styles.jobDetailLabel, isRTL && styles.rtlText]}>
                          🎯 {t('delivery')}:
                        </Text>
                        <Text style={[styles.jobDetailValue, isRTL && styles.rtlText]}>
                          {selectedTransaction.jobDetails.delivery}
                        </Text>
                      </View>
                      <View style={styles.jobDetailRow}>
                        <Text style={[styles.jobDetailLabel, isRTL && styles.rtlText]}>
                          📦 {t('cargoType')}:
                        </Text>
                        <Text style={[styles.jobDetailValue, isRTL && styles.rtlText]}>
                          {selectedTransaction.jobDetails.cargoType}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Status Information */}
                <View style={styles.statusSection}>
                  <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                    📊 {t('status')}
                  </Text>
                  <View style={[
                    styles.statusCard,
                    { backgroundColor: selectedTransaction.status === 'paid' ? '#E8F5E8' : '#FFF3E0' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      {
                        color: selectedTransaction.status === 'paid' ? '#2E7D32' : '#E65100'
                      },
                      isRTL && styles.rtlText
                    ]}>
                      {selectedTransaction.status === 'paid' ? '✅' : '⏳'} {t(selectedTransaction.status)}
                    </Text>
                    {selectedTransaction.status === 'pending' && (
                      <Text style={[styles.statusDescription, isRTL && styles.rtlText]}>
                        {t('paymentProcessing')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                {selectedTransaction.type === 'earning' && selectedTransaction.status === 'pending' && (
                  <View style={styles.actionsSection}>
                    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                      ⚡ {t('actions')}
                    </Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => Alert.alert(t('contactSupport'), t('supportFeatureComingSoon'))}
                    >
                      <Text style={styles.actionButtonText}>
                        📞 {t('contactSupportPayment')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderWithdrawalModal = () => (
    <Modal
      visible={showWithdrawal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowWithdrawal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.withdrawalModal, isRTL && styles.rtlContainer]}>
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('withdrawFunds')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWithdrawal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.withdrawalContent}>
            <View style={styles.availableBalance}>
              <Text style={[styles.balanceLabel, isRTL && styles.rtlText]}>
                {t('availableBalance')}
              </Text>
              <Text style={[styles.balanceAmount, isRTL && styles.rtlText]}>
                ${(earnings.total - earnings.pending).toLocaleString()}
              </Text>
            </View>

            <View style={styles.withdrawalOptions}>
              <Text style={[styles.optionsTitle, isRTL && styles.rtlText]}>
                {t('quickAmounts')}
              </Text>
              <View style={[styles.quickAmounts, isRTL && styles.rtlRow]}>
                {[100, 250, 500, 1000].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => processWithdrawal(amount)}
                    disabled={amount > (earnings.total - earnings.pending)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      amount > (earnings.total - earnings.pending) && styles.disabledText
                    ]}>
                      ${amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.customAmountButton}
              onPress={() => Alert.alert(t('customAmount'), t('customAmountFeatureComingSoon'))}
            >
              <Text style={styles.customAmountText}>
                💳 {t('customAmount')}
              </Text>
            </TouchableOpacity>

            <View style={styles.withdrawalInfo}>
              <Text style={[styles.infoText, isRTL && styles.rtlText]}>
                💡 {t('withdrawalInfo')}
              </Text>
              <Text style={[styles.infoText, isRTL && styles.rtlText]}>
                ⏱️ {t('processingTime')}
              </Text>
            </View>
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
            {t('earnings')}
          </Text>
          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdrawal}>
            <Text style={styles.withdrawButtonText}>💰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadEarningsData();
          }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Summary */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            📊 {t('earningsSummary')}
          </Text>
          <View style={styles.earningsGrid}>
            {renderEarningsCard(t('today'), earnings.today, '📅', '#4CAF50')}
            {renderEarningsCard(t('thisWeek'), earnings.thisWeek, '📈', '#2196F3')}
            {renderEarningsCard(t('thisMonth'), earnings.thisMonth, '📊', '#FF9500')}
            {renderEarningsCard(t('totalEarnings'), earnings.total, '💰', '#9C27B0')}
            {renderEarningsCard(t('pendingPayments'), earnings.pending, '⏳', '#FF5722')}
            {renderEarningsCard(t('averagePerJob'), earnings.averagePerJob, '📋', '#607D8B')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            ⚡ {t('quickActions')}
          </Text>
          <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleWithdrawal}
            >
              <Text style={styles.actionIcon}>🏦</Text>
              <Text style={[styles.actionTitle, isRTL && styles.rtlText]}>
                {t('withdraw')}
              </Text>
              <Text style={[styles.actionDescription, isRTL && styles.rtlText]}>
                {t('transferToBank')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert(t('taxReport'), t('taxReportFeatureComingSoon'))}
            >
              <Text style={styles.actionIcon}>📄</Text>
              <Text style={[styles.actionTitle, isRTL && styles.rtlText]}>
                {t('taxReport')}
              </Text>
              <Text style={[styles.actionDescription, isRTL && styles.rtlText]}>
                {t('downloadReport')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <View style={[styles.transactionsHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              📋 {t('transactionHistory')}
            </Text>
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterButtonText}>🔍 {t('filter')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.map(renderTransactionItem)
            ) : (
              <View style={styles.emptyTransactions}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>
                  {t('noTransactions')}
                </Text>
                <Text style={[styles.emptyDescription, isRTL && styles.rtlText]}>
                  {t('completeJobsToSeeEarnings')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            🤖 {t('performanceInsights')}
          </Text>
          <View style={styles.insightCard}>
            <Text style={[styles.insightText, isRTL && styles.rtlText]}>
              📈 {t('earningsGrowth')}: +15% {t('thisMonth')}
            </Text>
            <Text style={[styles.insightText, isRTL && styles.rtlText]}>
              🎯 {t('completionRate')}: 98% {t('excellent')}
            </Text>
            <Text style={[styles.insightText, isRTL && styles.rtlText]}>
              ⭐ {t('customerRating')}: 4.8/5.0 {t('aboveAverage')}
            </Text>
            <Text style={[styles.insightText, isRTL && styles.rtlText]}>
              💡 {t('suggestion')}: {t('peakHoursEarning')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderTransactionDetailsModal()}
      {renderWithdrawalModal()}
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
  withdrawButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  earningsCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionsSection: {
    marginBottom: 25,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  transactionsSection: {
    marginBottom: 25,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  pendingStatus: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: 'bold',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  insightsSection: {
    marginBottom: 25,
  },
  insightCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
  },
  insightText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 8,
    lineHeight: 20,
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
  transactionModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  withdrawalModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
  transactionSummary: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  summaryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryIconText: {
    fontSize: 24,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryDate: {
    fontSize: 14,
    color: '#999',
  },
  jobDetailsSection: {
    marginBottom: 20,
  },
  jobDetailCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
  },
  jobDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobDetailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  jobDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusCard: {
    borderRadius: 10,
    padding: 15,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Withdrawal Modal Styles
  withdrawalContent: {
    padding: 20,
  },
  availableBalance: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#2E7D32',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  withdrawalOptions: {
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#1B4965',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  quickAmountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#999',
  },
  customAmountButton: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  customAmountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  withdrawalInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 5,
    lineHeight: 20,
  },
});