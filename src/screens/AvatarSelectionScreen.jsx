import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { AVATARS } from '../constants/avatars';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const AvatarSelectionScreen = ({ user, onBack, onAvatarSelected }) => {
  const { width, height } = useWindowDimensions();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarType || 'captain');
  const [previewingAvatar, setPreviewingAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeTablet = width >= 1024 && width < 1280;
  const isDesktop = width >= 1280;
  const isLargeDesktop = width >= 1440;
  
  const aspectRatio = height / width;
  const isTallDevice = aspectRatio > 1.8;
  const isShortDevice = aspectRatio < 1.5;

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
      Alert.alert('Error', 'Failed to save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarArray = Object.values(AVATARS);
  
  const getCardWidth = () => {
    if (isLargeDesktop) return Math.min((width - 120) / 2, 550);
    if (isDesktop) return (width - 100) / 2;
    if (isLargeTablet) return (width - 80) / 2;
    if (isTablet) return (width - 60) / 2;
    if (isSmallPhone) return width - 30;
    return width - 40;
  };
  
  const getVideoHeight = () => {
    if (isLargeDesktop) return 420;
    if (isDesktop) return 400;
    if (isLargeTablet) return 380;
    if (isTablet) return 350;
    if (isTallDevice) return 380;
    if (isShortDevice) return 280;
    if (isSmallPhone) return 300;
    return 320;
  };

  const getGridColumns = () => {
    if (isDesktop || isLargeTablet || isTablet) return 2;
    return 1;
  };

  const getHeaderPadding = () => {
    if (isDesktop || isLargeTablet) return 40;
    if (isTablet) return 50;
    if (Platform.OS === 'ios' && isTallDevice) return 60;
    return 55;
  };

  const getFontSizes = () => {
    if (isLargeDesktop) return { title: 32, name: 32, desc: 20, back: 22, badge: 18, hint: 18 };
    if (isDesktop) return { title: 28, name: 30, desc: 18, back: 20, badge: 16, hint: 16 };
    if (isLargeTablet) return { title: 26, name: 28, desc: 17, back: 19, badge: 15, hint: 15 };
    if (isTablet) return { title: 24, name: 26, desc: 16, back: 18, badge: 14, hint: 14 };
    if (isSmallPhone) return { title: 20, name: 22, desc: 14, back: 16, badge: 12, hint: 13 };
    return { title: 22, name: 26, desc: 16, back: 18, badge: 14, hint: 14 };
  };

  const fonts = getFontSizes();

  const renderAvatarCard = (avatar) => {
    const isSelected = selectedAvatar === avatar.id;
    const isPreviewing = previewingAvatar === avatar.id;

    return (
      <TouchableOpacity
        key={avatar.id}
        style={[
          styles.avatarCard,
          isSelected && styles.selectedCard,
          {
            width: getGridColumns() > 1 ? getCardWidth() : '100%',
            marginHorizontal: getGridColumns() > 1 ? 10 : 0,
          }
        ]}
        onPress={() => handleSelect(avatar.id)}
        onLongPress={() => setPreviewingAvatar(avatar.id)}
        onPressOut={() => setPreviewingAvatar(null)}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        <View style={[styles.videoPreview, { height: getVideoHeight() }]}>
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
              resizeMode={(avatar.id === 'captain' || avatar.id === 'navigator') ? 'contain' : 'cover'}
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: avatar.primaryColor }]}>
              <Text style={[styles.placeholderText, { fontSize: isDesktop ? 120 : isTablet ? 100 : 80 }]}>
                {avatar.name[0]}
              </Text>
            </View>
          )}
          
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <View style={[styles.checkCircle, { backgroundColor: avatar.primaryColor }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[
          styles.avatarInfo,
          {
            backgroundColor: avatar.primaryColor + '20',
            padding: isDesktop ? 25 : isTablet ? 22 : isSmallPhone ? 16 : 20,
          }
        ]}>
          <Text style={[styles.avatarName, { fontSize: fonts.name }]}>
            {avatar.name}
          </Text>
          <Text style={[styles.avatarDescription, { fontSize: fonts.desc }]}>
            {avatar.description}
          </Text>
          
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: avatar.primaryColor }]}>
              <Text style={[styles.selectedBadgeText, { fontSize: fonts.badge }]}>
                ✓ CURRENT
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: getHeaderPadding() }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
            <Text style={[styles.backButton, { fontSize: fonts.back }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { fontSize: fonts.title }]}>Choose Your Avatar</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingHorizontal: isDesktop ? 30 : isTablet ? 20 : isSmallPhone ? 15 : 20,
              paddingBottom: Platform.OS === 'ios' ? 120 : 100,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.gridContainer,
            getGridColumns() === 1 && styles.singleColumnGrid
          ]}>
            {avatarArray.map(renderAvatarCard)}
          </View>

          <View style={[
            styles.hint,
            { 
              marginHorizontal: getGridColumns() > 1 ? 10 : 0,
              padding: isSmallPhone ? 12 : 15,
            }
          ]}>
            <Text style={[styles.hintText, { fontSize: fonts.hint }]}>
              💡 Long press any avatar to preview their calm video
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1128',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButtonContainer: {
    padding: 5,
  },
  backButton: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  singleColumnGrid: {
    flexDirection: 'column',
    alignItems: 'center',
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
    backgroundColor: '#000',
    position: 'relative',
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
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  avatarInfo: {},
  avatarName: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  avatarDescription: {
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
    fontWeight: 'bold',
  },
  hint: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginTop: 10,
  },
  hintText: {
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default AvatarSelectionScreen;
