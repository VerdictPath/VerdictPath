import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal, Dimensions } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import AvatarSelector from '../components/AvatarSelector';

const { width, height } = Dimensions.get('window');

const RoadmapScreen = ({ litigationStages, onCompleteStage, onNavigate, selectedAvatar, onSelectAvatar, onCompleteSubStage, onPurchaseVideo }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

  const openStageModal = (stage) => {
    setSelectedStage(stage);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedStage(null), 300);
  };

  const handleSubStageComplete = (subStageId, subStageCoins) => {
    onCompleteSubStage(selectedStage.id, subStageId, subStageCoins);
    const updatedStage = litigationStages.find(s => s.id === selectedStage.id);
    if (updatedStage) {
      setSelectedStage(updatedStage);
    }
  };

  const completeEntireStage = () => {
    if (!selectedStage.subStages || selectedStage.subStages.length === 0) {
      onCompleteStage(selectedStage.id, selectedStage.coins);
      closeModal();
    } else {
      const incompleteSubs = selectedStage.subStages.filter(sub => !sub.completed);
      const subStageCoins = incompleteSubs.reduce((sum, sub) => sum + sub.coins, 0);
      const totalCoins = subStageCoins + selectedStage.coins;

      Alert.alert(
        'Complete Stage?',
        `Mark "${selectedStage.name}" as complete?\n\nYou'll earn:\n• ${subStageCoins} coins from ${incompleteSubs.length} steps\n• ${selectedStage.coins} bonus coins\n\nTotal: ${totalCoins} coins`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete All',
            onPress: () => {
              incompleteSubs.forEach(sub => {
                onCompleteSubStage(selectedStage.id, sub.id, sub.coins);
              });
              closeModal();
            }
          }
        ]
      );
    }
  };

  const getCurrentStageIndex = () => {
    const firstIncomplete = litigationStages.findIndex(stage => !stage.completed);
    return firstIncomplete === -1 ? litigationStages.length - 1 : Math.max(0, firstIncomplete);
  };

  const currentStageIndex = getCurrentStageIndex();

  const renderTreasure = (stage, index) => {
    const isCurrent = currentStageIndex === index && !stage.completed;
    return (
      <TouchableOpacity
        key={stage.id}
        style={[
          styles.treasureChest,
          { top: stage.position.top, left: stage.position.left },
          isCurrent && !stage.completed && styles.treasureChestCurrent
        ]}
        onPress={() => openStageModal(stage)}
        activeOpacity={0.7}
      >
        {isCurrent && selectedAvatar && !stage.completed ? (
          <Text style={styles.avatarIcon}>{selectedAvatar.emoji}</Text>
        ) : (
          <Text style={styles.treasureIcon}>{stage.completed ? '🏆' : '💰'}</Text>
        )}
        {stage.completed && (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStageModal = () => {
    if (!selectedStage) return null;

    const completedSubStages = selectedStage.subStages?.filter(s => s.completed).length || 0;
    const totalSubStages = selectedStage.subStages?.length || 0;
    const progress = totalSubStages > 0 ? Math.round((completedSubStages / totalSubStages) * 100) : 0;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedStage.name}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>{selectedStage.description}</Text>

              {totalSubStages > 0 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Progress: {completedSubStages}/{totalSubStages} steps</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.coinsSection}>
                <Text style={styles.coinsSectionTitle}>🪙 Bonus Reward</Text>
                <Text style={styles.coinsAmount}>{selectedStage.coins} coins</Text>
              </View>

              {selectedStage.subStages && selectedStage.subStages.length > 0 && (
                <View style={styles.subStagesSection}>
                  <Text style={styles.sectionTitle}>📋 Steps in this Stage</Text>
                  {selectedStage.subStages.map(subStage => (
                    <View key={subStage.id} style={styles.subStageRow}>
                      <View style={styles.subStageLeft}>
                        <Text style={styles.subStageRowIcon}>{subStage.icon}</Text>
                        <View style={styles.subStageInfo}>
                          <Text style={styles.subStageRowName}>{subStage.name}</Text>
                          <Text style={styles.subStageRowCoins}>+{subStage.coins} coins</Text>
                        </View>
                      </View>
                      {subStage.completed ? (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.miniCompleteButton, selectedAvatar && { backgroundColor: selectedAvatar.color }]}
                          onPress={() => handleSubStageComplete(subStage.id, subStage.coins)}
                        >
                          <Text style={styles.miniCompleteButtonText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {selectedStage.videos && selectedStage.videos.length > 0 && (
                <View style={styles.videosSection}>
                  <Text style={styles.sectionTitle}>🎬 Tutorial Videos</Text>
                  {selectedStage.videos.map(video => (
                    <TouchableOpacity
                      key={video.id}
                      style={styles.videoCard}
                      onPress={() => onPurchaseVideo(video)}
                    >
                      <View style={styles.videoLeft}>
                        <Text style={styles.videoPlayIcon}>▶️</Text>
                        <View style={styles.videoInfo}>
                          <Text style={styles.videoTitle}>{video.title}</Text>
                          <Text style={styles.videoDuration}>{video.duration}</Text>
                        </View>
                      </View>
                      <Text style={styles.videoPrice}>${video.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!selectedStage.completed && (
                <TouchableOpacity
                  style={[styles.completeStageButton, selectedAvatar && { backgroundColor: selectedAvatar.color }]}
                  onPress={completeEntireStage}
                >
                  <Text style={styles.completeStageButtonText}>
                    ✓ Mark Entire Stage Complete
                  </Text>
                </TouchableOpacity>
              )}

              {selectedStage.completed && (
                <View style={styles.completedBanner}>
                  <Text style={styles.completedBannerText}>🏆 Stage Completed!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏴‍☠️ Pirate's Litigation Map</Text>
        {selectedAvatar && (
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={() => onSelectAvatar(null)}
          >
            <Text style={styles.heroEmoji}>{selectedAvatar.emoji}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedAvatar ? (
        <View style={styles.avatarSelectorContainer}>
          <AvatarSelector 
            selectedAvatar={selectedAvatar} 
            onSelectAvatar={onSelectAvatar}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.mapScrollView}
          contentContainerStyle={styles.mapContainer}
        >
          <View style={styles.pirateMap}>
            <Text style={[styles.mapDecor, { top: '5%', left: '5%' }]}>⚓</Text>
            <Text style={[styles.mapDecor, { top: '10%', right: '8%' }]}>🦜</Text>
            <Text style={[styles.mapDecor, { top: '30%', left: '85%' }]}>🏴‍☠️</Text>
            <Text style={[styles.mapDecor, { top: '55%', left: '5%' }]}>🗡️</Text>
            <Text style={[styles.mapDecor, { top: '70%', right: '10%' }]}>🌊</Text>
            <Text style={[styles.mapDecor, { bottom: '8%', left: '15%' }]}>🧭</Text>

            <View style={styles.treasurePath} />

            {litigationStages.map((stage, index) => renderTreasure(stage, index))}

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>🗺️ Map Legend</Text>
              <Text style={styles.legendItem}>💰 = Treasure to Claim</Text>
              <Text style={styles.legendItem}>🏆 = Treasure Found!</Text>
              <Text style={styles.legendItem}>{selectedAvatar.emoji} = Your Position</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {renderStageModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0f3460',
    padding: 20,
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#d4af37',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    flex: 1,
    textAlign: 'center',
  },
  changeAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  heroEmoji: {
    fontSize: 22,
  },
  avatarSelectorContainer: {
    flex: 1,
    backgroundColor: '#c9a86a',
  },
  mapScrollView: {
    flex: 1,
  },
  mapContainer: {
    minHeight: height * 1.2,
  },
  pirateMap: {
    flex: 1,
    backgroundColor: '#c9a86a',
    margin: 10,
    borderRadius: 15,
    borderWidth: 5,
    borderColor: '#8b7355',
    minHeight: height * 1.1,
    position: 'relative',
    padding: 20,
  },
  treasurePath: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '10%',
    borderWidth: 3,
    borderColor: '#654321',
    borderStyle: 'dashed',
    borderRadius: 20,
    opacity: 0.3,
  },
  treasureChest: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4e4c1',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#8b4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  treasureChestCurrent: {
    borderWidth: 4,
    borderColor: '#f39c12',
    backgroundColor: '#fff',
  },
  treasureIcon: {
    fontSize: 35,
  },
  avatarIcon: {
    fontSize: 32,
  },
  completeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  completeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapDecor: {
    position: 'absolute',
    fontSize: 30,
    opacity: 0.6,
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#f4e4c1',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8b4513',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#654321',
    marginBottom: 8,
  },
  legendItem: {
    fontSize: 12,
    color: '#654321',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.85,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f3460',
    flex: 1,
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 6,
  },
  coinsSection: {
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
    alignItems: 'center',
  },
  coinsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#654321',
    marginBottom: 5,
  },
  coinsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 5,
  },
  subStagesSection: {
    marginBottom: 20,
  },
  subStageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  subStageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subStageRowIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  subStageInfo: {
    flex: 1,
  },
  subStageRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  subStageRowCoins: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  miniCompleteButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniCompleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videosSection: {
    marginBottom: 20,
  },
  videoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  videoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  videoPlayIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  videoDuration: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  videoPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  completeStageButton: {
    backgroundColor: '#27ae60',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  completeStageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedBanner: {
    backgroundColor: '#d5f4e6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  completedBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});

export default RoadmapScreen;
