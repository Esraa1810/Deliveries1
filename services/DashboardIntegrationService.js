// services/DashboardIntegrationService.js - Connects Cargo & Truck Dashboards
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from '../firebase';
import { db } from '../firebase';

// Import other services
import JobMatchingService from './JobMatchingService';
import NotificationService from './NotificationService';

class DashboardIntegrationService {
  // Real-time dashboard data for cargo owners
  static subscribeToCargoDashboard(cargoOwnerId, callback) {
    const dashboardData = {
      shipments: [],
      applications: [],
      notifications: [],
      analytics: {}
    };

    // Subscribe to shipments
    const shipmentsQuery = query(
      collection(db, 'shipments'),
      where('ownerId', '==', cargoOwnerId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribeShipments = onSnapshot(shipmentsQuery, (snapshot) => {
      dashboardData.shipments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      callback(dashboardData);
    });

    // Subscribe to job applications for cargo owner's jobs
    const applicationsQuery = query(
      collection(db, 'jobApplications'),
      where('cargoOwnerId', '==', cargoOwnerId),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc'),
      limit(5)
    );

    const unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
      dashboardData.applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate()
      }));
      callback(dashboardData);
    });

    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', cargoOwnerId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      dashboardData.notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      callback(dashboardData);
    });

    // Return cleanup function
    return () => {
      unsubscribeShipments();
      unsubscribeApplications();
      unsubscribeNotifications();
    };
  }

  // Real-time dashboard data for truck drivers
  static subscribeToTruckDashboard(driverId, callback) {
    const dashboardData = {
      activeJobs: [],
      availableJobs: [],
      applications: [],
      notifications: [],
      earnings: {}
    };

    // Subscribe to active jobs (accepted applications)
    const activeJobsQuery = query(
      collection(db, 'jobApplications'),
      where('driverId', '==', driverId),
      where('status', 'in', ['accepted', 'in_progress']),
      orderBy('acceptedAt', 'desc'),
      limit(5)
    );

    const unsubscribeActiveJobs = onSnapshot(activeJobsQuery, async (snapshot) => {
      const activeJobs = [];
      for (const docSnap of snapshot.docs) {
        const applicationData = docSnap.data();
        
        // Get shipment details
        const shipmentDoc = await getDoc(doc(db, 'shipments', applicationData.jobId));
        if (shipmentDoc.exists()) {
          activeJobs.push({
            id: docSnap.id,
            ...applicationData,
            ...shipmentDoc.data(),
            acceptedAt: applicationData.acceptedAt?.toDate()
          });
        }
      }
      dashboardData.activeJobs = activeJobs;
      callback(dashboardData);
    });

    // Subscribe to driver's applications
    const applicationsQuery = query(
      collection(db, 'jobApplications'),
      where('driverId', '==', driverId),
      orderBy('submittedAt', 'desc'),
      limit(10)
    );

    const unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
      dashboardData.applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate()
      }));
      callback(dashboardData);
    });

    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', driverId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      dashboardData.notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      callback(dashboardData);
    });

    // Return cleanup function
    return () => {
      unsubscribeActiveJobs();
      unsubscribeApplications();
      unsubscribeNotifications();
    };
  }

  // Get recommended jobs for a driver based on AI matching
  static async getRecommendedJobsForDriver(driverId) {
    try {
      // Get driver profile
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (!driverDoc.exists()) return [];

      const driverData = driverDoc.data();

      // Get available shipments
      const shipmentsQuery = query(
        collection(db, 'shipments'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const shipmentsSnapshot = await getDocs(shipmentsQuery);
      const jobs = [];

      shipmentsSnapshot.forEach((doc) => {
        const jobData = doc.data();
        const matchScore = this.calculateJobMatchScore(jobData, driverData);
        
        if (matchScore > 60) { // Only show good matches
          jobs.push({
            id: doc.id,
            ...jobData,
            createdAt: jobData.createdAt?.toDate(),
            matchScore,
            estimatedEarnings: this.estimateJobEarnings(jobData, driverData)
          });
        }
      });

      // Sort by match score
      return jobs.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
    } catch (error) {
      console.error('Error getting recommended jobs:', error);
      return [];
    }
  }

  // Calculate match score between job and driver
  static calculateJobMatchScore(jobData, driverData) {
    let score = 50; // Base score

    // Vehicle type compatibility
    if (driverData.vehicle?.truckType && jobData.truckType) {
      const driverType = driverData.vehicle.truckType.toLowerCase();
      const requiredType = jobData.truckType.toLowerCase();
      
      if (driverType.includes(requiredType) || requiredType.includes(driverType)) {
        score += 25;
      }
    }

    // Location proximity
    if (driverData.location && jobData.pickupLocation) {
      const driverLocation = driverData.location.toLowerCase();
      const pickupLocation = jobData.pickupLocation.toLowerCase();
      
      // Simple city matching
      const driverCity = driverLocation.split(',')[0].trim();
      const pickupCity = pickupLocation.split(',')[0].trim();
      
      if (driverCity === pickupCity) {
        score += 20;
      } else if (pickupLocation.includes(driverCity) || driverLocation.includes(pickupCity)) {
        score += 10;
      }
    }

    // Driver rating and experience
    const rating = driverData.rating || 4.0;
    const completedJobs = driverData.completedJobs || 0;
    
    score += (rating - 3) * 5; // Rating above 3 adds points
    score += Math.min(completedJobs / 20, 10); // Experience bonus

    // Budget compatibility
    if (jobData.budget && driverData.averageBid) {
      const budgetRatio = jobData.budget / driverData.averageBid;
      if (budgetRatio >= 0.8 && budgetRatio <= 1.2) {
        score += 15; // Good budget match
      }
    }

    // Urgency factor
    if (jobData.urgency === 'urgent' && driverData.status === 'available') {
      score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  // Estimate job earnings for driver
  static estimateJobEarnings(jobData, driverData) {
    const baseBudget = jobData.budget || 0;
    const driverRate = driverData.pricePerKm || 2.5;
    const estimatedDistance = jobData.estimatedDistance || 100;
    
    // Use job budget or calculate based on distance
    return Math.max(baseBudget, driverRate * estimatedDistance);
  }

  // Get cargo owner's pending applications summary
  static async getCargoOwnerApplicationsSummary(cargoOwnerId) {
    try {
      const applicationsQuery = query(
        collection(db, 'jobApplications'),
        where('cargoOwnerId', '==', cargoOwnerId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(applicationsQuery);
      const applicationsByJob = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const jobId = data.jobId;
        
        if (!applicationsByJob[jobId]) {
          applicationsByJob[jobId] = {
            jobId,
            jobTitle: data.jobInfo?.title || 'Unknown Job',
            applications: [],
            averageBid: 0,
            lowestBid: Infinity,
            highestBid: 0
          };
        }

        applicationsByJob[jobId].applications.push({
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt?.toDate()
        });
      });

      // Calculate bid statistics
      Object.values(applicationsByJob).forEach(jobGroup => {
        const bids = jobGroup.applications.map(app => app.bidAmount || 0);
        jobGroup.averageBid = bids.reduce((sum, bid) => sum + bid, 0) / bids.length;
        jobGroup.lowestBid = Math.min(...bids);
        jobGroup.highestBid = Math.max(...bids);
      });

      return Object.values(applicationsByJob);
    } catch (error) {
      console.error('Error getting applications summary:', error);
      return [];
    }
  }

  // Process job completion and update both dashboards
  static async processJobCompletion(applicationId, rating = 5) {
    try {
      // Get application details
      const applicationDoc = await getDoc(doc(db, 'jobApplications', applicationId));
      if (!applicationDoc.exists()) return { success: false, error: 'Application not found' };

      const applicationData = applicationDoc.data();
      const { jobId, driverId, cargoOwnerId, bidAmount } = applicationData;

      // Update application status
      await updateDoc(doc(db, 'jobApplications', applicationId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        cargoOwnerRating: rating,
        finalAmount: bidAmount
      });

      // Update shipment status
      await updateDoc(doc(db, 'shipments', jobId), {
        status: 'delivered',
        deliveredAt: serverTimestamp(),
        completedApplicationId: applicationId
      });

      // Update driver stats
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        const completedJobs = (driverData.completedJobs || 0) + 1;
        const totalEarnings = (driverData.totalEarnings || 0) + bidAmount;
        const currentRating = driverData.rating || 4.5;
        const newRating = ((currentRating * (completedJobs - 1)) + rating) / completedJobs;

        await updateDoc(doc(db, 'users', driverId), {
          completedJobs,
          totalEarnings,
          rating: newRating,
          lastJobCompletedAt: serverTimestamp()
        });
      }

      // Send notifications
      await NotificationService.notifyPaymentReceived(
        driverId, 
        bidAmount, 
        applicationData.jobInfo?.title || 'Job'
      );

      await NotificationService.notifyJobStatusUpdate(
        cargoOwnerId,
        applicationData.jobInfo?.title || 'Your shipment',
        'delivered'
      );

      return { success: true };
    } catch (error) {
      console.error('Error processing job completion:', error);
      return { success: false, error: error.message };
    }
  }

  // Get market insights for cargo owners
  static async getMarketInsights(cargoOwnerId) {
    try {
      // Get recent shipments for analysis
      const shipmentsQuery = query(
        collection(db, 'shipments'),
        where('ownerId', '==', cargoOwnerId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const shipmentsSnapshot = await getDocs(shipmentsQuery);
      const shipments = shipmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Get market data (all recent shipments)
      const marketQuery = query(
        collection(db, 'shipments'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const marketSnapshot = await getDocs(marketQuery);
      const marketData = marketSnapshot.docs.map(doc => doc.data());

      // Calculate insights
      const insights = {
        averageMarketPrice: this.calculateAveragePrice(marketData),
        yourAveragePrice: this.calculateAveragePrice(shipments),
        demandTrends: this.analyzeDemandTrends(marketData),
        recommendations: this.generateRecommendations(shipments, marketData)
      };

      return insights;
    } catch (error) {
      console.error('Error getting market insights:', error);
      return null;
    }
  }

  // Helper methods for market insights
  static calculateAveragePrice(shipments) {
    if (shipments.length === 0) return 0;
    const totalBudget = shipments.reduce((sum, shipment) => sum + (shipment.budget || 0), 0);
    return totalBudget / shipments.length;
  }

  static analyzeDemandTrends(marketData) {
    const currentWeek = marketData.filter(s => {
      const createdAt = s.createdAt?.toDate() || new Date(s.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdAt > weekAgo;
    });

    const previousWeek = marketData.filter(s => {
      const createdAt = s.createdAt?.toDate() || new Date(s.createdAt);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdAt > twoWeeksAgo && createdAt <= weekAgo;
    });

    const trend = currentWeek.length - previousWeek.length;
    return {
      currentWeek: currentWeek.length,
      previousWeek: previousWeek.length,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      percentage: previousWeek.length > 0 ? Math.round((trend / previousWeek.length) * 100) : 0
    };
  }

  static generateRecommendations(userShipments, marketData) {
    const recommendations = [];

    // Price recommendation
    const userAvg = this.calculateAveragePrice(userShipments);
    const marketAvg = this.calculateAveragePrice(marketData);
    
    if (userAvg > marketAvg * 1.2) {
      recommendations.push({
        type: 'pricing',
        message: 'Consider reducing your budget by 10-15% to attract more drivers',
        impact: 'high'
      });
    } else if (userAvg < marketAvg * 0.8) {
      recommendations.push({
        type: 'pricing',
        message: 'You could increase your budget to get faster responses',
        impact: 'medium'
      });
    }

    // Urgency recommendation
    const urgentJobs = marketData.filter(s => s.urgency === 'urgent').length;
    const totalJobs = marketData.length;
    
    if (urgentJobs / totalJobs > 0.3) {
      recommendations.push({
        type: 'urgency',
        message: 'Market demand is high. Consider marking shipments as urgent for faster pickup',
        impact: 'medium'
      });
    }

    return recommendations;
  }

  // Get driver performance analytics
  static async getDriverAnalytics(driverId) {
    try {
      const applicationsQuery = query(
        collection(db, 'jobApplications'),
        where('driverId', '==', driverId),
        orderBy('submittedAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(applicationsQuery);
      const applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate()
      }));

      const completed = applications.filter(app => app.status === 'completed');
      const accepted = applications.filter(app => app.status === 'accepted');
      const pending = applications.filter(app => app.status === 'pending');
      const rejected = applications.filter(app => app.status === 'rejected');

      return {
        totalApplications: applications.length,
        acceptanceRate: applications.length > 0 ? (accepted.length + completed.length) / applications.length * 100 : 0,
        completionRate: accepted.length > 0 ? completed.length / (accepted.length + completed.length) * 100 : 0,
        averageEarnings: completed.length > 0 ? completed.reduce((sum, app) => sum + (app.bidAmount || 0), 0) / completed.length : 0,
        totalEarnings: completed.reduce((sum, app) => sum + (app.bidAmount || 0), 0),
        pendingApplications: pending.length,
        monthlyTrend: this.calculateMonthlyTrend(applications)
      };
    } catch (error) {
      console.error('Error getting driver analytics:', error);
      return null;
    }
  }

  static calculateMonthlyTrend(applications) {
    const now = new Date();
    const thisMonth = applications.filter(app => {
      const appDate = app.submittedAt;
      return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = applications.filter(app => {
      const appDate = app.submittedAt;
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return appDate.getMonth() === lastMonthDate.getMonth() && appDate.getFullYear() === lastMonthDate.getFullYear();
    });

    return {
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      trend: thisMonth.length - lastMonth.length
    };
  }
}

export default DashboardIntegrationService;