import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { AVATARS } from '../constants/mockData';

const AvatarSelector = ({ selectedAvatar, onSelectAvatar }) => {
  const { width, height } = useWindowDimensions();
  
  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;

  const getCardWidth = () => {
    if (isLargeDesktop) return '23%';
    if (isDesktop) return '23%';
    if (isTablet) return '31%';
    if (isSmallPhone) return '100%';
    return '48%';
  };

  const getFontSizes = () => {
    if (isLargeDesktop) return { title: 32, emoji: 70, name: 22, desc: 15, badge: 14 };
    if (isDesktop) return { title: 28, emoji: 60, name: 20, desc: 14, badge: 13 };
    if (isTablet) return { title: 26, emoji: 55, name: 19, desc: 13, badge: 12 };
    if (isSmallPhone) return { title: 22, emoji: 45, name: 16, desc: 12, badge: 11 };
    return { title: 24, emoji: 50, name: 18, desc: 12, badge: 12 };
  };

  const getPadding = () => {
    if (isDesktop) return { container: 30, card: 20 };
    if (isTablet) return { container: 25, card: 18 };
    if (isSmallPhone) return { container: 15, card: 12 };
    return { container: 20, card: 15 };
  };

  const fonts = getFontSizes();
  const padding = getPadding();

  return (
    <View style={[styles.container, { padding: padding.container }]}>
      <Text style={[styles.title, { fontSize: fonts.title }]}>Choose Your Pirate</Text>
      <View style={[
        styles.avatarGrid,
        isSmallPhone && styles.avatarGridSingle
      ]}>
        {AVATARS.map((avatar) => (
          <TouchableOpacity
            key={avatar.id}
            style={[
              styles.avatarCard,
              { 
                width: getCardWidth(),
                padding: padding.card,
              },
              selectedAvatar?.id === avatar.id && styles.avatarCardSelected,
              { borderColor: avatar.color }
            ]}
            onPress={() => onSelectAvatar(avatar)}
            activeOpacity={0.8}
          >
            <Text style={[styles.avatarEmoji, { fontSize: fonts.emoji }]}>
              {avatar.emoji}
            </Text>
            <Text style={[
              styles.avatarName, 
              { color: avatar.color, fontSize: fonts.name }
            ]}>
              {avatar.name}
            </Text>
            <Text style={[styles.avatarDescription, { fontSize: fonts.desc }]}>
              {avatar.description}
            </Text>
            {selectedAvatar?.id === avatar.id && (
              <Text style={[styles.selectedBadge, { fontSize: fonts.badge }]}>
                ✓ Selected
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  title: {
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarGridSingle: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarCardSelected: {
    borderWidth: 4,
    backgroundColor: '#f8f9fa',
  },
  avatarEmoji: {
    marginBottom: 10,
  },
  avatarName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  avatarDescription: {
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  selectedBadge: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});

export default AvatarSelector;
