import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';
import { alert } from '../utils/alert';

const ActionDashboardScreen = ({ user, onNavigate }) => {
  const { width, height } = useWindowDimensions();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    fetchTasks();
  }, [filter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }

      const queryString = params.toString();
      const url = queryString ? `${API_ENDPOINTS.TASKS.MY_TASKS}?${queryString}` : API_ENDPOINTS.TASKS.MY_TASKS;

      const data = await apiRequest(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      setTasks(data.tasks);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleTaskAction = async (task) => {
    if (task.status === 'completed') {
      alert(
        '✅ Task Completed',
        `${task.title}\n\nCompleted on: ${new Date(task.completedAt).toLocaleDateString()}\n${task.completionNotes ? `\nNotes: ${task.completionNotes}` : ''}\n\n💰 Note: If you revert this task, previously earned coins (${task.coinsReward} coins) are preserved and cannot be earned again when you re-complete.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '🔄 Revert to Incomplete',
            style: 'destructive',
            onPress: () => revertTask(task)
          }
        ]
      );
      return;
    }

    const actions = [];
    
    if (task.status === 'pending') {
      actions.push({
        text: '▶️ Start Task',
        onPress: () => updateTaskStatus(task.id, 'in_progress')
      });
    }

    if (task.status === 'in_progress' || task.status === 'pending') {
      actions.push({
        text: '✅ Mark Complete',
        onPress: () => markTaskComplete(task)
      });
    }

    actions.push({ text: 'Cancel', style: 'cancel' });

    alert('Update Task Status', `${task.title}`, actions);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const data = await apiRequest(API_ENDPOINTS.TASKS.UPDATE_STATUS(taskId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      alert('Success', data.message);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error', 'Failed to update task status');
    }
  };

  const markTaskComplete = (task) => {
    alert(
      '✅ Complete Task',
      `Mark "${task.title}" as complete?${task.coinsReward > 0 ? `\n\n🪙 You'll earn ${task.coinsReward} coins!` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: () => updateTaskStatus(task.id, 'completed')
        }
      ]
    );
  };

  const revertTask = (task) => {
    alert(
      '🔄 Revert Task',
      `Mark "${task.title}" as incomplete?\n\n💰 Note: Previously earned coins (${task.coinsReward} coins) will be preserved and cannot be earned again when you re-complete this task.\n\nThis prevents coin farming while allowing you to update your progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => updateTaskStatus(task.id, 'pending')
        }
      ]
    );
  };

  const getContentWidth = () => {
    if (isDesktop) return Math.min(width * 0.7, 900);
    if (isTablet) return width * 0.9;
    return width;
  };

  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'All', emoji: '📋' },
      { key: 'pending', label: 'To Do', emoji: '⏳' },
      { key: 'in_progress', label: 'In Progress', emoji: '▶️' },
      { key: 'completed', label: 'Done', emoji: '✅' }
    ];

    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterButton, filter === f.key && styles.activeFilterButton]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterEmoji, { fontSize: isDesktop ? 18 : 16 }]}>{f.emoji}</Text>
              <Text style={[
                styles.filterText, 
                filter === f.key && styles.activeFilterText,
                { fontSize: isDesktop ? 16 : 14 }
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPriorityFilters = () => {
    const priorities = [
      { key: 'all', label: 'All', color: '#999' },
      { key: 'urgent', label: 'Urgent', color: '#e74c3c' },
      { key: 'high', label: 'High', color: '#e67e22' },
      { key: 'medium', label: 'Medium', color: '#3498db' },
      { key: 'low', label: 'Low', color: '#95a5a6' }
    ];

    return (
      <View style={styles.priorityFilterContainer}>
        <Text style={[styles.priorityFilterLabel, { fontSize: isDesktop ? 15 : 13 }]}>Priority:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {priorities.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.priorityChip,
                { borderColor: p.color },
                priorityFilter === p.key && { backgroundColor: p.color }
              ]}
              onPress={() => setPriorityFilter(p.key)}
            >
              <Text style={[
                styles.priorityChipText,
                { color: priorityFilter === p.key ? '#fff' : p.color },
                { fontSize: isDesktop ? 14 : 12 }
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    return (
      <View style={[
        styles.summaryContainer,
        { padding: isDesktop ? 20 : 16 }
      ]}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { fontSize: isDesktop ? 28 : 24 }]}>{summary.pending}</Text>
          <Text style={[styles.summaryLabel, { fontSize: isDesktop ? 13 : 11 }]}>To Do</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { fontSize: isDesktop ? 28 : 24 }]}>{summary.inProgress}</Text>
          <Text style={[styles.summaryLabel, { fontSize: isDesktop ? 13 : 11 }]}>In Progress</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { fontSize: isDesktop ? 28 : 24 }]}>{summary.completed}</Text>
          <Text style={[styles.summaryLabel, { fontSize: isDesktop ? 13 : 11 }]}>Completed</Text>
        </View>
        {summary.overdue > 0 && (
          <View style={[styles.summaryCard, styles.overdueCard]}>
            <Text style={[styles.summaryNumber, styles.overdueNumberText, { fontSize: isDesktop ? 28 : 24 }]}>{summary.overdue}</Text>
            <Text style={[styles.summaryLabel, styles.overdueLabelText, { fontSize: isDesktop ? 13 : 11 }]}>Overdue</Text>
          </View>
        )}
      </View>
    );
  };

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

  const isOverdue = (task) => {
    return task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();
  };

  const renderTaskCard = (task) => {
    const overdue = isOverdue(task);

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskCard, 
          overdue && styles.overdueTaskCard,
          { padding: isDesktop ? 20 : 16 }
        ]}
        onPress={() => handleTaskAction(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskStatusContainer}>
            <Text style={[styles.taskStatusIcon, { fontSize: isDesktop ? 24 : 20 }]}>{getStatusIcon(task.status)}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={[styles.priorityBadgeText, { fontSize: isDesktop ? 13 : 11 }]}>{getPriorityLabel(task.priority)}</Text>
            </View>
          </View>
          {task.coinsReward > 0 && (
            <View style={styles.coinsBadge}>
              <Text style={[styles.coinsBadgeText, { fontSize: isDesktop ? 14 : 12 }]}>🪙 {task.coinsReward}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.taskTitle, { fontSize: isDesktop ? 20 : 18 }]}>{task.title}</Text>
        {task.description && (
          <Text style={[styles.taskDescription, { fontSize: isDesktop ? 16 : 14 }]} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        <View style={styles.taskFooter}>
          <Text style={[styles.taskLawFirm, { fontSize: isDesktop ? 15 : 13 }]}>⚖️ {task.lawFirmName}</Text>
          {task.dueDate && (
            <Text style={[
              styles.taskDueDate, 
              overdue && styles.overdueDueDate,
              { fontSize: isDesktop ? 15 : 13 }
            ]}>
              {overdue ? '⚠️ ' : '📅 '}
              {overdue ? 'Overdue: ' : 'Due: '}
              {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>

        {task.status !== 'completed' && (
          <View style={styles.taskActions}>
            <Text style={[styles.taskActionHint, { fontSize: isDesktop ? 14 : 12 }]}>Tap to update status</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../../attached_assets/Fighting Ships_1764038386285.png')}
        style={[styles.backgroundImage, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        </View>
      </ImageBackground>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
          >
            <View style={[
              styles.contentWrapper,
              { width: getContentWidth() }
            ]}>
              <View style={[
                styles.header,
                { 
                  paddingTop: isDesktop ? 30 : 50,
                  paddingHorizontal: isDesktop ? 30 : 20,
                }
              ]}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => onNavigate('dashboard')}
                >
                  <Text style={[styles.backButtonText, { fontSize: isDesktop ? 16 : 14 }]}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <Text style={[
                    styles.headerTitle,
                    { fontSize: isDesktop ? 34 : isTablet ? 30 : 28 }
                  ]}>⚓ Task Dashboard</Text>
                  <Text style={[
                    styles.headerSubtitle,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>Tasks assigned by your attorney</Text>
                </View>
              </View>

              {renderSummaryCards()}
              {renderFilterTabs()}
              {renderPriorityFilters()}

              <View style={[styles.content, { paddingHorizontal: isDesktop ? 30 : 16 }]}>
                {tasks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateIcon, { fontSize: isDesktop ? 80 : 64 }]}>🏴‍☠️</Text>
                    <Text style={[styles.emptyStateTitle, { fontSize: isDesktop ? 24 : 20 }]}>No Tasks Found</Text>
                    <Text style={[styles.emptyStateText, { fontSize: isDesktop ? 16 : 14 }]}>
                      {filter === 'all'
                        ? "You don't have any tasks assigned yet. Your attorney will send you tasks as your case progresses."
                        : `No ${filter} tasks found. Try adjusting your filters.`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tasksList}>
                    {tasks.map(task => renderTaskCard(task))}
                  </View>
                )}

                <View style={styles.bottomPadding} />
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
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    marginTop: 15,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  header: {
    paddingBottom: 15,
  },
  backButton: {
    backgroundColor: 'rgba(40, 30, 20, 0.85)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    marginBottom: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    color: '#FFD700',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerContent: {
    marginTop: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  headerSubtitle: {
    color: '#FFD700',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    gap: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(50, 40, 30, 0.9)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  summaryNumber: {
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  summaryLabel: {
    color: '#E8D5B0',
    marginTop: 4,
    fontWeight: '600',
  },
  overdueCard: {
    backgroundColor: 'rgba(80, 30, 30, 0.9)',
    borderColor: 'rgba(231, 76, 60, 0.6)',
  },
  overdueNumberText: {
    color: '#FF6B6B',
  },
  overdueLabelText: {
    color: '#FF9999',
  },
  filterContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 50, 40, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  activeFilterButton: {
    backgroundColor: 'rgba(180, 120, 40, 0.95)',
    borderColor: '#FFD700',
  },
  filterEmoji: {
    marginRight: 6,
  },
  filterText: {
    fontWeight: '700',
    color: '#E8D5B0',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  priorityFilterLabel: {
    fontWeight: '700',
    color: '#FFD700',
    marginRight: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priorityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    marginRight: 8,
    backgroundColor: 'rgba(60, 50, 40, 0.9)',
  },
  priorityChipText: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  overdueTaskCard: {
    borderColor: '#e74c3c',
    borderWidth: 3,
    backgroundColor: 'rgba(80, 30, 30, 0.92)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskStatusIcon: {},
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  priorityBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  coinsBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  coinsBadgeText: {
    fontWeight: '700',
    color: '#2c3e50',
  },
  taskTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  taskDescription: {
    color: '#E8D5B0',
    marginBottom: 12,
    lineHeight: 22,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskLawFirm: {
    color: '#B8A080',
    fontWeight: '700',
  },
  taskDueDate: {
    color: '#B8A080',
    fontWeight: '600',
  },
  overdueDueDate: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  taskActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
  },
  taskActionHint: {
    color: '#FFD700',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    marginTop: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyStateText: {
    color: '#E8D5B0',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 100,
  },
});

export default ActionDashboardScreen;
