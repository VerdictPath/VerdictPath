import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { AVATARS } from '../constants/avatars';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const { width } = Dimensions.get('window');

const AvatarSelectionScreen = ({ user, onBack, onAvatarSelected }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarType || 'captain');
  const [previewingAvatar, setPreviewingAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (avatarId) => {
    if (avatarId === user?.avatarType) {
      onBack();
      return;
    }

    try {
      setIsSaving(true);

      const response = await apiRequest(API_ENDPOINTS.AVATAR.SELECT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarType: avatarId }),
      });

      if (response.success) {
        setSelectedAvatar(avatarId);
        
        if (onAvatarSelected) {
          onAvatarSelected(avatarId);
        }

        Alert.alert(
          'Avatar Changed! ⚓',
          `You are now "${AVATARS[avatarId.toUpperCase()].name}"`,
          [{ text: 'Awesome!', onPress: onBack }]
        );
      }
    } catch (error) {
      console.error('[AvatarSelection] Save error:', error);
      Alert.alert('Error', 'Failed to save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarArray = Object.values(AVATARS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Avatar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {avatarArray.map((avatar) => {
          const isSelected = selectedAvatar === avatar.id;
          const isPreviewing = previewingAvatar === avatar.id;

          return (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarCard,
                isSelected && styles.selectedCard,
              ]}
              onPress={() => handleSelect(avatar.id)}
              onLongPress={() => setPreviewingAvatar(avatar.id)}
              onPressOut={() => setPreviewingAvatar(null)}
              disabled={isSaving}
            >
              <View style={styles.videoPreview}>
                {isPreviewing && avatar.calmVideo ? (
                  <Video
                    source={avatar.calmVideo}
                    rate={1.0}
                    volume={0}
                    isMuted={true}
                    isLooping={true}
                    shouldPlay={true}
                    resizeMode={ResizeMode.COVER}
                    style={styles.previewVideo}
                  />
                ) : avatar.thumbnail ? (
                  <Image
                    source={avatar.thumbnail}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.placeholderImage, { backgroundColor: avatar.primaryColor }]}>
                    <Text style={styles.placeholderText}>{avatar.name[0]}</Text>
                  </View>
                )}
              </View>

              <View style={[
                styles.avatarInfo,
                { backgroundColor: avatar.primaryColor + '20' }
              ]}>
                <Text style={styles.avatarName}>{avatar.name}</Text>
                <Text style={styles.avatarDescription}>
                  {avatar.description}
                </Text>
                
                {isSelected && (
                  <View style={[
                    styles.selectedBadge,
                    { backgroundColor: avatar.primaryColor }
                  ]}>
                    <Text style={styles.selectedBadgeText}>✓ CURRENT</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            💡 Long press any avatar to preview their calm video
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  avatarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedCard: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
  },
  videoPreview: {
    width: '100%',
    height: 320,
    backgroundColor: '#000',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarInfo: {
    padding: 20,
  },
  avatarName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  avatarDescription: {
    fontSize: 16,
    color: '#D0D0D0',
    lineHeight: 22,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hint: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginTop: 10,
  },
  hintText: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default AvatarSelectionScreen;
