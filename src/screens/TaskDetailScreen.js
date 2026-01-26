import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';
import { alert } from '../utils/alert';

const TaskDetailScreen = ({ user, task, onNavigate, onTaskUpdated }) => {
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'medium': return '#3498db';
      case 'low': return '#95a5a6';
      default: return '#999';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return '🔥 Urgent';
      case 'high': return '⚠️ High';
      case 'medium': return '📌 Medium';
      case 'low': return '💡 Low';
      default: return priority;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '▶️';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Not Started';
      case 'in_progress': return 'Working On It';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.TASKS.UPDATE_STATUS(task.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'completed') {
        setCompletionData(data);
        setJustCompleted(true);
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } else if (newStatus === 'in_progress') {
        alert('Success', 'Your attorney has been notified that you\'re working on this task.');
        if (onTaskUpdated) {
          onTaskUpdated();
        }
        onNavigate('actions');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error', 'Failed to update task status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertTask = async () => {
    setLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.TASKS.UPDATE_STATUS(task.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: 'pending' }),
      });

      alert('Task Reverted', 'Task has been marked as not started. Your attorney has been notified.');
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      onNavigate('actions');
    } catch (error) {
      console.error('Error reverting task:', error);
      alert('Error', 'Failed to revert task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const contentWidth = isDesktop ? Math.min(700, width * 0.6) : isTablet ? Math.min(600, width * 0.8) : '100%';

  if (justCompleted) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../../attached_assets/Fighting Ships_1764038386285.png')}
          style={[styles.backgroundImage, { width, height }]}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.celebrationContainer}>
              <View style={[styles.celebrationCard, { width: contentWidth, padding: isDesktop ? 40 : 28 }]}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={[styles.celebrationTitle, { fontSize: isDesktop ? 32 : 26 }]}>
                  Congratulations!
                </Text>
                <Text style={[styles.celebrationSubtitle, { fontSize: isDesktop ? 20 : 17 }]}>
                  You completed the task
                </Text>
                <Text style={[styles.celebrationTaskName, { fontSize: isDesktop ? 22 : 18 }]}>
                  "{task.title}"
                </Text>
                
                {completionData?.coinsAwarded > 0 && !completionData?.coinsAlreadyEarnedBefore && (
                  <View style={styles.coinsEarnedContainer}>
                    <Text style={styles.coinsEarnedEmoji}>🪙</Text>
                    <Text style={[styles.coinsEarnedText, { fontSize: isDesktop ? 24 : 20 }]}>
                      +{completionData.coinsAwarded} coins earned!
                    </Text>
                  </View>
                )}
                
                {completionData?.coinsAlreadyEarnedBefore && (
                  <Text style={[styles.coinsAlreadyEarnedText, { fontSize: isDesktop ? 14 : 12 }]}>
                    (Coins were already earned previously)
                  </Text>
                )}

                <Text style={[styles.notificationSentText, { fontSize: isDesktop ? 16 : 14 }]}>
                  Your attorney has been notified of your progress.
                </Text>

                <TouchableOpacity
                  style={styles.backToTasksButton}
                  onPress={() => onNavigate('actions')}
                >
                  <Text style={[styles.backToTasksButtonText, { fontSize: isDesktop ? 18 : 16 }]}>
                    Back to Tasks
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../attached_assets/Fighting Ships_1764038386285.png')}
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
            <View style={[styles.contentContainer, { width: contentWidth }]}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => onNavigate('actions')}
              >
                <Text style={styles.backButtonText}>← Back to Tasks</Text>
              </TouchableOpacity>

              <View style={[styles.taskCard, { padding: isDesktop ? 28 : 20 }]}>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusIcon, { fontSize: isDesktop ? 32 : 28 }]}>
                    {getStatusIcon(task.status)}
                  </Text>
                  <Text style={[styles.statusLabel, { fontSize: isDesktop ? 18 : 16 }]}>
                    {getStatusLabel(task.status)}
                  </Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    <Text style={[styles.priorityBadgeText, { fontSize: isDesktop ? 14 : 12 }]}>
                      {getPriorityLabel(task.priority)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.taskTitle, { fontSize: isDesktop ? 26 : 22 }]}>
                  {task.title}
                </Text>

                {task.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={[styles.sectionLabel, { fontSize: isDesktop ? 14 : 12 }]}>Description</Text>
                    <Text style={[styles.taskDescription, { fontSize: isDesktop ? 17 : 15 }]}>
                      {task.description}
                    </Text>
                  </View>
                )}

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⚖️</Text>
                    <View>
                      <Text style={[styles.detailLabel, { fontSize: isDesktop ? 13 : 11 }]}>Assigned By</Text>
                      <Text style={[styles.detailValue, { fontSize: isDesktop ? 16 : 14 }]}>{task.lawFirmName}</Text>
                    </View>
                  </View>

                  {task.dueDate && (
                    <View style={[styles.detailRow, isOverdue && styles.overdueRow]}>
                      <Text style={styles.detailIcon}>{isOverdue ? '⚠️' : '📅'}</Text>
                      <View>
                        <Text style={[styles.detailLabel, { fontSize: isDesktop ? 13 : 11 }]}>
                          {isOverdue ? 'Overdue!' : 'Due Date'}
                        </Text>
                        <Text style={[
                          styles.detailValue, 
                          isOverdue && styles.overdueText,
                          { fontSize: isDesktop ? 16 : 14 }
                        ]}>
                          {formatDate(task.dueDate)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {task.coinsReward > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🪙</Text>
                      <View>
                        <Text style={[styles.detailLabel, { fontSize: isDesktop ? 13 : 11 }]}>Coin Reward</Text>
                        <Text style={[styles.detailValue, styles.coinsValue, { fontSize: isDesktop ? 16 : 14 }]}>
                          {task.coinsReward} coins
                        </Text>
                      </View>
                    </View>
                  )}

                  {task.completedAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>✅</Text>
                      <View>
                        <Text style={[styles.detailLabel, { fontSize: isDesktop ? 13 : 11 }]}>Completed On</Text>
                        <Text style={[styles.detailValue, { fontSize: isDesktop ? 16 : 14 }]}>
                          {formatDate(task.completedAt)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {task.completionNotes && (
                  <View style={styles.notesContainer}>
                    <Text style={[styles.sectionLabel, { fontSize: isDesktop ? 14 : 12 }]}>Completion Notes</Text>
                    <Text style={[styles.notesText, { fontSize: isDesktop ? 15 : 13 }]}>
                      {task.completionNotes}
                    </Text>
                  </View>
                )}
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.loadingText}>Updating task...</Text>
                </View>
              ) : (
                <View style={styles.actionsContainer}>
                  {task.status !== 'completed' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleUpdateStatus('completed')}
                      >
                        <Text style={styles.actionButtonIcon}>✅</Text>
                        <View style={styles.actionButtonContent}>
                          <Text style={[styles.actionButtonText, { fontSize: isDesktop ? 20 : 18 }]}>
                            Complete
                          </Text>
                          <Text style={[styles.actionButtonSubtext, { fontSize: isDesktop ? 14 : 12 }]}>
                            Mark this task as done
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.workingButton,
                          task.status === 'in_progress' && styles.activeStatusButton
                        ]}
                        onPress={() => handleUpdateStatus('in_progress')}
                        disabled={task.status === 'in_progress'}
                      >
                        <Text style={styles.actionButtonIcon}>🔄</Text>
                        <View style={styles.actionButtonContent}>
                          <Text style={[styles.actionButtonText, { fontSize: isDesktop ? 20 : 18 }]}>
                            Working on it
                          </Text>
                          <Text style={[styles.actionButtonSubtext, { fontSize: isDesktop ? 14 : 12 }]}>
                            {task.status === 'in_progress' 
                              ? 'Your attorney knows you\'re working on this'
                              : 'Notify your attorney you\'re in progress'}
                          </Text>
                        </View>
                        {task.status === 'in_progress' && (
                          <Text style={styles.currentStatusBadge}>Current</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {task.status === 'completed' && (
                    <View style={styles.completedInfoBox}>
                      <Text style={styles.completedInfoIcon}>🎉</Text>
                      <Text style={[styles.completedInfoText, { fontSize: isDesktop ? 16 : 14 }]}>
                        Great job! This task is complete.
                      </Text>
                      <TouchableOpacity
                        style={styles.revertButton}
                        onPress={handleRevertTask}
                      >
                        <Text style={[styles.revertButtonText, { fontSize: isDesktop ? 14 : 12 }]}>
                          ↩️ Made a mistake? Revert to incomplete
                        </Text>
                      </TouchableOpacity>
                      {task.coinsReward > 0 && (
                        <Text style={[styles.coinsNote, { fontSize: isDesktop ? 12 : 11 }]}>
                          Note: Previously earned coins ({task.coinsReward}) are preserved and cannot be earned again.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  contentContainer: {
    maxWidth: 700,
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusLabel: {
    color: '#CCCCCC',
    fontWeight: '500',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 32,
  },
  descriptionContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  sectionLabel: {
    color: '#999999',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskDescription: {
    color: '#DDDDDD',
    lineHeight: 24,
  },
  detailsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  overdueRow: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.4)',
  },
  detailIcon: {
    fontSize: 24,
  },
  detailLabel: {
    color: '#999999',
    marginBottom: 2,
  },
  detailValue: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  overdueText: {
    color: '#e74c3c',
  },
  coinsValue: {
    color: '#FFD700',
  },
  notesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  notesText: {
    color: '#CCCCCC',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#FFD700',
    marginTop: 16,
    fontSize: 16,
  },
  actionsContainer: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  completeButton: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    borderColor: '#27ae60',
  },
  workingButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderColor: '#3498db',
  },
  activeStatusButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.4)',
    borderColor: '#2980b9',
    opacity: 0.8,
  },
  currentStatusBadge: {
    backgroundColor: '#3498db',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  actionButtonIcon: {
    fontSize: 32,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    color: '#AAAAAA',
  },
  completedInfoBox: {
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.4)',
    padding: 24,
    alignItems: 'center',
  },
  completedInfoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completedInfoText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  revertButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  revertButtonText: {
    color: '#CCCCCC',
  },
  coinsNote: {
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    maxWidth: 500,
  },
  celebrationEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  celebrationTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    color: '#CCCCCC',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationTaskName: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  coinsEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  coinsEarnedEmoji: {
    fontSize: 32,
  },
  coinsEarnedText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  coinsAlreadyEarnedText: {
    color: '#999999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  notificationSentText: {
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToTasksButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  backToTasksButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TaskDetailScreen;
