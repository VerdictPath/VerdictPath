import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { calculateDailyBonus } from '../utils/gamification';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS, apiRequest } from '../config/api';
import { useNotifications } from '../contexts/NotificationContext';
import InviteModal from '../components/InviteModal';
import ConnectionsModal from '../components/ConnectionsModal';

const DashboardScreen = ({ 
  user, 
  coins, 
  loginStreak, 
  onClaimBonus, 
  onConvertCoins, 
  onNavigate, 
  onLogout 
}) => {
  const { unreadCount } = useNotifications();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [connections, setConnections] = useState({
    lawFirm: null,
    medicalProviders: []
  });
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);

  useEffect(() => {
    fetchConnections();
    checkStripeAccountStatus();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/my-connections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnections({
          lawFirm: data.lawFirm,
          medicalProviders: data.medicalProviders || []
        });
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleConnectionsClose = () => {
    setConnectionsModalVisible(false);
    fetchConnections();
  };

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripeStatus(true);
      if (!user?.token) {
        console.error('No user token available');
        return;
      }
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStripeAccountStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe account status:', error);
    } finally {
      setCheckingStripeStatus(false);
    }
  };

  const handleNavigateToPaymentSetup = () => {
    if (onNavigate) {
      onNavigate('individual-payment-setup');
    }
  };

  const handleNavigateToDisbursements = () => {
    if (onNavigate) {
      onNavigate('individual-disbursements');
    }
  };

  const renderPaymentAccountBanner = () => {
    if (checkingStripeStatus) {
      return (
        <View style={styles.paymentBanner}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.paymentBannerText}>Checking payment account...</Text>
        </View>
      );
    }

    if (!stripeAccountStatus?.hasAccount) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerWarning]}>
          <View style={styles.paymentBannerContent}>
            <Text style={styles.paymentBannerIcon}>⚠️</Text>
            <View style={styles.paymentBannerTextContainer}>
              <Text style={styles.paymentBannerTitle}>Payment Account Required</Text>
              <Text style={styles.paymentBannerDescription}>
                Set up your payment account to receive settlement disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.paymentBannerButton}
            onPress={handleNavigateToPaymentSetup}
          >
            <Text style={styles.paymentBannerButtonText}>Set Up Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.hasAccount && !stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerWarning]}>
          <View style={styles.paymentBannerContent}>
            <Text style={styles.paymentBannerIcon}>⚠️</Text>
            <View style={styles.paymentBannerTextContainer}>
              <Text style={styles.paymentBannerTitle}>Complete Payment Setup</Text>
              <Text style={styles.paymentBannerDescription}>
                Finish your account setup to receive settlement disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.paymentBannerButton}
            onPress={handleNavigateToPaymentSetup}
          >
            <Text style={styles.paymentBannerButtonText}>Resume Setup</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerSuccess]}>
          <Text style={styles.paymentBannerIcon}>✓</Text>
          <View style={styles.paymentBannerTextContainer}>
            <Text style={styles.paymentBannerSuccessTitle}>Payment Account Active</Text>
            <Text style={styles.paymentBannerSuccessDescription}>
              You can receive settlement disbursements
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <ScrollView style={commonStyles.containerWithNav}>
      <View style={styles.dashboardHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            {!loadingConnections && (connections.lawFirm || connections.medicalProviders?.length > 0) && (
              <View style={styles.connectionsInfo}>
                {connections.lawFirm && (
                  <View style={styles.connectionItem}>
                    <Text style={styles.connectionLabel}>⚖️ Law Firm:</Text>
                    <Text style={styles.connectionValue}>{connections.lawFirm.firm_name || connections.lawFirm.email}</Text>
                  </View>
                )}
                {connections.medicalProviders?.length > 0 && (
                  <View style={styles.connectionItem}>
                    <Text style={styles.connectionLabel}>🏥 Medical Providers:</Text>
                    <Text style={styles.connectionValue}>
                      {connections.medicalProviders.map(p => p.provider_name || p.email).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => onNavigate && onNavigate('notifications')}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={() => setInviteModalVisible(true)}
            >
              <Text style={styles.inviteIcon}>👍</Text>
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.treasureButton}
          onPress={() => onNavigate && onNavigate('treasure-chest')}
        >
          <Image 
            source={require('../../attached_assets/Treasure Chest Full Cartoon_1762017505115.png')}
            style={styles.treasureButtonIcon}
            resizeMode="contain"
          />
          <Text style={styles.treasureButtonText}>Treasure Chest</Text>
          <Text style={styles.treasureButtonSubtext}>Purchase Coins</Text>
        </TouchableOpacity>

        {stripeAccountStatus?.onboardingComplete && (
          <TouchableOpacity 
            style={styles.disbursementCTA} 
            onPress={handleNavigateToDisbursements}
          >
            <View style={styles.disbursementCTAContent}>
              <Text style={styles.disbursementCTAIcon}>💰</Text>
              <View style={styles.disbursementCTATextContainer}>
                <Text style={styles.disbursementCTATitle}>My Disbursements</Text>
                <Text style={styles.disbursementCTASubtitle}>View settlement payments from your law firm</Text>
              </View>
              <Text style={styles.disbursementCTAArrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}

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

        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => onNavigate && onNavigate('manage-subscription')}
        >
          <View style={styles.upgradeIcon}>
            <Text style={{ fontSize: 24 }}>💎</Text>
          </View>
          <View style={styles.upgradeTextContainer}>
            <Text style={styles.upgradeTitle}>Upgrade Subscription</Text>
            <Text style={styles.upgradeSubtitle}>Unlock premium features</Text>
          </View>
          <Text style={styles.upgradeArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {renderPaymentAccountBanner()}

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('roadmap')}
        >
          <View style={styles.iconBadgeMap}>
            <Image 
              source={require('../../attached_assets/Treasure Map_1762016241708.png')}
              style={styles.treasureMapThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.menuText}>Case Roadmap</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('videos')}
        >
          <View style={styles.iconBadgeVideoCamera}>
            <Image 
              source={require('../../attached_assets/video_1762018822588.jpeg')}
              style={styles.videoCameraThumbnail}
              resizeMode="cover"
            />
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
          onPress={() => setConnectionsModalVisible(true)}
        >
          <View style={styles.iconBadgeEmoji}>
            <Text style={styles.emojiIcon}>🔗</Text>
          </View>
          <Text style={styles.menuText}>My Connections</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => onNavigate('event-requests')}
        >
          <View style={styles.iconBadgeEmoji}>
            <Text style={styles.emojiIcon}>📅</Text>
          </View>
          <Text style={styles.menuText}>Event Requests</Text>
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

      <ConnectionsModal
        visible={connectionsModalVisible}
        onClose={handleConnectionsClose}
        user={user}
      />

      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        user={user}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dashboardHeader: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  emailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  connectionsInfo: {
    marginTop: 5,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 5,
    fontWeight: '600',
  },
  connectionValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    position: 'relative',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  bellIcon: {
    fontSize: 22,
  },
  notificationBadge: {
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
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inviteButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  inviteIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  inviteButtonText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bonusButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bonusButtonText: {
    color: theme.colors.white,
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
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  menuText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  iconBadgeCoinStat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
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
    backgroundColor: theme.colors.paleGold,
    borderWidth: 1,
    borderColor: theme.colors.darkGold,
  },
  coinInnerStat: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.darkGold,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  coinShineStat: {
    width: 3,
    height: 1.5,
    backgroundColor: theme.colors.lightGold,
    borderRadius: 1.5,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  iconBadgeFlame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.deepMaroon,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
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
    borderBottomColor: theme.colors.warmOrange,
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
    borderBottomColor: theme.colors.lightOrange,
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
    borderBottomColor: theme.colors.deepMaroon,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  iconBadgeGemStat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
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
    borderBottomColor: theme.colors.warmPurple,
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
    borderTopColor: theme.colors.warmPurple,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  iconBadgeGift: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.darkMahogany,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
  },
  iconGiftBonus: {
    width: 14,
    height: 13,
    position: 'relative',
  },
  giftBoxBonus: {
    width: 14,
    height: 8,
    backgroundColor: theme.colors.warmBrown,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    position: 'absolute',
    bottom: 0,
  },
  giftTopBonus: {
    width: 14,
    height: 5,
    backgroundColor: theme.colors.lightBrown,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    position: 'absolute',
    top: 0,
  },
  giftLockBonus: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.paleGold,
    borderWidth: 0.5,
    borderColor: theme.colors.darkGold,
    position: 'absolute',
    bottom: 2,
    left: 5.5,
  },
  iconBadgeMap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  treasureMapThumbnail: {
    width: 48,
    height: 48,
    transform: [{ scale: 1.5 }],
  },
  iconBadgeVideoCamera: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  videoCameraThumbnail: {
    width: 48,
    height: 48,
  },
  iconBadgeTreasureChest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.darkMahogany,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  iconTreasureChest: {
    width: 22,
    height: 19,
    position: 'relative',
  },
  treasureChestBottom: {
    width: 22,
    height: 12,
    backgroundColor: theme.colors.warmBrown,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    position: 'absolute',
    bottom: 0,
  },
  treasureChestTop: {
    width: 22,
    height: 7,
    backgroundColor: theme.colors.lightBrown,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: 'absolute',
    top: 0,
  },
  treasureChestLock: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.paleGold,
    borderWidth: 1,
    borderColor: theme.colors.darkGold,
    position: 'absolute',
    bottom: 4,
    left: 8.5,
  },
  iconBadgeVideoPro: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  iconVideoPro: {
    width: 26,
    height: 20,
    position: 'relative',
  },
  videoProBody: {
    width: 20,
    height: 16,
    backgroundColor: theme.colors.navy,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal,
    position: 'absolute',
    left: 0,
    top: 2,
  },
  videoProLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.charcoal,
    position: 'absolute',
    left: 2,
    top: 5,
  },
  videoProLensOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.warmGray,
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 2,
    top: 5,
  },
  videoProLensInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.warmBlue,
    position: 'absolute',
    left: 5,
    top: 8,
  },
  videoProViewfinder: {
    width: 5,
    height: 4,
    backgroundColor: theme.colors.warmGreen,
    borderRadius: 1,
    position: 'absolute',
    right: 8,
    top: 3,
  },
  videoProMic: {
    width: 3,
    height: 6,
    backgroundColor: theme.colors.warmGray,
    borderRadius: 1.5,
    position: 'absolute',
    left: 8,
    bottom: 0,
  },
  iconBadgeHospital: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.deepMaroon,
  },
  iconHospital: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  hospitalCrossVertical: {
    width: 6,
    height: 20,
    backgroundColor: theme.colors.deepMaroon,
    position: 'absolute',
    left: 7,
    top: 0,
  },
  hospitalCrossHorizontal: {
    width: 20,
    height: 6,
    backgroundColor: theme.colors.deepMaroon,
    position: 'absolute',
    left: 0,
    top: 7,
  },
  iconBadgePower: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.deepMaroon,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.primary,
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
    borderColor: theme.colors.cream,
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
  },
  powerLine: {
    width: 2.5,
    height: 11,
    backgroundColor: theme.colors.cream,
    position: 'absolute',
    top: 0,
    left: 8.75,
  },
  iconBadgeScroll: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.tan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  iconScroll: {
    width: 24,
    height: 28,
    position: 'relative',
  },
  scrollBody: {
    width: 24,
    height: 28,
    backgroundColor: theme.colors.cream,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.darkBrown,
  },
  scrollTop: {
    width: 24,
    height: 4,
    backgroundColor: theme.colors.lightBrown,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    position: 'absolute',
    top: 0,
  },
  scrollBottom: {
    width: 24,
    height: 4,
    backgroundColor: theme.colors.lightBrown,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.darkBrown,
    position: 'absolute',
    bottom: 0,
  },
  // Litigation Progress Widget Styles
  progressWidget: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  viewFullMapLink: {
    fontSize: 14,
    color: theme.colors.mahogany,
    fontWeight: '600',
  },
  loader: {
    padding: 20,
  },
  progressContent: {
    paddingTop: 10,
  },
  currentStageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentStageLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  currentStageName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
    textAlign: 'center',
  },
  stageNumber: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 24,
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.warmGold,
    borderRadius: 10,
  },
  progressPercentage: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  progressStatItem: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  progressStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  continueJourneyButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueJourneyText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  noProgressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  startJourneyButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startJourneyText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Emoji Icon Badge
  iconBadgeEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  emojiIcon: {
    fontSize: 28,
  },
  // Upgrade Button
  upgradeButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  treasureButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#CD7F32',
  },
  treasureButtonIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  treasureButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 4,
  },
  treasureButtonSubtext: {
    fontSize: 14,
    color: '#8B4513',
  },
  upgradeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#F5E6D3',
  },
  upgradeArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  paymentBanner: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    marginHorizontal: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentBannerWarning: {
    backgroundColor: '#FFF3CD',
    borderWidth: 2,
    borderColor: '#FFC107',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paymentBannerSuccess: {
    backgroundColor: '#D4EDDA',
    borderWidth: 2,
    borderColor: '#28A745',
  },
  paymentBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  paymentBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentBannerTextContainer: {
    flex: 1,
  },
  paymentBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  paymentBannerDescription: {
    fontSize: 13,
    color: theme.colors.navy,
    lineHeight: 18,
  },
  paymentBannerButton: {
    backgroundColor: theme.colors.mahogany,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  paymentBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentBannerText: {
    fontSize: 14,
    color: theme.colors.navy,
    marginLeft: 10,
  },
  paymentBannerSuccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 3,
  },
  paymentBannerSuccessDescription: {
    fontSize: 13,
    color: theme.colors.navy,
  },
  disbursementCTA: {
    backgroundColor: theme.colors.mahogany,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: theme.colors.warmGold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  disbursementCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  disbursementCTAIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  disbursementCTATextContainer: {
    flex: 1,
  },
  disbursementCTATitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.cream,
    marginBottom: 4,
  },
  disbursementCTASubtitle: {
    fontSize: 14,
    color: theme.colors.lightCream,
    opacity: 0.9,
  },
  disbursementCTAArrow: {
    fontSize: 24,
    color: theme.colors.warmGold,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
