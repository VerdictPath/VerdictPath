import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import AvatarSelector from '../components/AvatarSelector';

const RoadmapScreen = ({ litigationStages, onCompleteStage, onNavigate, selectedAvatar, onSelectAvatar }) => {
  const handleCompleteStage = (stage) => {
    onCompleteStage(stage.id, stage.coins);
    Alert.alert('Milestone Complete!', `You earned ${stage.coins} coins! 🎉`);
  };

  const getCurrentStageIndex = () => {
    const firstIncomplete = litigationStages.findIndex(stage => !stage.completed);
    return firstIncomplete === -1 ? litigationStages.length - 1 : Math.max(0, firstIncomplete);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>⚓ Litigation Map</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {!selectedAvatar && (
          <AvatarSelector 
            selectedAvatar={selectedAvatar} 
            onSelectAvatar={onSelectAvatar}
          />
        )}

        {selectedAvatar && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>🗺️ Your Legal Journey</Text>
              <TouchableOpacity 
                style={styles.changeAvatarButton}
                onPress={() => onSelectAvatar(null)}
              >
                <Text style={styles.changeAvatarText}>Change Hero</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectedHeroDisplay}>
              <Text style={styles.heroEmoji}>{selectedAvatar.emoji}</Text>
              <Text style={[styles.heroName, { color: selectedAvatar.color }]}>
                {selectedAvatar.name}
              </Text>
            </View>

            <View style={styles.pirateMap}>
              {litigationStages.map((stage, index) => {
                const isCurrentStage = index === currentStageIndex;
                const isCompleted = stage.completed;
                const position = getStagePosition(index);
                
                return (
                  <View 
                    key={stage.id} 
                    style={[
                      styles.stageLocation,
                      { top: position.top, left: position.left }
                    ]}
                  >
                    {index > 0 && (
                      <View style={[
                        styles.pathLine,
                        getPreviousStagePosition(index - 1, position)
                      ]} />
                    )}
                    
                    <View style={[
                      styles.stageIsland,
                      isCompleted && styles.stageIslandCompleted
                    ]}>
                      <Text style={styles.stageIcon}>
                        {isCompleted ? '🏆' : '🏝️'}
                      </Text>
                      
                      {isCurrentStage && (
                        <View style={styles.avatarMarker}>
                          <Text style={styles.avatarMarkerEmoji}>
                            {selectedAvatar.emoji}
                          </Text>
                        </View>
                      )}
                      
                      <Text style={styles.stageNameMap}>{stage.name}</Text>
                      <Text style={styles.stageCoinsMap}>💰 {stage.coins}</Text>
                      
                      {!isCompleted && (
                        <TouchableOpacity 
                          style={[styles.completeButton, { backgroundColor: selectedAvatar.color }]}
                          onPress={() => handleCompleteStage(stage)}
                        >
                          <Text style={styles.completeButtonText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                      
                      {isCompleted && (
                        <Text style={styles.completedBadge}>✓ Done</Text>
                      )}
                    </View>
                  </View>
                );
              })}
              
              <View style={styles.mapDecoration}>
                <Text style={styles.decorationText}>⚓</Text>
              </View>
              <View style={[styles.mapDecoration, { top: 100, right: 20 }]}>
                <Text style={styles.decorationText}>🦜</Text>
              </View>
              <View style={[styles.mapDecoration, { bottom: 50, left: 30 }]}>
                <Text style={styles.decorationText}>💎</Text>
              </View>
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>🗺️ Map Legend</Text>
              <Text style={styles.legendItem}>🏝️ Unvisited Location</Text>
              <Text style={styles.legendItem}>🏆 Conquered Territory</Text>
              <Text style={styles.legendItem}>{selectedAvatar.emoji} Your Current Position</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStagePosition = (index) => {
  const positions = [
    { top: 50, left: 20 },
    { top: 120, left: 60 },
    { top: 80, left: 140 },
    { top: 180, left: 100 },
    { top: 220, left: 40 },
    { top: 320, left: 80 },
    { top: 380, left: 160 },
    { top: 450, left: 100 },
  ];
  return positions[index] || positions[0];
};

const getPreviousStagePosition = (prevIndex, currentPos) => {
  const prevPos = getStagePosition(prevIndex);
  const angle = Math.atan2(currentPos.top - prevPos.top, currentPos.left - prevPos.left);
  const distance = Math.sqrt(
    Math.pow(currentPos.left - prevPos.left, 2) + 
    Math.pow(currentPos.top - prevPos.top, 2)
  );
  
  return {
    position: 'absolute',
    top: -20,
    left: -30,
    width: distance,
    height: 3,
    transform: [{ rotate: `${angle}rad` }],
  };
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  mapContainer: {
    padding: 15,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b4513',
  },
  changeAvatarButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedHeroDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  heroEmoji: {
    fontSize: 30,
    marginRight: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pirateMap: {
    backgroundColor: '#f4e4c1',
    borderRadius: 15,
    padding: 20,
    minHeight: 600,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#8b4513',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stageLocation: {
    position: 'absolute',
    width: 140,
  },
  pathLine: {
    backgroundColor: '#8b4513',
    opacity: 0.3,
  },
  stageIsland: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b4513',
    padding: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stageIslandCompleted: {
    backgroundColor: '#d4f4dd',
    borderColor: '#27ae60',
  },
  stageIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  avatarMarker: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    borderWidth: 3,
    borderColor: '#f39c12',
    elevation: 5,
  },
  avatarMarkerEmoji: {
    fontSize: 24,
  },
  stageNameMap: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 3,
  },
  stageCoinsMap: {
    fontSize: 12,
    color: '#f39c12',
    marginBottom: 8,
  },
  completeButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  completedBadge: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: 'bold',
    marginTop: 5,
  },
  mapDecoration: {
    position: 'absolute',
    top: 20,
    left: 200,
  },
  decorationText: {
    fontSize: 24,
    opacity: 0.3,
  },
  legend: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#8b4513',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 10,
  },
  legendItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 5,
  },
});

export default RoadmapScreen;
