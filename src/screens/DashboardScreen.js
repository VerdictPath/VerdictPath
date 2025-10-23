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
            <View style={styles.statIconContainer}>
              <View style={styles.iconBadgeCoinStat}>
                <View style={styles.iconCoinStat}>
                  <View style={styles.coinOuterStat} />
                  <View style={styles.coinInnerStat} />
                  <View style={styles.coinShineStat} />
                </View>
              </View>
              <Text style={styles.statValue}>{coins}</Text>
            </View>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <View style={styles.iconBadgeFlame}>
                <View style={styles.iconFlame}>
                  <View style={styles.flameTip} />
                  <View style={styles.flameMiddle} />
                  <View style={styles.flameBase} />
                </View>
              </View>
              <Text style={styles.statValue}>{loginStreak}</Text>
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <View style={styles.iconBadgeGemStat}>
                <View style={styles.iconGemStat}>
                  <View style={styles.gemTopStat} />
                  <View style={styles.gemBottomStat} />
                </View>
              </View>
              <Text style={styles.statValue}>{user?.subscription}</Text>
            </View>
            <Text style={styles.statLabel}>Tier</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bonusButton} onPress={onClaimBonus}>
          <View style={styles.bonusContent}>
            <View style={styles.iconBadgeGift}>
              <View style={styles.iconGiftBonus}>
                <View style={styles.giftBoxBonus} />
                <View style={styles.giftTopBonus} />
                <View style={styles.giftLockBonus} />
              </View>
            </View>
            <Text style={styles.bonusButtonText}>
              Claim Daily Bonus ({calculateDailyBonus(loginStreak + 1)} coins)
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('roadmap')}
        >
          <View style={styles.iconBadgeMap}>
            <View style={styles.iconCompass}>
              <View style={styles.compassOuter} />
              <View style={styles.compassInner} />
              <View style={styles.compassNeedleNorth} />
              <View style={styles.compassNeedleSouth} />
            </View>
          </View>
          <Text style={styles.menuText}>Case Roadmap</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('videos')}
        >
          <View style={styles.iconBadgeVideoPro}>
            <View style={styles.iconVideoPro}>
              <View style={styles.videoProBody} />
              <View style={styles.videoProLens} />
              <View style={styles.videoProLensOuter} />
              <View style={styles.videoProLensInner} />
              <View style={styles.videoProViewfinder} />
              <View style={styles.videoProMic} />
            </View>
          </View>
          <Text style={styles.menuText}>Video Library</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('medical')}
        >
          <View style={styles.iconBadgeHospital}>
            <View style={styles.iconHospital}>
              <View style={styles.hospitalCrossVertical} />
              <View style={styles.hospitalCrossHorizontal} />
            </View>
          </View>
          <Text style={styles.menuText}>Medical Hub</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={onConvertCoins}
        >
          <View style={styles.iconBadgeTreasureChest}>
            <View style={styles.iconTreasureChest}>
              <View style={styles.treasureChestBottom} />
              <View style={styles.treasureChestTop} />
              <View style={styles.treasureChestLock} />
            </View>
          </View>
          <Text style={styles.menuText}>Convert Coins</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={onLogout}
        >
          <View style={styles.iconBadgePower}>
            <View style={styles.iconPower}>
              <View style={styles.powerCircle} />
              <View style={styles.powerLine} />
            </View>
          </View>
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
  bonusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
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
  menuText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  iconBadgeCoinStat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B6914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  iconCoinStat: {
    width: 14,
    height: 14,
    position: 'relative',
  },
  coinOuterStat: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  coinInnerStat: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B8860B',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  coinShineStat: {
    width: 3,
    height: 1.5,
    backgroundColor: '#FFFACD',
    borderRadius: 1.5,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  iconBadgeFlame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d35400',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },
  iconFlame: {
    width: 12,
    height: 16,
    position: 'relative',
  },
  flameTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f39c12',
    position: 'absolute',
    top: 0,
    left: 2,
  },
  flameMiddle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e67e22',
    position: 'absolute',
    top: 5,
    left: 1,
  },
  flameBase: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#c0392b',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  iconBadgeGemStat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#9b59b6',
  },
  iconGemStat: {
    width: 11,
    height: 14,
    position: 'relative',
  },
  gemTopStat: {
    width: 0,
    height: 0,
    borderLeftWidth: 5.5,
    borderRightWidth: 5.5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#9b59b6',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gemBottomStat: {
    width: 0,
    height: 0,
    borderLeftWidth: 5.5,
    borderRightWidth: 5.5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8e44ad',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  iconBadgeGift: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6b4423',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  iconGiftBonus: {
    width: 14,
    height: 13,
    position: 'relative',
  },
  giftBoxBonus: {
    width: 14,
    height: 8,
    backgroundColor: '#8B4513',
    borderWidth: 1,
    borderColor: '#654321',
    position: 'absolute',
    bottom: 0,
  },
  giftTopBonus: {
    width: 14,
    height: 5,
    backgroundColor: '#A0522D',
    borderWidth: 1,
    borderColor: '#654321',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    position: 'absolute',
    top: 0,
  },
  giftLockBonus: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFD700',
    borderWidth: 0.5,
    borderColor: '#B8860B',
    position: 'absolute',
    bottom: 2,
    left: 5.5,
  },
  iconBadgeMap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#8B7355',
  },
  iconCompass: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  compassOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent',
  },
  compassInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2c5f7f',
    position: 'absolute',
    top: 5,
    left: 5,
  },
  compassNeedleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e74c3c',
    position: 'absolute',
    top: 3,
    left: 9,
  },
  compassNeedleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4AF37',
    position: 'absolute',
    bottom: 3,
    left: 9,
  },
  iconBadgeTreasureChest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6b4423',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  iconTreasureChest: {
    width: 22,
    height: 19,
    position: 'relative',
  },
  treasureChestBottom: {
    width: 22,
    height: 12,
    backgroundColor: '#8B4513',
    borderWidth: 1,
    borderColor: '#654321',
    position: 'absolute',
    bottom: 0,
  },
  treasureChestTop: {
    width: 22,
    height: 7,
    backgroundColor: '#A0522D',
    borderWidth: 1,
    borderColor: '#654321',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: 'absolute',
    top: 0,
  },
  treasureChestLock: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#B8860B',
    position: 'absolute',
    bottom: 4,
    left: 8.5,
  },
  iconBadgeVideoPro: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#34495e',
  },
  iconVideoPro: {
    width: 26,
    height: 20,
    position: 'relative',
  },
  videoProBody: {
    width: 20,
    height: 16,
    backgroundColor: '#2c3e50',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#34495e',
    position: 'absolute',
    left: 0,
    top: 2,
  },
  videoProLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    left: 2,
    top: 5,
  },
  videoProLensOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#7f8c8d',
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 2,
    top: 5,
  },
  videoProLensInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3498db',
    position: 'absolute',
    left: 5,
    top: 8,
  },
  videoProViewfinder: {
    width: 5,
    height: 4,
    backgroundColor: '#27ae60',
    borderRadius: 1,
    position: 'absolute',
    right: 8,
    top: 3,
  },
  videoProMic: {
    width: 3,
    height: 6,
    backgroundColor: '#95a5a6',
    borderRadius: 1.5,
    position: 'absolute',
    left: 8,
    bottom: 0,
  },
  iconBadgeHospital: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  iconHospital: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  hospitalCrossVertical: {
    width: 6,
    height: 20,
    backgroundColor: '#e74c3c',
    position: 'absolute',
    left: 7,
    top: 0,
  },
  hospitalCrossHorizontal: {
    width: 20,
    height: 6,
    backgroundColor: '#e74c3c',
    position: 'absolute',
    left: 0,
    top: 7,
  },
  iconBadgePower: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c0392b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  iconPower: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  powerCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#ecf0f1',
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
  },
  powerLine: {
    width: 2.5,
    height: 11,
    backgroundColor: '#ecf0f1',
    position: 'absolute',
    top: 0,
    left: 8.75,
  },
});

export default DashboardScreen;
