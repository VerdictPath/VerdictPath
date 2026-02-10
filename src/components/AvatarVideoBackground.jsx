import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Video, ResizeMode } from '../utils/safeAVImport';
import { LinearGradient } from 'expo-linear-gradient';

const AvatarVideoBackground = ({ videoSource, webVideoUri, opacity = 0.6 }) => {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const webVideoRef = useRef(null);

  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    loadVideo();
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [videoSource]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !webVideoUri) return;

    const container = webVideoRef.current;
    if (!container) return;

    container.innerHTML = '';

    const vid = document.createElement('video');
    vid.src = webVideoUri;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.setAttribute('playsinline', '');
    vid.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease-in-out;';

    const reveal = () => {
      if (vid.currentTime > 0.05) {
        requestAnimationFrame(() => {
          vid.style.opacity = '1';
        });
      }
    };

    vid.addEventListener('playing', () => {
      setTimeout(reveal, 50);
    });

    vid.addEventListener('timeupdate', function onTime() {
      if (vid.currentTime > 0.1) {
        vid.removeEventListener('timeupdate', onTime);
        requestAnimationFrame(() => {
          vid.style.opacity = '1';
        });
      }
    });

    container.appendChild(vid);
    vid.play().catch(() => {});

    return () => {
      vid.pause();
      vid.src = '';
      container.innerHTML = '';
    };
  }, [webVideoUri]);

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
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: width,
      height: height,
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
      {Platform.OS === 'web' ? (
        webVideoUri ? (
          <div
            ref={webVideoRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              backgroundColor: '#0A1128',
            }}
          />
        ) : null
      ) : Video ? (
        <Video
          ref={videoRef}
          source={videoSource}
          rate={1.0}
          volume={0}
          isMuted={true}
          isLooping={true}
          shouldPlay={true}
          resizeMode={ResizeMode.CONTAIN}
          style={[styles.video, getVideoStyle()]}
          onLoad={() => {
            setIsReady(true);
          }}
          onError={(error) => {
            console.error('[AvatarVideoBackground] Error:', error);
          }}
          posterStyle={styles.poster}
          usePoster={!isReady}
        />
      ) : null}
      
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
