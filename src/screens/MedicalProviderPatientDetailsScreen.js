import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { LITIGATION_STAGES } from '../constants/mockData';

const { width } = Dimensions.get('window');

const MedicalProviderPatientDetailsScreen = ({ user, patientId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('roadmap');

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.MEDICALPROVIDER.PATIENT_DETAILS(patientId)}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPatient(data.patient);
        setLitigationProgress(data.litigationProgress);
      } else {
        console.error('Failed to fetch patient details');
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const mergeCompletedSubstages = () => {
    if (!litigationProgress || !litigationProgress.completedSubstages) {
      return LITIGATION_STAGES;
    }

    const stagesWithProgress = JSON.parse(JSON.stringify(LITIGATION_STAGES));

    litigationProgress.completedSubstages.forEach(completedSubstage => {
      const stageIndex = stagesWithProgress.findIndex(s => s.id === completedSubstage.stage_id);
      if (stageIndex !== -1) {
        const stage = stagesWithProgress[stageIndex];
        
        // Safety check: ensure subStages array exists (note: LITIGATION_STAGES uses camelCase 'subStages')
        if (stage.subStages && Array.isArray(stage.subStages)) {
          const substageIndex = stage.subStages.findIndex(sub => 
            sub.id === completedSubstage.substage_id
          );

          if (substageIndex !== -1) {
            stage.subStages[substageIndex].completed = true;
            stage.subStages[substageIndex].completedAt = completedSubstage.completed_at;
          }
        }
      }
    });

    stagesWithProgress.forEach(stage => {
      // Safety check: ensure subStages array exists
      if (stage.subStages && Array.isArray(stage.subStages)) {
        const hasAnyCompleted = stage.subStages.some(sub => sub.completed);
        if (hasAnyCompleted) {
          stage.completed = stage.subStages.every(sub => sub.completed);
        }
      }
    });

    return stagesWithProgress;
  };

  const renderRoadmapPath = () => {
    const stages = mergeCompletedSubstages();
    const mapWidth = width - 40;
    const mapHeight = 600;
    const centerX = mapWidth / 2;

    const stagePositions = [
      { x: centerX - 100, y: 50 },
      { x: centerX + 80, y: 120 },
      { x: centerX - 120, y: 200 },
      { x: centerX + 100, y: 280 },
      { x: centerX - 80, y: 360 },
      { x: centerX + 90, y: 440 },
      { x: centerX - 110, y: 520 },
      { x: centerX + 70, y: 590 },
      { x: centerX, y: 660 }
    ];

    const paths = [];
    const circles = [];

    for (let i = 0; i < stagePositions.length - 1; i++) {
      const start = stagePositions[i];
      const end = stagePositions[i + 1];
      const stage = stages[i];
      
      // Determine stage status: complete, in-progress, or not started
      const isComplete = stage.completed === true;
      const hasAnyCompleted = (stage.subStages && Array.isArray(stage.subStages)) 
        ? stage.subStages.some(sub => sub.completed === true) 
        : false;
      const isInProgress = !isComplete && hasAnyCompleted;
      
      // Color coding: green for complete, yellow for in-progress, gray for not started
      let pathColor = theme.colors.warmGray;
      if (isComplete) {
        pathColor = '#27ae60'; // Green
      } else if (isInProgress) {
        pathColor = '#f39c12'; // Yellow/Amber
      }
      
      const strokeDasharray = (isComplete || isInProgress) ? "5,5" : "0";

      const controlX1 = start.x + (end.x - start.x) / 3;
      const controlY1 = start.y + (end.y - start.y) / 3 + 30;
      const controlX2 = start.x + 2 * (end.x - start.x) / 3;
      const controlY2 = start.y + 2 * (end.y - start.y) / 3 - 30;

      paths.push(
        <Path
          key={`path-${i}`}
          d={`M ${start.x} ${start.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${end.x} ${end.y}`}
          stroke={pathColor}
          strokeWidth="3"
          fill="none"
          strokeDasharray={strokeDasharray}
        />
      );
    }

    stages.forEach((stage, index) => {
      const pos = stagePositions[index];
      
      // Determine stage status: complete, in-progress, or not started
      const isComplete = stage.completed === true;
      const hasAnyCompleted = (stage.subStages && Array.isArray(stage.subStages)) 
        ? stage.subStages.some(sub => sub.completed === true) 
        : false;
      const isInProgress = !isComplete && hasAnyCompleted;
      
      // Color coding: green for complete, yellow for in-progress, gray for not started
      let circleColor = theme.colors.warmGray;
      if (isComplete) {
        circleColor = '#27ae60'; // Green
      } else if (isInProgress) {
        circleColor = '#f39c12'; // Yellow/Amber
      }
      
      console.log(`Stage ${index} (${stage.name}): isComplete=${isComplete}, isInProgress=${isInProgress}, hasAnyCompleted=${hasAnyCompleted}, color=${circleColor}`);
      
      const circleIcon = isComplete ? '✓' : stage.icon;

      circles.push(
        <Circle
          key={`circle-${index}`}
          cx={pos.x}
          cy={pos.y}
          r="25"
          fill={circleColor}
          stroke={theme.colors.navy}
          strokeWidth="2"
        />
      );
    });

    return (
      <View style={styles.mapContainer}>
        <Svg width={mapWidth} height={750}>
          {paths}
          {circles}
        </Svg>
        
        {stages.map((stage, index) => {
          const pos = stagePositions[index];
          const hasProgress = stage.completed || (stage.subStages && stage.subStages.some(sub => sub.completed));
          const completedCount = stage.subStages ? stage.subStages.filter(sub => sub.completed).length : 0;
          const totalCount = stage.subStages ? stage.subStages.length : 0;
          
          return (
            <View
              key={`label-${index}`}
              style={[
                styles.stageLabel,
                {
                  position: 'absolute',
                  left: pos.x - 60,
                  top: pos.y + 30,
                }
              ]}
            >
              <Text style={styles.stageName}>{stage.name}</Text>
              {hasProgress && (
                <Text style={styles.stageProgress}>
                  {completedCount}/{totalCount} Complete
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderRoadmapTab = () => {
    const stages = mergeCompletedSubstages();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Litigation Journey</Text>
          <View style={styles.progressSummary}>
            <Text style={styles.progressLabel}>Overall Progress:</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${litigationProgress?.progress?.progress_percentage || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {litigationProgress?.progress?.progress_percentage || 0}% Complete
            </Text>
          </View>
          {renderRoadmapPath()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Stage Details</Text>
          {stages.map((stage, index) => {
            if (!stage.subStages || !Array.isArray(stage.subStages)) return null;
            
            const completedCount = stage.subStages.filter(sub => sub.completed).length;
            const hasProgress = completedCount > 0;
            
            if (!hasProgress) return null;
            
            return (
              <View key={index} style={styles.stageDetailCard}>
                <View style={styles.stageDetailHeader}>
                  <Text style={styles.stageDetailIcon}>{stage.icon}</Text>
                  <Text style={styles.stageDetailName}>{stage.name}</Text>
                </View>
                <Text style={styles.stageDetailProgress}>
                  {completedCount} of {stage.subStages.length} tasks completed
                </Text>
                <View style={styles.substageList}>
                  {stage.subStages.filter(sub => sub.completed).map((substage, subIndex) => (
                    <Text key={subIndex} style={styles.completedSubstage}>
                      ✓ {substage.name}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Patient Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{patient?.displayName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{patient?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Stage:</Text>
          <Text style={styles.infoValue}>
            {litigationProgress?.progress?.current_stage_name || 'Pre-Litigation'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Progress:</Text>
          <Text style={styles.infoValue}>
            {litigationProgress?.progress?.progress_percentage || 0}%
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tasks Completed:</Text>
          <Text style={styles.infoValue}>
            {litigationProgress?.progress?.total_substages_completed || 0}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Progress Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statValue}>
              {litigationProgress?.progress?.total_substages_completed || 0}
            </Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>
              {litigationProgress?.progress?.total_coins_earned || 0}
            </Text>
            <Text style={styles.statLabel}>Coins Earned</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading Patient Details...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found or access denied</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👤 {patient.displayName}</Text>
          <Text style={styles.headerSubtitle}>Patient Details (Read-Only)</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roadmap' && styles.activeTab]}
          onPress={() => setActiveTab('roadmap')}
        >
          <Text style={styles.tabIcon}>🗺️</Text>
          <Text style={[styles.tabText, activeTab === 'roadmap' && styles.activeTabText]}>
            Roadmap
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'roadmap' && renderRoadmapTab()}

        <TouchableOpacity style={styles.backButtonBottom} onPress={onBack}>
          <Text style={styles.backButtonBottomText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sand,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 15,
  },
  backArrow: {
    fontSize: 24,
    color: theme.colors.mahogany,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.warmGold,
    backgroundColor: theme.colors.lightCream,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.mahogany,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.navy,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  progressSummary: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: theme.colors.sand,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 10,
  },
  progressPercentage: {
    fontSize: 16,
    color: theme.colors.mahogany,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    position: 'relative',
    marginTop: 20,
  },
  stageLabel: {
    alignItems: 'center',
    width: 120,
  },
  stageName: {
    fontSize: 12,
    color: theme.colors.navy,
    fontWeight: '600',
    textAlign: 'center',
  },
  stageProgress: {
    fontSize: 10,
    color: '#27ae60',
    marginTop: 2,
    textAlign: 'center',
  },
  stageDetailCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  stageDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageDetailIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  stageDetailName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  stageDetailProgress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  substageList: {
    gap: 6,
  },
  completedSubstage: {
    fontSize: 13,
    color: '#27ae60',
    paddingLeft: 10,
  },
  backButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButtonBottom: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  backButtonBottomText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicalProviderPatientDetailsScreen;
