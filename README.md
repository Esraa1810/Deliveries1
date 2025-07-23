# 🚛 Deliveries App (Logistix ) 

A comprehensive React Native mobile application that connects cargo owners with truck drivers for efficient delivery services. The app features real-time tracking, multi-language support (English, Arabic, Hebrew), and a complete logistics management system.

## 📱 Features

### For Cargo Owners
- **Create Shipments**: Post delivery requests with detailed cargo information
- **Find Trucks**: Browse available drivers and vehicles
- **Track Shipments**: Real-time tracking of cargo delivery status
- **Payment Management**: Handle payments and billing
- **Chat System**: Direct communication with drivers

### For Truck Drivers
- **Find Jobs**: Browse available delivery opportunities
- **Job Applications**: Apply for shipments that match your vehicle
- **Active Jobs**: Manage current deliveries
- **Earnings Tracking**: Monitor income and payment history
- **Vehicle Management**: Manage vehicle information and availability
- **Notifications**: Real-time updates on job applications and messages

### General Features
- **Multi-language Support**: English, Arabic, and Hebrew with RTL support
- **Real-time Notifications**: Firebase-powered instant updates
- **User Authentication**: Secure login and registration system
- **Profile Management**: Complete user profile customization
- **Settings**: Language preferences and app configuration

## 🛠 Technology Stack

- **Frontend**: React Native
- **Navigation**: React Navigation
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth (Mock implementation for demo)
- **Real-time Updates**: Firebase onSnapshot listeners
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Internationalization**: Custom translation system with RTL support

## 📁 Project Structure

```
├── App.js                     # Main app component with navigation
├── contexts/
│   └── LanguageContext.js     # Language and RTL management
├── components/
│   └── LanguageToggle.js      # Language switcher component
├── screens/
│   ├── SplashScreen.js        # App loading screen
│   ├── RegisterScreen.js      # User registration
│   ├── LoginScreen.js         # User authentication
│   ├── CargoDashboard.js      # Cargo owner main dashboard
│   ├── TruckDashboard.js      # Driver main dashboard
│   ├── CreateShipmentScreen.js # Post new shipment
│   ├── TrackShipmentsScreen.js # Track cargo deliveries
│   ├── FindTrucksScreen.js    # Browse available drivers
│   ├── FindJobsScreen.js      # Browse available jobs
│   ├── ActiveJobsScreen.js    # Manage active deliveries
│   ├── JobApplicationsScreen.js # Handle job applications
│   ├── EarningsScreen.js      # Driver earnings tracking
│   ├── PaymentsScreen.js      # Payment management
│   ├── VehicleManagementScreen.js # Vehicle information
│   ├── DriverSettingsScreen.js # Driver preferences
│   └── DriverNotificationsScreen.js # Notification center
├── services/
│   ├── JobMatchingService.js  # Job matching algorithms
│   └── NotificationService.js # Push notification handling
├── translations/
│   ├── en.js                  # English translations
│   ├── ar.js                  # Arabic translations
│   ├── he.js                  # Hebrew translations
│   └── index.js              # Translation exports
├── firebase.js               # Firebase configuration
└── package.json             # Dependencies and scripts
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- React Native development environment
- Android Studio / Xcode for device testing
- Firebase project setup

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Esraa1810/Deliveries1.git
   cd Deliveries1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Enable Authentication
   - Update `firebase.js` with your Firebase configuration

4. **Run the application**
   
   For Android:
   ```bash
   npx react-native run-android
   ```
   
   For iOS:
   ```bash
   npx react-native run-ios
   ```

## 🔧 Configuration

### Firebase Configuration
Update the `firebaseConfig` object in `firebase.js` with your project credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Language Support
The app supports three languages with automatic RTL detection:
- English (en)
- Arabic (ar) - RTL
- Hebrew (he) - RTL

## 📊 Database Structure

### Collections

**users**
```javascript
{
  uid: "user-id",
  email: "user@example.com",
  userType: "cargo" | "truck",
  name: "User Name",
  phone: "+1234567890",
  createdAt: timestamp
}
```

**shipments**
```javascript
{
  id: "shipment-id",
  title: "Shipment Title",
  cargoOwnerId: "user-id",
  pickupLocation: "Address",
  deliveryLocation: "Address",
  status: "pending" | "accepted" | "in_progress" | "delivered",
  createdAt: timestamp,
  budget: number
}
```

**jobApplications**
```javascript
{
  shipmentId: "shipment-id",
  driverId: "driver-id",
  status: "pending" | "accepted" | "rejected",
  appliedAt: timestamp
}
```

## 🎨 Features in Detail

### Multi-language System
- Seamless language switching
- RTL support for Arabic and Hebrew
- Context-based translation management
- Dynamic text direction adjustment

### Real-time Updates
- Live shipment tracking
- Instant notifications for job applications
- Real-time chat messaging
- Status updates across all users

### Job Matching
- Smart algorithm matching shipments with drivers
- Filter by location, cargo type, and vehicle capacity
- Application management system
- Rating and review system

## 🔐 Authentication

Currently uses a mock authentication system for demo purposes with predefined users:
- **Cargo Owner**: cargo@demo.com
- **Truck Driver**: truck@demo.com

## 👥 Team

- **Developer**: Esraa
- **GitHub**: [@Esraa1810](https://github.com/Esraa1810)

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: esraabetony17@gmail.com

---

**Made with ❤️ for efficient cargo delivery**
