import { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

let videoCounter = 0;

const POSTER_MAP = {
  '/videos/ship.mp4': '/videos/ship_poster.jpg',
  '/videos/breathing.mp4': '/videos/breathing_poster.jpg',
  '/videos/cat_mobile.mp4': '/videos/cat_mobile_poster.jpg',
  '/videos/cat_tab.mp4': '/videos/cat_tab_poster.jpg',
  '/videos/cat_desktop.mp4': '/videos/cat_desktop_poster.jpg',
};

const WebVideoBackground = ({ uri }) => {
  const idRef = useRef(`vbg-${++videoCounter}`);
  const videoElRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const containerId = idRef.current;

    const tryAttach = () => {
      const container = document.getElementById(containerId);
      if (!container) return false;

      if (videoElRef.current && videoElRef.current.parentNode) {
        videoElRef.current.parentNode.removeChild(videoElRef.current);
      }

      const video = document.createElement('video');
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');
      video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;background:#000;';

      const poster = POSTER_MAP[uri];
      if (poster) {
        video.poster = poster;
      }

      if (uri) {
        const source = document.createElement('source');
        source.src = uri;
        source.type = 'video/mp4';
        video.appendChild(source);
      }

      container.appendChild(video);

      var playAttempt = function() {
        video.play().catch(function() {
          setTimeout(playAttempt, 1000);
        });
      };
      playAttempt();

      videoElRef.current = video;
      return true;
    };

    if (!tryAttach()) {
      const timer = setTimeout(tryAttach, 100);
      const timer2 = setTimeout(tryAttach, 500);
      const timer3 = setTimeout(tryAttach, 1500);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        clearTimeout(timer3);
        if (videoElRef.current && videoElRef.current.parentNode) {
          videoElRef.current.pause();
          videoElRef.current.parentNode.removeChild(videoElRef.current);
          videoElRef.current = null;
        }
      };
    }

    return () => {
      if (videoElRef.current && videoElRef.current.parentNode) {
        videoElRef.current.pause();
        videoElRef.current.parentNode.removeChild(videoElRef.current);
        videoElRef.current = null;
      }
    };
  }, [uri]);

  if (Platform.OS !== 'web') return null;

  return (
    <View
      nativeID={idRef.current}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});

export default WebVideoBackground;
