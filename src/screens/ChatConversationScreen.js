import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { apiRequest, API_BASE_URL } from '../config/api';
import { subscribeToChatMessages, unsubscribeFromChatMessages } from '../services/firebaseService';
import { theme } from '../styles/theme';

const ChatConversationScreen = ({ conversationId, onBack, user }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const flatListRef = useRef(null);

  // Initial load from API
  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    let unsubscribe = null;

    const setupFirebaseListener = async () => {
      try {
        unsubscribe = await subscribeToChatMessages(
          conversationId,
          handleFirebaseMessages,
          user.token
        );
        
        if (unsubscribe) {
          setFirebaseConnected(true);
          console.log('✅ Firebase listener connected for conversation:', conversationId);
        } else {
          console.warn('⚠️ Firebase listener failed to connect, falling back to polling');
        }
      } catch (error) {
        console.error('❌ Error setting up Firebase listener:', error);
      }
    };

    setupFirebaseListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, user.token]);

  const fetchMessages = async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`, {
        method: 'GET',
      });
      setMessages(response.messages || []);
      setLoading(false);
      
      // Mark messages as read
      if (response.messages && response.messages.length > 0) {
        const lastMessage = response.messages[response.messages.length - 1];
        await markAsRead(lastMessage.id);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setLoading(false);
    }
  };

  const handleFirebaseMessages = async (firebaseMessages) => {
    try {
      
      // Firebase contains encrypted messages only
      // Fetch decrypted messages from API
      const response = await apiRequest(`${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`, {
        method: 'GET',
      });

      if (response && response.messages) {
        console.log('✅ Received', response.messages.length, 'decrypted messages from API');
        setMessages(response.messages);
        setLoading(false);

        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Mark latest message as read
        const lastMessage = response.messages[response.messages.length - 1];
        if (lastMessage) {
          await markAsRead(lastMessage.id);
        }
      }
    } catch (error) {
      console.error('Error handling Firebase messages:', error);
    }
  };

  const markAsRead = async (lastReadMessageId) => {
    try {
      await apiRequest(`${API_BASE_URL}/api/chat/conversations/${conversationId}/read-receipts`, {
        method: 'POST',
        body: JSON.stringify({ lastReadMessageId }),
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const response = await apiRequest(
        `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: messageText,
            metadata: {},
          }),
        }
      );

      // Validate message has required fields
      if (response?.message && response.message.id) {
        // Add message to list immediately
        setMessages(prev => [...prev, response.message]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('Invalid message response:', response);
        throw new Error('Invalid message response from server');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Restore input text on error
      setInputText(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderMessage = ({ item }) => {
    // Normalize user type for comparison
    const normalizedUserType = user.userType === 'lawfirm' ? 'law_firm' : 
                               user.userType === 'medicalprovider' ? 'medical_provider' : 
                               user.userType;
    
    const isMyMessage = 
      (normalizedUserType === 'user' && item.sender_type === 'user' && item.sender_id === user.id) ||
      (normalizedUserType === 'law_firm' && item.sender_type === 'law_firm' && item.sender_id === user.id) ||
      (normalizedUserType === 'medical_provider' && item.sender_type === 'medical_provider' && item.sender_id === user.id);

    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.body}
          </Text>
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {formatTime(item.sent_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.backButton} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item?.id?.toString() || `message-${index}`}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#95a5a6"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>
              {sending ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#d4a574',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: '#d4a574',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4a574',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  myMessageBubble: {
    backgroundColor: '#d4a574',
    borderColor: '#d4a574',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5dc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d4a574',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatConversationScreen;
