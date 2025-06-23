// components/cargo/Analytics/RevenueChart.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width } = Dimensions.get('window');

const RevenueChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>No revenue data available</Text>
      </View>
    );
  }

  const maxRevenue = Math.max(...data.map(item => item.revenue));
  const chartWidth = width - 60; // Account for padding
  const barWidth = (chartWidth - (data.length - 1) * 10) / data.length; // 10px gap between bars

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const BarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.yAxisLabels}>
        <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue)}</Text>
        <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue * 0.75)}</Text>
        <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue * 0.5)}</Text>
        <Text style={styles.yAxisLabel}>{formatCurrency(maxRevenue * 0.25)}</Text>
        <Text style={styles.yAxisLabel}>$0</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          <View style={styles.gridLines}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => (
              <View key={index} style={[styles.gridLine, { top: ratio * 120 }]} />
            ))}
          </View>
          
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const barHeight = (item.revenue / maxRevenue) * 120;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: barHeight || 2,
                          width: Math.max(barWidth, 30),
                        }
                      ]} 
                    />
                    <Text style={styles.barValue}>
                      {formatCurrency(item.revenue)}
                    </Text>
                  </View>
                  <Text style={styles.xAxisLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const averageRevenue = totalRevenue / data.length;
  const growth = data.length > 1 
    ? ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100 
    : 0;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average</Text>
          <Text style={styles.summaryValue}>{formatCurrency(averageRevenue)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Growth</Text>
          <Text style={[
            styles.summaryValue,
            { color: growth >= 0 ? '#27ae60' : '#e74c3c' }
          ]}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      <BarChart />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
  },
  yAxisLabels: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  chart: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 120,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  barWrapper: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  barContainer: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#1B4965',
    borderRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 10,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default RevenueChart;