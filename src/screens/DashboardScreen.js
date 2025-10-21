import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { calculateDailyBonus } from '../utils/gamification';

const DashboardScreen = ({ 
  user, 
  coins, 
  loginStreak, 
  onClaimBonus, 
  onConvertCoins, 
  onNavigate, 
  onLogout 
}) => {
  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.welcomeText}>Welcome back! 👋</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>🪙 {coins}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>🔥 {loginStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💎 {user?.subscription}</Text>
            <Text style={styles.statLabel}>Tier</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bonusButton} onPress={onClaimBonus}>
          <Text style={styles.bonusButtonText}>
            🎁 Claim Daily Bonus ({calculateDailyBonus(loginStreak + 1)} coins)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('roadmap')}
        >
          <Text style={styles.menuIcon}>🗺️</Text>
          <Text style={styles.menuText}>Case Roadmap</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('videos')}
        >
          <Text style={styles.menuIcon}>🎥</Text>
          <Text style={styles.menuText}>Video Library</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('medical')}
        >
          <Text style={styles.menuIcon}>🏥</Text>
          <Text style={styles.menuText}>Medical Hub</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={onConvertCoins}
        >
          <Text style={styles.menuIcon}>💰</Text>
          <Text style={styles.menuText}>Convert Coins</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={onLogout}
        >
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={styles.menuText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dashboardHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  bonusButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bonusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuContainer: {
    padding: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  menuText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
});

export default DashboardScreen;
