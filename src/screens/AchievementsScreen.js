import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_BASE_URL } from '../config/api';

const AchievementsScreen = ({ user, onBack, onViewBadges }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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
      Alert.alert('Error', 'Failed to load achievements');
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
            <Text style={[styles.achievementName, isCompleted && styles.completedText]}>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Achievements</Text>
        <TouchableOpacity onPress={onViewBadges} style={styles.badgesButton}>
          <Text style={styles.badgesButtonText}>Badges →</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.achievementsCompleted}/{stats.totalAchievements}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.coins} 🪙</Text>
            <Text style={styles.statLabel}>Total Coins</Text>
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

      <ScrollView style={styles.achievementsList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  badgesButton: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  badgesButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  filterChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  achievementsList: {
    flex: 1,
    padding: 16,
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
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#F0FFF4',
    borderColor: '#2ECC71',
  },
  rareGlow: {
    borderColor: '#3498DB',
    shadowColor: '#3498DB',
    shadowOpacity: 0.3,
  },
  epicGlow: {
    borderColor: '#9B59B6',
    shadowColor: '#9B59B6',
    shadowOpacity: 0.3,
  },
  legendaryGlow: {
    borderColor: '#F39C12',
    shadowColor: '#F39C12',
    shadowOpacity: 0.4,
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
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#666',
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
  },
  categoryText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  completedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  rewardLabel: {
    fontSize: 13,
    color: '#666',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default AchievementsScreen;
