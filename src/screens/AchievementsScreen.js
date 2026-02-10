import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 StyleSheet,
 ActivityIndicator,
 ImageBackground,
 useWindowDimensions
} from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { apiRequest, API_BASE_URL } from '../config/api';

const AchievementsScreen = ({ user, onBack, onViewBadges }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { width, height } = useWindowDimensions();

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    loadAchievementsAndStats();
  }, []);

  const loadAchievementsAndStats = async () => {
    try {
      setLoading(true);

      const [achievementsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/gamification/achievements`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        }),
        fetch(`${API_BASE_URL}/api/gamification/stats`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        })
      ]);

      const achievementsData = await achievementsRes.json();
      const statsData = await statsRes.json();

      if (achievementsData.success) {
        setAchievements(achievementsData.achievements);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      alert('Error', 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#95A5A6',
      rare: '#3498DB',
      epic: '#9B59B6',
      legendary: '#F39C12'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityGlow = (rarity) => {
    if (rarity === 'legendary') return styles.legendaryGlow;
    if (rarity === 'epic') return styles.epicGlow;
    if (rarity === 'rare') return styles.rareGlow;
    return null;
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'all') return true;
    if (filter === 'completed') return achievement.progress.isCompleted;
    if (filter === 'in_progress') return !achievement.progress.isCompleted && achievement.progress.current > 0;
    return achievement.category === filter;
  });

  const getContentWidth = () => {
    if (isDesktop) return Math.min(width * 0.6, 800);
    if (isTablet) return width * 0.85;
    return width;
  };

  const renderAchievementCard = (achievement) => {
    const progress = achievement.progress.current;
    const total = achievement.progress.required;
    const percentage = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
    const isCompleted = achievement.progress.isCompleted;

    return (
      <View 
        key={achievement.id} 
        style={[
          styles.achievementCard,
          isCompleted && styles.completedCard,
          getRarityGlow(achievement.rarity)
        ]}
      >
        <View style={styles.achievementHeader}>
          <Text style={[styles.achievementIcon, isCompleted && styles.completedIcon]}>
            {achievement.icon}
          </Text>
          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, isCompleted && styles.completedNameText]}>
              {achievement.name}
            </Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            <View style={styles.achievementMeta}>
              <Text style={[styles.rarityBadge, { backgroundColor: getRarityColor(achievement.rarity) }]}>
                {achievement.rarity.toUpperCase()}
              </Text>
              <Text style={styles.categoryText}>{achievement.category}</Text>
            </View>
          </View>
        </View>

        {!isCompleted ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress} / {total}
            </Text>
          </View>
        ) : (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✓ COMPLETED</Text>
            <Text style={styles.rewardText}>+{achievement.coinReward} 🪙</Text>
          </View>
        )}

        <View style={styles.rewardContainer}>
          <Text style={styles.rewardLabel}>Reward:</Text>
          <Text style={styles.rewardValue}>{achievement.coinReward} coins 🪙</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../attached_assets/Treasure Chest_1764130964116.png')}
        style={[styles.backgroundImage, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { alignItems: isDesktop || isTablet ? 'center' : 'stretch' }
            ]}
          >
            <View style={[
              styles.contentWrapper,
              { width: getContentWidth() }
            ]}>
              <View style={[
                styles.header,
                { paddingTop: isDesktop ? 30 : 50 }
              ]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Text style={[
                    styles.backButtonText,
                    { fontSize: isDesktop ? 20 : 18 }
                  ]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[
                  styles.headerTitle,
                  { fontSize: isDesktop ? 28 : isTablet ? 24 : 20 }
                ]}>🏆 Achievements</Text>
                <TouchableOpacity onPress={onViewBadges} style={styles.badgesButton}>
                  <Text style={[
                    styles.badgesButtonText,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>Badges →</Text>
                </TouchableOpacity>
              </View>

              {stats && (
                <View style={[
                  styles.statsContainer,
                  { padding: isDesktop ? 20 : 16 }
                ]}>
                  <View style={[
                    styles.statCard,
                    { padding: isDesktop ? 20 : 16 }
                  ]}>
                    <Text style={[
                      styles.statValue,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>{stats.achievementsCompleted}/{stats.totalAchievements}</Text>
                    <Text style={[
                      styles.statLabel,
                      { fontSize: isDesktop ? 14 : 12 }
                    ]}>Completed</Text>
                  </View>
                  <View style={[
                    styles.statCard,
                    { padding: isDesktop ? 20 : 16 }
                  ]}>
                    <Text style={[
                      styles.statValue,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>{stats.completionRate}%</Text>
                    <Text style={[
                      styles.statLabel,
                      { fontSize: isDesktop ? 14 : 12 }
                    ]}>Completion Rate</Text>
                  </View>
                  <View style={[
                    styles.statCard,
                    { padding: isDesktop ? 20 : 16 }
                  ]}>
                    <Text style={[
                      styles.statValue,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>{stats.coins} 🪙</Text>
                    <Text style={[
                      styles.statLabel,
                      { fontSize: isDesktop ? 14 : 12 }
                    ]}>Total Coins</Text>
                  </View>
                </View>
              )}

              <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['all', 'completed', 'in_progress', 'progress', 'consistency', 'engagement', 'milestones'].map(filterOption => (
                    <TouchableOpacity
                      key={filterOption}
                      style={[
                        styles.filterChip,
                        filter === filterOption && styles.filterChipActive
                      ]}
                      onPress={() => setFilter(filterOption)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filter === filterOption && styles.filterChipTextActive
                      ]}>
                        {filterOption.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[
                styles.achievementsList,
                { padding: isDesktop ? 20 : 16 }
              ]}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.loadingText}>Loading achievements...</Text>
                  </View>
                ) : filteredAchievements.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>🎯</Text>
                    <Text style={styles.emptyStateText}>No achievements found</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Try a different filter or start completing tasks to unlock achievements!
                    </Text>
                  </View>
                ) : (
                  filteredAchievements.map(achievement => renderAchievementCard(achievement))
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  badgesButton: {
    backgroundColor: 'rgba(180, 120, 40, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  badgesButtonText: {
    color: '#FFD700',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabel: {
    color: '#E8D5B0',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    paddingVertical: 12,
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  filterChip: {
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(180, 120, 40, 0.9)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  filterChipText: {
    fontSize: 14,
    color: '#B8A080',
  },
  filterChipTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  achievementsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#E8D5B0',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 16,
    padding: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#E8D5B0',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  achievementCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  completedCard: {
    backgroundColor: 'rgba(30, 80, 50, 0.85)',
    borderColor: 'rgba(39, 174, 96, 0.6)',
  },
  rareGlow: {
    borderColor: 'rgba(52, 152, 219, 0.8)',
    shadowColor: '#3498DB',
    shadowOpacity: 0.4,
  },
  epicGlow: {
    borderColor: 'rgba(155, 89, 182, 0.8)',
    shadowColor: '#9B59B6',
    shadowOpacity: 0.4,
  },
  legendaryGlow: {
    borderColor: 'rgba(243, 156, 18, 0.9)',
    shadowColor: '#F39C12',
    shadowOpacity: 0.5,
  },
  achievementHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 48,
    marginRight: 16,
    opacity: 0.7,
  },
  completedIcon: {
    opacity: 1,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  completedNameText: {
    color: '#90EE90',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#E8D5B0',
    marginBottom: 8,
  },
  achievementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rarityBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryText: {
    fontSize: 11,
    color: '#B8A080',
    fontStyle: 'italic',
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#E8D5B0',
    textAlign: 'right',
  },
  completedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.8)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.6)',
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
  },
  rewardLabel: {
    fontSize: 13,
    color: '#B8A080',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AchievementsScreen;
