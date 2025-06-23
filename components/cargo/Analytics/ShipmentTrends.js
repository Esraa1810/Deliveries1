// components/cargo/Analytics/ShipmentTrends.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width } = Dimensions.get('window');

const ShipmentTrends = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📈</Text>
        <Text style={styles.emptyText}>No shipment data available</Text>
      </View>
    );
  }

  const maxShipments = Math.max(...data.map(item => item.shipments));
  const chartWidth = width - 100; // Account for padding and axis
  const chartHeight = 120;

  const LineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = chartHeight - (item.shipments / maxShipments) * chartHeight;
      return { x, y, value: item.shipments, month: item.month };
    });

    // Create SVG-like path using View components (simplified line chart)
    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{maxShipments}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxShipments * 0.75)}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxShipments * 0.5)}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxShipments * 0.25)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chart}>
            {/* Grid Lines */}
            <View style={styles.gridLines}>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <View key={index} style={[styles.gridLine, { top: ratio * chartHeight }]} />
              ))}
            </View>
            
            {/* Data Points */}
            <View style={styles.dataContainer}>
              {points.map((point, index) => (
                <View key={index} style={styles.pointWrapper}>
                  <View style={styles.pointColumn}>
                    <View 
                      style={[
                        styles.dataPoint, 
                        { 
                          bottom: (point.value / maxShipments) * chartHeight,
                        }
                      ]} 
                    />
                    <Text style={styles.pointValue}>{point.value}</Text>
                  </View>
                  <Text style={styles.xAxisLabel}>{point.month}</Text>
                </View>
              ))}
              
              {/* Connecting Lines (simplified) */}
              {points.map((point, index) => {
                if (index === points.length - 1) return null;
                const nextPoint = points[index + 1];
                const lineHeight = Math.abs(nextPoint.y - point.y);
                const isGoingUp = nextPoint.y < point.y;
                
                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      styles.connectingLine,
                      {
                        left: point.x + 15,
                        top: isGoingUp ? nextPoint.y + 10 : point.y + 10,
                        width: nextPoint.x - point.x - 10,
                        height: Math.max(lineHeight, 2),
                        transform: [
                          { 
                            rotate: isGoingUp 
                              ? `-${Math.atan(lineHeight / (nextPoint.x - point.x)) * 180 / Math.PI}deg`
                              : `${Math.atan(lineHeight / (nextPoint.x - point.x)) * 180 / Math.PI}deg`
                          }
                        ],
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const totalShipments = data.reduce((sum, item) => sum + item.shipments, 0);
  const averageShipments = Math.round(totalShipments / data.length);
  const trend = data.length > 1 
    ? ((data[data.length - 1].shipments - data[0].shipments) / data[0].shipments) * 100 
    : 0;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Shipments</Text>
          <Text style={styles.summaryValue}>{totalShipments}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average</Text>
          <Text style={styles.summaryValue}>{averageShipments}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Trend</Text>
          <Text style={[
            styles.summaryValue,
            { color: trend >= 0 ? '#27ae60' : '#e74c3c' }
          ]}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      <LineChart />
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
    height: 180,
  },
  yAxisLabels: {
    width: 40,
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
    paddingVertical: 20,
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
  dataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
    position: 'relative',
  },
  pointWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  pointColumn: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  dataPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    position: 'absolute',
  },
  pointValue: {
    fontSize: 10,
    color: '#333',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  connectingLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3498db',
    opacity: 0.7,
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

export default ShipmentTrends;