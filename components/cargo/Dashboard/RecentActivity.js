// components/cargo/Dashboard/RecentActivity.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

const RecentActivity = ({ 
  shipments = [], 
  onViewAll, 
  showAll = false, 
  isRTL = false 
}) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return '#27ae60';
      case 'in_transit':
      case 'active':
        return '#3498db';
      case 'pending':
        return '#f39c12';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return '✅';
      case 'in_transit':
      case 'active':
        return '🚛';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  const ShipmentItem = ({ shipment }) => (
    <TouchableOpacity style={[styles.shipmentItem, isRTL && styles.rtlShipmentItem]}>
      <View style={[styles.shipmentHeader, isRTL && styles.rtlShipmentHeader]}>
        <Text style={styles.statusIcon}>
          {getStatusIcon(shipment.status)}
        </Text>
        <View style={styles.shipmentInfo}>
          <Text style={[styles.shipmentRoute, isRTL && styles.rtlText]}>
            {shipment.from} → {shipment.to}
          </Text>
          <Text style={[styles.shipmentType, isRTL && styles.rtlText]}>
            {shipment.cargoType}
          </Text>
        </View>
        <View style={[styles.shipmentMeta, isRTL && styles.rtlShipmentMeta]}>
          <Text style={[
            styles.shipmentStatus,
            { backgroundColor: getStatusColor(shipment.status) + '20', color: getStatusColor(shipment.status) }
          ]}>
            {shipment.status.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.shipmentValue, isRTL && styles.rtlText]}>
            ${shipment.value?.toLocaleString() || '0'}
          </Text>
        </View>
      </View>
      <Text style={[styles.shipmentDate, isRTL && styles.rtlText]}>
        {formatDate(shipment.createdAt)}
      </Text>
    </TouchableOpacity>
  );

  const displayShipments = showAll ? shipments : shipments.slice(0, 3);

  if (!shipments || shipments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>
          No Recent Activity
        </Text>
        <Text style={[styles.emptyDescription, isRTL && styles.rtlText]}>
          Start by creating your first shipment to see activity here.
        </Text>
        <TouchableOpacity style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Create First Shipment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {displayShipments.map((shipment) => (
          <ShipmentItem key={shipment.id} shipment={shipment} />
        ))}
        
        {!showAll && shipments.length > 3 && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>
              View All Shipments ({shipments.length})
            </Text>
            <Text style={[styles.viewAllArrow, isRTL && { transform: [{ scaleX: -1 }] }]}>
              →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  rtlContainer: {
    direction: 'rtl',
  },
  shipmentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rtlShipmentItem: {
    direction: 'rtl',
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rtlShipmentHeader: {
    flexDirection: 'row-reverse',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shipmentType: {
    fontSize: 14,
    color: '#666',
  },
  shipmentMeta: {
    alignItems: 'flex-end',
  },
  rtlShipmentMeta: {
    alignItems: 'flex-start',
  },
  shipmentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
    textAlign: 'center',
    minWidth: 80,
  },
  shipmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4965',
  },
  shipmentDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 32,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewAllText: {
    fontSize: 14,
    color: '#1B4965',
    fontWeight: '600',
    marginRight: 8,
  },
  viewAllArrow: {
    fontSize: 16,
    color: '#1B4965',
    fontWeight: 'bold',
  },
  
  // Empty state
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
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
    marginBottom: 16,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#1B4965',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default RecentActivity;