import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Image } from 'react-native';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';

const MedicalProviderBottomNavigation = ({ currentScreen, onNavigate, notificationCount = 0 }) => {
  console.log('[MedicalProviderBottomNavigation] Rendering for screen:', currentScreen);
  
  const tabs = [
    { name: 'Dashboard', imageSource: require('../../attached_assets/ICON_1765571245006.jpeg'), screen: 'medicalprovider-dashboard' },
    { name: 'Calendar', icon: '📅', screen: 'medicalprovider-calendar' },
    { name: 'Users', icon: '👥', screen: 'medicalprovider-user-management' },
    { name: 'HIPAA', icon: '🔒', screen: 'medicalprovider-hipaa-dashboard' },
    { name: 'Activity', icon: '📊', screen: 'medicalprovider-activity-dashboard' },
    { name: 'Negotiations', icon: '🤝', screen: 'medicalprovider-negotiations' },
    { name: 'Profile', icon: '👤', screen: 'medicalprovider-profile' },
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
    backgroundColor: medicalProviderTheme.colors.primary,
    borderTopWidth: 3,
    borderTopColor: medicalProviderTheme.colors.silver,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    shadowColor: medicalProviderTheme.colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    backgroundColor: 'rgba(168, 168, 168, 0.2)',
  },
  icon: {
    fontSize: 22,
  },
  iconImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  activeLabel: {
    color: medicalProviderTheme.colors.silverLight,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    backgroundColor: medicalProviderTheme.colors.silver,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: medicalProviderTheme.colors.critical,
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

export default MedicalProviderBottomNavigation;
