import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const AvatarVideoBackground = ({ videoSource, opacity = 0.6 }) => {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [videoSource]);

  const loadVideo = async () => {
    if (videoRef.current) {
      try {
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

  const isLargeScreen = width >= 768;
  const isDesktop = width >= 1024;
  
  const videoResizeMode = isDesktop ? ResizeMode.COVER : ResizeMode.COVER;

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
        resizeMode={videoResizeMode}
        style={[
          styles.video,
          {
            width: width,
            height: height,
            minWidth: '100%',
            minHeight: '100%',
          }
        ]}
        onLoad={() => {
          console.log('[AvatarVideoBackground] Video loaded');
          setIsReady(true);
        }}
        onError={(error) => {
          console.error('[AvatarVideoBackground] Error:', error);
        }}
      />
      
      <LinearGradient
        colors={[
          `rgba(0, 0, 0, ${opacity * 0.4})`,
          `rgba(0, 0, 0, ${opacity * 0.7})`,
          `rgba(0, 0, 0, ${opacity})`
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
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
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
