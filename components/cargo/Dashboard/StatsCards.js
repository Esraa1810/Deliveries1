// components/cargo/Dashboard/StatsCards.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const StatsCards = ({ stats, isRTL = false }) => {
  const StatCard = ({ title, value, icon, color = '#1B4965', percentage, isPositive = true }) => (
    <View style={[
      styles.statCard, 
      { borderLeftColor: color },
      isRTL && { borderLeftWidth: 0, borderRightWidth: 4, borderRightColor: color }
    ]}>
      <View style={[styles.statHeader, isRTL && styles.rtlStatHeader]}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statInfo}>
          <Text style={[styles.statTitle, isRTL && styles.rtlText]}>{title}</Text>
          {percentage && (
            <Text style={[
              styles.statPercentage,
              { color: isPositive ? '#27ae60' : '#e74c3c' }
            ]}>
              {isPositive ? '↗' : '↘'} {percentage}%
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.statValue, { color }, isRTL && styles.rtlText]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <View style={[styles.statsGrid, isRTL && styles.rtlStatsGrid]}>
        <StatCard
          title="Total Shipments"
          value={stats.totalShipments?.toString() || '0'}
          icon="📦"
          color="#1B4965"
          percentage="12.5"
          isPositive={true}
        />
        <StatCard
          title="Pending"
          value={stats.pendingShipments?.toString() || '0'}
          icon="⏳"
          color="#f39c12"
          percentage="8.2"
          isPositive={false}
        />
        <StatCard
          title="Completed"
          value={stats.completedShipments?.toString() || '0'}
          icon="✅"
          color="#27ae60"
          percentage="15.3"
          isPositive={true}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.totalRevenue?.toLocaleString() || '0'}`}
          icon="💰"
          color="#8e44ad"
          percentage="22.1"
          isPositive={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  rtlContainer: {
    direction: 'rtl',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  rtlStatsGrid: {
    flexDirection: 'row-reverse',
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rtlStatHeader: {
    flexDirection: 'row-reverse',
  },
  statIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  statPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default StatsCards;