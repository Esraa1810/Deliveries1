// App.js - Updated with All Truck Driver Screens (Fixed)
import React, { useState, useEffect } from 'react';
import { StatusBar, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language System
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Core Screens
import SplashScreen from './screens/SplashScreen';
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';

// Dashboard Screens
import CargoDashboard from './screens/CargoDashboard';
import TruckDashboard from './screens/TruckDashboard';

// Cargo Owner Screens
import CreateShipmentScreen from './screens/CreateShipmentScreen';
import TrackShipmentsScreen from './screens/TrackShipmentsScreen';
import FindTrucksScreen from './screens/FindTrucksScreen';
import PaymentsScreen from './screens/PaymentsScreen';

// Truck Driver Screens
import FindJobsScreen from './screens/FindJobsScreen';
import ActiveJobsScreen from './screens/ActiveJobsScreen';
import EarningsScreen from './screens/EarningsScreen';
import VehicleManagementScreen from './screens/VehicleManagementScreen';
import DriverSettingsScreen from './screens/DriverSettingsScreen';

const Stack = createNativeStackNavigator();

// Main App Content
function AppContent() {
  const { isLoading: languageLoading, currentLanguage, isRTL } = useLanguage();
  const [appState, setAppState] = useState('splash'); // splash, languageSelection, main
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (!languageLoading) {
      // Language system is ready
      if (isFirstLaunch) {
        setAppState('languageSelection');
      } else {
        setAppState('main');
      }
    }
  }, [languageLoading, isFirstLaunch]);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem('hasLaunched', 'true');
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(false);
    }
  };

  const handleLanguageSelected = () => {
    setAppState('main');
  };

  // Show splash screen while loading
  if (appState === 'splash' || languageLoading) {
    return <SplashScreen />;
  }

  // Show language selection for first-time users
  if (appState === 'languageSelection') {
    return (
      <LanguageSelectionScreen 
        onLanguageSelected={handleLanguageSelected}
      />
    );
  }

  // Main app navigation
  return (
    <NavigationContainer>
      <StatusBar 
        barStyle={isRTL ? "dark-content" : "light-content"} 
        backgroundColor="#1B4965" 
      />
      <Stack.Navigator 
        initialRouteName="Register"
        screenOptions={{ 
          headerShown: false,
          animation: isRTL ? 'slide_from_left' : 'slide_from_right'
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Dashboard Screens */}
        <Stack.Screen name="CargoDashboard" component={CargoDashboard} />
        <Stack.Screen name="TruckDashboard" component={TruckDashboard} />
        
        {/* Cargo Owner Screens */}
        <Stack.Screen name="CreateShipment" component={CreateShipmentScreen} />
        <Stack.Screen name="TrackShipments" component={TrackShipmentsScreen} />
        <Stack.Screen name="FindTrucks" component={FindTrucksScreen} />
        <Stack.Screen name="Payments" component={PaymentsScreen} />
        
        {/* Truck Driver Screens */}
        <Stack.Screen name="FindJobs" component={FindJobsScreen} />
        <Stack.Screen name="ActiveJobs" component={ActiveJobsScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} />
        <Stack.Screen name="VehicleManagement" component={VehicleManagementScreen} />
        <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} />
        
        {/* Settings Screen */}
        <Stack.Screen 
          name="LanguageSelection" 
          component={LanguageSelectionScreen}
          options={{
            animation: 'slide_from_bottom'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Root App Component
export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}