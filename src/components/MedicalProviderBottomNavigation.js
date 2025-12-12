import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Image } from 'react-native';

const MedicalProviderBottomNavigation = ({ currentScreen, onNavigate, notificationCount = 0 }) => {
  console.log('[MedicalProviderBottomNavigation] Rendering for screen:', currentScreen);
  
  const tabs = [
    { name: 'Dashboard', imageSource: require('../../attached_assets/ICON_1765571245006.jpeg'), screen: 'medicalprovider-dashboard' },
    { name: 'Notifications', icon: '🔔', screen: 'medicalprovider-send-notification', badge: notificationCount },
    { name: 'Users', icon: '👥', screen: 'medicalprovider-user-management' },
    { name: 'HIPAA', icon: '🔒', screen: 'medicalprovider-hipaa-dashboard' },
    { name: 'Activity', icon: '📊', screen: 'medicalprovider-activity-dashboard' },
    { name: 'Billing', icon: '💰', screen: 'medicalprovider-billing' },
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
    backgroundColor: '#000',
    borderTopWidth: 2,
    borderTopColor: '#d4af37',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
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
    backgroundColor: '#d4af37',
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
    color: '#a0aec0',
    marginTop: 2,
  },
  activeLabel: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    backgroundColor: '#d4af37',
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
