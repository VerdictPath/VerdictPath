import { Platform } from 'react-native';
import { AVATARS, AMBIENT_SOUNDS, MUSIC_PREFERENCES } from '../constants/avatars';

let Audio = null;
if (Platform.OS !== 'web') {
  try {
    const expoAV = require('expo-av');
    Audio = expoAV.Audio;
  } catch (e) {
    console.warn('[BackgroundMusic] expo-av not available:', e);
  }
}

class BackgroundMusicService {
  constructor() {
    this.sound = null;
    this.webAudio = null;
    this.currentSource = null;
    this.isPlaying = false;
    this.volume = 0.7;
    this.preference = MUSIC_PREFERENCES.OFF;
    this.avatarType = 'captain';
    this.isLoading = false;
    this.fadeInterval = null;
  }

  getAvatarConfig(avatarType) {
    const key = avatarType?.toUpperCase();
    return AVATARS[key] || AVATARS.CAPTAIN;
  }

  getSourceForPreference(preference, avatarType) {
    if (preference === MUSIC_PREFERENCES.AVATAR) {
      const avatar = this.getAvatarConfig(avatarType);
      if (Platform.OS === 'web') {
        return avatar.musicFileWeb;
      }
      return avatar.musicFile;
    } else if (preference === MUSIC_PREFERENCES.AMBIENT) {
      if (Platform.OS === 'web') {
        return AMBIENT_SOUNDS.fileWeb;
      }
      return AMBIENT_SOUNDS.file;
    }
    return null;
  }

