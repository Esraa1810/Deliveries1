// services/JobMatchingService.js - AI-Powered Job Matching & Bidding System
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  onSnapshot
} from '../firebase';
import { db } from '../firebase';

class JobMatchingService {
  // Submit job application from truck driver
  static async submitJobApplication(jobId, driverId, bidAmount, message = '') {
    try {
      const application = {
        jobId,
        driverId,
        bidAmount: parseFloat(bidAmount),
        message,
        status: 'pending',
        submittedAt: serverTimestamp(),
        cargoOwnerId: null, // Will be filled when we get job details
        driverInfo: null,
        jobInfo: null
      };

      // Get job details to extract cargo owner ID
      const jobDoc = await getDoc(doc(db, 'shipments', jobId));
      if (jobDoc.exists()) {
        const jobData = jobDoc.data();
        application.cargoOwnerId = jobData.ownerId;
        application.jobInfo = {
          title: jobData.title,
          pickupLocation: jobData.pickupLocation,
          deliveryLocation: jobData.deliveryLocation,
          budget: jobData.budget
        };
      }

      // Get driver details
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        application.driverInfo = {
          name: driverData.name,
          rating: driverData.rating || 4.5,
          completedJobs: driverData.completedJobs || 0,
          vehicleType: driverData.vehicle?.truckType || 'Unknown'
        };
      }

      const docRef = await addDoc(collection(db, 'jobApplications'), application);
      
      // Update job to indicate it has applications
      await updateDoc(doc(db, 'shipments', jobId), {
        hasApplications: true,
        applicationCount: (jobData?.applicationCount || 0) + 1,
        lastApplicationAt: serverTimestamp()
      });

      return { success: true, applicationId: docRef.id };
    } catch (error) {
      console.error('Error submitting job application:', error);
      return { success: false, error: error.message };
    }
  }

  // Get applications for a specific job (for cargo owners)
  static async getJobApplications(jobId) {
    try {
      const q = query(
        collection(db, 'jobApplications'),
        where('jobId', '==', jobId),
        orderBy('submittedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error getting job applications:', error);
      return [];
    }
  }

  // Get applications submitted by a driver (for truck drivers)
  static async getDriverApplications(driverId) {
    try {
      const q = query(
        collection(db, 'jobApplications'),
        where('driverId', '==', driverId),
        orderBy('submittedAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error getting driver applications:', error);
      return [];
    }
  }

  // Accept a job application (cargo owner accepts driver)
  static async acceptJobApplication(applicationId, jobId) {
    try {
      // Update application status
      await updateDoc(doc(db, 'jobApplications', applicationId), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Update job status
      await updateDoc(doc(db, 'shipments', jobId), {
        status: 'assigned',
        assignedApplicationId: applicationId,
        assignedAt: serverTimestamp()
      });

      // Reject all other applications for this job
      const otherApplicationsQuery = query(
        collection(db, 'jobApplications'),
        where('jobId', '==', jobId),
        where('status', '==', 'pending')
      );

      const otherApplications = await getDocs(otherApplicationsQuery);
      const rejectPromises = [];

      otherApplications.forEach((doc) => {
        if (doc.id !== applicationId) {
          rejectPromises.push(
            updateDoc(doc.ref, {
              status: 'rejected',
              rejectedAt: serverTimestamp(),
              rejectionReason: 'Another driver was selected'
            })
          );
        }
      });

      await Promise.all(rejectPromises);

      return { success: true };
    } catch (error) {
      console.error('Error accepting job application:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject a job application
  static async rejectJobApplication(applicationId, reason = '') {
    try {
      await updateDoc(doc(db, 'jobApplications', applicationId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: reason
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting job application:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listener for new applications (for cargo owners)
  static subscribeToJobApplications(jobId, callback) {
    const q = query(
      collection(db, 'jobApplications'),
      where('jobId', '==', jobId),
      orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate()
        });
      });
      callback(applications);
    });
  }

  // Real-time listener for application status updates (for truck drivers)
  static subscribeToDriverApplications(driverId, callback) {
    const q = query(
      collection(db, 'jobApplications'),
      where('driverId', '==', driverId),
      orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate()
        });
      });
      callback(applications);
    });
  }

  // AI-powered driver matching for jobs
  static async getRecommendedDrivers(jobId) {
    try {
      const jobDoc = await getDoc(doc(db, 'shipments', jobId));
      if (!jobDoc.exists()) return [];

      const jobData = jobDoc.data();

      // Get all available drivers
      const driversQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'truck'),
        where('status', '==', 'available')
      );

      const driversSnapshot = await getDocs(driversQuery);
      const drivers = [];

      driversSnapshot.forEach((doc) => {
        const driverData = doc.data();
        const matchScore = this.calculateMatchScore(jobData, driverData);
        
        drivers.push({
          id: doc.id,
          ...driverData,
          matchScore,
          estimatedCost: this.estimateJobCost(jobData, driverData)
        });
      });

      // Sort by match score and return top matches
      return drivers
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recommended drivers:', error);
      return [];
    }
  }

  // Calculate AI match score between job and driver
  static calculateMatchScore(jobData, driverData) {
    let score = 50; // Base score

    // Vehicle type matching
    if (driverData.vehicle?.truckType) {
      const jobRequiredType = jobData.truckType?.toLowerCase();
      const driverType = driverData.vehicle.truckType.toLowerCase();
      
      if (jobRequiredType && driverType.includes(jobRequiredType)) {
        score += 20;
      }
    }

    // Experience and rating
    const rating = driverData.rating || 0;
    const completedJobs = driverData.completedJobs || 0;
    
    score += (rating - 3) * 10; // Rating above 3 adds points
    score += Math.min(completedJobs / 10, 15); // Up to 15 points for experience

    // Location proximity (simplified)
    const pickupLocation = jobData.pickupLocation?.toLowerCase();
    const driverLocation = driverData.location?.toLowerCase();
    
    if (pickupLocation && driverLocation && 
        (pickupLocation.includes(driverLocation) || driverLocation.includes(pickupLocation))) {
      score += 15;
    }

    // Availability
    if (driverData.status === 'available') {
      score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  // Estimate job cost based on driver and job details
  static estimateJobCost(jobData, driverData) {
    const baseRate = driverData.pricePerKm || 2.5;
    const estimatedDistance = jobData.estimatedDistance || 100;
    const urgencyMultiplier = jobData.urgency === 'urgent' ? 1.3 : 1.0;
    
    return Math.round(baseRate * estimatedDistance * urgencyMultiplier);
  }

  // Send invitation to specific driver
  static async inviteDriver(jobId, driverId, message = '') {
    try {
      const invitation = {
        jobId,
        driverId,
        message,
        type: 'invitation',
        status: 'sent',
        sentAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      const docRef = await addDoc(collection(db, 'driverInvitations'), invitation);
      return { success: true, invitationId: docRef.id };
    } catch (error) {
      console.error('Error sending driver invitation:', error);
      return { success: false, error: error.message };
    }
  }

  // Get pending invitations for a driver
  static async getDriverInvitations(driverId) {
    try {
      const q = query(
        collection(db, 'driverInvitations'),
        where('driverId', '==', driverId),
        where('status', 'in', ['sent', 'accepted']),
        orderBy('sentAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invitations = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invitations.push({
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        });
      });

      return invitations;
    } catch (error) {
      console.error('Error getting driver invitations:', error);
      return [];
    }
  }
}

export default JobMatchingService;