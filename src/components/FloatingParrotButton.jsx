import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Platform
} from 'react-native';
import ParrotNavigator from './ParrotNavigator';

const FloatingParrotButton = ({ onNavigate, userType = 'individual', style }) => {
  const [showNavigator, setShowNavigator] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    );
    bounceLoop.start();

    const tooltipTimer = setTimeout(() => {
      setShowTooltip(true);
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();

      setTimeout(() => {
        Animated.timing(tooltipAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start(() => setShowTooltip(false));
      }, 4000);
    }, 3000);

    return () => {
      bounceLoop.stop();
      clearTimeout(tooltipTimer);
    };
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();

    setShowNavigator(true);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg']
  });

  return (
    <>
      <View style={[styles.container, style]}>
        {showTooltip && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: tooltipAnim,
                transform: [{
                  translateX: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <Text style={styles.tooltipText}>Need help navigating? 🗺️</Text>
            <View style={styles.tooltipArrow} />
          </Animated.View>
        )}
        
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              transform: [
                { scale: bounceAnim },
                { rotate: rotateInterpolate }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.parrotEmoji}>🦜</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ParrotNavigator
        visible={showNavigator}
        onClose={() => setShowNavigator(false)}
        onNavigate={onNavigate}
        userType={userType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    zIndex: 1000,
    alignItems: 'flex-end'
  },
  buttonWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0d2f54',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  parrotEmoji: {
    fontSize: 28
  },
  tooltip: {
    position: 'absolute',
    right: 70,
    bottom: 12,
    backgroundColor: '#0d2f54',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center'
  },
  tooltipText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500'
  },
  tooltipArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent'
  }
});

export default FloatingParrotButton;
