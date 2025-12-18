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
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const ParrotNavigator = ({ navigation, onClose }) => {
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

  // Parrot bounce animation
  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(parrotBounce, {
          toValue: -10,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(parrotBounce, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, []);

  const getParrotResponse = (userQuestion) => {
    const question = userQuestion.toLowerCase();

    // Navigation Help
    if (question.includes('settlement') || question.includes('money') || question.includes('disbursement')) {
      return {
        text: "Arr! To view yer treasure (settlement info), navigate to the **Settlement Tracker** on yer main dashboard. Ye can see the breakdown of yer booty, upload documents, and track the disbursement process. Tap the treasure chest icon to get started! 💰",
        action: () => navigation?.navigate('SettlementTracker')
      };
    }

    if (question.includes('medical') && (question.includes('record') || question.includes('upload'))) {
      return {
        text: "Ahoy! To upload yer medical scrolls, sail to the **Medical Records** section from yer main menu. Tap the upload button (looks like a ship's anchor ⚓) and ye can snap photos or choose files from yer device!",
        action: () => navigation?.navigate('MedicalRecords')
      };
    }

    if (question.includes('appointment') || question.includes('calendar') || question.includes('schedule')) {
      return {
        text: "Need to chart yer course for medical appointments? Head to the **Appointment Calendar** 📅 from the main dashboard. Ye can view all appointments, add new ones, and get reminders so ye never miss a port o' call!",
        action: () => navigation?.navigate('AppointmentCalendar')
      };
    }

    if (question.includes('attorney') || question.includes('lawyer') || question.includes('law firm')) {
      return {
        text: "Lookin' for yer legal crew? Navigate to **My Law Firm** to see yer attorney's contact info, send messages, and view case updates. Tap the ship's wheel ⚓ to access it!",
        action: () => navigation?.navigate('LawFirmProfile')
      };
    }

    if (question.includes('roadmap') || question.includes('progress') || question.includes('case status')) {
      return {
        text: "Arr! The **Litigation Roadmap** 🗺️ be yer treasure map to victory! Find it on yer dashboard - it shows every step of yer journey, from filing to settlement, with coins to collect along the way! ⚓",
        action: () => navigation?.navigate('LitigationRoadmap')
      };
    }

    if (question.includes('coin') || question.includes('reward') || question.includes('earn')) {
      return {
        text: "Shiver me timbers! Earn coins by completin' tasks on yer Litigation Roadmap, daily logins, and uploadn' documents. Check yer **Coin Balance** in the top right corner. Spend 'em in the Ship's Store! 🪙",
        action: null
      };
    }

    if (question.includes('message') || question.includes('chat') || question.includes('contact')) {
      return {
        text: "To send messages to yer crew (law firm or medical providers), tap the **Messages** icon (looks like a bottle with a scroll 📜). Ye can start new conversations or reply to existing ones!",
        action: () => navigation?.navigate('Messages')
      };
    }

    if (question.includes('document') && !question.includes('medical')) {
      return {
        text: "All yer important documents be stored in the **Document Vault** 📂. Access it from the main menu - ye can upload, organize, and share legal papers with yer attorney!",
        action: () => navigation?.navigate('DocumentVault')
      };
    }

    if (question.includes('notification') || question.includes('alert')) {
      return {
        text: "Manage yer ship's signals in **Settings** ⚙️ > **Notifications**. Ye can choose which alerts ye want to receive and how ye want to be notified - carrier pigeon not included! 🦜",
        action: () => navigation?.navigate('Settings')
      };
    }

    if (question.includes('profile') || question.includes('account') || question.includes('settings')) {
      return {
        text: "To update yer captain's profile, navigate to **Settings** ⚙️ from the menu. There ye can change yer avatar, update contact info, and manage yer account preferences!",
        action: () => navigation?.navigate('Settings')
      };
    }

    if (question.includes('video') || question.includes('education') || question.includes('learn')) {
      return {
        text: "Seekin' knowledge of the legal seas? Check out the **Education Library** 📚 where ye'll find videos explainin' each step of yer case. Navigate there from the main menu!",
        action: () => navigation?.navigate('EducationLibrary')
      };
    }

    if (question.includes('dashboard') || question.includes('home') || question.includes('main')) {
      return {
        text: "The **Dashboard** be yer ship's command center! Tap the home icon 🏴‍☠️ at the bottom to return to yer main view where ye can access all features!",
        action: () => navigation?.navigate('Dashboard')
      };
    }

    if (question.includes('analytics') || question.includes('stats') || question.includes('report')) {
      return {
        text: "For law firms and medical providers, the **Analytics Dashboard** 📊 shows all yer performance metrics. Access it from the main menu - it be like havin' a spyglass on yer success!",
        action: () => navigation?.navigate('Analytics')
      };
    }

    if (question.includes('payment') || question.includes('subscription') || question.includes('billing')) {
      return {
        text: "Manage yer doubloons in **Settings** ⚙️ > **Billing & Subscription**. View yer current plan, update payment methods, and see transaction history!",
        action: () => navigation?.navigate('Billing')
      };
    }

    if (question.includes('help') || question.includes('support') || question.includes('stuck')) {
      return {
        text: "If ye be truly lost at sea, navigate to **Help & Support** 🆘 from Settings. Ye can view FAQs, contact support, or watch tutorial videos. I'm here to help too, matey! Just ask!",
        action: () => navigation?.navigate('Support')
      };
    }

    // Default response
    return {
      text: "Arr, I didn't quite catch that, matey! 🦜 Try askin' me:\n\n• How to find settlements\n• Where to upload medical records\n• How to schedule appointments\n• Where to see my case progress\n• How to earn coins\n• Where to message my attorney\n\nWhat can I help ye navigate to?",
      action: null
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
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getParrotResponse(inputText);
      const parrotMessage = {
        id: messages.length + 2,
        text: response.text,
        isParrot: true,
        timestamp: new Date(),
        action: response.action
      };

      setMessages(prev => [...prev, parrotMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (action) => {
    if (action) {
      action();
      onClose?.();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(26, 35, 126, 0.95)', 'rgba(13, 71, 161, 0.95)', 'rgba(1, 87, 155, 0.95)']}
        style={styles.gradient}
      >
        {/* Header */}
        <BlurView intensity={20} tint="dark" style={styles.header}>
          <View style={styles.headerContent}>
            <Animated.Text 
              style={[
                styles.parrotEmoji,
                { transform: [{ translateY: parrotBounce }] }
              ]}
            >
              🦜
            </Animated.Text>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Polly the Navigator</Text>
              <Text style={styles.headerSubtitle}>Yer Trusty Guide</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Messages */}
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
                <BlurView 
                  intensity={message.isParrot ? 30 : 20} 
                  tint={message.isParrot ? "dark" : "light"}
                  style={styles.bubbleBlur}
                >
                  {message.isParrot && (
                    <Text style={styles.parrotIcon}>🦜</Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    message.isParrot ? styles.parrotText : styles.userText
                  ]}>
                    {message.text}
                  </Text>
                  {message.action && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleQuickAction(message.action)}
                    >
                      <Text style={styles.actionButtonText}>Take Me There! ⚓</Text>
                    </TouchableOpacity>
                  )}
                </BlurView>
              </View>
            ))}

            {isTyping && (
              <View style={[styles.messageBubble, styles.parrotBubble]}>
                <BlurView intensity={30} tint="dark" style={styles.bubbleBlur}>
                  <Text style={styles.parrotIcon}>🦜</Text>
                  <Text style={styles.typingText}>Polly be thinkin'...</Text>
                </BlurView>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <BlurView intensity={40} tint="dark" style={styles.inputContainer}>
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
          </BlurView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parrotEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBubble: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  parrotBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  bubbleBlur: {
    borderRadius: 20,
    padding: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  parrotIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  parrotText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#1A237E',
  },
  typingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    fontSize: 14,
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendButtonText: {
    fontSize: 20,
  },
};

export default ParrotNavigator;
