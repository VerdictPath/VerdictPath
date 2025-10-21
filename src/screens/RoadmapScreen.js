import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const RoadmapScreen = ({ litigationStages, onCompleteStage, onNavigate }) => {
  const handleCompleteStage = (stage) => {
    onCompleteStage(stage.id, stage.coins);
    Alert.alert('Milestone Complete!', `You earned ${stage.coins} coins! 🎉`);
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Your Case Journey</Text>
      </View>

      <View style={styles.roadmapContainer}>
        {litigationStages.map((stage, index) => (
          <View key={stage.id} style={styles.stageItem}>
            <View style={[styles.stageCircle, stage.completed && styles.stageCircleCompleted]}>
              <Text style={styles.stageNumber}>{stage.completed ? '✓' : index + 1}</Text>
            </View>
            
            <View style={styles.stageContent}>
              <Text style={styles.stageName}>{stage.name}</Text>
              <Text style={styles.stageDescription}>{stage.description}</Text>
              <Text style={styles.stageCoins}>🪙 {stage.coins} coins</Text>
              
              {!stage.completed && (
                <TouchableOpacity 
                  style={styles.markCompleteButton}
                  onPress={() => handleCompleteStage(stage)}
                >
                  <Text style={styles.markCompleteText}>Mark Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  roadmapContainer: {
    padding: 20,
  },
  stageItem: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  stageCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stageCircleCompleted: {
    backgroundColor: '#27ae60',
  },
  stageNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  stageContent: {
    flex: 1,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  stageDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  stageCoins: {
    fontSize: 14,
    color: '#f39c12',
    marginBottom: 10,
  },
  markCompleteButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  markCompleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RoadmapScreen;
