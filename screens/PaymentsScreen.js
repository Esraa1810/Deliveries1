// screens/PaymentsScreen.js - Financial Management & Analytics
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
  Dimensions
} from 'react-native';

// Language System
import { useLanguage } from '../contexts/LanguageContext';

// Firebase
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp } from '../firebase';

const { width } = Dimensions.get('window');

export default function PaymentsScreen({ navigation }) {
  const { t, isRTL, currentLanguage, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, transactions, analytics
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load user's transactions
      await loadTransactions(user.uid);
      generateAnalytics();
    } catch (error) {
      console.warn('Could not load payment data:', error.message);
      // Use mock data
      setTransactions(getMockTransactions());
      setAnalytics(getMockAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (userId) => {
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const userTransactions = [];
    querySnapshot.forEach((doc) => {
      userTransactions.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      });
    });

    // Add mock transactions if none exist
    if (userTransactions.length === 0) {
      userTransactions.push(...getMockTransactions());
    }

    setTransactions(userTransactions.sort((a, b) => b.createdAt - a.createdAt));
  };

  const getMockTransactions = () => [
    {
      id: 'txn1',
      type: 'payment',
      amount: 250.00,
      currency: 'USD',
      status: 'completed',
      description: 'Electronics Shipment - Dubai to Abu Dhabi',
      shipmentId: 'ship1',
      driverName: 'Ahmed Al-Mansouri',
      paymentMethod: 'credit_card',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fee: 7.50,
      netAmount: 242.50
    },
    {
      id: 'txn2',
      type: 'refund',
      amount: 75.00,
      currency: 'USD',
      status: 'pending',
      description: 'Partial refund for cancelled delivery',
      shipmentId: 'ship2',
      driverName: 'Mohammad Hassan',
      paymentMethod: 'bank_transfer',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fee: 0,
      netAmount: 75.00
    },
    {
      id: 'txn3',
      type: 'payment',
      amount: 180.00,
      currency: 'USD',
      status: 'completed',
      description: 'Furniture Delivery - Sharjah to Dubai',
      shipmentId: 'ship3',
      driverName: 'David Smith',
      paymentMethod: 'digital_wallet',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      fee: 5.40,
      netAmount: 174.60
    }
  ];

  const getMockAnalytics = () => ({
    totalSpent: 505.00,
    totalRefunds: 75.00,
    averageShipmentCost: 168.33,
    monthlySpending: [
      { month: 'Jan', amount: 320 },
      { month: 'Feb', amount: 450 },
      { month: 'Mar', amount: 280 },
      { month: 'Apr', amount: 390 },
      { month: 'May', amount: 505 },
      { month: 'Jun', amount: 0 }
    ],
    paymentMethodBreakdown: {
      credit_card: 60,
      bank_transfer: 25,
      digital_wallet: 15
    },
    costSavings: {
      aiOptimization: 45.20,
      bulkDiscount: 23.50,
      loyaltyBonus: 12.30
    }
  });

  const generateAnalytics = () => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);
    
    setAnalytics({
      totalSpent,
      totalRefunds,
      averageShipmentCost: completedTransactions.length > 0 ? totalSpent / completedTransactions.length : 0,
      ...getMockAnalytics()
    });
  };

  const handleMakePayment = async (transactionData) => {
    try {
      const user = auth.currentUser;
      const paymentDoc = {
        userId: user.uid,
        userEmail: user.email,
        type: 'payment',
        amount: transactionData.amount,
        currency: 'USD',
        status: 'completed',
        description: transactionData.description,
        paymentMethod: paymentMethod,
        createdAt: serverTimestamp(),
        fee: transactionData.amount * 0.03, // 3% processing fee
        netAmount: transactionData.amount * 0.97
      };

      await addDoc(collection(db, 'transactions'), paymentDoc);
      
      Alert.alert(
        t('success'),
        t('paymentProcessed'),
        [{ text: t('ok'), onPress: () => {
          setShowPaymentModal(false);
          loadPaymentData();
        }}]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(t('error'), t('paymentFailed'));
    }
  };

  const getTransactionIcon = (type, status) => {
    if (type === 'payment') {
      return status === 'completed' ? '✅' : '⏳';
    } else if (type === 'refund') {
      return status === 'completed' ? '💰' : '🔄';
    }
    return '💳';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9500';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const toggleLanguage = () => {
    const nextLanguage = currentLanguage === 'en' ? 'ar' : currentLanguage === 'ar' ? 'he' : 'en';
    changeLanguage(nextLanguage);
  };

  const renderOverviewTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Financial Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
          <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
            {t('totalSpent')}
          </Text>
          <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
            ${analytics.totalSpent?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.summaryChange, isRTL && styles.rtlText]}>
            +12% {t('thisMonth')}
          </Text>
        </View>

        <View style={[styles.summaryCard, isRTL && styles.rtlCard]}>
          <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
            {t('averageCost')}
          </Text>
          <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
            ${analytics.averageShipmentCost?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.summaryChange, styles.positive, isRTL && styles.rtlText]}>
            -8% {t('vs')} {t('lastMonth')}
          </Text>
        </View>
      </View>

      {/* AI Cost Optimization */}
      <View style={styles.aiOptimizationCard}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          🤖 {t('aiCostOptimization')}
        </Text>
        <View style={[styles.optimizationItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.optimizationLabel, isRTL && styles.rtlText]}>
            📊 {t('routeOptimization')}
          </Text>
          <Text style={styles.optimizationSaving}>
            -${analytics.costSavings?.aiOptimization || 0}
          </Text>
        </View>
        <View style={[styles.optimizationItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.optimizationLabel, isRTL && styles.rtlText]}>
            📦 {t('bulkShippingDiscount')}
          </Text>
          <Text style={styles.optimizationSaving}>
            -${analytics.costSavings?.bulkDiscount || 0}
          </Text>
        </View>
        <View style={[styles.optimizationItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.optimizationLabel, isRTL && styles.rtlText]}>
            ⭐ {t('loyaltyBonus')}
          </Text>
          <Text style={styles.optimizationSaving}>
            -${analytics.costSavings?.loyaltyBonus || 0}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('quickActions')}
        </Text>
        <View style={[styles.quickActions, isRTL && styles.rtlRow]}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowPaymentModal(true)}
          >
            <Text style={styles.quickActionIcon}>💳</Text>
            <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
              {t('makePayment')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={[styles.quickActionText, isRTL && styles.rtlText]}>
              {t('viewAnalytics')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.recentTransactions}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('recentTransactions')}
        </Text>
        {transactions.slice(0, 3).map(renderTransactionCard)}
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.viewAllText, isRTL && styles.rtlText]}>
            {t('viewAllTransactions')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTransactionsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.transactionsHeader}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('allTransactions')} ({transactions.length})
        </Text>
        {/* Filter options could go here */}
      </View>
      {transactions.map(renderTransactionCard)}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Spending Chart Placeholder */}
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, isRTL && styles.rtlText]}>
          📈 {t('monthlySpending')}
        </Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>{t('spendingChart')}</Text>
          {analytics.monthlySpending?.map((month, index) => (
            <View key={index} style={[styles.chartBar, isRTL && styles.rtlRow]}>
              <Text style={[styles.chartMonth, isRTL && styles.rtlText]}>
                {month.month}
              </Text>
              <View style={[styles.chartBarFill, { width: (month.amount / 500) * 200 }]} />
              <Text style={styles.chartAmount}>${month.amount}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Methods Breakdown */}
      <View style={styles.paymentMethodsCard}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          💳 {t('paymentMethodsUsage')}
        </Text>
        <View style={[styles.methodItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.methodLabel, isRTL && styles.rtlText]}>
            💳 {t('creditCard')}
          </Text>
          <Text style={styles.methodPercentage}>
            {analytics.paymentMethodBreakdown?.credit_card || 0}%
          </Text>
        </View>
        <View style={[styles.methodItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.methodLabel, isRTL && styles.rtlText]}>
            🏦 {t('bankTransfer')}
          </Text>
          <Text style={styles.methodPercentage}>
            {analytics.paymentMethodBreakdown?.bank_transfer || 0}%
          </Text>
        </View>
        <View style={[styles.methodItem, isRTL && styles.rtlRow]}>
          <Text style={[styles.methodLabel, isRTL && styles.rtlText]}>
            📱 {t('digitalWallet')}
          </Text>
          <Text style={styles.methodPercentage}>
            {analytics.paymentMethodBreakdown?.digital_wallet || 0}%
          </Text>
        </View>
      </View>

      {/* Financial Insights */}
      <View style={styles.insightsCard}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
          🧠 {t('financialInsights')}
        </Text>
        <View style={styles.insightItem}>
          <Text style={[styles.insightText, isRTL && styles.rtlText]}>
            💡 {t('peakSpendingDay')}: {t('tuesday')}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={[styles.insightText, isRTL && styles.rtlText]}>
            📈 {t('spendingTrend')}: +12% {t('thisMonth')}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={[styles.insightText, isRTL && styles.rtlText]}>
            🎯 {t('costSavingsOpportunity')}: -15% {t('withBulkBooking')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderTransactionCard = (transaction) => (
    <TouchableOpacity
      key={transaction.id}
      style={[styles.transactionCard, isRTL && styles.rtlCard]}
      onPress={() => {
        setSelectedTransaction(transaction);
        // Could open transaction details modal
      }}
    >
      <View style={[styles.transactionHeader, isRTL && styles.rtlRow]}>
        <View style={styles.transactionIcon}>
          <Text style={styles.transactionIconText}>
            {getTransactionIcon(transaction.type, transaction.status)}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, isRTL && styles.rtlText]}>
            {transaction.description}
          </Text>
          <Text style={[styles.transactionDate, isRTL && styles.rtlText]}>
            {transaction.createdAt.toLocaleDateString()} • {transaction.driverName}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[
            styles.transactionAmountText,
            { color: transaction.type === 'refund' ? '#4CAF50' : '#333' },
            isRTL && styles.rtlText
          ]}>
            {transaction.type === 'refund' ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
          <View style={[
            styles.transactionStatus,
            { backgroundColor: getStatusColor(transaction.status) }
          ]}>
            <Text style={styles.transactionStatusText}>
              {t(transaction.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.transactionDetails, isRTL && styles.rtlContainer]}>
        <Text style={[styles.transactionDetailText, isRTL && styles.rtlText]}>
          {t('paymentMethod')}: {t(transaction.paymentMethod)}
        </Text>
        {transaction.fee > 0 && (
          <Text style={[styles.transactionFee, isRTL && styles.rtlText]}>
            {t('processingFee')}: ${transaction.fee.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.paymentModal, isRTL && styles.rtlContainer]}>
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('makePayment')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Payment Amount */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                {t('amount')}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                placeholder="0.00"
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Payment Method Selection */}
            <View style={styles.paymentMethodSection}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                {t('paymentMethod')}
              </Text>
              <View style={styles.paymentMethods}>
                {['credit_card', 'bank_transfer', 'digital_wallet'].map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === method && styles.selectedPaymentMethod
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={styles.paymentMethodIcon}>
                      {method === 'credit_card' ? '💳' : 
                       method === 'bank_transfer' ? '🏦' : '📱'}
                    </Text>
                    <Text style={[
                      styles.paymentMethodText,
                      paymentMethod === method && styles.selectedPaymentMethodText,
                      isRTL && styles.rtlText
                    ]}>
                      {t(method)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={[styles.modalActions, isRTL && styles.rtlRow]}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleMakePayment({
                  amount: 100, // This would come from the input
                  description: 'Manual payment'
                })}
              >
                <Text style={styles.confirmButtonText}>{t('processPayment')}</Text>
              </TouchableOpacity>
            </View>
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
            {t('payments')}
          </Text>
          {/* Language Switch Button */}
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Text style={styles.languageButtonText}>
              {currentLanguage === 'en' ? 'EN' : currentLanguage === 'ar' ? 'عر' : 'עב'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {['overview', 'transactions', 'analytics'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
                isRTL && styles.rtlText
              ]}>
                {t(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </View>

      {renderPaymentModal()}
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
  rtlText: {
    textAlign: 'right',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlCard: {
    alignItems: 'flex-end',
  },
  rtlInput: {
    textAlign: 'right',
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
    paddingBottom: 20,
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
  languageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: 12,
    color: '#fff',
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
  content: {
    flex: 1,
    padding: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 5,
  },
  summaryChange: {
    fontSize: 12,
    color: '#FF6B35',
  },
  positive: {
    color: '#4CAF50',
  },
  aiOptimizationCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optimizationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optimizationLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  optimizationSaving: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  recentTransactions: {
    marginBottom: 20,
  },
  viewAllButton: {
    backgroundColor: '#1B4965',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsHeader: {
    marginBottom: 20,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  transactionDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionFee: {
    fontSize: 12,
    color: '#999',
  },
  chartContainer: {
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chartPlaceholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 20,
    minHeight: 200,
  },
  chartText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartMonth: {
    width: 40,
    fontSize: 14,
    color: '#666',
  },
  chartBarFill: {
    height: 20,
    backgroundColor: '#1B4965',
    borderRadius: 10,
    marginHorizontal: 10,
  },
  chartAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodsCard: {
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
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  methodLabel: {
    fontSize: 14,
    color: '#333',
  },
  methodPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  insightsCard: {
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
  insightItem: {
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paymentMethodSection: {
    marginBottom: 30,
  },
  paymentMethods: {
    marginTop: 10,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    borderColor: '#1B4965',
    backgroundColor: 'rgba(27, 73, 101, 0.1)',
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
  },
  selectedPaymentMethodText: {
    color: '#1B4965',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 0.48,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 0.48,
    backgroundColor: '#1B4965',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});