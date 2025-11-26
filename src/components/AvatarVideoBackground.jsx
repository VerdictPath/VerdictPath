import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const AvatarVideoBackground = ({ videoSource, opacity = 0.6 }) => {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;
  
  const aspectRatio = height / width;
  const isTallDevice = aspectRatio > 1.8;
  const isShortDevice = aspectRatio < 1.5;

  useEffect(() => {
    loadVideo();
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [videoSource]);

  const loadVideo = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(videoSource, {
          shouldPlay: true,
          isLooping: true,
          isMuted: true,
          volume: 0,
        });
        setIsReady(true);
      } catch (error) {
        console.error('[AvatarVideoBackground] Load error:', error);
      }
    }
  };

  const getVideoStyle = () => {
    const baseStyle = {
      position: 'absolute',
    };

    if (isLargeDesktop) {
      return {
        ...baseStyle,
        width: width * 1.1,
        height: height * 1.1,
        top: -height * 0.05,
        left: -width * 0.05,
      };
    }

    if (isDesktop) {
      return {
        ...baseStyle,
        width: width,
        height: height,
        top: 0,
        left: 0,
      };
    }

    if (isTablet) {
      const scale = isTallDevice ? 1.15 : 1.05;
      return {
        ...baseStyle,
        width: width * scale,
        height: height * scale,
        top: -height * ((scale - 1) / 2),
        left: -width * ((scale - 1) / 2),
      };
    }

    if (isTallDevice) {
      return {
        ...baseStyle,
        width: width * 1.3,
        height: height,
        top: 0,
        left: -width * 0.15,
      };
    }

    if (isShortDevice) {
      return {
        ...baseStyle,
        width: width,
        height: height * 1.2,
        top: -height * 0.1,
        left: 0,
      };
    }

    return {
      ...baseStyle,
      width: width * 1.1,
      height: height * 1.1,
      top: -height * 0.05,
      left: -width * 0.05,
    };
  };

  const getGradientOpacity = () => {
    if (isSmallPhone) {
      return {
        top: opacity * 0.5,
        middle: opacity * 0.75,
        bottom: opacity * 1.1,
      };
    }
    if (isPhone) {
      return {
        top: opacity * 0.4,
        middle: opacity * 0.7,
        bottom: opacity,
      };
    }
    if (isTablet) {
      return {
        top: opacity * 0.35,
        middle: opacity * 0.65,
        bottom: opacity * 0.95,
      };
    }
    return {
      top: opacity * 0.3,
      middle: opacity * 0.6,
      bottom: opacity * 0.9,
    };
  };

  const gradientOpacity = getGradientOpacity();

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={videoSource}
        rate={1.0}
        volume={0}
        isMuted={true}
        isLooping={true}
        shouldPlay={true}
        resizeMode={ResizeMode.COVER}
        style={[styles.video, getVideoStyle()]}
        onLoad={() => {
          console.log('[AvatarVideoBackground] Video loaded');
          setIsReady(true);
        }}
        onError={(error) => {
          console.error('[AvatarVideoBackground] Error:', error);
        }}
        posterStyle={styles.poster}
        usePoster={!isReady}
      />
      
      <LinearGradient
        colors={[
          `rgba(0, 0, 0, ${gradientOpacity.top})`,
          `rgba(0, 0, 0, ${gradientOpacity.middle})`,
          `rgba(0, 0, 0, ${gradientOpacity.bottom})`
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#0A1128',
  },
  video: {
    backgroundColor: '#0A1128',
  },
  poster: {
    backgroundColor: '#0A1128',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default AvatarVideoBackground;
