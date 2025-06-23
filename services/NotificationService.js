// services/NotificationService.js - Real-time Notification System
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
  serverTimestamp,
  onSnapshot
} from '../firebase';
import { db } from '../firebase';

class NotificationService {
  // Create a new notification
  static async createNotification(userId, notification) {
    try {
      const notificationDoc = {
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type, // 'job_application', 'job_accepted', 'job_rejected', 'payment', 'message'
        data: notification.data || {},
        read: false,
        createdAt: serverTimestamp(),
        priority: notification.priority || 'normal' // 'low', 'normal', 'high', 'urgent'
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);
      return { success: true, notificationId: docRef.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, limitCount = 50) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const notifications = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = [];

      querySnapshot.forEach((doc) => {
        updatePromises.push(
          updateDoc(doc.ref, {
            read: true,
            readAt: serverTimestamp()
          })
        );
      });

      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listener for notifications
  static subscribeToNotifications(userId, callback) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      callback(notifications);
    });
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Job-specific notification helpers
  static async notifyNewJobApplication(cargoOwnerId, application) {
    const notification = {
      title: 'New Job Application',
      body: `${application.driverInfo?.name} applied for your job: ${application.jobInfo?.title}`,
      type: 'job_application',
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        driverId: application.driverId,
        bidAmount: application.bidAmount
      },
      priority: 'high'
    };

    return this.createNotification(cargoOwnerId, notification);
  }

  static async notifyJobAccepted(driverId, jobInfo) {
    const notification = {
      title: 'Job Application Accepted! 🎉',
      body: `Congratulations! Your application for "${jobInfo.title}" has been accepted.`,
      type: 'job_accepted',
      data: {
        jobId: jobInfo.jobId,
        applicationId: jobInfo.applicationId
      },
      priority: 'high'
    };

    return this.createNotification(driverId, notification);
  }

  static async notifyJobRejected(driverId, jobInfo, reason = '') {
    const notification = {
      title: 'Job Application Update',
      body: `Your application for "${jobInfo.title}" was not selected. ${reason}`,
      type: 'job_rejected',
      data: {
        jobId: jobInfo.jobId,
        applicationId: jobInfo.applicationId,
        reason
      },
      priority: 'normal'
    };

    return this.createNotification(driverId, notification);
  }

  static async notifyJobStatusUpdate(userId, jobTitle, newStatus) {
    const statusMessages = {
      'picked_up': 'Your cargo has been picked up',
      'in_transit': 'Your cargo is on the way',
      'delivered': 'Your cargo has been delivered',
      'delayed': 'Your delivery has been delayed'
    };

    const notification = {
      title: 'Shipment Update',
      body: `${jobTitle}: ${statusMessages[newStatus] || 'Status updated'}`,
      type: 'job_status',
      data: {
        status: newStatus,
        jobTitle
      },
      priority: newStatus === 'delivered' ? 'high' : 'normal'
    };

    return this.createNotification(userId, notification);
  }

  static async notifyPaymentReceived(userId, amount, jobTitle) {
    const notification = {
      title: 'Payment Received 💰',
      body: `You received $${amount} for delivering "${jobTitle}"`,
      type: 'payment',
      data: {
        amount,
        jobTitle
      },
      priority: 'high'
    };

    return this.createNotification(userId, notification);
  }

  static async notifyNewMessage(userId, senderName, preview, conversationId) {
    const notification = {
      title: `New message from ${senderName}`,
      body: preview,
      type: 'message',
      data: {
        conversationId,
        senderName
      },
      priority: 'normal'
    };

    return this.createNotification(userId, notification);
  }

  // Driver invitation notifications
  static async notifyDriverInvitation(driverId, jobInfo, cargoOwnerName) {
    const notification = {
      title: 'Job Invitation Received! 📩',
      body: `${cargoOwnerName} invited you to apply for "${jobInfo.title}"`,
      type: 'driver_invitation',
      data: {
        jobId: jobInfo.jobId,
        cargoOwnerName
      },
      priority: 'high'
    };

    return this.createNotification(driverId, notification);
  }

  // System notifications
  static async notifySystemMaintenance(userId, message) {
    const notification = {
      title: 'System Maintenance',
      body: message,
      type: 'system',
      data: {},
      priority: 'normal'
    };

    return this.createNotification(userId, notification);
  }

  static async notifyAccountVerification(userId, status) {
    const notification = {
      title: status === 'approved' ? 'Account Verified ✅' : 'Account Verification Update',
      body: status === 'approved' 
        ? 'Your account has been verified! You can now access all features.'
        : 'Your account verification requires additional information.',
      type: 'verification',
      data: { status },
      priority: 'high'
    };

    return this.createNotification(userId, notification);
  }

  // Bulk notifications
  static async sendBulkNotification(userIds, notification) {
    const promises = userIds.map(userId => 
      this.createNotification(userId, notification)
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return {
        success: true,
        sent: successful,
        failed: failed,
        total: userIds.length
      };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics
  static async getNotificationAnalytics(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const notifications = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      const analytics = {
        total: notifications.length,
        read: notifications.filter(n => n.read).length,
        unread: notifications.filter(n => !n.read).length,
        byType: {},
        byPriority: {},
        readRate: 0
      };

      // Calculate read rate
      analytics.readRate = analytics.total > 0 
        ? Math.round((analytics.read / analytics.total) * 100) 
        : 0;

      // Group by type
      notifications.forEach(notification => {
        analytics.byType[notification.type] = (analytics.byType[notification.type] || 0) + 1;
        analytics.byPriority[notification.priority] = (analytics.byPriority[notification.priority] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.error('Error getting notification analytics:', error);
      return null;
    }
  }
}

export default NotificationService;