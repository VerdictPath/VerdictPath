import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Image } from 'react-native';
import { theme } from '../styles/theme';

const LawFirmBottomNavigation = ({ currentScreen, onNavigate, notificationCount = 0 }) => {
  console.log('[LawFirmBottomNavigation] Rendering for screen:', currentScreen);
  
  const tabs = [
    { name: 'Dashboard', imageSource: require('../../attached_assets/ICON_1765571245006.jpeg'), screen: 'lawfirm-dashboard' },
    { name: 'Appointments', icon: '📅', screen: 'lawfirm-client-appointments' },
    { name: 'Users', icon: '👥', screen: 'lawfirm-user-management' },
    { name: 'Analytics', icon: '📊', screen: 'lawfirm-activity-dashboard' },
    { name: 'Negotiations', icon: '🤝', screen: 'lawfirm-negotiations' },
    { name: 'Profile', icon: '👤', screen: 'lawfirm-profile' },
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
            <View style={styles.iconContainer}>
              {tab.imageSource ? (
                <Image 
                  source={tab.imageSource} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.icon}>{tab.icon}</Text>
              )}
              {tab.badge !== undefined && (
                <View style={[styles.badge, !showBadge && styles.hiddenBadge]}>
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
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 1000,
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
    backgroundColor: theme.lawFirm.accent,
  },
  icon: {
    fontSize: 22,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: 10,
    color: '#C0C0C0',
    marginTop: 2,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    backgroundColor: '#C0C0C0',
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.lawFirm.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenBadge: {
    opacity: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default LawFirmBottomNavigation;
