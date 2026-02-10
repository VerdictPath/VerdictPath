import React, { useEffect, useRef, useCallback, memo } from 'react';
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
  const currentUriRef = useRef(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef(null);

  const cleanupVideo = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (videoElRef.current) {
      try {
        videoElRef.current.pause();
        videoElRef.current.src = '';
        if (videoElRef.current.parentNode) {
          videoElRef.current.parentNode.removeChild(videoElRef.current);
        }
      } catch (e) {}
      videoElRef.current = null;
    }
    currentUriRef.current = null;
  }, []);

  const createVideo = useCallback((container, videoUri) => {
    if (!mountedRef.current || !container || !videoUri) return;

    if (currentUriRef.current === videoUri && videoElRef.current && videoElRef.current.parentNode) {
      return;
    }

    cleanupVideo();

    if (!mountedRef.current) return;

    var poster = POSTER_MAP[videoUri];

    var video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');

    var cssRules = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'display:block',
      'will-change:transform',
      'backface-visibility:hidden',
      '-webkit-backface-visibility:hidden',
      'transform:translateZ(0)',
      '-webkit-transform:translateZ(0)',
    ];

    if (poster) {
      video.poster = poster;
      cssRules.push('background:url(' + poster + ') center/cover no-repeat');
    }

    video.style.cssText = cssRules.join(';');

    video.addEventListener('ended', function() {
      if (mountedRef.current && videoElRef.current === video) {
        video.currentTime = 0;
        video.play().catch(function() {});
      }
    });

    video.src = videoUri;

    container.appendChild(video);
    videoElRef.current = video;
    currentUriRef.current = videoUri;

    var playAttempts = 0;
    var maxAttempts = 8;
    var tryPlay = function() {
      if (!mountedRef.current || videoElRef.current !== video) return;
      video.play().then(function() {}).catch(function() {
        playAttempts++;
        if (playAttempts < maxAttempts && mountedRef.current) {
          retryTimerRef.current = setTimeout(tryPlay, 300 * playAttempts);
        }
      });
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('canplay', function onCanPlay() {
        video.removeEventListener('canplay', onCanPlay);
        tryPlay();
      });
      retryTimerRef.current = setTimeout(tryPlay, 500);
    }
  }, [cleanupVideo]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    mountedRef.current = true;

    var attachAttempts = 0;
    var maxAttachAttempts = 10;

    var attachVideo = function() {
      if (!mountedRef.current) return;

      var el = containerRef.current;
      if (!el) {
        attachAttempts++;
        if (attachAttempts < maxAttachAttempts) {
          retryTimerRef.current = setTimeout(attachVideo, 100);
        }
        return;
      }

      var domNode = el;
      if (typeof el.getBoundingClientRect !== 'function') {
        if (el._nativeTag) {
          domNode = el._nativeTag;
        }
      }

      if (domNode && uri) {
        createVideo(domNode, uri);
      }
    };

    requestAnimationFrame(function() {
      if (mountedRef.current) {
        attachVideo();
      }
    });

    return function() {
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

export default memo(WebVideoBackground);
