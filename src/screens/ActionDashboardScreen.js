import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const ActionDashboardScreen = ({ user, onNavigate }) => {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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
      Alert.alert('Error', 'Failed to load tasks');
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
      Alert.alert(
        '✅ Task Completed',
        `${task.title}\n\nCompleted on: ${new Date(task.completedAt).toLocaleDateString()}\n${task.completionNotes ? `\nNotes: ${task.completionNotes}` : ''}`,
        [{ text: 'OK' }]
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

    Alert.alert('Update Task Status', `${task.title}`, actions);
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

      Alert.alert('Success', data.message);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const markTaskComplete = (task) => {
    Alert.alert(
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
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[styles.filterText, filter === f.key && styles.activeFilterText]}>
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
        <Text style={styles.priorityFilterLabel}>Priority:</Text>
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
                { color: priorityFilter === p.key ? '#fff' : p.color }
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
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>To Do</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{summary.inProgress}</Text>
          <Text style={styles.summaryLabel}>In Progress</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{summary.completed}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        {summary.overdue > 0 && (
          <View style={[styles.summaryCard, styles.overdueCard]}>
            <Text style={[styles.summaryNumber, styles.overdueText]}>{summary.overdue}</Text>
            <Text style={[styles.summaryLabel, styles.overdueText]}>Overdue</Text>
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
        style={[styles.taskCard, overdue && styles.overdueTaskCard]}
        onPress={() => handleTaskAction(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskStatusContainer}>
            <Text style={styles.taskStatusIcon}>{getStatusIcon(task.status)}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={styles.priorityBadgeText}>{getPriorityLabel(task.priority)}</Text>
            </View>
          </View>
          {task.coinsReward > 0 && (
            <View style={styles.coinsBadge}>
              <Text style={styles.coinsBadgeText}>🪙 {task.coinsReward}</Text>
            </View>
          )}
        </View>

        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        <View style={styles.taskFooter}>
          <Text style={styles.taskLawFirm}>⚖️ {task.lawFirmName}</Text>
          {task.dueDate && (
            <Text style={[styles.taskDueDate, overdue && styles.overdueDueDate]}>
              {overdue ? '⚠️ ' : '📅 '}
              {overdue ? 'Overdue: ' : 'Due: '}
              {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>

        {task.status !== 'completed' && (
          <View style={styles.taskActions}>
            <Text style={styles.taskActionHint}>Tap to update status</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚓ Action Dashboard</Text>
        <Text style={styles.headerSubtitle}>Tasks assigned by your attorney</Text>
      </View>

      {renderSummaryCards()}
      {renderFilterTabs()}
      {renderPriorityFilters()}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏴‍☠️</Text>
            <Text style={styles.emptyStateTitle}>No Tasks Found</Text>
            <Text style={styles.emptyStateText}>
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
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.cream,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  overdueCard: {
    backgroundColor: '#ffe6e6',
  },
  overdueText: {
    color: '#e74c3c',
  },
  filterContainer: {
    backgroundColor: theme.colors.cream,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeFilterText: {
    color: '#fff',
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightCream,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  priorityFilterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginRight: 12,
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tasksList: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: theme.colors.cream,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  overdueTaskCard: {
    borderColor: '#e74c3c',
    borderWidth: 3,
    backgroundColor: '#fff5f5',
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
  taskStatusIcon: {
    fontSize: 20,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  coinsBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  coinsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.navy,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskLawFirm: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  taskDueDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  overdueDueDate: {
    color: '#e74c3c',
    fontWeight: '700',
  },
  taskActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  taskActionHint: {
    fontSize: 12,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});

export default ActionDashboardScreen;
