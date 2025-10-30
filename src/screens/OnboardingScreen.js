import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    emoji: '🏴‍☠️',
    title: 'Welcome Aboard!',
    description: 'Embark on your legal journey with Verdict Path - your personal treasure map through civil litigation. Navigate the legal process with confidence.',
    color: '#8B2500',
  },
  {
    id: '2',
    emoji: '🗺️',
    title: 'Your Roadmap',
    description: 'Track your progress through 9 key stages: Pre-Litigation, Demand Letter, Filing Complaint, Discovery, Mediation, Trial Prep, Trial, Post-Trial, and Collection. Each stage guides you step-by-step.',
    color: '#2A4A6F',
  },
  {
    id: '3',
    emoji: '🎧',
    title: 'Learn with Audio & Video',
    description: 'Every stage includes audio descriptions and video tutorials that explain what\'s happening and what to expect. These educational resources are your guide through the legal process.',
    color: '#3498db',
  },
  {
    id: '4',
    emoji: '🪙',
    title: 'Earn Rewards',
    description: 'Complete milestones to earn coins, build daily streaks, and unlock achievements as you progress through your case. Stay motivated on your journey.',
    color: '#D4AF37',
  },
  {
    id: '5',
    emoji: '📋',
    title: 'Secure Documents',
    description: 'Store your medical records and legal documents safely in our HIPAA-compliant Medical Hub with bank-level encryption for your protection.',
    color: '#27ae60',
  },
  {
    id: '6',
    emoji: '⚓',
    title: 'Set Sail!',
    description: 'Ready to begin? Your legal adventure starts now. Track progress, learn the process, and navigate with confidence every step of the way.',
    color: '#8B2500',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete();
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.color }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.buttonContainer}>
        {currentIndex < onboardingData.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.nextButton, 
            currentIndex === onboardingData.length - 1 && styles.getStartedButton
          ]} 
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    color: '#F5F1E8',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1C4B0',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#8B2500',
    width: 30,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  skipButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#8B2500',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  getStartedButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 50,
  },
  nextText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
