import { useEffect } from 'react';
import { Platform } from 'react-native';

const WebVideoBackground = ({ uri }) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (window.__setVideoBg && uri) {
      window.__setVideoBg(uri);
    }
    if (window.__showVideoBg) {
      window.__showVideoBg(true);
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
