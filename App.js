// APP VERSION 1.0.5 - Privacy Acceptance Screen Added - Build: 20251031212500
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, Alert, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonStyles } from './src/styles/commonStyles';
import { theme } from './src/styles/theme';

let StripeProvider = null;
if (Platform.OS !== 'web') {
  const StripeModule = require('@stripe/stripe-react-native');
  StripeProvider = StripeModule.StripeProvider;
}
import { LITIGATION_STAGES, USER_TYPES } from './src/constants/mockData';
import { calculateDailyBonus, calculateCreditsFromCoins, calculateCoinsNeeded } from './src/utils/gamification';
import { apiRequest, API_ENDPOINTS } from './src/config/api';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
import NotificationService from './src/services/NotificationService';
import ActionVideoModal from './src/components/ActionVideoModal';
import { AVATARS } from './src/constants/avatars';

import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PrivacyAcceptanceScreen from './src/screens/PrivacyAcceptanceScreen';
import SubscriptionSelectionScreen from './src/screens/SubscriptionSelectionScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import MedicalHubScreen from './src/screens/MedicalHubScreen';
import HIPAAFormsScreen from './src/screens/HIPAAFormsScreen';
import LawFirmDashboardScreen from './src/screens/LawFirmDashboardScreen';
import LawFirmClientDetailsScreen from './src/screens/LawFirmClientDetailsScreen';
import DisbursementDashboardScreen from './src/screens/DisbursementDashboardScreen';
import ReceivedDisbursementsScreen from './src/screens/ReceivedDisbursementsScreen';
import StripeConnectOnboardingScreen from './src/screens/StripeConnectOnboardingScreen';
import MedicalProviderDashboardScreen from './src/screens/MedicalProviderDashboardScreen';
import MedicalProviderPatientDetailsScreen from './src/screens/MedicalProviderPatientDetailsScreen';
import NotificationInboxScreen from './src/screens/NotificationInboxScreen';
import NotificationDetailScreen from './src/screens/NotificationDetailScreen';
import LawFirmSendNotificationScreen from './src/screens/LawFirmSendNotificationScreen';
import LawFirmNotificationAnalyticsScreen from './src/screens/LawFirmNotificationAnalyticsScreen';
import MedicalProviderSendNotificationScreen from './src/screens/MedicalProviderSendNotificationScreen';
import ActionDashboardScreen from './src/screens/ActionDashboardScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import BadgeCollectionScreen from './src/screens/BadgeCollectionScreen';
import LawFirmEventRequestsScreen from './src/screens/LawFirmEventRequestsScreen';
import LawFirmUserManagementScreen from './src/screens/LawFirmUserManagementScreen';
import LawFirmActivityDashboardScreen from './src/screens/LawFirmActivityDashboardScreen';
import LawFirmUserActivityTimelineScreen from './src/screens/LawFirmUserActivityTimelineScreen';
import MedicalProviderUserManagementScreen from './src/screens/MedicalProviderUserManagementScreen';
import MedicalProviderActivityDashboardScreen from './src/screens/MedicalProviderActivityDashboardScreen';
import MedicalProviderHIPAADashboardScreen from './src/screens/MedicalProviderHIPAADashboardScreen';
import MedicalProviderUserActivityTimelineScreen from './src/screens/MedicalProviderUserActivityTimelineScreen';
import MedicalProviderEventRequestsScreen from './src/screens/MedicalProviderEventRequestsScreen';
import MedicalProviderBillingScreen from './src/screens/MedicalProviderBillingScreen';
import ClientEventRequestsScreen from './src/screens/ClientEventRequestsScreen';
import TreasureChestScreen from './src/screens/TreasureChestScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import EULAScreen from './src/screens/EULAScreen';
import IndividualSubscriptionScreen from './src/screens/IndividualSubscriptionScreen';
import LawFirmSubscriptionScreen from './src/screens/LawFirmSubscriptionScreen';
import MedicalProviderSubscriptionScreen from './src/screens/MedicalProviderSubscriptionScreen';
import NegotiationsScreen from './src/screens/NegotiationsScreen';
import AvatarSelectionScreen from './src/screens/AvatarSelectionScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatConversationScreen from './src/screens/ChatConversationScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import LawFirmRegistrationScreen from './src/screens/LawFirmRegistrationScreen';
import MedicalProviderRegistrationScreen from './src/screens/MedicalProviderRegistrationScreen';
import BottomNavigation from './src/components/BottomNavigation';
import LawFirmBottomNavigation from './src/components/LawFirmBottomNavigation';
import MedicalProviderBottomNavigation from './src/components/MedicalProviderBottomNavigation';

