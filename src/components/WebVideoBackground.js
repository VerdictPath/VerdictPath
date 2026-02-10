import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const WebVideoBackground = ({ uri }) => {
  const prevUri = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (window.__showVideoBg) {
      window.__showVideoBg(true);
    }

    if (uri && uri !== prevUri.current) {
      if (window.__setVideoBg) {
        window.__setVideoBg(uri);
      }
      prevUri.current = uri;
    }

    return () => {
      if (window.__showVideoBg) {
        window.__showVideoBg(false);
      }
    };
  }, [uri]);

  return null;
};

export default WebVideoBackground;
