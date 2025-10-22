import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import AvatarSelector from '../components/AvatarSelector';

const RoadmapScreen = ({ litigationStages, onCompleteStage, onNavigate, selectedAvatar, onSelectAvatar, onToggleStage, onCompleteSubStage }) => {
  
  const calculateProgress = () => {
    let completedStages = 0;
    let totalStages = 0;

    litigationStages.forEach(stage => {
      if (stage.subStages && stage.subStages.length > 0) {
        totalStages += stage.subStages.length;
        completedStages += stage.subStages.filter(sub => sub.completed).length;
      } else {
        totalStages += 1;
        if (stage.completed) completedStages += 1;
      }
    });

    return totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  };

  const getCurrentStageIndex = () => {
    const firstIncomplete = litigationStages.findIndex(stage => !stage.completed);
    return firstIncomplete === -1 ? litigationStages.length - 1 : Math.max(0, firstIncomplete);
  };

  const currentStageIndex = getCurrentStageIndex();
  const progress = calculateProgress();

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚓ Litigation Map</Text>
        
        {selectedAvatar && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}% Complete</Text>
            </View>
            
            <View style={styles.selectedHeroDisplay}>
              <Text style={styles.heroEmoji}>{selectedAvatar.emoji}</Text>
              <Text style={[styles.heroName, { color: selectedAvatar.color }]}>
                {selectedAvatar.name}
              </Text>
              <TouchableOpacity 
                style={styles.changeAvatarButton}
                onPress={() => onSelectAvatar(null)}
              >
                <Text style={styles.changeAvatarText}>Change</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {!selectedAvatar && (
          <AvatarSelector 
            selectedAvatar={selectedAvatar} 
            onSelectAvatar={onSelectAvatar}
          />
        )}

        {selectedAvatar && (
          <View style={styles.roadmapContainer}>
            {litigationStages.map((stage, index) => (
              <View key={stage.id} style={styles.stageWrapper}>
                <View style={styles.stageItem}>
                  <View style={styles.stageLeftSection}>
                    <View style={[
                      styles.stageCircle,
                      stage.completed && styles.stageCircleCompleted,
                      currentStageIndex === index && styles.stageCircleCurrent
                    ]}>
                      {currentStageIndex === index && !stage.completed && (
                        <Text style={styles.avatarOnStage}>{selectedAvatar.emoji}</Text>
                      )}
                      {currentStageIndex !== index && (
                        <Text style={styles.stageNumber}>
                          {stage.completed ? '✓' : stage.id}
                        </Text>
                      )}
                    </View>
                    {index < litigationStages.length - 1 && (
                      <View style={styles.connectingLine} />
                    )}
                  </View>

                  <View style={styles.stageContent}>
                    <TouchableOpacity
                      onPress={() => stage.subStages && stage.subStages.length > 0 && onToggleStage(stage.id)}
                      activeOpacity={stage.subStages && stage.subStages.length > 0 ? 0.7 : 1}
                    >
                      <View style={styles.stageHeader}>
                        <Text style={styles.stageName}>{stage.name}</Text>
                        {stage.subStages && stage.subStages.length > 0 && (
                          <Text style={styles.expandIcon}>
                            {stage.expanded ? '▼' : '▶'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.stageDescription}>{stage.description}</Text>
                      <Text style={styles.stageCoins}>
                        💰 {stage.coins} coins {stage.subStages && stage.subStages.length > 0 ? '(bonus)' : ''}
                      </Text>
                    </TouchableOpacity>

                    {(!stage.subStages || stage.subStages.length === 0) && !stage.completed && (
                      <TouchableOpacity
                        style={[styles.markCompleteButton, { backgroundColor: selectedAvatar.color }]}
                        onPress={() => onCompleteStage(stage.id, stage.coins)}
                      >
                        <Text style={styles.markCompleteText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}

                    {stage.completed && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedText}>🏆 Completed</Text>
                      </View>
                    )}
                  </View>
                </View>

                {stage.expanded && stage.subStages && stage.subStages.length > 0 && (
                  <View style={styles.subStagesContainer}>
                    {stage.subStages.map((subStage, subIndex) => (
                      <View key={subStage.id} style={styles.subStageItem}>
                        <View style={styles.subStageLeftSection}>
                          <View style={[
                            styles.subStageCircle,
                            subStage.completed && styles.subStageCircleCompleted
                          ]}>
                            <Text style={styles.subStageIcon}>{subStage.icon}</Text>
                          </View>
                          {subIndex < stage.subStages.length - 1 && (
                            <View style={styles.subConnectingLine} />
                          )}
                        </View>

                        <View style={styles.subStageContent}>
                          <Text style={styles.subStageName}>{subStage.name}</Text>
                          <Text style={styles.subStageDescription}>{subStage.description}</Text>
                          <Text style={styles.subStageCoins}>🪙 {subStage.coins} coins</Text>

                          {!subStage.completed ? (
                            <TouchableOpacity
                              style={[styles.subMarkCompleteButton, { backgroundColor: selectedAvatar.color }]}
                              onPress={() => onCompleteSubStage(stage.id, subStage.id, subStage.coins)}
                            >
                              <Text style={styles.subMarkCompleteText}>Mark Complete</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.subCompletedBadge}>
                              <Text style={styles.subCompletedText}>✓ Done</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>🗺️ Map Legend</Text>
              <Text style={styles.legendItem}>🏝️ Stage Not Started</Text>
              <Text style={styles.legendItem}>🏆 Stage Completed</Text>
              <Text style={styles.legendItem}>{selectedAvatar.emoji} Your Current Position</Text>
              <Text style={styles.legendItem}>▶ Tap to expand Pre-Litigation checklist</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#8b4513',
    padding: 20,
    paddingTop: 15,
    borderBottomWidth: 3,
    borderBottomColor: '#654321',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f4e4c1',
    marginBottom: 15,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#654321',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f4e4c1',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#f4e4c1',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedHeroDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#654321',
    padding: 10,
    borderRadius: 10,
    marginTop: 5,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  heroEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  heroName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  changeAvatarButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  roadmapContainer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f4e4c1',
  },
  stageWrapper: {
    marginBottom: 20,
  },
  stageItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stageLeftSection: {
    alignItems: 'center',
    marginRight: 15,
  },
  stageCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8b4513',
  },
  stageCircleCompleted: {
    backgroundColor: '#27ae60',
  },
  stageCircleCurrent: {
    borderWidth: 4,
    borderColor: '#f39c12',
    backgroundColor: '#fff',
  },
  stageNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarOnStage: {
    fontSize: 28,
  },
  connectingLine: {
    width: 3,
    flex: 1,
    backgroundColor: '#8b4513',
    marginVertical: 5,
    opacity: 0.4,
  },
  stageContent: {
    flex: 1,
    backgroundColor: '#fff9e6',
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b4513',
    elevation: 3,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
    flex: 1,
  },
  expandIcon: {
    fontSize: 16,
    color: '#8b4513',
    fontWeight: 'bold',
  },
  stageDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
    lineHeight: 20,
  },
  stageCoins: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 10,
  },
  markCompleteButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markCompleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  completedBadge: {
    backgroundColor: '#d5f4e6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#27ae60',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subStagesContainer: {
    marginLeft: 35,
    marginTop: 10,
    paddingLeft: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
    backgroundColor: '#fffef8',
    padding: 15,
    borderRadius: 10,
  },
  subStageItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  subStageLeftSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  subStageCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b4513',
  },
  subStageCircleCompleted: {
    backgroundColor: '#81c784',
  },
  subStageIcon: {
    fontSize: 18,
  },
  subConnectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#bdc3c7',
    marginVertical: 3,
  },
  subStageContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8b4513',
  },
  subStageName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subStageDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 18,
  },
  subStageCoins: {
    fontSize: 13,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 8,
  },
  subMarkCompleteButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  subMarkCompleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  subCompletedBadge: {
    backgroundColor: '#d5f4e6',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  subCompletedText: {
    color: '#27ae60',
    fontWeight: '600',
    fontSize: 12,
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