  async setAudioMode() {
    if (Platform.OS !== 'web' && Audio) {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('[BackgroundMusic] Failed to set audio mode:', e);
      }
    }
  }

  async play(preference, avatarType) {
    if (this.isLoading) return;

    this.preference = preference;
    this.avatarType = avatarType || this.avatarType;

    if (preference === MUSIC_PREFERENCES.OFF) {
      await this.stop();
      return;
    }

    const source = this.getSourceForPreference(preference, this.avatarType);
    if (!source) {
      await this.stop();
      return;
    }

    const sourceKey = Platform.OS === 'web' ? source : JSON.stringify(source);
    if (this.currentSource === sourceKey && this.isPlaying) {
      return;
    }

    if (this.currentSource === sourceKey && !this.isPlaying) {
      await this.resume();
      return;
    }

    this.isLoading = true;

    try {
      await this.stop(true);

      if (Platform.OS === 'web') {
        await this.playWeb(source);
      } else {
        await this.playNative(source);
      }

      this.currentSource = sourceKey;
      this.isPlaying = true;
    } catch (error) {
      console.error('[BackgroundMusic] Play error:', error);
      this.isPlaying = false;
    } finally {
      this.isLoading = false;
    }
  }

  async playWeb(source) {
    try {
      this.webAudio = new window.Audio(source);
      this.webAudio.loop = true;
      this.webAudio.volume = this.volume;
      this.webAudio.preload = 'auto';

      await new Promise((resolve, reject) => {
        const onCanPlay = () => {
          this.webAudio.removeEventListener('canplaythrough', onCanPlay);
          this.webAudio.removeEventListener('error', onError);
          resolve();
        };
        const onError = (e) => {
          this.webAudio.removeEventListener('canplaythrough', onCanPlay);
          this.webAudio.removeEventListener('error', onError);
          reject(new Error('Failed to load audio: ' + (e.message || 'unknown')));
        };
        this.webAudio.addEventListener('canplaythrough', onCanPlay);
        this.webAudio.addEventListener('error', onError);
        this.webAudio.load();
      });

      const playPromise = this.webAudio.play();
      if (playPromise) {
        await playPromise.catch(e => {
          console.warn('[BackgroundMusic] Web autoplay blocked, will play on user interaction:', e.message);
          this.isPlaying = false;
          const resumeOnInteraction = () => {
            document.removeEventListener('click', resumeOnInteraction);
            document.removeEventListener('touchstart', resumeOnInteraction);
            if (this.webAudio && this.preference !== 'off') {
              this.webAudio.play().then(() => {
                this.isPlaying = true;
              }).catch(() => {});
            }
          };
          document.addEventListener('click', resumeOnInteraction);
          document.addEventListener('touchstart', resumeOnInteraction);
        });
      }
    } catch (error) {
      console.error('[BackgroundMusic] Web play error:', error);
      throw error;
    }
  }

  async playNative(source) {
    if (!Audio) {
      console.warn('[BackgroundMusic] Audio not available on this platform');
      return;
    }

    try {
      await this.setAudioMode();

      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          isLooping: true,
          volume: this.volume,
          shouldPlay: true,
        }
      );

      this.sound = sound;

      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && !status.isLooping) {
          this.sound?.replayAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.error('[BackgroundMusic] Native play error:', error);
      throw error;
    }
  }

  async stop(skipReset = false) {
    this.clearFade();

    if (Platform.OS === 'web') {
      if (this.webAudio) {
        try {
          this.webAudio.pause();
          this.webAudio.currentTime = 0;
          this.webAudio.src = '';
          this.webAudio = null;
        } catch (e) {
          console.warn('[BackgroundMusic] Web stop error:', e);
        }
      }
    } else {
      if (this.sound) {
        try {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        } catch (e) {
          console.warn('[BackgroundMusic] Native stop error:', e);
        }
        this.sound = null;
      }
    }

    if (!skipReset) {
      this.isPlaying = false;
      this.currentSource = null;
    }
  }

  async setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));

    if (Platform.OS === 'web') {
      if (this.webAudio) {
        this.webAudio.volume = this.volume;
      }
    } else {
      if (this.sound) {
        try {
          await this.sound.setVolumeAsync(this.volume);
        } catch (e) {
          console.warn('[BackgroundMusic] Volume error:', e);
        }
      }
    }
  }

  async pause() {
    if (Platform.OS === 'web') {
      if (this.webAudio) {
        this.webAudio.pause();
      }
    } else {
      if (this.sound) {
        try {
          await this.sound.pauseAsync();
        } catch (e) {
          console.warn('[BackgroundMusic] Pause error:', e);
        }
      }
    }
    this.isPlaying = false;
  }

  async resume() {
    if (this.preference === MUSIC_PREFERENCES.OFF) return;

    if (Platform.OS === 'web') {
      if (this.webAudio) {
        try {
          await this.webAudio.play();
          this.isPlaying = true;
        } catch (e) {
          console.warn('[BackgroundMusic] Resume error:', e);
        }
      }
    } else {
      if (this.sound) {
        try {
          await this.sound.playAsync();
          this.isPlaying = true;
        } catch (e) {
          console.warn('[BackgroundMusic] Resume error:', e);
        }
      }
    }
  }

  async switchAvatar(newAvatarType) {
    this.avatarType = newAvatarType;
    if (this.preference === MUSIC_PREFERENCES.AVATAR && this.isPlaying) {
      await this.play(MUSIC_PREFERENCES.AVATAR, newAvatarType);
    }
  }

  clearFade() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  async fadeOut(duration = 1000) {
    return new Promise((resolve) => {
      this.clearFade();
      const startVolume = this.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      this.fadeInterval = setInterval(async () => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
        await this.setVolume(newVolume);

        if (currentStep >= steps) {
          this.clearFade();
          await this.stop();
          this.volume = startVolume;
          resolve();
        }
      }, stepDuration);
    });
  }

  async fadeIn(preference, avatarType, duration = 1000) {
    const targetVolume = this.volume;
    const source = this.getSourceForPreference(preference, avatarType);
    const sourceKey = Platform.OS === 'web' ? source : JSON.stringify(source);
    const isSameSource = this.currentSource === sourceKey;
    const hasExistingAudio = Platform.OS === 'web' ? !!this.webAudio : !!this.sound;

    if (isSameSource && hasExistingAudio && !this.isPlaying) {
      await this.setVolume(0);
      await this.resume();
    } else {
      this.volume = 0;
      await this.play(preference, avatarType);
    }

    return new Promise((resolve) => {
      this.clearFade();
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = targetVolume / steps;
      let currentStep = 0;

      this.fadeInterval = setInterval(async () => {
        currentStep++;
        const newVolume = Math.min(targetVolume, volumeStep * currentStep);
        await this.setVolume(newVolume);

        if (currentStep >= steps) {
          this.clearFade();
          this.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  }

  getNowPlaying() {
    if (!this.isPlaying || this.preference === MUSIC_PREFERENCES.OFF) {
      return null;
    }

    if (this.preference === MUSIC_PREFERENCES.AVATAR) {
      const avatar = this.getAvatarConfig(this.avatarType);
      return {
        title: avatar.musicTitle,
        type: 'avatar',
        avatarName: avatar.name,
      };
    }

    if (this.preference === MUSIC_PREFERENCES.AMBIENT) {
      return {
        title: AMBIENT_SOUNDS.title,
        type: 'ambient',
        description: AMBIENT_SOUNDS.description,
      };
    }

    return null;
  }

  destroy() {
    this.clearFade();
    this.stop();
  }
}

const backgroundMusicService = new BackgroundMusicService();
export default backgroundMusicService;
