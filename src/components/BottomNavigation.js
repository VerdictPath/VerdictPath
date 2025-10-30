import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

const BottomNavigation = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { name: 'Dashboard', icon: '🏠', screen: 'dashboard' },
    { name: 'Roadmap', icon: '🗺️', screen: 'roadmap' },
    { name: 'Medical', icon: '⚕️', screen: 'medical' },
    { name: 'Videos', icon: '🎬', screen: 'videos' },
    { name: 'Forms', icon: '📋', screen: 'hipaaForms' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.screen;
        return (
          <TouchableOpacity
            key={tab.screen}
            style={styles.tab}
            onPress={() => onNavigate(tab.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <Text style={styles.icon}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.name}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    borderTopWidth: 2,
    borderTopColor: '#d4a574',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconContainer: {
    backgroundColor: '#d4a574',
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 2,
  },
  activeLabel: {
    color: '#d4a574',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    backgroundColor: '#d4a574',
    borderRadius: 2,
  },
});

export default BottomNavigation;
