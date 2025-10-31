// APP VERSION 1.0.4 - Stripe Payment Integration
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeProvider } from '@stripe/stripe-react-native';
import { commonStyles } from './src/styles/commonStyles';
import { theme } from './src/styles/theme';
import { LITIGATION_STAGES, USER_TYPES } from './src/constants/mockData';
import { calculateDailyBonus, calculateCreditsFromCoins, calculateCoinsNeeded } from './src/utils/gamification';
import { apiRequest, API_ENDPOINTS } from './src/config/api';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
import NotificationService from './src/services/NotificationService';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SubscriptionSelectionScreen from './src/screens/SubscriptionSelectionScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import VideosScreen from './src/screens/VideosScreen';
import MedicalHubScreen from './src/screens/MedicalHubScreen';
import HIPAAFormsScreen from './src/screens/HIPAAFormsScreen';
import LawFirmDashboardScreen from './src/screens/LawFirmDashboardScreen';
import LawFirmClientDetailsScreen from './src/screens/LawFirmClientDetailsScreen';
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
import MedicalProviderEventRequestsScreen from './src/screens/MedicalProviderEventRequestsScreen';
import ClientEventRequestsScreen from './src/screens/ClientEventRequestsScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import BottomNavigation from './src/components/BottomNavigation';

const AppContent = ({ user, setUser, currentScreen, setCurrentScreen }) => {
  const notificationContext = useNotifications();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [userType, setUserType] = useState(USER_TYPES.INDIVIDUAL);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [coins, setCoins] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  const authToken = user?.token || null;
  const notificationCleanupRef = useRef(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingStatus === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(true);
      }
    };

    checkOnboardingStatus();
  }, []);

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
        setCurrentScreen('videos');
      } else if (url.includes('dashboard')) {
        setCurrentScreen('dashboard');
      }
    }
  };

  const handleOnboardingComplete = () => {
    setHasSeenOnboarding(true);
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
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_CLIENT, {
            method: 'POST',
            body: JSON.stringify({
              firstName: firstName,
              lastName: lastName,
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
        Alert.alert('Registration Error', error.message || 'Failed to create account. Please try again.');
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
      
      if (userType === USER_TYPES.LAW_FIRM) {
        apiUserType = 'lawfirm';
        targetScreen = 'lawfirm-dashboard';
      } else if (userType === USER_TYPES.MEDICAL_PROVIDER) {
        apiUserType = 'medical_provider';
        targetScreen = 'medicalprovider-dashboard';
      } else {
        apiUserType = 'individual';
        targetScreen = 'dashboard';
      }
      
      console.log('[Login] API userType:', apiUserType, 'Target screen:', targetScreen);
      
      const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password, userType: apiUserType })
      });
      
      console.log('[Login] Login successful, user:', response.user);
      
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
        setCoins(response.totalCoins);
        setLoginStreak(response.newStreak);
        Alert.alert('Daily Bonus!', response.message);
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
      Alert.alert('🎉 Congratulations!', `You completed this stage (offline mode)!`);
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
      
      if (actualCoinsEarned > 0) {
        Alert.alert('🎉 Congratulations!', `You completed this stage and earned ${actualCoinsEarned} coins!`);
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
    
    if (user && user.token) {
      try {
        // Call backend to revert the stage
        const response = await apiRequest(API_ENDPOINTS.LITIGATION.REVERT_STAGE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            stageId: stageId
          })
        });
        
        // Update local state to reflect the revert
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
              // Note: Success alert is shown in RoadmapScreen after backend completion
              return { ...subStage, completed: true };
            }
            return subStage;
          });

          // DON'T auto-complete the stage here - user must explicitly click "Complete Stage" button
          // This prevents coin farming by ensuring stage bonus goes through backend validation
          return { ...stage, subStages: updatedSubStages };
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

    // Create a Set of completed backend IDs (format: '1-0', '2-1', etc.)
    const completedIds = new Set(
      completedSubstagesData.completedSubstages.map(sub => sub.substage_id)
    );

    // Deep clone LITIGATION_STAGES to avoid state contamination
    return JSON.parse(JSON.stringify(LITIGATION_STAGES)).map(stage => {
      return {
        ...stage,
        completed: completedSubstagesData.completedStages?.some(s => s.stage_id === stage.id) || false,
        subStages: stage.subStages?.map((subStage, index) => {
          // Backend uses format like '1-0', '1-1', '2-0', '2-1'
          // Frontend uses format like 'pre-1', 'pre-2', 'cf-1', 'cf-2'
          // We need to convert frontend index to backend format: `${stageId}-${index}`
          const backendId = `${stage.id}-${index}`;
          
          return {
            ...subStage,
            completed: completedIds.has(backendId)
          };
        }) || []
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

  const handleBackToLawFirmDashboard = () => {
    setSelectedClientId(null);
    setCurrentScreen('lawfirm-dashboard');
  };

  const handleBackToMedicalProviderDashboard = () => {
    setSelectedPatientId(null);
    setCurrentScreen('medicalprovider-dashboard');
  };

  if (hasSeenOnboarding === null) {
    return null;
  }

  if (hasSeenOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

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
      
      {currentScreen === 'privacy-policy' && (
        <PrivacyPolicyScreen
          onBack={() => setCurrentScreen('register')}
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
      
      {currentScreen === 'videos' && (
        <VideosScreen onNavigate={handleNavigateInternal} />
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
          user={user}
          onNavigate={handleNavigateInternal}
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
          onNavigateToPatient={(patientId) => {
            setSelectedPatientId(patientId);
            setCurrentScreen('medicalprovider-patient-details');
          }}
          onNavigate={handleNavigateInternal}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'medicalprovider-patient-details' && (
        <MedicalProviderPatientDetailsScreen
          user={user}
          patientId={selectedPatientId}
          onBack={() => {
            setSelectedPatientId(null);
            setCurrentScreen('medicalprovider-dashboard');
          }}
        />
      )}

      {currentScreen === 'medicalprovider-send-notification' && (
        <MedicalProviderSendNotificationScreen
          user={user}
          onBack={handleBackToMedicalProviderDashboard}
        />
      )}

      {currentScreen === 'medicalprovider-notification-analytics' && (
        <LawFirmNotificationAnalyticsScreen
          user={user}
          onBack={handleBackToMedicalProviderDashboard}
        />
      )}

      {currentScreen === 'medicalprovider-event-requests' && (
        <MedicalProviderEventRequestsScreen
          user={user}
          onBack={handleBackToMedicalProviderDashboard}
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

      {currentScreen === 'payment' && (
        <PaymentScreen
          route={{
            params: {
              amount: 29.99,
              description: 'Premium Subscription - 1 Month',
              subscriptionTier: 'Premium'
            }
          }}
          navigation={{
            navigate: handleNavigateInternal,
            goBack: () => setCurrentScreen('dashboard')
          }}
        />
      )}
      
        {/* Bottom Navigation - only show for individual user screens */}
        {['dashboard', 'roadmap', 'medical', 'videos', 'hipaaForms', 'notifications'].includes(currentScreen) && (
          <BottomNavigation 
            currentScreen={currentScreen}
            onNavigate={handleNavigateInternal}
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

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
      <NotificationProvider user={user} onNavigate={handleNavigate}>
        <AppContent 
          user={user} 
          setUser={setUser} 
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      </NotificationProvider>
    </StripeProvider>
  );
};

export default CaseCompassApp;
