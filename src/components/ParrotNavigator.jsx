import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ParrotNavigator = ({ visible, onClose, onNavigate, userType = 'individual' }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      setMessages([{
        id: 1,
        type: 'bot',
        text: "Ahoy, matey! 🦜 I be Polly, yer trusty navigator! What treasure of knowledge can I help ye find today? Ask me about settlements, medical records, appointments, or any feature ye be seekin'!",
        timestamp: new Date()
      }]);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);

  const getParrotResponse = (question) => {
    const q = question.toLowerCase();

    // Settlement related
    if (q.includes('settlement') || q.includes('disbursement') || q.includes('payout')) {
      return {
        text: "Arr! Lookin' for yer treasure, eh? 💰 The Settlement Tracker be where ye can view all yer settlement details and disbursement status. Head to the Dashboard and look for 'Settlement' in yer navigation!",
        action: { screen: 'dashboard', section: 'settlement' }
      };
    }

    // Medical records
    if (q.includes('medical') || q.includes('records') || q.includes('documents') || q.includes('upload')) {
      return {
        text: "Aye, yer medical scrolls! 📜 Navigate to the Medical Hub from yer dashboard to upload documents, view yer medical history, and manage all yer health records. Keep 'em organized like a proper ship's log!",
        action: { screen: 'medical' }
      };
    }

    // Appointments / Calendar
    if (q.includes('appointment') || q.includes('calendar') || q.includes('schedule') || q.includes('booking')) {
      return {
        text: "Time to chart yer course! 📅 The Appointments screen shows all yer scheduled meetings and court dates. Ye can book new appointments, sync to yer device calendar, and never miss an important date!",
        action: { screen: 'appointments' }
      };
    }

    // Law firm / Attorney
    if (q.includes('attorney') || q.includes('lawyer') || q.includes('law firm') || q.includes('legal')) {
      return {
        text: "Seekin' yer legal captain, are ye? ⚖️ Yer law firm's contact info and case updates can be found in Messages. Send 'em a message anytime through the secure chat system!",
        action: { screen: 'chat-list' }
      };
    }

    // Roadmap / Case progress
    if (q.includes('roadmap') || q.includes('progress') || q.includes('case') || q.includes('stage') || q.includes('litigation')) {
      return {
        text: "Aye, the treasure map of yer journey! 🗺️ The Litigation Roadmap shows ye exactly where ye be on yer legal voyage. Each stage be marked with X's as ye complete 'em. Find it on yer Dashboard!",
        action: { screen: 'roadmap' }
      };
    }

    // Coins / Rewards / Gamification
    if (q.includes('coin') || q.includes('reward') || q.includes('streak') || q.includes('badge') || q.includes('points')) {
      return {
        text: "Arr, the doubloons! 🪙 Ye earn coins by completin' tasks, loggin' in daily, and hittin' milestones. Check yer coin balance on the Dashboard. Keep yer streak goin' for bonus treasure!",
        action: { screen: 'dashboard' }
      };
    }

    // Messages
    if (q.includes('message') || q.includes('chat') || q.includes('contact') || q.includes('communicate')) {
      return {
        text: "Time to send a message in a bottle! 💬 The Messages tab lets ye communicate securely with yer law firm and medical providers. All messages be encrypted for yer privacy!",
        action: { screen: 'chat-list' }
      };
    }

    // Notifications
    if (q.includes('notification') || q.includes('alert') || q.includes('remind')) {
      return {
        text: "Keep yer spyglass ready! 🔔 The Notifications tab shows all yer important updates. Ye can customize which alerts ye receive in yer Profile settings - push, email, or SMS!",
        action: { screen: 'notifications' }
      };
    }

    // Profile / Settings
    if (q.includes('profile') || q.includes('setting') || q.includes('account') || q.includes('preference')) {
      return {
        text: "Aye, yer captain's quarters! ⚙️ The Profile tab be where ye manage yer account, notification preferences, and personal details. Keep yer info shipshape!",
        action: { screen: 'profile' }
      };
    }

    // Tasks / Actions
    if (q.includes('task') || q.includes('action') || q.includes('todo') || q.includes('assignment')) {
      return {
        text: "Yer crew's orders! 📋 The Actions tab shows tasks assigned by yer law firm. Complete 'em to earn coins and keep yer case movin' forward!",
        action: { screen: 'actions' }
      };
    }

    // Help / How to use
    if (q.includes('help') || q.includes('how') || q.includes('what') || q.includes('where')) {
      return {
        text: "Need a compass, matey? 🧭 I can help ye navigate to any part of the app! Ask me about:\n\n• Settlement tracking\n• Medical records\n• Appointments\n• Messages\n• Roadmap progress\n• Coins & rewards\n• Notifications\n• Profile settings\n\nJust ask away!"
      };
    }

    // Greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('ahoy')) {
      return {
        text: "Ahoy there, shipmate! 🦜 Polly at yer service! What can I help ye navigate today?"
      };
    }

    // Thank you
    if (q.includes('thank') || q.includes('thanks')) {
      return {
        text: "Ye be most welcome, matey! 🏴‍☠️ Fair winds and following seas to ye! If ye need anything else, just give old Polly a squawk!"
      };
    }

    // Default response
    return {
      text: "Shiver me timbers! 🦜 I'm not quite sure what ye be askin', but I can help ye find:\n\n• Settlement info\n• Medical records\n• Appointments\n• Messages\n• Case roadmap\n• Coins & rewards\n\nTry askin' about one of these treasures!"
    };
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getParrotResponse(inputText);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.text,
        action: response.action,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleQuickAction = (action) => {
    if (action && onNavigate) {
      onNavigate(action.screen, action.section);
      onClose();
    }
  };

  const renderMessage = (message) => {
    const isBot = message.type === 'bot';
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isBot ? styles.botMessage : styles.userMessage
        ]}
      >
        {isBot && (
          <View style={styles.parrotAvatar}>
            <Text style={styles.parrotEmoji}>🦜</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isBot ? styles.botBubble : styles.userBubble
        ]}>
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {message.text}
          </Text>
          {message.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleQuickAction(message.action)}
            >
              <Icon name="compass" size={16} color="#FFD700" />
              <Text style={styles.actionButtonText}>Navigate There</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const quickQuestions = [
    { label: "Settlement", icon: "treasure-chest", query: "Where can I see my settlement?" },
    { label: "Medical", icon: "medical-bag", query: "How do I upload medical records?" },
    { label: "Appointments", icon: "calendar", query: "Where are my appointments?" },
    { label: "Messages", icon: "message", query: "How do I message my attorney?" }
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.container,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#0d2f54', '#1a5490', '#0d2f54']}
              style={styles.gradient}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.parrotIcon}>🦜</Text>
                  <View>
                    <Text style={styles.headerTitle}>Polly the Navigator</Text>
                    <Text style={styles.headerSubtitle}>Yer Trusty Guide</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#FFD700" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map(renderMessage)}
                
                {isTyping && (
                  <View style={[styles.messageContainer, styles.botMessage]}>
                    <View style={styles.parrotAvatar}>
                      <Text style={styles.parrotEmoji}>🦜</Text>
                    </View>
                    <View style={[styles.messageBubble, styles.botBubble]}>
                      <Text style={styles.typingText}>Polly is thinking...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {messages.length === 1 && (
                <View style={styles.quickQuestionsContainer}>
                  <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {quickQuestions.map((q, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.quickQuestionChip}
                        onPress={() => {
                          setInputText(q.query);
                          setTimeout(handleSend, 100);
                        }}
                      >
                        <Icon name={q.icon} size={16} color="#FFD700" />
                        <Text style={styles.quickQuestionText}>{q.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask Polly anything..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim()}
                >
                  <Icon name="send" size={20} color={inputText.trim() ? "#FFD700" : "#666"} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  container: {
    height: height * 0.75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden'
  },
  gradient: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  parrotIcon: {
    fontSize: 36
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#C0C0C0'
  },
  closeButton: {
    padding: 8
  },
  messagesContainer: {
    flex: 1
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end'
  },
  botMessage: {
    justifyContent: 'flex-start'
  },
  userMessage: {
    justifyContent: 'flex-end'
  },
  parrotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  parrotEmoji: {
    fontSize: 20
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16
  },
  botBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderBottomLeftRadius: 4
  },
  userBubble: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderBottomRightRadius: 4,
    marginLeft: 'auto'
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  botText: {
    color: '#fff'
  },
  userText: {
    color: '#FFD700'
  },
  typingText: {
    color: '#999',
    fontStyle: 'italic'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  actionButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600'
  },
  quickQuestionsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.1)'
  },
  quickQuestionsTitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8
  },
  quickQuestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  quickQuestionText: {
    color: '#fff',
    fontSize: 12
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  }
});

export default ParrotNavigator;
