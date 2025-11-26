import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { apiRequest, API_BASE_URL } from '../config/api';
import { getFirebaseDatabase, authenticateWithBackend, waitForAuthReady } from '../services/firebaseService';
import { ref, onValue, off } from 'firebase/database';
import { theme } from '../styles/theme';

const ChatListScreen = ({ onNavigateToConversation, onNavigateToNewChat, user }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const unreadListenerRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Subscribe to Firebase unread count changes to trigger refresh
  useEffect(() => {
    const setupFirebaseListener = async () => {
      try {
        const db = getFirebaseDatabase();
        if (!db) {
          console.warn('⚠️ Firebase not available for chat list, falling back to manual refresh');
          return;
        }

        // Authenticate with Firebase using backend token
        if (user.token) {
          console.log('🔐 Authenticating with Firebase for chat list...');
          const authResult = await authenticateWithBackend(user.token);
          if (!authResult || !authResult.success) {
            const errorMsg = authResult?.error || 'Unknown authentication error';
            console.error('❌ Firebase authentication failed for chat list:', errorMsg);
            setError('Real-time updates unavailable. Please refresh manually.');
            setFirebaseConnected(false);
            return;
          }
          console.log('✅ Firebase authentication successful for chat list');
          
          // Wait for auth state to be fully ready before setting up listener
          console.log('⏳ Waiting for Firebase auth state to be ready...');
          const authStateResult = await waitForAuthReady(5000);
          if (!authStateResult || !authStateResult.success) {
            const errorMsg = authStateResult?.error || 'Auth state not ready';
            console.error('❌ Firebase auth state not ready for chat list:', errorMsg);
            setError('Real-time updates unavailable. Please refresh manually.');
            setFirebaseConnected(false);
            return;
          }
          console.log('✅ Firebase auth state confirmed, proceeding with listener setup');
        } else {
          console.warn('⚠️ No user token available, skipping Firebase authentication');
          setFirebaseConnected(false);
          return;
        }

        // Determine user path based on user type
        let basePath;
        const userType = user.userType || user.user_type;
        if (userType === 'user' || userType === 'individual') {
          basePath = 'users';
        } else if (userType === 'law_firm' || userType === 'lawfirm') {
          basePath = 'lawfirms';
        } else if (userType === 'medical_provider' || userType === 'medicalprovider') {
          basePath = 'providers';
        }

        if (!basePath) {
          console.error('❌ Unknown user type for Firebase listener:', userType);
          return;
        }

        const unreadCountsPath = `chat/${basePath}/${user.id}/unread_counts`;
        const unreadCountsRef = ref(db, unreadCountsPath);

        console.log(`💬 Setting up Firebase listener for unread counts: ${unreadCountsPath}`);

        unreadListenerRef.current = onValue(
          unreadCountsRef,
          (snapshot) => {
            const data = snapshot.val();
            console.log('💬 Firebase unread counts update detected:', data ? Object.keys(data).length : 0, 'conversations');
            
            // Refetch conversation list when unread counts change
            // This ensures we show latest messages and counts
            if (data && !loading && !refreshing) {
              console.log('🔄 Refreshing conversation list due to Firebase update...');
              fetchConversations();
            }
          },
          (error) => {
            console.error('❌ Firebase unread counts listener error:', error);
            console.error('Error details:', error.code, error.message);
            setError('Real-time updates failed. Please refresh manually.');
            setFirebaseConnected(false);
          }
        );

        setFirebaseConnected(true);
        console.log('✅ Firebase listener connected for chat list');
      } catch (error) {
        console.error('❌ Error setting up Firebase listener:', error);
        setError('Failed to setup real-time updates. Please refresh manually.');
        setFirebaseConnected(false);
      }
    };

    setupFirebaseListener();

    return () => {
      if (unreadListenerRef.current) {
        const db = getFirebaseDatabase();
        if (db) {
          const userType = user.userType || user.user_type;
          let basePath = userType === 'user' || userType === 'individual' ? 'users' :
                         userType === 'law_firm' || userType === 'lawfirm' ? 'lawfirms' : 'providers';
          const unreadCountsPath = `chat/${basePath}/${user.id}/unread_counts`;
          const unreadCountsRef = ref(db, unreadCountsPath);
          off(unreadCountsRef);
          console.log('🔕 Cleaned up Firebase listener for chat list');
        }
      }
    };
  }, [user.id, user.userType]);

  const fetchConversations = async () => {
    try {
      setError(null);
      const response = await apiRequest(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
      });
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Less than a week
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getConversationTitle = (conversation) => {
    // This will be the other participant's name
    // For now, return a generic title
    return `Conversation`;
  };

  const renderConversationItem = ({ item }) => {
    const lastMessage = item.lastMessage;
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onNavigateToConversation(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>💬</Text>
          </View>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationTitle, hasUnread && styles.unreadTitle]}>
              {lastMessage?.sender_name || getConversationTitle(item)}
            </Text>
            <Text style={styles.timestamp}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          
          {lastMessage && (
            <Text 
              style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
              numberOfLines={2}
            >
              Message
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>⚠️</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity 
          style={styles.newMessageButton}
          onPress={onNavigateToNewChat}
          activeOpacity={0.7}
        >
          <Text style={styles.newMessageIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your conversations will appear here
          </Text>
          <TouchableOpacity 
            style={styles.startChatButton}
            onPress={onNavigateToNewChat}
          >
            <Text style={styles.startChatButtonText}>Start a Conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item, index) => item?.id?.toString() || `conversation-${index}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5dc',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#d4a574',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4a574',
    flex: 1,
    textAlign: 'center',
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d4a574',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newMessageIcon: {
    fontSize: 20,
  },
  startChatButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d4a574',
    marginTop: 20,
  },
  startChatButtonText: {
    color: '#d4a574',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    fontSize: 60,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d4a574',
  },
  retryButtonText: {
    color: '#d4a574',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  avatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#d4a574',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 10,
  },
  lastMessage: {
    fontSize: 14,
    color: '#95a5a6',
  },
  unreadMessage: {
    color: '#2c3e50',
    fontWeight: '600',
  },
});

export default ChatListScreen;
