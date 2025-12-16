import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PollyImage = require('../../attached_assets/Polly_Profile_Left_w_Hat_1765858321178.png');

const ParrotNavigator = ({ onNavigate, onClose, userType = 'individual' }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Ahoy there, matey! 🦜 I be Polly, yer trusty navigator aboard the Verdict Path! Ask me how to find any feature or navigate the app, and I'll point ye in the right direction!",
      isParrot: true,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();
  const parrotBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(parrotBounce, {
          toValue: -10,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(parrotBounce, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, []);

  const getParrotResponse = (userQuestion) => {
    const question = userQuestion.toLowerCase();

    if (question.includes('upload') || question.includes('picture') || question.includes('pic') || 
        question.includes('photo') || question.includes('evidence') || question.includes('file') ||
        (question.includes('doc') && !question.includes('medical'))) {
      return {
        text: "Ahoy, matey! 📸 To upload yer pictures, documents, and evidence, set sail to the **Litigation Roadmap** and open the **Pre-Litigation** stage! There ye'll find upload buttons for Camera, Gallery, and Documents in each substage. Yer uploads will automatically appear in yer law firm's Evidence Locker! 🗺️",
        screen: 'roadmap'
      };
    }

    if (question.includes('settlement') || question.includes('money') || question.includes('disbursement')) {
      return {
        text: "Arr! To view yer treasure (settlement and disbursement info), navigate to the **Disbursements** page. Ye can see the breakdown of yer booty, track payments, and monitor the distribution of yer hard-won treasure! 💰",
        screen: 'disbursements'
      };
    }

    if (question.includes('medical') && (question.includes('record') || question.includes('upload'))) {
      return {
        text: "Ahoy! To upload yer medical scrolls, sail to the **Medical Hub** from yer main menu. Tap the upload button and ye can snap photos or choose files from yer device! 📜",
        screen: 'medical'
      };
    }

    if (question.includes('appointment') || question.includes('calendar') || question.includes('schedule')) {
      return {
        text: "Need to chart yer course for appointments? Head to the **Appointments Calendar** 📅 from the main dashboard. Ye can view all appointments, sync to yer device calendar, and never miss a port o' call!",
        screen: 'appointments'
      };
    }

    if (question.includes('attorney') || question.includes('lawyer') || question.includes('law firm')) {
      return {
        text: "Lookin' for yer legal crew? Navigate to **Messages** to see yer attorney's messages, send secure communications, and view case updates. All messages be encrypted for yer privacy! ⚖️",
        screen: 'chat-list'
      };
    }

    if (question.includes('roadmap') || question.includes('progress') || question.includes('case status') || question.includes('litigation')) {
      return {
        text: "Arr! The **Litigation Roadmap** 🗺️ be yer treasure map to victory! Find it on yer dashboard - it shows every step of yer journey, from filing to settlement, with coins to collect along the way!",
        screen: 'roadmap'
      };
    }

    if (question.includes('coin') || question.includes('reward') || question.includes('earn') || question.includes('streak')) {
      return {
        text: "Shiver me timbers! Earn coins by completin' tasks on yer Litigation Roadmap, daily logins, and uploadin' documents. Check yer **Coin Balance** on the dashboard. Keep yer streak goin' for bonus treasure! 🪙",
        screen: 'dashboard'
      };
    }

    if (question.includes('message') || question.includes('chat') || question.includes('contact')) {
      return {
        text: "To send messages to yer crew (law firm or medical providers), tap the **Messages** tab. Ye can start new conversations or reply to existing ones - all encrypted for yer privacy! 💬",
        screen: 'chat-list'
      };
    }

    if (question.includes('document') && !question.includes('medical')) {
      return {
        text: "All yer important documents be stored in the **Medical Hub** 📂. Access it from the dashboard - ye can upload, organize, and share papers with yer attorney!",
        screen: 'medical'
      };
    }

    if (question.includes('notification') || question.includes('alert')) {
      return {
        text: "Manage yer ship's signals in the **Notifications** tab. Ye can see all yer updates and customize which alerts ye receive in yer Profile settings! 🔔",
        screen: 'notifications'
      };
    }

    if (question.includes('profile') || question.includes('account') || question.includes('settings')) {
      return {
        text: "To update yer captain's profile, navigate to the **Profile** tab. There ye can change notification preferences, manage yer account, and update contact info! ⚙️",
        screen: 'profile'
      };
    }

    if (question.includes('task') || question.includes('action') || question.includes('todo') || question.includes('assignment')) {
      return {
        text: "Yer crew's orders be in the **Actions** tab! 📋 Complete tasks assigned by yer law firm to earn coins and keep yer case movin' forward!",
        screen: 'actions'
      };
    }

    if (question.includes('dashboard') || question.includes('home') || question.includes('main')) {
      return {
        text: "The **Dashboard** be yer ship's command center! 🏴‍☠️ It shows yer coins, streak, quick actions, and access to all features!",
        screen: 'dashboard'
      };
    }

    if (question.includes('badge') || question.includes('achievement')) {
      return {
        text: "Earn **Badges** and **Achievements** by completin' milestones on yer legal journey! Check yer progress from the Dashboard - each badge be a trophy of yer voyage! 🏆",
        screen: 'achievements'
      };
    }

    if (question.includes('help') || question.includes('support') || question.includes('stuck')) {
      return {
        text: "If ye be truly lost at sea, I'm here to help, matey! 🆘 Just ask me about any feature and I'll point ye in the right direction. Ye can also check the Notifications for updates from yer legal crew!",
        screen: null
      };
    }

    return {
      text: "Arr, I didn't quite catch that, matey! 🦜 Try askin' me:\n\n• How to find disbursements\n• Where to upload medical records\n• How to schedule appointments\n• Where to see my case progress\n• How to earn coins\n• Where to message my attorney\n• How to view my tasks\n\nWhat can I help ye navigate to?",
      screen: null
    };
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isParrot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const questionText = inputText;
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getParrotResponse(questionText);
      const parrotMessage = {
        id: messages.length + 2,
        text: response.text,
        isParrot: true,
        timestamp: new Date(),
        screen: response.screen
      };

      setMessages(prev => [...prev, parrotMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (screen) => {
    if (screen && onNavigate) {
      onNavigate(screen);
      onClose?.();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a237e', '#0d47a1', '#01579b']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Animated.View 
              style={[
                styles.pollyImageContainer,
                Platform.OS !== 'web' && { transform: [{ translateY: parrotBounce }] }
              ]}
            >
              <Image source={PollyImage} style={styles.pollyImage} />
            </Animated.View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Polly the Navigator</Text>
              <Text style={styles.headerSubtitle}>Yer Trusty Guide</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.isParrot ? styles.parrotBubble : styles.userBubble
                ]}
              >
                <View style={[
                  styles.bubbleContent,
                  message.isParrot ? styles.parrotBubbleContent : styles.userBubbleContent
                ]}>
                  {message.isParrot && (
                    <View style={styles.messagePollyContainer}>
                      <Image source={PollyImage} style={styles.messagePollyImage} />
                    </View>
                  )}
                  <Text style={[
                    styles.messageText,
                    message.isParrot ? styles.parrotText : styles.userText
                  ]}>
                    {message.text}
                  </Text>
                  {message.screen && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleQuickAction(message.screen)}
                    >
                      <Text style={styles.actionButtonText}>Take Me There! ⚓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {isTyping && (
              <View style={[styles.messageBubble, styles.parrotBubble]}>
                <View style={[styles.bubbleContent, styles.parrotBubbleContent]}>
                  <View style={styles.messagePollyContainer}>
                    <Image source={PollyImage} style={styles.messagePollyImage} />
                  </View>
                  <Text style={styles.typingText}>Polly be thinkin'...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Polly for navigation help..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                maxLength={200}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendButtonText}>🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollyImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#1a237e',
  },
  pollyImage: {
    width: 50,
    height: 50,
    resizeMode: 'cover',
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  closeButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageBubble: {
    marginBottom: 15,
    maxWidth: '85%',
  },
  parrotBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  bubbleContent: {
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  parrotBubbleContent: {
    backgroundColor: 'rgba(26, 35, 126, 0.8)',
  },
  userBubbleContent: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  messagePollyContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: '#1a237e',
    marginBottom: 8,
  },
  messagePollyImage: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  parrotText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#FFD700',
  },
  typingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    fontSize: 14,
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendButton: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendButtonText: {
    fontSize: 20,
  },
});

export default ParrotNavigator;
