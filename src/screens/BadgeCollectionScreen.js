import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 StyleSheet,
 ActivityIndicator } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const BadgeCollectionScreen = ({ user, onBack }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/gamification/badges`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      const data = await response.json();

      if (data.success) {
        setBadges(data.badges);
      }
    } catch (error) {
      console.error('Error loading badges:', error);
      alert('Error', 'Failed to load badges');
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

  const filteredBadges = badges.filter(badge => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return badge.unlocked;
    if (filter === 'locked') return !badge.unlocked;
    return badge.rarity === filter;
  });

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalBadges = badges.length;
  const unlockPercentage = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  const renderBadgeCard = (badge) => {
    return (
      <View 
        key={badge.id} 
        style={[
          styles.badgeCard,
          !badge.unlocked && styles.lockedBadge
        ]}
      >
        <View style={[
          styles.badgeIconContainer,
          { borderColor: getRarityColor(badge.rarity) }
        ]}>
          <Text style={[
            styles.badgeIcon,
            !badge.unlocked && styles.lockedIcon
          ]}>
            {badge.unlocked ? badge.icon : '🔒'}
          </Text>
        </View>

        <View style={styles.badgeInfo}>
          <Text style={[
            styles.badgeName,
            !badge.unlocked && styles.lockedText
          ]}>
            {badge.unlocked ? badge.name : '???'}
          </Text>
          
          <Text style={styles.badgeDescription}>
            {badge.unlocked ? badge.description : 'Complete achievements to unlock'}
          </Text>

          <View style={styles.badgeMeta}>
            <Text style={[
              styles.rarityBadge,
              { backgroundColor: getRarityColor(badge.rarity) }
            ]}>
              {badge.rarity.toUpperCase()}
            </Text>
            
            {badge.isSpecial && (
              <Text style={styles.specialBadge}>⭐ SPECIAL</Text>
            )}
          </View>

          {badge.unlocked && badge.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked: {new Date(badge.unlockedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          )}
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
        <Text style={styles.headerTitle}>⭐ Badge Collection</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Collection Progress</Text>
        <View style={styles.progressInfo}>
          <Text style={styles.progressCount}>{unlockedCount} / {totalBadges}</Text>
          <Text style={styles.progressPercentage}>{unlockPercentage}% Complete</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${unlockPercentage}%` }]} />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'unlocked', 'locked', 'common', 'rare', 'epic', 'legendary'].map(filterOption => (
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

      <ScrollView style={styles.badgesList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading badges...</Text>
          </View>
        ) : filteredBadges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⭐</Text>
            <Text style={styles.emptyStateText}>No badges found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try a different filter or unlock more badges by completing achievements!
            </Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {filteredBadges.map(badge => renderBadgeCard(badge))}
          </View>
        )}
      </ScrollView>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Rarity Legend</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#95A5A6' }]} />
            <Text style={styles.legendText}>Common</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3498DB' }]} />
            <Text style={styles.legendText}>Rare</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#9B59B6' }]} />
            <Text style={styles.legendText}>Epic</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F39C12' }]} />
            <Text style={styles.legendText}>Legendary</Text>
          </View>
        </View>
      </View>
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
  headerSpacer: {
    width: 60,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
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
  badgesList: {
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
  badgesGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedBadge: {
    backgroundColor: '#F9F9F9',
    opacity: 0.7,
  },
  badgeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#FFF',
  },
  badgeIcon: {
    fontSize: 40,
  },
  lockedIcon: {
    opacity: 0.4,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lockedText: {
    color: '#999',
  },
  badgeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  badgeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rarityBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  specialBadge: {
    backgroundColor: '#F39C12',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unlockedDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  legendContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default BadgeCollectionScreen;
