import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

const BottomNavigation = ({ currentScreen, onNavigate }) => {
  const { unreadCount } = useNotifications();
  
  const tabs = [
    { name: 'Dashboard', icon: '🏠', screen: 'dashboard', badge: unreadCount },
    { name: 'Roadmap', icon: '🗺️', screen: 'roadmap' },
    { name: 'Medical', icon: '⚕️', screen: 'medical' },
    { name: 'Videos', icon: '🎬', screen: 'videos' },
    { name: 'Forms', icon: '📋', screen: 'hipaaForms' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.screen;
        const showBadge = tab.badge && tab.badge > 0;
        
        return (
          <TouchableOpacity
            key={tab.screen}
            style={styles.tab}
            onPress={() => onNavigate(tab.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <Text style={styles.icon}>{tab.icon}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#2c3e50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default BottomNavigation;
