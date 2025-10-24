import React, { useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { commonStyles } from './src/styles/commonStyles';
import { LITIGATION_STAGES, USER_TYPES } from './src/constants/mockData';
import { calculateDailyBonus, calculateCreditsFromCoins, calculateCoinsNeeded } from './src/utils/gamification';
import { apiRequest, API_ENDPOINTS } from './src/config/api';
import alert from './src/utils/alert';

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

const CaseCompassApp = () => {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [userType, setUserType] = useState(USER_TYPES.INDIVIDUAL);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firmCode, setFirmCode] = useState('');

  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [firmSize, setFirmSize] = useState('small');

  const [litigationStages, setLitigationStages] = useState(LITIGATION_STAGES);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [medicalHubUploads, setMedicalHubUploads] = useState({
    medicalBills: [],
    medicalRecords: []
  });
  
  const [selectedClientId, setSelectedClientId] = useState(null);

  const authToken = user?.token || null;

  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setCurrentScreen('subscription');
  };

  const handleSelectSubscription = async (tier, size) => {
    setSubscriptionTier(tier);
    setFirmSize(size);
    
    if (tier === 'free') {
      try {
        let response;
        let userData;
        
        if (userType === USER_TYPES.LAW_FIRM) {
          const firmCode = `FIRM${Date.now()}`;
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_LAWFIRM, {
            method: 'POST',
            body: JSON.stringify({
              firmName: email.split('@')[0] + ' Law Firm',
              firmCode: firmCode,
              email: email,
              password: password
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
          const providerCode = `MED${Date.now()}`;
          console.log('Registering medical provider:', { providerCode, email });
          
          response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_MEDICALPROVIDER, {
            method: 'POST',
            body: JSON.stringify({
              providerName: email.split('@')[0] + ' Medical Center',
              providerCode: providerCode,
              email: email,
              password: password
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
              firstName: email.split('@')[0],
              lastName: 'User',
              email: email,
              password: password,
              lawFirmCode: firmCode || null,
              avatarType: 'captain',
              subscriptionTier: tier,
              subscriptionPrice: 0
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
        
        Alert.alert(
          '🎉 Welcome to Verdict Path!',
          'Your free account has been created successfully!'
        );
      } catch (error) {
        console.error('Registration Error Details:', error);
        const errorMsg = error.message || error.toString() || 'Failed to create account. Please try again.';
        Alert.alert('Registration Error', errorMsg);
      }
    } else {
      Alert.alert(
        'Payment Required',
        'In a production app, you would now proceed to payment. For this demo, your account has been created with a free trial.',
        [{ text: 'OK', onPress: () => setCurrentScreen('login') }]
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    if (userType === USER_TYPES.LAW_FIRM) {
      try {
        const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
          method: 'POST',
          body: JSON.stringify({ email, password, userType: 'lawfirm' })
        });
        
        const userData = {
          id: response.user.id,
          email: response.user.email,
          type: USER_TYPES.LAW_FIRM,
          firmName: response.user.firmName,
          firmCode: response.user.firmCode,
          token: response.token,
          coins: 150,
          streak: 3
        };
        
        setUser(userData);
        setCoins(150);
        setLoginStreak(3);
        setIsLoggedIn(true);
        setCurrentScreen('lawfirm-dashboard');
      } catch (error) {
        Alert.alert('Error', 'Login failed. Please check your credentials.');
      }
    } else {
      const userData = {
        id: 1,
        email: email,
        type: userType,
        subscription: subscriptionTier,
        firmSize: firmSize,
        coins: 150,
        streak: 3
      };
      
      setUser(userData);
      setCoins(150);
      setLoginStreak(3);
      setIsLoggedIn(true);
      setCurrentScreen('dashboard');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentScreen('landing');
  };

  const handleClaimDailyBonus = () => {
    const bonus = calculateDailyBonus(loginStreak + 1);
    setCoins(coins + bonus);
    setLoginStreak(loginStreak + 1);
    Alert.alert('Daily Bonus!', `You earned ${bonus} coins! ${loginStreak + 1} day streak! 🎉`);
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
    setLitigationStages(prevStages => 
      prevStages.map(s => 
        s.id === stageId && !s.completed ? { ...s, completed: true } : s
      )
    );
    
    if (user && user.token) {
      try {
        const response = await apiRequest(API_ENDPOINTS.COINS.UPDATE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            coinsDelta: stageCoins,
            source: `stage_completed:${stageId}`
          })
        });
        
        setCoins(response.totalCoins);
        Alert.alert('🎉 Congratulations!', `You completed this stage and earned ${stageCoins} coins!`);
      } catch (error) {
        console.error('Failed to update coins:', error);
        setCoins(prevCoins => prevCoins + stageCoins);
        Alert.alert('🎉 Congratulations!', `You completed this stage and earned ${stageCoins} coins!`);
      }
    } else {
      setCoins(prevCoins => prevCoins + stageCoins);
      Alert.alert('🎉 Congratulations!', `You completed this stage and earned ${stageCoins} coins!`);
    }
  };

  const handleUncompleteStage = async (stageId, stageCoins) => {
    const currentStage = litigationStages.find(s => s.id === stageId);
    if (!currentStage || !currentStage.completed) return;
    
    let totalCoinsToRemove = stageCoins;
    const completedSubStages = currentStage.subStages?.filter(s => s.completed) || [];
    completedSubStages.forEach(subStage => {
      totalCoinsToRemove += subStage.coins;
    });
    
    if (user && user.token) {
      try {
        const response = await apiRequest(API_ENDPOINTS.COINS.UPDATE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            coinsDelta: -totalCoinsToRemove,
            source: `stage_reverted:${stageId}`
          })
        });
        
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
        
        setCoins(response.totalCoins);
        Alert.alert('Stage Reverted', `This stage is now marked as incomplete. ${totalCoinsToRemove} coins removed.`);
        
      } catch (error) {
        console.error('Failed to revert coins:', error);
        
        if (error.message && error.message.includes('Cannot refund all coins')) {
          try {
            const errorData = JSON.parse(error.message.match(/\{.*\}/)?.[0] || '{}');
            const maxRefund = errorData.maxRefund || 0;
            const coinsSpent = errorData.coinsSpent || 0;
            
            Alert.alert(
              '⚠️ Cannot Fully Revert',
              `You've already converted ${coinsSpent} coins to credits.\n\nOnly ${maxRefund} coins can be refunded.\n\nTo revert this stage, you'll lose those converted coins permanently.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revert Anyway',
                  style: 'destructive',
                  onPress: async () => {
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
                    
                    setCoins(prevCoins => Math.max(0, prevCoins - maxRefund));
                    Alert.alert('Stage Reverted', `Stage reverted. ${maxRefund} coins removed.`);
                  }
                }
              ]
            );
          } catch (parseError) {
            Alert.alert('Error', 'Cannot revert this stage - some coins were already converted to credits.');
          }
        } else {
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
          
          setCoins(prevCoins => Math.max(0, prevCoins - totalCoinsToRemove));
          Alert.alert('Stage Reverted', `This stage is now marked as incomplete. ${totalCoinsToRemove} coins removed.`);
        }
      }
    } else {
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
      
      setCoins(prevCoins => {
        const newBalance = Math.max(0, prevCoins - totalCoinsToRemove);
        if (newBalance === 0 && prevCoins < totalCoinsToRemove) {
          console.warn(`Coin underflow prevented: attempted to remove ${totalCoinsToRemove} coins but only had ${prevCoins}`);
        }
        return newBalance;
      });
      Alert.alert('Stage Reverted', `This stage is now marked as incomplete. ${totalCoinsToRemove} coins removed.`);
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
              setCoins(prevCoins => prevCoins + subStageCoins);
              // Note: Success alert is shown in RoadmapScreen after backend completion
              return { ...subStage, completed: true };
            }
            return subStage;
          });

          const allSubStagesComplete = updatedSubStages.every(sub => sub.completed);
          
          if (allSubStagesComplete && !stage.completed && updatedSubStages.length > 0) {
            setCoins(prevCoins => prevCoins + stage.coins);
            // Note: Success alert is shown in RoadmapScreen after backend completion
            return { ...stage, subStages: updatedSubStages, completed: true };
          }

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

  const handleNavigate = (screen) => {
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

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {currentScreen === 'landing' && (
        <LandingScreen onNavigate={handleNavigate} />
      )}
      
      {currentScreen === 'register' && (
        <RegisterScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          userType={userType}
          setUserType={setUserType}
          firmCode={firmCode}
          setFirmCode={setFirmCode}
          onRegister={handleRegister}
          onNavigate={handleNavigate}
        />
      )}
      
      {currentScreen === 'subscription' && (
        <SubscriptionSelectionScreen
          userType={userType}
          onSelectSubscription={handleSelectSubscription}
          onNavigate={handleNavigate}
        />
      )}
      
      {currentScreen === 'login' && (
        <LoginScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onLogin={handleLogin}
          onNavigate={handleNavigate}
        />
      )}
      
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          user={user}
          coins={coins}
          loginStreak={loginStreak}
          onClaimBonus={handleClaimDailyBonus}
          onConvertCoins={handleConvertCoinsToCredits}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'roadmap' && (
        <RoadmapScreen
          litigationStages={litigationStages}
          onCompleteStage={handleCompleteStage}
          onUncompleteStage={handleUncompleteStage}
          onNavigate={handleNavigate}
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
        <VideosScreen onNavigate={handleNavigate} />
      )}
      
      {currentScreen === 'medical' && (
        <MedicalHubScreen 
          onNavigate={handleNavigate} 
          onUploadMedicalDocument={handleMedicalHubUpload}
          medicalHubUploads={medicalHubUploads}
          authToken={authToken}
        />
      )}
      
      {currentScreen === 'hipaaForms' && (
        <HIPAAFormsScreen onNavigate={handleNavigate} />
      )}
      
      {currentScreen === 'lawfirm-dashboard' && (
        <LawFirmDashboardScreen
          user={user}
          onNavigateToClient={handleNavigateToClient}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      
      {currentScreen === 'lawfirm-client-details' && (
        <LawFirmClientDetailsScreen
          user={user}
          clientId={selectedClientId}
          onBack={handleBackToLawFirmDashboard}
        />
      )}
      
      {currentScreen === 'medicalprovider-dashboard' && (
        <MedicalProviderDashboardScreen
          user={user}
          onNavigateToPatient={() => {}}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
    </SafeAreaView>
  );
};

export default CaseCompassApp;
