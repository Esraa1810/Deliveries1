// components/cargo/Dashboard/QuickActions.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const QuickActions = ({ onActionPress, isRTL = false }) => {
  const actions = [
    {
      id: 'create_shipment',
      title: 'Create Shipment',
      description: 'Post new cargo shipment',
      icon: '📦',
      color: '#1B4965',
    },
    {
      id: 'find_trucks',
      title: 'Find Trucks',
      description: 'Search available trucks',
      icon: '🚛',
      color: '#27ae60',
    },
    {
      id: 'track_shipments',
      title: 'Track Shipments',
      description: 'Monitor active deliveries',
      icon: '📍',
      color: '#3498db',
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'View payment history',
      icon: '💳',
      color: '#8e44ad',
    },
  ];

  const ActionCard = ({ action }) => (
    <TouchableOpacity 
      style={[styles.actionCard, isRTL && styles.rtlActionCard]} 
      onPress={() => onActionPress(action.id)}
    >
      <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
        <Text style={styles.actionIconText}>{action.icon}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, isRTL && styles.rtlText]}>
          {action.title}
        </Text>
        <Text style={[styles.actionDescription, isRTL && styles.rtlText]}>
          {action.description}
        </Text>
      </View>
      <Text style={[
        styles.actionArrow, 
        { color: action.color },
        isRTL && { transform: [{ scaleX: -1 }] }
      ]}>
        →
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  rtlContainer: {
    direction: 'rtl',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rtlActionCard: {
    flexDirection: 'row-reverse',
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
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default QuickActions;