const AppContent = ({ user, setUser, currentScreen, setCurrentScreen }) => {
  const notificationContext = useNotifications();
  const [userType, setUserType] = useState(USER_TYPES.INDIVIDUAL);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [coins, setCoins] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firmName, setFirmName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [firmCode, setFirmCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [firmSize, setFirmSize] = useState('small');

  const [litigationStages, setLitigationStages] = useState(LITIGATION_STAGES);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [medicalHubUploads, setMedicalHubUploads] = useState({
    medicalBills: [],
    medicalRecords: []
  });
  
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientRoadmapData, setClientRoadmapData] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [lawFirmReturnTab, setLawFirmReturnTab] = useState('clients');
  const [medicalProviderReturnTab, setMedicalProviderReturnTab] = useState('patients');
  const [currentLawFirmUser, setCurrentLawFirmUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentMedicalProviderUser, setCurrentMedicalProviderUser] = useState(null);
  const [selectedMedicalUserId, setSelectedMedicalUserId] = useState(null);
  const [changePasswordData, setChangePasswordData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  const authToken = user?.token || null;
  const notificationCleanupRef = useRef(null);
  const prevScreenRef = useRef(currentScreen);
  const [treasureChestRefreshKey, setTreasureChestRefreshKey] = useState(0);

  const [showActionVideo, setShowActionVideo] = useState(false);
  const [actionVideoData, setActionVideoData] = useState({
    message: '',
    coinsEarned: 0,
  });

  // Increment treasure chest refresh key when navigating to it
  useEffect(() => {
    if (prevScreenRef.current !== 'treasure-chest' && currentScreen === 'treasure-chest') {
      console.log('[TreasureChest] Navigating to treasure-chest from', prevScreenRef.current);
      console.log('[TreasureChest] Incrementing refreshKey to trigger coin balance fetch');
      setTreasureChestRefreshKey(prev => {
        console.log('[TreasureChest] RefreshKey:', prev, '→', prev + 1);
        return prev + 1;
      });
    }
    prevScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Load user's litigation progress function (defined outside useEffect so it can be reused)
  const loadUserProgress = async () => {
    if (!user || !user.token || user.type !== USER_TYPES.INDIVIDUAL) {
      return;
    }

    try {
      console.log('[App] Loading user litigation progress...');
      const progressData = await apiRequest(API_ENDPOINTS.LITIGATION.PROGRESS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      console.log('[App] Progress loaded:', progressData);
      
      // Merge backend progress with static LITIGATION_STAGES
      const mergedStages = mergeCompletedSubstages(progressData);
      setLitigationStages(mergedStages);
      
      console.log('[App] Litigation stages updated with user progress');
    } catch (error) {
      console.error('[App] Error loading litigation progress:', error);
      // On error, keep using default LITIGATION_STAGES
    }
  };

  // Load user's litigation progress when they log in
  useEffect(() => {
    loadUserProgress();
  }, [user?.token, user?.id]);


  // Initialize push notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Register for push notifications
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          console.log('Push token obtained:', token);
        }

        // If user is logged in, register device with backend
        if (user?.token && user?.id) {
          const registered = await NotificationService.registerDeviceWithBackend(user.token, user.id);
          if (registered) {
            console.log('Device registered with backend successfully');
            
            // Update badge count from server
            const unreadCount = await NotificationService.fetchUnreadCount(user.token);
            await NotificationService.setBadgeCount(unreadCount);
          }
        }

        // Setup notification listeners
        const cleanup = NotificationService.setupNotificationListeners(
          // On notification received while app is open
          async (notification) => {
            // Refresh badge count when new notification arrives
            if (user?.token) {
              const unreadCount = await NotificationService.fetchUnreadCount(user.token);
              await NotificationService.setBadgeCount(unreadCount);
            }
            
            if (notificationContext?.refreshNotifications) {
              notificationContext.refreshNotifications();
            }
          },
          // On notification tapped
          async (response) => {
            const { notificationId, actionUrl, type, taskId } = response.notification.request.content.data || {};
            
            // Mark as read and clicked
            if (notificationId && user?.token) {
              await NotificationService.markNotificationAsRead(notificationId, user.token);
              await NotificationService.markNotificationAsClicked(notificationId, user.token);
              
              // Refresh badge count after marking as read
              const unreadCount = await NotificationService.fetchUnreadCount(user.token);
              await NotificationService.setBadgeCount(unreadCount);
            }
            
            // Handle deep linking based on notification type
            if (type === 'task_assigned' && taskId) {
              setCurrentScreen('actions');
            } else if (actionUrl) {
              handleDeepLink(actionUrl);
            } else {
              // Default to notifications inbox
              setCurrentScreen('notifications');
            }
            
            // Refresh notifications
            if (notificationContext?.refreshNotifications) {
              notificationContext.refreshNotifications();
            }
          }
        );

        notificationCleanupRef.current = cleanup;

      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Cleanup on unmount
    return () => {
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
      }
    };
  }, [user?.token, user?.id]);

  // Handle deep links
  const handleDeepLink = (url) => {
    console.log('Deep link:', url);
    
    // Parse deep link URLs like "verdictpath://screen/action"
    if (typeof url === 'string') {
      if (url.includes('roadmap')) {
        setCurrentScreen('roadmap');
      } else if (url.includes('task') || url.includes('action')) {
        setCurrentScreen('actions');
      } else if (url.includes('notification')) {
        setCurrentScreen('notifications');
      } else if (url.includes('medical')) {
        setCurrentScreen('medical');
      } else if (url.includes('video')) {
        setCurrentScreen('notifications');
      } else if (url.includes('dashboard')) {
        setCurrentScreen('dashboard');
      }
    }
  };

  const handleRegister = () => {
    console.log('[Registration] Button clicked - Starting registration...');
    console.log('[Registration] Email:', email);
    console.log('[Registration] Password exists:', !!password);
    console.log('[Registration] Confirm password exists:', !!confirmPassword);
    console.log('[Registration] User type:', userType);
    
    // Name validation based on user type
    if (userType === USER_TYPES.INDIVIDUAL && (!firstName || !lastName)) {
      alert('Error: Please enter your first and last name');
      return;
    }
    
    // Phone number validation for individual users
    if (userType === USER_TYPES.INDIVIDUAL && !phoneNumber) {
      alert('Error: Please enter your cell phone number');
      return;
    }
    
    if (userType === USER_TYPES.LAW_FIRM && !firmName) {
      alert('Error: Please enter your law firm name');
      return;
    }
    
    if (userType === USER_TYPES.MEDICAL_PROVIDER && !providerName) {
      alert('Error: Please enter your medical provider/practice name');
      return;
    }
    
    if (!email || !password) {
      console.log('[Registration] ERROR: Missing email or password');
      alert('Error: Please fill in all required fields');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[Registration] ERROR: Invalid email format');
      alert('Error: Please enter a valid email address');
      return;
    }
    
    if (password !== confirmPassword) {
      console.log('[Registration] ERROR: Passwords do not match');
      alert('Error: Passwords do not match');
      return;
    }
    
    // Password strength validation
    if (password.length < 6) {
      console.log('[Registration] ERROR: Password too short');
      alert('Error: Password must be at least 6 characters long');
      return;
    }
    
    console.log('[Registration] ✓ Validation passed! Navigating to subscription screen...');
    setCurrentScreen('subscription');
  };

  const handleSelectSubscription = async (tier, size) => {
    console.log('[SUBSCRIPTION] Privacy Accepted value:', privacyAccepted);
    console.log('[SUBSCRIPTION] User type:', userType);
    
    setSubscriptionTier(tier);
    setFirmSize(size);
    
    if (tier === 'free') {
      try {
        let response;
        let userData;
        let inviteSuccessMessage = '';
        
        if (userType === USER_TYPES.LAW_FIRM) {
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_LAWFIRM, {
            method: 'POST',
            body: JSON.stringify({
              firmName: firmName,
              email: email,
              password: password,
              subscriptionTier: tier,
              firmSize: size || null,
              privacyAccepted: privacyAccepted
            })
          });
          
          userData = {
            id: response.lawFirm.id,
            email: response.lawFirm.email,
            type: USER_TYPES.LAW_FIRM,
            firmName: response.lawFirm.firmName,
            firmCode: response.lawFirm.firmCode,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          setCurrentScreen('lawfirm-dashboard');
        } else if (userType === USER_TYPES.MEDICAL_PROVIDER) {
          console.log('Registering medical provider:', { email });
          
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_MEDICALPROVIDER, {
            method: 'POST',
            body: JSON.stringify({
              providerName: providerName,
              email: email,
              password: password,
              subscriptionTier: tier,
              providerSize: size || null,
              privacyAccepted: privacyAccepted
            })
          });
          
          console.log('Medical provider registration response:', response);
          
          if (!response || !response.medicalProvider) {
            throw new Error('Invalid response from server. Please try again.');
          }
          
          userData = {
            id: response.medicalProvider.id,
            email: response.medicalProvider.email,
            type: USER_TYPES.MEDICAL_PROVIDER,
            providerName: response.medicalProvider.providerName,
            providerCode: response.medicalProvider.providerCode,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          setCurrentScreen('medicalprovider-dashboard');
        } else {
          console.log('[INDIVIDUAL] Sending registration with privacyAccepted:', privacyAccepted);
          
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_CLIENT, {
            method: 'POST',
            body: JSON.stringify({
              firstName: firstName,
              lastName: lastName,
              phoneNumber: phoneNumber,
              email: email,
              password: password,
              lawFirmCode: firmCode || null,
              avatarType: 'captain',
              subscriptionTier: tier,
              subscriptionPrice: 0,
              privacyAccepted: privacyAccepted
            })
          });
          
          userData = {
            id: response.user.id,
            email: response.user.email,
            type: USER_TYPES.INDIVIDUAL,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          // Process invite code if provided
          if (inviteCode && inviteCode.trim()) {
            try {
              const inviteResponse = await apiRequest(API_ENDPOINTS.INVITES.PROCESS, {
                method: 'POST',
                body: JSON.stringify({
                  inviteCode: inviteCode.trim(),
                  newUserId: response.user.id
                })
              });
              
              if (inviteResponse.success) {
                console.log('✅ Invite processed:', inviteResponse.message);
                inviteSuccessMessage = '\n\n🎉 Invite code applied! Your friend earned 500 coins for inviting you!';
              }
            } catch (inviteError) {
              console.error('Error processing invite:', inviteError);
              // Show warning but don't fail registration
              alert('⚠️ Invalid invite code: ' + (inviteError.message || 'The invite code you entered was not found. Your account was still created successfully.'));
            }
          }
          
          setCurrentScreen('dashboard');
        }
        
        setUser(userData);
        setCoins(0);
        setLoginStreak(0);
        setIsLoggedIn(true);
        setPrivacyAccepted(false);
        
        let welcomeMessage = 'Your free account has been created successfully!';
        if (userType === USER_TYPES.LAW_FIRM && userData.firmCode) {
          welcomeMessage += `\n\nYour unique Law Firm Code:\n${userData.firmCode}\n\nShare this code with your clients so they can connect to your firm.`;
        } else if (userType === USER_TYPES.MEDICAL_PROVIDER && userData.providerCode) {
          welcomeMessage += `\n\nYour unique Provider Code:\n${userData.providerCode}\n\nShare this code with your patients so they can connect to your practice.`;
        }
        
        // Add invite success message if it was set
        if (inviteSuccessMessage) {
          welcomeMessage += inviteSuccessMessage;
        }
        
        alert('🎉 Welcome to Verdict Path!\n\n' + welcomeMessage);
      } catch (error) {
        console.error('Registration Error Details:', error);
        const errorMsg = error.message || error.toString() || 'Failed to create account. Please try again.';
        alert('Registration Error: ' + errorMsg);
      }
    } else {
      // Paid tier registration - create account with paid tier
      try {
        let response;
        let userData;
        
        if (userType === USER_TYPES.LAW_FIRM) {
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_LAWFIRM, {
            method: 'POST',
            body: JSON.stringify({
              firmName: firmName,
              email: email,
              password: password,
              subscriptionTier: tier,
              firmSize: size || null,
              privacyAccepted: privacyAccepted
            })
          });
          
          userData = {
            id: response.lawFirm.id,
            email: response.lawFirm.email,
            type: USER_TYPES.LAW_FIRM,
            firmName: response.lawFirm.firmName,
            firmCode: response.lawFirm.firmCode,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          setCurrentScreen('lawfirm-dashboard');
        } else if (userType === USER_TYPES.MEDICAL_PROVIDER) {
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_MEDICALPROVIDER, {
            method: 'POST',
            body: JSON.stringify({
              providerName: providerName,
              email: email,
              password: password,
              subscriptionTier: tier,
              providerSize: size || null,
              privacyAccepted: privacyAccepted
            })
          });
          
          userData = {
            id: response.medicalProvider.id,
            email: response.medicalProvider.email,
            type: USER_TYPES.MEDICAL_PROVIDER,
            providerName: response.medicalProvider.providerName,
            providerCode: response.medicalProvider.providerCode,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          setCurrentScreen('medicalprovider-dashboard');
        } else {
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_CLIENT, {
            method: 'POST',
            body: JSON.stringify({
              firstName: firstName,
              lastName: lastName,
              phoneNumber: phoneNumber,
              email: email,
              password: password,
              lawFirmCode: firmCode || null,
              avatarType: 'captain',
              subscriptionTier: tier,
              subscriptionPrice: tier === 'basic' ? 9.99 : 19.99
            })
          });
          
          userData = {
            id: response.user.id,
            email: response.user.email,
            type: USER_TYPES.INDIVIDUAL,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            token: response.token,
            subscription: tier,
            coins: 0,
            streak: 0
          };
          
          setCurrentScreen('dashboard');
        }
        
        setUser(userData);
        setCoins(0);
        setLoginStreak(0);
        setIsLoggedIn(true);
        setPrivacyAccepted(false);
        
        Alert.alert(
          '🎉 Welcome to Verdict Path!',
          `Your ${tier} account has been created! In a production app, payment processing would occur here. You're now on a free trial.`,
          [{ text: 'Get Started!', onPress: () => {} }]
        );
      } catch (error) {
        console.error('Paid Registration Error:', error);
        const errorMessage = error.response?.message || error.message || 'Failed to create account. Please try again.';
        Alert.alert('Registration Error', errorMessage);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    console.log('[Login] Attempting login with userType:', userType);
    
    try {
      let apiUserType;
      let targetScreen;
      let loginEndpoint;
      let requestBody;
      
      if (userType === USER_TYPES.LAW_FIRM) {
        apiUserType = 'lawfirm';
        targetScreen = 'lawfirm-dashboard';
        loginEndpoint = API_ENDPOINTS.AUTH.LOGIN_LAWFIRM_USER;
        requestBody = { email, password };
      } else if (userType === USER_TYPES.MEDICAL_PROVIDER) {
        apiUserType = 'medical_provider';
        targetScreen = 'medicalprovider-dashboard';
        loginEndpoint = API_ENDPOINTS.AUTH.LOGIN_MEDICALPROVIDER_USER;
        requestBody = { email, password };
      } else {
        apiUserType = 'individual';
        targetScreen = 'dashboard';
        loginEndpoint = API_ENDPOINTS.AUTH.LOGIN;
        requestBody = { email, password, userType: apiUserType };
      }
      
      console.log('[Login] API userType:', apiUserType, 'Target screen:', targetScreen, 'Endpoint:', loginEndpoint);
      
      const response = await apiRequest(loginEndpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      console.log('[Login] Login successful, response:', response);
      
      if (response.mustChangePassword) {
        console.log('[Login] User must change password before accessing account');
        setChangePasswordData({
          changePasswordToken: response.changePasswordToken,
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          userType: apiUserType
        });
        setCurrentScreen('change-password');
        return;
      }
      
      let userData;
      
      if (userType === USER_TYPES.LAW_FIRM) {
        userData = {
          id: response.user.id,
          email: response.user.email,
          type: USER_TYPES.LAW_FIRM,
          userType: 'lawfirm',
          firmName: response.user.firmName,
          firmCode: response.user.firmCode,
          token: response.token,
          coins: 150,
          streak: 3
        };
      } else if (userType === USER_TYPES.MEDICAL_PROVIDER) {
        userData = {
          id: response.user.id,
          email: response.user.email,
          type: USER_TYPES.MEDICAL_PROVIDER,
          userType: 'medical_provider',
          providerName: response.user.providerName,
          providerCode: response.user.providerCode,
          token: response.token,
          coins: 0,
          streak: 0
        };
      } else {
        userData = {
          id: response.user.id,
          email: response.user.email,
          type: USER_TYPES.INDIVIDUAL,
          userType: 'individual',
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          token: response.token,
          subscription: subscriptionTier,
          coins: 0,
          streak: 0
        };
      }
      
      console.log('[Login] Setting user data:', userData);
      console.log('[Login] Navigating to:', targetScreen);
      
      setUser(userData);
      setCoins(userData.coins);
      setLoginStreak(userData.streak);
      setIsLoggedIn(true);
      setCurrentScreen(targetScreen);
    } catch (error) {
      console.error('[Login] Login error:', error);
      Alert.alert('Error', error.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.token && user?.id) {
        await NotificationService.unregisterDeviceFromBackend(user.token, user.id);
      }
      await notificationContext.logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
    
    setIsLoggedIn(false);
    setUser(null);
    setCurrentScreen('landing');
  };

  const refreshUserProfile = async () => {
    if (!user || !user.token || user.type !== USER_TYPES.INDIVIDUAL) {
      console.log('[RefreshProfile] Skipping refresh - not an individual user');
      return;
    }

    try {
      console.log('[RefreshProfile] Fetching latest subscription data...');
      const response = await apiRequest(
        API_ENDPOINTS.SUBSCRIPTION.INDIVIDUAL_CURRENT,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      if (response.subscription) {
        const updatedUser = {
          ...user,
          subscription: response.subscription.tier
        };
        
        console.log('[RefreshProfile] Updated subscription from', user.subscription, 'to', response.subscription.tier);
        setUser(updatedUser);
        
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('[RefreshProfile] Error refreshing user profile:', error);
    }
  };

  const triggerActionVideo = (message, coinsEarned = 0) => {
    console.log('[App] Triggering action video:', message, coinsEarned);
    setActionVideoData({ message, coinsEarned });
    setShowActionVideo(true);
  };

  const handleClaimDailyBonus = async () => {
    if (!user || !user.token) {
      Alert.alert('Error', 'You must be logged in to claim daily rewards');
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.COINS.CLAIM_DAILY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.success) {
        const bonusAmount = response.totalCoins - coins;
        setCoins(response.totalCoins);
        setLoginStreak(response.newStreak);
        
        triggerActionVideo(`Daily Bonus Claimed! 🎉\nDay ${response.newStreak} Streak`, bonusAmount);
      } else {
        Alert.alert('Error', response.message || 'Failed to claim daily reward');
      }
    } catch (error) {
      if (error.message && error.message.includes('already claimed')) {
        Alert.alert('Already Claimed', 'You have already claimed your daily reward today. Come back tomorrow!');
      } else {
        console.error('Error claiming daily bonus:', error);
        Alert.alert('Error', error.message || 'Failed to claim daily reward');
      }
    }
  };

  const handleConvertCoinsToCredits = async () => {
    const actualCredits = calculateCreditsFromCoins(coins);
    const coinsNeeded = calculateCoinsNeeded(actualCredits);
    
    if (actualCredits === 0) {
      Alert.alert('Not Enough Coins', 'You need at least 5,000 coins to convert to credits.\n\n(5,000 coins = $1)');
      return;
    }
    
    Alert.alert(
      'Convert Coins to Credits',
      `Convert ${coinsNeeded} coins to $${actualCredits}?\n\n⚠️ Lifetime cap: $5 per account`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Convert', onPress: async () => {
          if (user && user.token) {
            try {
              const response = await apiRequest(API_ENDPOINTS.COINS.CONVERT, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                  coinsToConvert: coinsNeeded
                })
              });
              
              setCoins(response.totalCoins - response.coinsSpent);
              
              const remainingMsg = response.remainingLifetimeCredits > 0 
                ? `\n\nRemaining lifetime conversions: $${response.remainingLifetimeCredits.toFixed(2)}` 
                : '\n\n🎯 You\'ve reached your $5 lifetime cap!';
              
              Alert.alert(
                '✅ Success!', 
                `$${response.creditAmount} added to your account!\n\nCoins converted: ${response.coinsConverted}${remainingMsg}`
              );
            } catch (error) {
              console.error('Failed to convert coins:', error);
              
              // Check if it's a lifetime cap error
              if (error.message && error.message.includes('lifetime cap')) {
                Alert.alert('💰 Lifetime Cap Reached', error.message);
              } else if (error.message && error.message.includes('exceed your lifetime cap')) {
                Alert.alert('⚠️ Conversion Limit', error.message);
              } else {
                Alert.alert('Error', error.message || 'Failed to convert coins. Please try again.');
              }
            }
          } else {
            setCoins(coins - coinsNeeded);
            Alert.alert('Success!', `$${actualCredits} added to your account credits!`);
          }
        }}
      ]
    );
  };

  const handleCompleteStage = async (stageId, stageCoins) => {
    if (!user || !user.token) {
      // Offline mode - just update local state
      setLitigationStages(prevStages => 
        prevStages.map(s => 
          s.id === stageId && !s.completed ? { ...s, completed: true } : s
        )
      );
      setCoins(prevCoins => prevCoins + stageCoins);
      
      // Trigger treasure chest refresh to show updated coin balance
      console.log('[TreasureChest] Stage completed (offline), incrementing refreshKey to update coin balance');
      setTreasureChestRefreshKey(prev => prev + 1);
      
      triggerActionVideo('Stage Complete! 🏆', stageCoins);
      return;
    }

    try {
      const stage = litigationStages.find(s => s.id === stageId);
      
      // Call backend litigation stage completion endpoint (with coin farming prevention)
      const response = await apiRequest(API_ENDPOINTS.LITIGATION.COMPLETE_STAGE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          stageId: stageId,
          stageName: stage?.name || `Stage ${stageId}`,
          coinsEarned: stageCoins,
          allSubstagesCompleted: true
        })
      });
      
      // Update local state
      setLitigationStages(prevStages => 
        prevStages.map(s => 
          s.id === stageId && !s.completed ? { ...s, completed: true } : s
        )
      );
      
      // Add coins from backend response (may be 0 if already earned)
      const actualCoinsEarned = response.coinsEarned || 0;
      setCoins(prevCoins => prevCoins + actualCoinsEarned);
      
      // Trigger treasure chest refresh to show updated coin balance
      console.log('[TreasureChest] Stage completed, incrementing refreshKey to update coin balance');
      setTreasureChestRefreshKey(prev => {
        console.log('[TreasureChest] RefreshKey after stage completion:', prev, '→', prev + 1);
        return prev + 1;
      });
      
      if (actualCoinsEarned > 0) {
        triggerActionVideo('Stage Complete! 🏆', actualCoinsEarned);
      } else {
        Alert.alert('🎉 Stage Completed!', `Stage marked complete! (Coins were already earned previously)`);
      }
    } catch (error) {
      console.error('Failed to complete stage:', error);
      Alert.alert('Error', error.message || 'Failed to complete stage. Please try again.');
    }
  };

  const handleUncompleteStage = async (stageId, stageCoins) => {
    const currentStage = litigationStages.find(s => s.id === stageId);
    if (!currentStage || !currentStage.completed) return;
    
    console.log('[Revert] Reverting stage:', stageId, 'Current stage:', currentStage);
    
    if (user && user.token) {
      try {
        const requestBody = { stageId: stageId };
        console.log('[Revert] Request body:', JSON.stringify(requestBody));
        
        // Call backend to revert the stage
        const response = await apiRequest(API_ENDPOINTS.LITIGATION.REVERT_STAGE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(requestBody)
        });
        
        // Reload user progress from backend to ensure UI is in sync
        try {
          await loadUserProgress();
        } catch (refreshError) {
          console.error('Failed to refresh progress after revert:', refreshError);
          // Fallback: update local state optimistically
          setLitigationStages(prevStages => 
            prevStages.map(stage => {
              if (stage.id === stageId && stage.completed) {
                const updatedSubStages = stage.subStages?.map(subStage => {
                  return { ...subStage, completed: false, uploaded: false, uploadedFiles: [], enteredData: null };
                }) || [];
                
                return { ...stage, completed: false, subStages: updatedSubStages };
              }
              return stage;
            })
          );
        }
        
        Alert.alert(
          'Stage Reverted',
          'This stage is now marked as incomplete.\n\n💰 Note: Previously earned coins are preserved and cannot be earned again when you re-complete this stage.'
        );
        
      } catch (error) {
        console.error('Failed to revert stage:', error);
        Alert.alert('Error', error.message || 'Failed to revert stage. Please try again.');
      }
    } else {
      // Offline mode - just update local state
      setLitigationStages(prevStages => 
        prevStages.map(stage => {
          if (stage.id === stageId && stage.completed) {
            const updatedSubStages = stage.subStages?.map(subStage => {
              return { ...subStage, completed: false, uploaded: false, uploadedFiles: [], enteredData: null };
            }) || [];
            
            return { ...stage, completed: false, subStages: updatedSubStages };
          }
          return stage;
        })
      );
      
      Alert.alert(
        'Stage Reverted',
        'This stage is now marked as incomplete (offline mode).'
      );
    }
  };

  const handleToggleStage = (stageId) => {
    setLitigationStages(prevStages =>
      prevStages.map(stage =>
        stage.id === stageId
          ? { ...stage, expanded: !stage.expanded }
          : stage
      )
    );
  };

  const handleCompleteSubStage = (stageId, subStageId, subStageCoins) => {
    setLitigationStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === stageId) {
          const updatedSubStages = stage.subStages.map(subStage => {
            if (subStage.id === subStageId && !subStage.completed) {
              // Only add coins from the backend response (could be 0 if already earned)
              setCoins(prevCoins => prevCoins + subStageCoins);
              
              // Trigger treasure chest refresh to show updated coin balance
              console.log('[TreasureChest] Substage completed, incrementing refreshKey to update coin balance');
              setTreasureChestRefreshKey(prev => {
                console.log('[TreasureChest] RefreshKey after substage completion:', prev, '→', prev + 1);
                return prev + 1;
              });
              
              // Trigger action video for substage completion
              if (subStageCoins > 0) {
                triggerActionVideo('Substage Complete! 🎯', subStageCoins);
              }
              
              return { ...subStage, completed: true };
            }
            return subStage;
          });

          // Check if ALL substages are now complete
          const allSubstagesComplete = updatedSubStages.every(sub => sub.completed);
          
          // Mark stage as complete for visual indicators (green dotted lines)
          // but user still needs to click "Complete Stage" button for stage bonus coins
          return { 
            ...stage, 
            subStages: updatedSubStages,
            completed: allSubstagesComplete ? true : stage.completed
          };
        }
        return stage;
      })
    );
  };

  const handlePurchaseVideo = (video) => {
    Alert.alert(
      `${video.title}`,
      `Duration: ${video.duration}\nPrice: $${video.price}\n\nPurchase this tutorial video?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: () => Alert.alert('Success!', 'Video added to your library! You can watch it anytime in the Videos section.')
        }
      ]
    );
  };

  const handleUploadFile = (stageId, subStageId, fileName) => {
    setLitigationStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === stageId) {
          const updatedSubStages = stage.subStages.map(subStage => {
            if (subStage.id === subStageId) {
              const newFiles = [...(subStage.uploadedFiles || []), fileName];
              return { 
                ...subStage, 
                uploaded: true, 
                uploadedFiles: newFiles 
              };
            }
            return subStage;
          });
          return { ...stage, subStages: updatedSubStages };
        }
        return stage;
      })
    );
  };

  const handleDataEntry = (stageId, subStageId, data) => {
    setLitigationStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === stageId) {
          const updatedSubStages = stage.subStages.map(subStage => {
            if (subStage.id === subStageId) {
              return { 
                ...subStage, 
                enteredData: data 
              };
            }
            return subStage;
          });
          return { ...stage, subStages: updatedSubStages };
        }
        return stage;
      })
    );
  };

  const handleMedicalHubUpload = (documentType, fileName) => {
    setMedicalHubUploads(prev => ({
      ...prev,
      [documentType]: [...prev[documentType], fileName]
    }));
  };

  // Merge completed substages from API into LITIGATION_STAGES structure
  const mergeCompletedSubstages = (completedSubstagesData) => {
    if (!completedSubstagesData || !completedSubstagesData.completedSubstages) {
      return JSON.parse(JSON.stringify(LITIGATION_STAGES));
    }

    // Create a Set of completed backend IDs (format: 'pre-1', 'cf-1', etc.)
    const completedIds = new Set(
      completedSubstagesData.completedSubstages.map(sub => sub.substage_id)
    );

    // Deep clone LITIGATION_STAGES to avoid state contamination
    return JSON.parse(JSON.stringify(LITIGATION_STAGES)).map(stage => {
      // Map substages with completion status
      const mappedSubStages = stage.subStages?.map((subStage) => {
        // Backend uses IDs like 'pre-1', 'pre-2', 'cf-1', 'cf-2'
        // Match using the substage's own ID field
        return {
          ...subStage,
          completed: completedIds.has(subStage.id)
        };
      }) || [];
      
      // A stage is completed when ALL of its substages are completed
      const allSubstagesCompleted = mappedSubStages.length > 0 && 
        mappedSubStages.every(subStage => subStage.completed);
      
      return {
        ...stage,
        completed: allSubstagesCompleted,
        subStages: mappedSubStages
      };
    });
  };

  const handleNavigateInternal = (screen, data) => {
    if (screen === 'client-roadmap' && data) {
      setSelectedClientId(data.clientId);
      setClientRoadmapData(data.clientData);
    }
    setCurrentScreen(screen);
  };

  const handleNavigateToClient = (clientId) => {
    setSelectedClientId(clientId);
    setCurrentScreen('lawfirm-client-details');
  };

  const handleBackToLawFirmDashboard = (returnTab = null) => {
    setSelectedClientId(null);
    // Set the return tab (or reset to default 'clients' if not specified)
    setLawFirmReturnTab(returnTab || 'clients');
    setCurrentScreen('lawfirm-dashboard');
  };

  const handleBackToMedicalProviderDashboard = (returnTab = null) => {
    setSelectedPatientId(null);
    // Set the return tab (or reset to default 'patients' if not specified)
    setMedicalProviderReturnTab(returnTab || 'patients');
    setCurrentScreen('medicalprovider-dashboard');
  };

  const handleAvatarSelected = async (avatarType) => {
    const updatedUser = {
      ...user,
      avatarType: avatarType
    };
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={theme.colors.background}
          translucent={false}
        />
        
        {currentScreen === 'landing' && (
          <LandingScreen onNavigate={handleNavigateInternal} />
        )}

      {currentScreen === 'view-pricing' && (
        <SubscriptionSelectionScreen
          userType={null}
          viewOnly={true}
          onSelectSubscription={() => {
            setCurrentScreen('register');
          }}
          onNavigate={handleNavigateInternal}
          onBack={() => setCurrentScreen('landing')}
        />
      )}
      
      {currentScreen === 'register' && (
        <RegisterScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          firmName={firmName}
          setFirmName={setFirmName}
          providerName={providerName}
          setProviderName={setProviderName}
          userType={userType}
          setUserType={setUserType}
          firmCode={firmCode}
          setFirmCode={setFirmCode}
          inviteCode={inviteCode}
          setInviteCode={setInviteCode}
          privacyAccepted={privacyAccepted}
          setPrivacyAccepted={setPrivacyAccepted}
          onRegister={handleRegister}
          onNavigate={handleNavigateInternal}
        />
      )}

      {currentScreen === 'lawfirm-registration' && (
        <LawFirmRegistrationScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          firmName={firmName}
          setFirmName={setFirmName}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          onSelectSubscription={handleSelectSubscription}
          onNavigate={handleNavigateInternal}
          privacyAccepted={privacyAccepted}
          setPrivacyAccepted={setPrivacyAccepted}
        />
      )}

      {currentScreen === 'lawfirm-subscription-selection' && (
        <LawFirmSubscriptionScreen
          user={null}
          isNewRegistration={true}
          registrationData={{
            firmName: firmName,
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            privacyAccepted: privacyAccepted
          }}
          onRegistrationComplete={(userData) => {
            setUser(userData);
            setCoins(0);
            setLoginStreak(0);
            setIsLoggedIn(true);
            setPrivacyAccepted(false);
            setCurrentScreen('lawfirm-dashboard');
            alert('Welcome to Verdict Path!\n\nYour law firm account has been created successfully!\n\nYour unique Law Firm Code: ' + userData.firmCode + '\n\nShare this code with your clients so they can connect to your firm.');
          }}
          onBack={() => setCurrentScreen('lawfirm-registration')}
          onNavigate={handleNavigateInternal}
        />
      )}

      {currentScreen === 'medicalprovider-registration' && (
        <MedicalProviderRegistrationScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          providerName={providerName}
          setProviderName={setProviderName}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          onSelectSubscription={handleSelectSubscription}
          onNavigate={handleNavigateInternal}
          privacyAccepted={privacyAccepted}
          setPrivacyAccepted={setPrivacyAccepted}
          onRegistrationComplete={(userData) => {
            setUser(userData);
            setCoins(0);
            setLoginStreak(0);
            setIsLoggedIn(true);
            setPrivacyAccepted(false);
            setCurrentScreen('medicalprovider-dashboard');
            alert('Welcome to Verdict Path!\n\nYour medical provider account has been created successfully!\n\nYour unique Provider Code: ' + userData.providerCode + '\n\nShare this code with your patients so they can connect to your practice.\n\n100% FREE - No monthly fees ever!');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-subscription-selection' && (
        <MedicalProviderSubscriptionScreen
          user={null}
          isNewRegistration={true}
          registrationData={{
            providerName: providerName,
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            privacyAccepted: privacyAccepted
          }}
          onRegistrationComplete={(userData) => {
            setUser(userData);
            setCoins(0);
            setLoginStreak(0);
            setIsLoggedIn(true);
            setPrivacyAccepted(false);
            setCurrentScreen('medicalprovider-dashboard');
            alert('Welcome to Verdict Path!\n\nYour medical provider account has been created successfully!\n\nYour unique Provider Code: ' + userData.providerCode + '\n\nShare this code with your patients so they can connect to your practice.');
          }}
          onBack={() => setCurrentScreen('medicalprovider-registration')}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'privacy-acceptance' && (
        <PrivacyAcceptanceScreen
          onAccept={() => {
            console.log('[Privacy Acceptance] User accepted legal documents');
            setPrivacyAccepted(true);
            setCurrentScreen('subscription');
          }}
          onDecline={() => {
            console.log('[Privacy Acceptance] User declined - returning to register');
            setPrivacyAccepted(false);
            setCurrentScreen('register');
          }}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'privacy-policy' && (
        <PrivacyPolicyScreen
          onBack={() => setCurrentScreen('privacy-acceptance')}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'terms-of-service' && (
        <TermsOfServiceScreen
          onBack={() => setCurrentScreen('privacy-acceptance')}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'eula' && (
        <EULAScreen
          onBack={() => setCurrentScreen('privacy-acceptance')}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'subscription' && (
        <SubscriptionSelectionScreen
          userType={userType}
          onSelectSubscription={handleSelectSubscription}
          onNavigate={handleNavigateInternal}
        />
      )}
      
      {currentScreen === 'login' && (
        <LoginScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onLogin={handleLogin}
          onNavigate={handleNavigateInternal}
          userType={userType}
          setUserType={setUserType}
          firmCode={firmCode}
          setFirmCode={setFirmCode}
        />
      )}

      {currentScreen === 'change-password' && changePasswordData && (
        <ChangePasswordScreen
          route={{
            params: {
              changePasswordToken: changePasswordData.changePasswordToken,
              email: changePasswordData.email,
              firstName: changePasswordData.firstName,
              lastName: changePasswordData.lastName,
              userType: changePasswordData.userType
            }
          }}
          navigation={{
            reset: ({ routes }) => {
              setCurrentScreen(routes[0].name.toLowerCase());
              setChangePasswordData(null);
            }
          }}
        />
      )}
      
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          user={user}
          coins={coins}
          loginStreak={loginStreak}
          onClaimBonus={handleClaimDailyBonus}
          onConvertCoins={handleConvertCoinsToCredits}
          onNavigate={handleNavigateInternal}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'roadmap' && (
        <RoadmapScreen
          litigationStages={litigationStages}
          onCompleteStage={handleCompleteStage}
          onUncompleteStage={handleUncompleteStage}
          onNavigate={handleNavigateInternal}
          selectedAvatar={selectedAvatar}
          onSelectAvatar={setSelectedAvatar}
          onCompleteSubStage={handleCompleteSubStage}
          onPurchaseVideo={handlePurchaseVideo}
          onUploadFile={handleUploadFile}
          onDataEntry={handleDataEntry}
          authToken={authToken}
          medicalHubUploads={medicalHubUploads}
        />
      )}
      
      {currentScreen === 'medical' && (
        <MedicalHubScreen 
          onNavigate={handleNavigateInternal} 
          onUploadMedicalDocument={handleMedicalHubUpload}
          medicalHubUploads={medicalHubUploads}
          authToken={authToken}
        />
      )}

      {currentScreen === 'actions' && (
        <ActionDashboardScreen 
          key={taskRefreshKey}
          user={user}
          onNavigate={handleNavigateInternal}
          onSelectTask={(task) => {
            setSelectedTask(task);
            setCurrentScreen('task-detail');
          }}
        />
      )}

      {currentScreen === 'task-detail' && selectedTask && (
        <TaskDetailScreen 
          user={user}
          task={selectedTask}
          onNavigate={handleNavigateInternal}
          onTaskUpdated={() => {
            setSelectedTask(null);
            setTaskRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {currentScreen === 'profile' && (
        <NotificationSettingsScreen 
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'calendar' && (
        <CalendarScreen 
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'achievements' && (
        <AchievementsScreen 
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
          onViewBadges={() => setCurrentScreen('badges')}
        />
      )}

      {currentScreen === 'badges' && (
        <BadgeCollectionScreen 
          user={user}
          onBack={() => setCurrentScreen('achievements')}
        />
      )}

      {currentScreen === 'event-requests' && (
        <ClientEventRequestsScreen 
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}
      
      {currentScreen === 'hipaaForms' && (
        <HIPAAFormsScreen onNavigate={handleNavigateInternal} user={user} />
      )}
      
      {currentScreen === 'lawfirm-dashboard' && (
        <LawFirmDashboardScreen
          user={user}
          onNavigateToClient={handleNavigateToClient}
          onNavigate={handleNavigateInternal}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'lawfirm-client-details' && (
        <LawFirmClientDetailsScreen
          user={user}
          clientId={selectedClientId}
          onBack={handleBackToLawFirmDashboard}
          onNavigate={handleNavigateInternal}
        />
      )}

      {currentScreen === 'lawfirm-send-notification' && (
        <LawFirmSendNotificationScreen
          user={user}
          onBack={handleBackToLawFirmDashboard}
        />
      )}

      {currentScreen === 'lawfirm-notification-analytics' && (
        <LawFirmNotificationAnalyticsScreen
          user={user}
          onBack={handleBackToLawFirmDashboard}
        />
      )}

      {currentScreen === 'lawfirm-event-requests' && (
        <LawFirmEventRequestsScreen
          user={user}
          onBack={handleBackToLawFirmDashboard}
        />
      )}

      {currentScreen === 'lawfirm-negotiations' && (
        <View style={{ flex: 1, marginBottom: Platform.OS === 'ios' ? 80 : 70 }}>
          <NegotiationsScreen
            user={user}
            onBack={handleBackToLawFirmDashboard}
          />
        </View>
      )}

      {currentScreen === 'lawfirm-disbursements' && (
        <View style={{ flex: 1, marginBottom: Platform.OS === 'ios' ? 80 : 70 }}>
          <DisbursementDashboardScreen
            user={user}
            onBack={handleBackToLawFirmDashboard}
            onNavigate={handleNavigateInternal}
          />
        </View>
      )}

      {currentScreen === 'lawfirm-user-management' && (
        <LawFirmUserManagementScreen
          user={currentLawFirmUser || user}
          onBack={() => setCurrentScreen('lawfirm-dashboard')}
        />
      )}

      {currentScreen === 'lawfirm-settings' && (
        <SettingsScreen
          user={user}
          onBack={() => setCurrentScreen('lawfirm-dashboard')}
        />
      )}

      {currentScreen === 'lawfirm-activity-dashboard' && (
        <LawFirmActivityDashboardScreen
          user={currentLawFirmUser || user}
          onBack={() => setCurrentScreen('lawfirm-dashboard')}
          onNavigateToUser={(userId) => {
            setSelectedUserId(userId);
            setCurrentScreen('lawfirm-user-timeline');
          }}
        />
      )}

      {currentScreen === 'lawfirm-user-timeline' && (
        <LawFirmUserActivityTimelineScreen
          user={currentLawFirmUser || user}
          targetUserId={selectedUserId}
          onBack={() => setCurrentScreen('lawfirm-activity-dashboard')}
        />
      )}

      {currentScreen === 'lawfirm-messages' && (
        <ChatListScreen
          user={user}
          onNavigateToConversation={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('lawfirm-chat-conversation');
          }}
          onNavigateToNewChat={() => {
            setCurrentScreen('lawfirm-new-chat');
          }}
        />
      )}

      {currentScreen === 'lawfirm-chat-conversation' && (
        <ChatConversationScreen
          user={user}
          conversationId={selectedConversationId}
          onBack={() => setCurrentScreen('lawfirm-messages')}
        />
      )}

      {currentScreen === 'lawfirm-new-chat' && (
        <NewChatScreen
          user={user}
          onBack={() => setCurrentScreen('lawfirm-messages')}
          onChatStarted={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('lawfirm-chat-conversation');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-user-management' && (
        <MedicalProviderUserManagementScreen
          user={currentMedicalProviderUser || user}
          onBack={() => setCurrentScreen('medicalprovider-dashboard')}
        />
      )}

      {currentScreen === 'medicalprovider-settings' && (
        <SettingsScreen
          user={user}
          onBack={() => setCurrentScreen('medicalprovider-dashboard')}
        />
      )}

      {currentScreen === 'medicalprovider-activity-dashboard' && (
        <MedicalProviderActivityDashboardScreen
          user={currentMedicalProviderUser || user}
          onBack={() => setCurrentScreen('medicalprovider-dashboard')}
          onNavigateToUser={(userId) => {
            setSelectedMedicalUserId(userId);
            setCurrentScreen('medicalprovider-user-timeline');
          }}
          onNavigateToHIPAAReport={() => {
            setCurrentScreen('medicalprovider-hipaa-dashboard');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-hipaa-dashboard' && (
        <MedicalProviderHIPAADashboardScreen
          user={currentMedicalProviderUser || user}
          onBack={() => setCurrentScreen('medicalprovider-activity-dashboard')}
        />
      )}

      {currentScreen === 'medicalprovider-messages' && (
        <ChatListScreen
          user={user}
          onNavigateToConversation={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('medicalprovider-chat-conversation');
          }}
          onNavigateToNewChat={() => {
            setCurrentScreen('medicalprovider-new-chat');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-chat-conversation' && (
        <ChatConversationScreen
          user={user}
          conversationId={selectedConversationId}
          onBack={() => setCurrentScreen('medicalprovider-messages')}
        />
      )}

      {currentScreen === 'medicalprovider-new-chat' && (
        <NewChatScreen
          user={user}
          onBack={() => setCurrentScreen('medicalprovider-messages')}
          onChatStarted={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('medicalprovider-chat-conversation');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-user-timeline' && (
        <MedicalProviderUserActivityTimelineScreen
          user={currentMedicalProviderUser || user}
          targetUserId={selectedMedicalUserId}
          onBack={() => setCurrentScreen('medicalprovider-activity-dashboard')}
        />
      )}

      {currentScreen === 'disbursement-dashboard' && (
        <DisbursementDashboardScreen
          user={user}
          onBack={handleBackToLawFirmDashboard}
          onNavigate={handleNavigateInternal}
        />
      )}

      {currentScreen === 'medicalprovider-billing' && (
        <MedicalProviderBillingScreen
          user={user}
          onBack={handleBackToMedicalProviderDashboard}
        />
      )}

      {currentScreen === 'individual-disbursements' && (
        <ReceivedDisbursementsScreen
          user={user}
          userType="individual"
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'medicalprovider-disbursements' && (
        <ReceivedDisbursementsScreen
          user={user}
          userType="medical_provider"
          onBack={() => handleBackToMedicalProviderDashboard(medicalProviderReturnTab)}
        />
      )}

      {currentScreen === 'StripeConnectOnboarding' && (
        <StripeConnectOnboardingScreen
          user={user}
          onBack={() => setCurrentScreen('lawfirm-disbursements')}
        />
      )}
      
      {currentScreen === 'client-roadmap' && (
        <RoadmapScreen
          litigationStages={mergeCompletedSubstages(clientRoadmapData)}
          onNavigate={handleNavigateInternal}
          selectedAvatar={selectedAvatar}
          onSelectAvatar={setSelectedAvatar}
          onCompleteStage={() => {}} // Read-only mode
          onUncompleteStage={() => {}} // Read-only mode
          onCompleteSubStage={() => {}} // Read-only mode
          onPurchaseVideo={() => {}} // Read-only mode
          onUploadFile={() => {}} // Read-only mode
          onDataEntry={() => {}} // Read-only mode
          authToken={authToken}
          medicalHubUploads={medicalHubUploads}
          readOnly={true}
          clientId={selectedClientId}
          clientRoadmapData={clientRoadmapData}
          user={user}
        />
      )}
      
      {currentScreen === 'medicalprovider-dashboard' && (
        <MedicalProviderDashboardScreen
          user={user}
          initialTab={medicalProviderReturnTab}
          onNavigateToPatient={(patientId) => {
            setSelectedPatientId(patientId);
            setCurrentScreen('medicalprovider-patient-details');
          }}
          onNavigate={(screen, currentTab) => {
            if (currentTab) {
              setMedicalProviderReturnTab(currentTab);
            }
            handleNavigateInternal(screen);
          }}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'medicalprovider-patient-details' && (
        <MedicalProviderPatientDetailsScreen
          user={user}
          patientId={selectedPatientId}
          onBack={() => {
            setSelectedPatientId(null);
            setMedicalProviderReturnTab('patients');
            setCurrentScreen('medicalprovider-dashboard');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-send-notification' && (
        <MedicalProviderSendNotificationScreen
          user={user}
          onBack={() => handleBackToMedicalProviderDashboard(medicalProviderReturnTab)}
        />
      )}

      {currentScreen === 'medicalprovider-notification-analytics' && (
        <LawFirmNotificationAnalyticsScreen
          user={user}
          onBack={() => handleBackToMedicalProviderDashboard(medicalProviderReturnTab)}
        />
      )}

      {currentScreen === 'medicalprovider-event-requests' && (
        <MedicalProviderEventRequestsScreen
          user={user}
          onBack={() => handleBackToMedicalProviderDashboard(medicalProviderReturnTab)}
        />
      )}

      {currentScreen === 'medicalprovider-negotiations' && (
        <View style={{ flex: 1, marginBottom: Platform.OS === 'ios' ? 80 : 70 }}>
          <NegotiationsScreen
            user={user}
            onBack={() => handleBackToMedicalProviderDashboard(medicalProviderReturnTab)}
          />
        </View>
      )}

      {currentScreen === 'medicalprovider-payment-setup' && (
        <StripeConnectOnboardingScreen
          user={user}
          onBack={handleBackToMedicalProviderDashboard}
        />
      )}

      {currentScreen === 'individual-payment-setup' && (
        <StripeConnectOnboardingScreen
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {/* Notification Screens */}
      {currentScreen === 'notifications' && (
        <NotificationInboxScreen
          user={user}
          onNavigate={handleNavigateInternal}
          onNotificationPress={(notificationId) => {
            setSelectedNotificationId(notificationId);
            setCurrentScreen('notification-detail');
          }}
        />
      )}

      {currentScreen === 'notification-detail' && (
        <NotificationDetailScreen
          user={user}
          notificationId={selectedNotificationId}
          onBack={() => {
            setSelectedNotificationId(null);
            setCurrentScreen('notifications');
          }}
          onNavigate={handleNavigateInternal}
        />
      )}

      {/* Chat Screens */}
      {currentScreen === 'chat-list' && (
        <ChatListScreen
          user={user}
          onNavigateToConversation={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('chat-conversation');
          }}
          onNavigateToNewChat={() => {
            setCurrentScreen('new-chat');
          }}
        />
      )}

      {currentScreen === 'new-chat' && (
        <NewChatScreen
          user={user}
          onBack={() => {
            setCurrentScreen('chat-list');
          }}
          onSelectConnection={(conversationId) => {
            setSelectedConversationId(conversationId);
            setCurrentScreen('chat-conversation');
          }}
        />
      )}

      {currentScreen === 'chat-conversation' && (
        <ChatConversationScreen
          user={user}
          conversationId={selectedConversationId}
          onBack={() => {
            setSelectedConversationId(null);
            setCurrentScreen('chat-list');
          }}
        />
      )}

      {currentScreen === 'treasure-chest' && (
        <TreasureChestScreen
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
          setCoins={setCoins}
          refreshKey={treasureChestRefreshKey}
        />
      )}

      {currentScreen === 'manage-subscription' && (
        <IndividualSubscriptionScreen
          user={user}
          onNavigate={handleNavigateInternal}
          onSubscriptionChanged={refreshUserProfile}
        />
      )}

      {currentScreen === 'LawFirmSubscription' && (
        <LawFirmSubscriptionScreen
          token={user?.token}
          onBack={() => setCurrentScreen('lawfirm-dashboard')}
        />
      )}

      {currentScreen === 'MedicalProviderSubscription' && (
        <MedicalProviderSubscriptionScreen
          token={user?.token}
          onBack={() => setCurrentScreen('medicalprovider-dashboard')}
        />
      )}

      {currentScreen === 'avatar-selection' && (user?.userType === 'individual' || user?.type === 'individual') && (
        <AvatarSelectionScreen
          user={user}
          onBack={() => setCurrentScreen('dashboard')}
          onAvatarSelected={handleAvatarSelected}
        />
      )}
      
        {/* Bottom Navigation - only show for individual user screens */}
        {['dashboard', 'roadmap', 'medical', 'hipaaForms', 'notifications', 'chat-list', 'chat-conversation', 'actions', 'task-detail', 'profile'].includes(currentScreen) && (
          <BottomNavigation 
            currentScreen={currentScreen}
            onNavigate={handleNavigateInternal}
            chatUnreadCount={chatUnreadCount}
          />
        )}
        
        {/* Law Firm Bottom Navigation */}
        {(() => {
          const lawFirmScreens = ['lawfirm-dashboard', 'lawfirm-send-notification', 'lawfirm-user-management', 'lawfirm-messages', 'lawfirm-disbursements', 'lawfirm-negotiations', 'lawfirm-activity-dashboard'];
          const shouldShow = lawFirmScreens.includes(currentScreen);
          console.log('[App.js] Law Firm Nav Check - Current screen:', currentScreen, 'Should show:', shouldShow);
          return shouldShow;
        })() && (
          <LawFirmBottomNavigation 
            currentScreen={currentScreen}
            onNavigate={handleNavigateInternal}
            notificationCount={0}
          />
        )}
        
        {/* Medical Provider Bottom Navigation */}
        {(() => {
          const medProviderScreens = ['medicalprovider-dashboard', 'medicalprovider-send-notification', 'medicalprovider-user-management', 'medicalprovider-hipaa-dashboard', 'medicalprovider-activity-dashboard', 'medicalprovider-billing', 'medicalprovider-disbursements'];
          const shouldShow = medProviderScreens.includes(currentScreen);
          console.log('[App.js] Medical Provider Nav Check - Current screen:', currentScreen, 'Should show:', shouldShow);
          return shouldShow;
        })() && (
          <MedicalProviderBottomNavigation 
            currentScreen={currentScreen}
            onNavigate={handleNavigateInternal}
            notificationCount={0}
          />
        )}

      {/* Global Action Video Modal - Individual Users Only */}
      {user && user.userType === 'individual' && user.avatarType && (
        <ActionVideoModal
          visible={showActionVideo}
          onClose={() => setShowActionVideo(false)}
          avatarType={user.avatarType}
          message={actionVideoData.message}
          coinsEarned={actionVideoData.coinsEarned}
        />
      )}
    </SafeAreaView>
  );
};

const CaseCompassApp = () => {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('landing');

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const appContent = (
    <SafeAreaProvider>
      <NotificationProvider user={user} onNavigate={handleNavigate}>
        <AppContent 
          user={user} 
          setUser={setUser} 
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      </NotificationProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return appContent;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
      {appContent}
    </StripeProvider>
  );
};

export default CaseCompassApp;
