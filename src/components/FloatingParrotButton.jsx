import React, { useState, useRef, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Animated, 
  Modal,
  StyleSheet,
  View,
  Text,
  Platform,
  Image
} from 'react-native';
import ParrotNavigator from './ParrotNavigator';

const PollyImage = require('../../attached_assets/Polly_Profile_Left_w_Hat_1765858321178.png');

const FloatingParrotButton = ({ onNavigate, userType = 'individual' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();

    Animated.timing(tooltipAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    const tooltipTimer = setTimeout(() => {
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setShowTooltip(false));
    }, 5000);

    return () => {
      pulse.stop();
      clearTimeout(tooltipTimer);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePress = () => {
    setIsVisible(true);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.floatingButton,
          Platform.OS === 'web' ? {
            transform: [{ scale: 1 }]
          } : {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) }
            ]
          }
        ]}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.buttonTouchable}
        >
          <View style={styles.buttonContent}>
            <Image source={PollyImage} style={styles.pollyImage} />
            <View style={styles.pulseRing} />
          </View>
        </TouchableOpacity>

        {showTooltip && (
          <Animated.View
            style={[
              styles.tooltip,
              Platform.OS === 'web' ? {
                opacity: 1,
              } : {
                opacity: tooltipAnim,
                transform: [
                  {
                    translateX: tooltipAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.tooltipContent}>
              <Text style={styles.tooltipText}>Need help navigating? Tap me! 🗺️</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <ParrotNavigator 
          onNavigate={onNavigate}
          onClose={() => setIsVisible(false)}
          userType={userType}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  buttonTouchable: {
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 35, 126, 0.95)',
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
  },
  pollyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'cover',
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    right: 80,
    top: 15,
    maxWidth: 180,
  },
  tooltipContent: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(26, 35, 126, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  tooltipText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FloatingParrotButton;
