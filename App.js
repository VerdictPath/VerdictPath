import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Alert } from 'react-native';
import { commonStyles } from './src/styles/commonStyles';
import { LITIGATION_STAGES, USER_TYPES } from './src/constants/mockData';
import { calculateDailyBonus, calculateCreditsFromCoins, calculateCoinsNeeded } from './src/utils/gamification';

import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import VideosScreen from './src/screens/VideosScreen';
import MedicalHubScreen from './src/screens/MedicalHubScreen';

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

  const [litigationStages, setLitigationStages] = useState(LITIGATION_STAGES);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    setCurrentScreen('login');
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setUser({
      id: 1,
      email: email,
      type: userType,
      subscription: 'free',
      coins: 150,
      streak: 3
    });
    setCoins(150);
    setLoginStreak(3);
    setIsLoggedIn(true);
    setCurrentScreen('dashboard');
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

  const handleConvertCoinsToCredits = () => {
    const actualCredits = calculateCreditsFromCoins(coins);
    const coinsNeeded = calculateCoinsNeeded(actualCredits);
    
    if (actualCredits === 0) {
      Alert.alert('Not Enough Coins', 'You need at least 500 coins to convert to credits.');
      return;
    }
    
    Alert.alert(
      'Convert Coins',
      `Convert ${coinsNeeded} coins to $${actualCredits} in credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Convert', onPress: () => {
          setCoins(coins - coinsNeeded);
          Alert.alert('Success!', `$${actualCredits} added to your account credits!`);
        }}
      ]
    );
  };

  const handleCompleteStage = (stageId, stageCoins) => {
    setLitigationStages(prevStages => 
      prevStages.map(s => 
        s.id === stageId && !s.completed ? { ...s, completed: true } : s
      )
    );
    setCoins(prevCoins => prevCoins + stageCoins);
    Alert.alert('🎉 Congratulations!', `You completed this stage and earned ${stageCoins} coins!`);
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
              Alert.alert(
                '🎉 Congratulations!',
                `You earned ${subStageCoins} coins for completing "${subStage.name}"!`
              );
              return { ...subStage, completed: true };
            }
            return subStage;
          });

          const allSubStagesComplete = updatedSubStages.every(sub => sub.completed);
          
          if (allSubStagesComplete && !stage.completed && updatedSubStages.length > 0) {
            setCoins(prevCoins => prevCoins + stage.coins);
            Alert.alert(
              '🏆 Stage Complete!',
              `You completed "${stage.name}" and earned ${stage.coins} bonus coins!`
            );
            return { ...stage, subStages: updatedSubStages, completed: true };
          }

          return { ...stage, subStages: updatedSubStages };
        }
        return stage;
      })
    );
  };

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
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
          onNavigate={handleNavigate}
          selectedAvatar={selectedAvatar}
          onSelectAvatar={setSelectedAvatar}
          onToggleStage={handleToggleStage}
          onCompleteSubStage={handleCompleteSubStage}
        />
      )}
      
      {currentScreen === 'videos' && (
        <VideosScreen onNavigate={handleNavigate} />
      )}
      
      {currentScreen === 'medical' && (
        <MedicalHubScreen onNavigate={handleNavigate} />
      )}
    </SafeAreaView>
  );
};

export default CaseCompassApp;
