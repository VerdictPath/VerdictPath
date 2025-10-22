import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AVATARS } from '../constants/mockData';

const AvatarSelector = ({ selectedAvatar, onSelectAvatar }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Hero</Text>
      <View style={styles.avatarGrid}>
        {AVATARS.map((avatar) => (
          <TouchableOpacity
            key={avatar.id}
            style={[
              styles.avatarCard,
              selectedAvatar?.id === avatar.id && styles.avatarCardSelected,
              { borderColor: avatar.color }
            ]}
            onPress={() => onSelectAvatar(avatar)}
          >
            <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
            <Text style={[styles.avatarName, { color: avatar.color }]}>
              {avatar.name}
            </Text>
            <Text style={styles.avatarDescription}>{avatar.description}</Text>
            {selectedAvatar?.id === avatar.id && (
              <Text style={styles.selectedBadge}>✓ Selected</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
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
  avatarCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    padding: 15,
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
    fontSize: 50,
    marginBottom: 10,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  avatarDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  selectedBadge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});

export default AvatarSelector;
