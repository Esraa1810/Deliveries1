// services/cargo/ShipmentService.js - Professional Shipment Management Service
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from '../firebase';
import { db, auth } from '../firebase';

class ShipmentService {
  constructor() {
    this.collection = 'shipments';
    this.shipmentsRef = collection(db, this.collection);
  }

  // Create new shipment
  async createShipment(shipmentData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Generate unique tracking number
      const trackingNumber = this.generateTrackingNumber();

      const shipment = {
        ...shipmentData,
        cargoOwnerId: user.uid,
        cargoOwnerEmail: user.email,
        trackingNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Professional fields
        estimatedCost: this.calculateEstimatedCost(shipmentData),
        priority: shipmentData.priority || 'standard',
        insuranceRequired: shipmentData.insuranceRequired || false,
        specialHandling: shipmentData.specialHandling || [],
        
        // Tracking fields
        statusHistory: [{
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Shipment created and posted'
        }],
        
        // Business fields
        businessCategory: shipmentData.businessCategory || 'general',
        seasonality: this.detectSeasonality(shipmentData),
        
        // Location analysis
        routeComplexity: this.analyzeRouteComplexity(shipmentData.pickup, shipmentData.delivery),
        estimatedDistance: await this.calculateDistance(shipmentData.pickup, shipmentData.delivery),
        estimatedDuration: await this.calculateDuration(shipmentData.pickup, shipmentData.delivery)
      };

      const docRef = await addDoc(this.shipmentsRef, shipment);
      
      // Send notification to nearby drivers
      this.notifyNearbyDrivers(shipment);
      
      return {
        success: true,
        id: docRef.id,
        shipment: { ...shipment, id: docRef.id },
        trackingNumber
      };
    } catch (error) {
      console.error('Error creating shipment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get user's shipments with advanced filtering
  async getUserShipments(filters = {}) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      let q = query(
        this.shipmentsRef,
        where('cargoOwnerId', '==', user.uid)
      );

      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }

      if (filters.dateRange) {
        // Add date range filtering
        q = query(q, where('createdAt', '>=', filters.dateRange.start));
        q = query(q, where('createdAt', '<=', filters.dateRange.end));
      }

      // Add ordering
      const orderField = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      q = query(q, orderBy(orderField, orderDirection));

      // Add limit
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const shipments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        shipments,
        count: shipments.length
      };
    } catch (error) {
      console.error('Error fetching shipments:', error);
      return {
        success: false,
        error: error.message,
        shipments: []
      };
    }
  }

  // Update shipment status with history tracking
  async updateShipmentStatus(shipmentId, newStatus, note = '') {
    try {
      const shipmentRef = doc(db, this.collection, shipmentId);
      const shipmentDoc = await getDoc(shipmentRef);
      
      if (!shipmentDoc.exists()) {
        throw new Error('Shipment not found');
      }

      const currentData = shipmentDoc.data();
      const newStatusEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        note
      };

      await updateDoc(shipmentRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: [...(currentData.statusHistory || []), newStatusEntry]
      });

      return {
        success: true,
        message: 'Status updated successfully'
      };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Professional analytics methods
  async getShipmentAnalytics(timeframe = '30d') {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const startDate = this.getStartDate(timeframe);
      const q = query(
        this.shipmentsRef,
        where('cargoOwnerId', '==', user.uid),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const shipments = querySnapshot.docs.map(doc => doc.data());

      return this.calculateAnalytics(shipments);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Calculate comprehensive analytics
  calculateAnalytics(shipments) {
    const total = shipments.length;
    const completed = shipments.filter(s => s.status === 'delivered').length;
    const pending = shipments.filter(s => s.status === 'pending').length;
    const inProgress = shipments.filter(s => s.status === 'in_transit' || s.status === 'picked_up').length;
    const cancelled = shipments.filter(s => s.status === 'cancelled').length;

    const totalRevenue = shipments
      .filter(s => s.status === 'delivered')
      .reduce((sum, s) => sum + (s.actualCost || s.estimatedCost || 0), 0);

    const averageValue = total > 0 ? shipments.reduce((sum, s) => sum + (s.cargoValue || 0), 0) / total : 0;
    const averageCost = total > 0 ? shipments.reduce((sum, s) => sum + (s.estimatedCost || 0), 0) / total : 0;

    // Advanced metrics
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const averageDeliveryTime = this.calculateAverageDeliveryTime(shipments.filter(s => s.status === 'delivered'));
    const topRoutes = this.getTopRoutes(shipments);
    const monthlyTrends = this.getMonthlyTrends(shipments);
    const priorityDistribution = this.getPriorityDistribution(shipments);

    return {
      overview: {
        total,
        completed,
        pending,
        inProgress,
        cancelled,
        totalRevenue,
        averageValue,
        averageCost,
        completionRate
      },
      performance: {
        averageDeliveryTime,
        onTimeDeliveryRate: this.calculateOnTimeRate(shipments),
        customerSatisfaction: this.calculateSatisfactionScore(shipments)
      },
      insights: {
        topRoutes,
        monthlyTrends,
        priorityDistribution,
        busyDays: this.getBusyDays(shipments),
        seasonalTrends: this.getSeasonalTrends(shipments)
      }
    };
  }

  // Utility methods
  generateTrackingNumber() {
    const prefix = 'MC';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  calculateEstimatedCost(shipmentData) {
    const baseRate = 2.5; // per km
    const weightMultiplier = (shipmentData.weight || 1) * 0.1;
    const urgencyMultiplier = shipmentData.priority === 'urgent' ? 1.5 : 1;
    const distance = shipmentData.estimatedDistance || 100;
    
    return Math.round((distance * baseRate + weightMultiplier) * urgencyMultiplier);
  }

  analyzeRouteComplexity(pickup, delivery) {
    // Analyze route complexity based on locations
    const factors = [];
    
    if (pickup.type === 'urban' || delivery.type === 'urban') {
      factors.push('urban_traffic');
    }
    
    if (pickup.country !== delivery.country) {
      factors.push('international');
    }
    
    return {
      level: factors.length > 1 ? 'complex' : 'simple',
      factors
    };
  }

  detectSeasonality(shipmentData) {
    const month = new Date().getMonth();
    const cargoType = shipmentData.cargoType;
    
    // Simple seasonality detection
    if (['agriculture', 'food'].includes(cargoType)) {
      return month >= 6 && month <= 8 ? 'peak' : 'normal';
    }
    
    if (cargoType === 'retail') {
      return month >= 10 || month <= 1 ? 'peak' : 'normal';
    }
    
    return 'normal';
  }

  async calculateDistance(pickup, delivery) {
    // Mock calculation - in real app, use Google Maps API
    const lat1 = pickup.coordinates?.latitude || 0;
    const lon1 = pickup.coordinates?.longitude || 0;
    const lat2 = delivery.coordinates?.latitude || 0;
    const lon2 = delivery.coordinates?.longitude || 0;
    
    // Haversine formula approximation
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance);
  }

  async calculateDuration(pickup, delivery) {
    // Mock calculation - estimate based on distance
    const distance = await this.calculateDistance(pickup, delivery);
    const averageSpeed = 60; // km/h
    return Math.round(distance / averageSpeed * 60); // minutes
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  getStartDate(timeframe) {
    const now = new Date();
    switch(timeframe) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  calculateAverageDeliveryTime(deliveredShipments) {
    if (deliveredShipments.length === 0) return 0;
    
    const totalTime = deliveredShipments.reduce((sum, shipment) => {
      const created = new Date(shipment.createdAt.seconds * 1000);
      const delivered = shipment.statusHistory?.find(s => s.status === 'delivered');
      if (delivered) {
        const deliveredTime = new Date(delivered.timestamp);
        return sum + (deliveredTime - created);
      }
      return sum;
    }, 0);
    
    return Math.round(totalTime / deliveredShipments.length / (1000 * 60 * 60)); // hours
  }

  calculateOnTimeRate(shipments) {
    const deliveredShipments = shipments.filter(s => s.status === 'delivered');
    if (deliveredShipments.length === 0) return 0;
    
    const onTimeDeliveries = deliveredShipments.filter(s => {
      // Mock on-time calculation
      return Math.random() > 0.2; // 80% on-time rate for demo
    });
    
    return Math.round((onTimeDeliveries.length / deliveredShipments.length) * 100);
  }

  calculateSatisfactionScore(shipments) {
    // Mock satisfaction score calculation
    return Math.round(4.2 + Math.random() * 0.6); // 4.2-4.8 rating
  }

  getTopRoutes(shipments) {
    const routeCounts = {};
    
    shipments.forEach(shipment => {
      const route = `${shipment.pickup?.city || 'Unknown'} → ${shipment.delivery?.city || 'Unknown'}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    
    return Object.entries(routeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));
  }

  getMonthlyTrends(shipments) {
    const monthlyData = {};
    
    shipments.forEach(shipment => {
      const date = new Date(shipment.createdAt.seconds * 1000);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, revenue: 0 };
      }
      
      monthlyData[monthKey].count++;
      monthlyData[monthKey].revenue += shipment.estimatedCost || 0;
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  getPriorityDistribution(shipments) {
    const distribution = { standard: 0, urgent: 0, express: 0 };
    
    shipments.forEach(shipment => {
      const priority = shipment.priority || 'standard';
      distribution[priority] = (distribution[priority] || 0) + 1;
    });
    
    return distribution;
  }

  getBusyDays(shipments) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    
    shipments.forEach(shipment => {
      const date = new Date(shipment.createdAt.seconds * 1000);
      dayCounts[date.getDay()]++;
    });
    
    return dayNames.map((day, index) => ({
      day,
      count: dayCounts[index]
    })).sort((a, b) => b.count - a.count);
  }

  getSeasonalTrends(shipments) {
    const seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    
    shipments.forEach(shipment => {
      const month = new Date(shipment.createdAt.seconds * 1000).getMonth();
      let season;
      
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'autumn';
      else season = 'winter';
      
      seasons[season]++;
    });
    
    return seasons;
  }

  // Professional notification system
  async notifyNearbyDrivers(shipment) {
    // This would integrate with a real notification service
    console.log('Notifying nearby drivers about new shipment:', shipment.trackingNumber);
    
    // Mock implementation
    return {
      notified: Math.floor(Math.random() * 10) + 5,
      radius: '50km'
    };
  }

  // Delete shipment (soft delete)
  async deleteShipment(shipmentId) {
    try {
      const shipmentRef = doc(db, this.collection, shipmentId);
      await updateDoc(shipmentRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        status: 'cancelled'
      });

      return {
        success: true,
        message: 'Shipment cancelled successfully'
      };
    } catch (error) {
      console.error('Error deleting shipment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get shipment by tracking number
  async getShipmentByTracking(trackingNumber) {
    try {
      const q = query(
        this.shipmentsRef,
        where('trackingNumber', '==', trackingNumber),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Shipment not found'
        };
      }

      const doc = querySnapshot.docs[0];
      return {
        success: true,
        shipment: {
          id: doc.id,
          ...doc.data()
        }
      };
    } catch (error) {
      console.error('Error fetching shipment by tracking:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ShipmentService();