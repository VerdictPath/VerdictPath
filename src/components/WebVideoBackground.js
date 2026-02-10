import { useEffect, useRef, useCallback } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

const POSTER_MAP = {
  '/videos/ship.mp4': '/videos/ship_poster.jpg',
  '/videos/breathing.mp4': '/videos/breathing_poster.jpg',
  '/videos/cat_mobile.mp4': '/videos/cat_mobile_poster.jpg',
  '/videos/cat_tab.mp4': '/videos/cat_tab_poster.jpg',
  '/videos/cat_desktop.mp4': '/videos/cat_desktop_poster.jpg',
};

const WebVideoBackground = ({ uri }) => {
  const containerRef = useRef(null);
  const videoElRef = useRef(null);
  const mountedRef = useRef(true);

  const cleanupVideo = useCallback(() => {
    if (videoElRef.current) {
      try {
        videoElRef.current.pause();
        videoElRef.current.removeAttribute('src');
        videoElRef.current.load();
        if (videoElRef.current.parentNode) {
          videoElRef.current.parentNode.removeChild(videoElRef.current);
        }
      } catch (e) {}
      videoElRef.current = null;
    }
  }, []);

  const createVideo = useCallback((container, videoUri) => {
    cleanupVideo();

    if (!mountedRef.current || !container || !videoUri) return;

    const video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('crossorigin', 'anonymous');
    video.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'display:block',
    ].join(';');

    const poster = POSTER_MAP[videoUri];
    if (poster) {
      video.poster = poster;
      video.style.background = 'url(' + poster + ') center/cover no-repeat';
    }

    const source = document.createElement('source');
    source.src = videoUri;
    source.type = 'video/mp4';
    video.appendChild(source);

    container.appendChild(video);
    videoElRef.current = video;

    var attempts = 0;
    var tryPlay = function() {
      if (!mountedRef.current || !videoElRef.current) return;
      video.play().then(function() {}).catch(function() {
        attempts++;
        if (attempts < 5 && mountedRef.current) {
          setTimeout(tryPlay, 500 * attempts);
        }
      });
    };
    tryPlay();
  }, [cleanupVideo]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    mountedRef.current = true;

    const attachVideo = () => {
      const el = containerRef.current;
      if (!el) return;

      let domNode = el;
      if (typeof el.getBoundingClientRect === 'function') {
        domNode = el;
      } else if (el._nativeTag) {
        domNode = el._nativeTag;
      }

      if (domNode && uri) {
        createVideo(domNode, uri);
      }
    };

    requestAnimationFrame(attachVideo);

    return () => {
      mountedRef.current = false;
      cleanupVideo();
    };
  }, [uri, createVideo, cleanupVideo]);

  if (Platform.OS !== 'web') return null;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      pointerEvents="none"
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
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 0,
  },
});

export default WebVideoBackground;
