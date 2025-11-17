import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import AvatarVideoBackground from '../components/AvatarVideoBackground';
import ActionVideoModal from '../components/ActionVideoModal';
import { AVATARS } from '../constants/avatars';
import { useVideoPreloader } from '../hooks/useVideoPreloader';

const { width } = Dimensions.get('window');

const DashboardScreen = ({
  user,
  coins,
  loginStreak,
  onClaimBonus,
  onConvertCoins,
  onNavigate,
  onLogout,
}) => {
  const [showActionVideo, setShowActionVideo] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionCoins, setActionCoins] = useState(0);

  const avatarType = user?.avatarType || 'captain';
  const selectedAvatar = AVATARS[avatarType.toUpperCase()] || AVATARS.CAPTAIN;

  const { videosLoaded } = useVideoPreloader(avatarType);

  useEffect(() => {
    console.log('[Dashboard] Videos loaded:', videosLoaded);
  }, [videosLoaded]);

  const handleClaimBonus = async () => {
    try {
      await onClaimBonus();
      
      triggerActionVideo('Daily Bonus Claimed! 🎉', 50);
    } catch (error) {
      console.error('[Dashboard] Claim bonus error:', error);
    }
  };

  const triggerActionVideo = (message, coinsEarned = 0) => {
    console.log('[Dashboard] Triggering action video:', message);
    setActionMessage(message);
    setActionCoins(coinsEarned);
    setShowActionVideo(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <AvatarVideoBackground 
        videoSource={selectedAvatar.calmVideo}
        opacity={0.7}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.firstName || 'Captain'} 
            </Text>
            <Text style={styles.avatarName}>
              "{selectedAvatar.name}"
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.avatarButton,
              { backgroundColor: selectedAvatar.primaryColor }
            ]}
            onPress={() => onNavigate('avatar-selection')}
          >
            <Text style={styles.avatarButtonText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={[
            styles.statCard,
            { borderColor: selectedAvatar.accentColor }
          ]}>
            <Text style={styles.statLabel}>⚓ Coins</Text>
            <Text style={styles.statValue}>{coins.toLocaleString()}</Text>
          </View>
          
          <View style={[
            styles.statCard,
            { borderColor: selectedAvatar.accentColor }
          ]}>
            <Text style={styles.statLabel}>🔥 Streak</Text>
            <Text style={styles.statValue}>{loginStreak} days</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.bonusButton,
            { backgroundColor: selectedAvatar.primaryColor }
          ]}
          onPress={handleClaimBonus}
        >
          <Text style={styles.bonusButtonText}>⚓ Claim Daily Bonus</Text>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <QuickActionButton
            imageSource={require('../../attached_assets/MAP_1763356928680.png')}
            title="Roadmap"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('roadmap')}
          />
          <QuickActionButton
            icon="🏥"
            title="Medical Hub"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('medical')}
          />
          <QuickActionButton
            icon="📹"
            title="Videos"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('videos')}
          />
          <QuickActionButton
            icon="✅"
            title="Actions"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('actions')}
          />
          <QuickActionButton
            icon="🔔"
            title="Notifications"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('notifications')}
          />
          <QuickActionButton
            icon="📅"
            title="Calendar"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('calendar')}
          />
          <QuickActionButton
            icon="🏆"
            title="Achievements"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('achievements')}
          />
          <QuickActionButton
            icon="🎖️"
            title="Badges"
            color={selectedAvatar.accentColor}
            onPress={() => onNavigate('badges')}
          />
        </View>

        <TouchableOpacity 
          style={styles.convertButton}
          onPress={onConvertCoins}
        >
          <Text style={styles.convertButtonText}>
            💰 Convert Coins to Credits
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.treasureButton,
            { borderColor: selectedAvatar.accentColor }
          ]}
          onPress={() => onNavigate('treasure-chest')}
        >
          <Text style={styles.treasureButtonText}>
            🏴‍☠️ Open Treasure Chest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ActionVideoModal
        visible={showActionVideo}
        onClose={() => setShowActionVideo(false)}
        avatarType={avatarType}
        message={actionMessage}
        coinsEarned={actionCoins}
      />
    </View>
  );
};

const QuickActionButton = ({ icon, imageSource, title, color, onPress }) => (
  <TouchableOpacity 
    style={[styles.quickActionCard, { borderColor: color }]}
    onPress={onPress}
  >
    {imageSource ? (
      <Image 
        source={imageSource} 
        style={styles.quickActionImage}
        resizeMode="contain"
      />
    ) : (
      <Text style={styles.quickActionIcon}>{icon}</Text>
    )}
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    marginTop: 60,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  userName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 5,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatarName: {
    fontSize: 18,
    color: '#FFD700',
    fontStyle: 'italic',
    marginTop: 5,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatarButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 10,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bonusButton: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  bonusButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  quickActionIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  quickActionImage: {
    width: 50,
    height: 50,
    marginBottom: 12,
    borderRadius: 8,
  },
  quickActionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  convertButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    marginBottom: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  convertButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  treasureButton: {
    backgroundColor: 'rgba(139, 69, 19, 0.4)',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  treasureButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;
