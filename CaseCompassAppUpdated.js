import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Dimensions
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ============================================
// CASE COMPASS - COMPLETE APP WITH PIRATE MAP
// ============================================

const CaseCompassApp = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [userType, setUserType] = useState('individual');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firmCode, setFirmCode] = useState('');

  // Modal states
  const [selectedStage, setSelectedStage] = useState(null);
  const [stageModalVisible, setStageModalVisible] = useState(false);

  // ============================================
  // ROADMAP DATA WITH PIRATE MAP POSITIONS
  // ============================================
  const [roadmapStages, setRoadmapStages] = useState([
    {
      id: 1,
      name: 'Pre-Litigation',
      coins: 100,
      completed: false,
      description: 'Gather all necessary documentation before filing your case',
      position: { top: '20%', left: '15%' },
      label: 'Dead Man\'s Cove',
      subStages: [
        { 
          id: 'pre-1', 
          name: 'Police Report', 
          coins: 10, 
          completed: false, 
          icon: '🚔',
          description: 'Upload the official police accident report',
          acceptedFormats: 'PDF, JPG, PNG',
          uploaded: false,
          uploadedFiles: []
        },
        { 
          id: 'pre-2', 
          name: 'Body Cam Footage', 
          coins: 10, 
          completed: false, 
          icon: '📹',
          description: 'Upload body camera footage if available',
          acceptedFormats: 'MP4, MOV, AVI',
          uploaded: false,
          uploadedFiles: []
        },
        { 
          id: 'pre-3', 
          name: 'Dash Cam Footage', 
          coins: 10, 
          completed: false, 
          icon: '🎥',
          description: 'Upload dash camera recordings',
          acceptedFormats: 'MP4, MOV, AVI',
          uploaded: false,
          uploadedFiles: []
        },
        { 
          id: 'pre-4', 
          name: 'Pictures', 
          coins: 5, 
          completed: false, 
          icon: '📸',
          description: 'Upload photos of accident scene, vehicle damage, and injuries',
          acceptedFormats: 'JPG, PNG, HEIC',
          uploaded: false,
          uploadedFiles: []
        },
        { 
          id: 'pre-5', 
          name: 'Health Insurance Card', 
          coins: 5, 
          completed: false, 
          icon: '💳',
          description: 'Upload copy of health insurance card (front and back)',
          acceptedFormats: 'PDF, JPG, PNG',
          uploaded: false,
          uploadedFiles: []
        },
        { 
          id: 'pre-6', 
          name: 'Auto Insurance Company', 
          coins: 5, 
          completed: false, 
          icon: '🏢',
          description: 'Enter your auto insurance provider name',
          isDataEntry: true,
          enteredData: ''
        },
        { 
          id: 'pre-7', 
          name: 'Auto Insurance Policy Number', 
          coins: 5, 
          completed: false, 
          icon: '🔢',
          description: 'Enter your auto insurance policy number',
          isDataEntry: true,
          enteredData: ''
        },
        { 
          id: 'pre-8', 
          name: 'Medical Bills', 
          coins: 15, 
          completed: false, 
          icon: '💵',
          description: 'Upload all medical treatment bills',
          acceptedFormats: 'PDF, JPG, PNG',
          uploaded: false,
          uploadedFiles: [],
          linkToMedicalHub: true
        },
        { 
          id: 'pre-9', 
          name: 'Medical Records', 
          coins: 35, 
          completed: false, 
          icon: '📋',
          description: 'Upload complete medical records and reports',
          acceptedFormats: 'PDF, JPG, PNG',
          uploaded: false,
          uploadedFiles: [],
          linkToMedicalHub: true
        }
      ],
      videos: [
        { id: 'v1', title: 'Pre-Litigation Essentials', price: 2.99, duration: '15 min' },
        { id: 'v2', title: 'Document Collection Guide', price: 3.99, duration: '20 min' }
      ]
    },
    {
      id: 2,
      name: 'Complaint Filed',
      coins: 25,
      completed: false,
      description: 'Your lawsuit is officially filed with the court',
      position: { top: '32%', left: '68%' },
      label: 'Skull Island',
      subStages: [
        { id: 'cf-1', name: 'Draft Complaint', coins: 8, completed: false, icon: '📝', description: 'Create initial complaint document' },
        { id: 'cf-2', name: 'File with Court', coins: 10, completed: false, icon: '⚖️', description: 'Submit to court system' },
        { id: 'cf-3', name: 'Serve Defendant', coins: 7, completed: false, icon: '📬', description: 'Legally notify defendant' }
      ],
      videos: [
        { id: 'v3', title: 'Filing Your Complaint', price: 4.99, duration: '18 min' }
      ]
    },
    {
      id: 3,
      name: 'Discovery Begins',
      coins: 50,
      completed: false,
      description: 'Exchange information with the opposing party',
      position: { top: '45%', left: '25%' },
      label: 'Serpent\'s Bay',
      subStages: [
        { id: 'disc-1', name: 'Interrogatories', coins: 15, completed: false, icon: '❓', description: 'Answer written questions' },
        { id: 'disc-2', name: 'Document Requests', coins: 15, completed: false, icon: '📄', description: 'Provide requested documents' },
        { id: 'disc-3', name: 'Admissions', coins: 20, completed: false, icon: '✅', description: 'Respond to admission requests' }
      ],
      videos: [
        { id: 'v4', title: 'Understanding Discovery', price: 3.99, duration: '22 min' },
        { id: 'v5', title: 'Discovery Response Strategies', price: 4.99, duration: '25 min' }
      ]
    },
    {
      id: 4,
      name: 'Depositions',
      coins: 75,
      completed: false,
      description: 'Sworn testimony is recorded under oath',
      position: { top: '55%', left: '72%' },
      label: 'Blackbeard\'s Port',
      subStages: [
        { id: 'dep-1', name: 'Deposition Preparation', coins: 25, completed: false, icon: '📖', description: 'Prepare for questioning' },
        { id: 'dep-2', name: 'Your Deposition', coins: 30, completed: false, icon: '🎤', description: 'Give your testimony' },
        { id: 'dep-3', name: 'Opposing Party Deposition', coins: 20, completed: false, icon: '👥', description: 'Witness other depositions' }
      ],
      videos: [
        { id: 'v6', title: 'Deposition Deep Dive', price: 4.99, duration: '30 min' },
        { id: 'v7', title: 'How to Testify Effectively', price: 5.99, duration: '28 min' }
      ]
    },
    {
      id: 5,
      name: 'Mediation',
      coins: 50,
      completed: false,
      description: 'Attempt to settle the case with a neutral mediator',
      position: { top: '68%', left: '18%' },
      label: 'Parley Point',
      subStages: [
        { id: 'med-1', name: 'Mediation Prep', coins: 15, completed: false, icon: '📋', description: 'Prepare settlement strategy' },
        { id: 'med-2', name: 'Mediation Session', coins: 25, completed: false, icon: '🤝', description: 'Attend mediation meeting' },
        { id: 'med-3', name: 'Settlement Negotiation', coins: 10, completed: false, icon: '💼', description: 'Negotiate terms' }
      ],
      videos: [
        { id: 'v8', title: 'Mediation Mastery', price: 4.99, duration: '24 min' }
      ]
    },
    {
      id: 6,
      name: 'Trial Prep',
      coins: 100,
      completed: false,
      description: 'Prepare your case for trial presentation',
      position: { top: '78%', left: '58%' },
      label: 'Justice Harbor',
      subStages: [
        { id: 'tp-1', name: 'Witness Preparation', coins: 30, completed: false, icon: '👨‍⚖️', description: 'Prep witnesses for testimony' },
        { id: 'tp-2', name: 'Exhibit Organization', coins: 25, completed: false, icon: '🗂️', description: 'Organize evidence and exhibits' },
        { id: 'tp-3', name: 'Trial Strategy', coins: 45, completed: false, icon: '🎯', description: 'Develop trial presentation plan' }
      ],
      videos: [
        { id: 'v9', title: 'Trial Preparation Guide', price: 5.99, duration: '35 min' },
        { id: 'v10', title: 'Courtroom Procedures', price: 4.99, duration: '28 min' }
      ]
    },
    {
      id: 7,
      name: 'Trial/Settlement',
      coins: 100,
      completed: false,
      description: 'Present your case in court or reach final settlement',
      position: { top: '86%', left: '30%' },
      label: 'Victory Shores',
      subStages: [
        { id: 'ts-1', name: 'Opening Statements', coins: 30, completed: false, icon: '🗣️', description: 'Present opening arguments' },
        { id: 'ts-2', name: 'Presentation of Evidence', coins: 40, completed: false, icon: '📊', description: 'Present case evidence' },
        { id: 'ts-3', name: 'Closing Arguments', coins: 30, completed: false, icon: '⚡', description: 'Make final arguments' }
      ],
      videos: [
        { id: 'v11', title: 'Trial Tactics', price: 6.99, duration: '40 min' }
      ]
    },
    {
      id: 8,
      name: 'Case Resolved',
      coins: 200,
      completed: false,
      description: 'Your case reaches final resolution - congratulations!',
      position: { top: '92%', left: '75%' },
      label: 'Treasure Isle',
      subStages: [
        { id: 'cr-1', name: 'Judgment Entry', coins: 100, completed: false, icon: '⚖️', description: 'Court enters judgment' },
        { id: 'cr-2', name: 'Case Closure', coins: 100, completed: false, icon: '🎊', description: 'Finalize all matters' }
      ],
      videos: [
        { id: 'v12', title: 'Post-Trial Procedures', price: 3.99, duration: '18 min' }
      ]
    }
  ]);

  const videos = [
    { id: 1, title: 'Understanding Discovery', price: 3.99, tier: 'free', duration: '12 min' },
    { id: 2, title: 'Deposition Deep Dive', price: 4.99, tier: 'premium', duration: '25 min' },
    { id: 3, title: 'Mediation Mastery', price: 4.99, tier: 'premium', duration: '30 min' },
    { id: 4, title: 'Trial Preparation Guide', price: 4.99, tier: 'premium', duration: '28 min' },
    { id: 5, title: 'Medical Bills 101', price: 1.99, tier: 'basic', duration: '8 min' }
  ];

  // ============================================
  // AUTHENTICATION FUNCTIONS
  // ============================================
  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    setCurrentScreen('login');
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setUser({
      id: 1,
      email: email,
      type: userType,
      subscription: 'free',
      coins: 150,
      streak: 3
    });
    setCoins(150);
    setLoginStreak(3);
    setIsLoggedIn(true);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentScreen('landing');
  };

  // ============================================
  // GAMIFICATION FUNCTIONS
  // ============================================
  const calculateDailyBonus = (streak) => {
    const bonuses = [5, 7, 10, 12, 15, 20, 30];
    return bonuses[Math.min(streak - 1, 6)];
  };

  const claimDailyBonus = () => {
    const bonus = calculateDailyBonus(loginStreak + 1);
    setCoins(coins + bonus);
    setLoginStreak(loginStreak + 1);
    Alert.alert('Daily Bonus!', `You earned ${bonus} coins! ${loginStreak + 1} day streak! 🎉`);
  };

  const convertCoinsToCredits = () => {
    const credits = Math.floor(coins / 500);
    const maxCredits = 7;
    const actualCredits = Math.min(credits, maxCredits);
    
    Alert.alert(
      'Convert Coins',
      `Convert ${actualCredits * 500} coins to $${actualCredits} in credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Convert', onPress: () => {
          setCoins(coins - (actualCredits * 500));
          Alert.alert('Success!', `$${actualCredits} added to your account credits!`);
        }}
      ]
    );
  };

  // ============================================
  // PIRATE MAP FUNCTIONS
  // ============================================
  const handleFileUpload = (subStageId) => {
    const subStage = selectedStage.subStages.find(s => s.id === subStageId);
    
    if (subStage.linkToMedicalHub) {
      Alert.alert(
        '🏥 Medical Hub',
        `This document is managed in your Medical Hub. Would you like to go there now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Medical Hub', 
            onPress: () => {
              setStageModalVisible(false);
              setCurrentScreen('medical');
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      '📁 Upload Document',
      `Select files to upload for "${subStage.name}"\n\nAccepted formats: ${subStage.acceptedFormats}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => simulateUpload(subStageId, 'photo') },
        { text: 'Choose Files', onPress: () => simulateUpload(subStageId, 'file') }
      ]
    );
  };

  const simulateUpload = (subStageId, uploadType) => {
    setRoadmapStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === selectedStage.id) {
          const updatedSubStages = stage.subStages.map(subStage => {
            if (subStage.id === subStageId) {
              const fileName = uploadType === 'photo' 
                ? `photo_${Date.now()}.jpg` 
                : `document_${Date.now()}.pdf`;
              
              const newFiles = [...(subStage.uploadedFiles || []), fileName];
              Alert.alert('✅ Upload Successful!', `${fileName} has been uploaded successfully.`);
              
              return { ...subStage, uploaded: true, uploadedFiles: newFiles };
            }
            return subStage;
          });

          setSelectedStage({ ...stage, subStages: updatedSubStages });
          return { ...stage, subStages: updatedSubStages };
        }
        return stage;
      })
    );
  };

  const viewUploadedFiles = (subStage) => {
    if (!subStage.uploaded || subStage.uploadedFiles.length === 0) {
      Alert.alert('No Files', 'No files have been uploaded yet.');
      return;
    }
    const fileList = subStage.uploadedFiles.map((file, index) => `${index + 1}. ${file}`).join('\n');
    Alert.alert('📁 Uploaded Files', fileList, [{ text: 'OK' }]);
  };

  const handleDataEntry = (subStageId, subStageName, currentValue) => {
    Alert.prompt(
      `✏️ ${subStageName}`,
      'Please enter the information:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: (text) => {
            if (text && text.trim()) {
              setRoadmapStages(prevStages =>
                prevStages.map(stage => {
                  if (stage.id === selectedStage.id) {
                    const updatedSubStages = stage.subStages.map(subStage => {
                      if (subStage.id === subStageId) {
                        return { ...subStage, enteredData: text.trim() };
                      }
                      return subStage;
                    });
                    setSelectedStage({ ...stage, subStages: updatedSubStages });
                    return { ...stage, subStages: updatedSubStages };
                  }
                  return stage;
                })
              );
              Alert.alert('✅ Saved!', 'Information has been saved successfully.');
            }
          }
        }
      ],
      'plain-text',
      currentValue || ''
    );
  };

  const markSubStageComplete = (subStageId) => {
    const subStage = selectedStage.subStages.find(s => s.id === subStageId);
    
    if (subStage.linkToMedicalHub) {
      Alert.alert(
        'Medical Hub Required',
        'Please complete this step in the Medical Hub first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Medical Hub', onPress: () => {
            setStageModalVisible(false);
            setCurrentScreen('medical');
          }}
        ]
      );
      return;
    }

    setRoadmapStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === selectedStage.id) {
          const updatedSubStages = stage.subStages.map(sub => {
            if (sub.id === subStageId && !sub.completed) {
              setCoins(coins + sub.coins);
              Alert.alert('🎉 Step Complete!', `You earned ${sub.coins} doubloons!`);
              return { ...sub, completed: true };
            }
            return sub;
          });

          const allComplete = updatedSubStages.every(sub => sub.completed);
          if (allComplete && !stage.completed) {
            setCoins(coins + stage.coins);
            Alert.alert('💰 Treasure Found!', `${stage.name} complete! +${stage.coins} bonus doubloons!`);
            return { ...stage, subStages: updatedSubStages, completed: true };
          }

          setSelectedStage({ ...stage, subStages: updatedSubStages });
          return { ...stage, subStages: updatedSubStages };
        }
        return stage;
      })
    );
  };

  const completeEntireStage = () => {
    Alert.alert(
      'Complete Stage?',
      `Mark "${selectedStage.name}" as complete and earn ${selectedStage.coins} doubloons?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            setRoadmapStages(prevStages =>
              prevStages.map(stage => {
                if (stage.id === selectedStage.id && !stage.completed) {
                  const updatedSubStages = stage.subStages.map(sub => ({ ...sub, completed: true }));
                  const subStageCoins = stage.subStages.reduce((sum, sub) => sum + sub.coins, 0);
                  setCoins(coins + stage.coins + subStageCoins);
                  Alert.alert('💰 Treasure Found!', `You earned ${stage.coins + subStageCoins} total doubloons!`);
                  return { ...stage, subStages: updatedSubStages, completed: true };
                }
                return stage;
              })
            );
            setStageModalVisible(false);
          }
        }
      ]
    );
  };

  const watchVideo = (video) => {
    Alert.alert(
      `${video.title}`,
      `Duration: ${video.duration}\nPrice: $${video.price}\n\nPurchase this video tutorial?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => Alert.alert('Success!', 'Video added to your library!') }
      ]
    );
  };

  const openStageModal = (stage) => {
    setSelectedStage(stage);
    setStageModalVisible(true);
  };

  const closeStageModal = () => {
    setStageModalVisible(false);
    setTimeout(() => setSelectedStage(null), 300);
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderStageModal = () => {
    if (!selectedStage) return null;

    const completedSubStages = selectedStage.subStages.filter(s => s.completed).length;
    const totalSubStages = selectedStage.subStages.length;
    const progress = totalSubStages > 0 ? Math.round((completedSubStages / totalSubStages) * 100) : 0;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={stageModalVisible}
        onRequestClose={closeStageModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedStage.name}</Text>
              <TouchableOpacity onPress={closeStageModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>{selectedStage.description}</Text>

              {totalSubStages > 0 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Progress: {completedSubStages}/{totalSubStages} steps</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.coinsSection}>
                <Text style={styles.coinsSectionTitle}>💰 Treasure Reward</Text>
                <Text style={styles.coinsAmount}>{selectedStage.coins} Doubloons</Text>
              </View>

              {selectedStage.subStages.length > 0 && (
                <View style={styles.subStagesSection}>
                  <Text style={styles.sectionTitle}>📜 Quest Steps</Text>
                  {selectedStage.subStages.map(subStage => (
                    <View key={subStage.id} style={styles.subStageCard}>
                      <View style={styles.subStageHeader}>
                        <Text style={styles.subStageRowIcon}>{subStage.icon}</Text>
                        <View style={styles.subStageInfo}>
                          <Text style={styles.subStageRowName}>{subStage.name}</Text>
                          <Text style={styles.subStageDescription}>{subStage.description}</Text>
                          <Text style={styles.subStageRowCoins}>+{subStage.coins} doubloons</Text>
                        </View>
                      </View>

                      {subStage.isDataEntry ? (
                        <View style={styles.uploadSection}>
                          <TouchableOpacity
                            style={styles.dataEntryButton}
                            onPress={() => handleDataEntry(subStage.id, subStage.name, subStage.enteredData)}
                          >
                            <Text style={styles.dataEntryIcon}>✏️</Text>
                            <Text style={styles.dataEntryButtonText}>
                              {subStage.enteredData ? 'Edit Information' : 'Enter Information'}
                            </Text>
                          </TouchableOpacity>
                          {subStage.enteredData && (
                            <View style={styles.dataEntryDisplay}>
                              <Text style={styles.dataEntryLabel}>Saved:</Text>
                              <Text style={styles.dataEntryValue} numberOfLines={1}>{subStage.enteredData}</Text>
                            </View>
                          )}
                        </View>
                      ) : subStage.acceptedFormats ? (
                        <View style={styles.uploadSection}>
                          {subStage.linkToMedicalHub ? (
                            <TouchableOpacity
                              style={styles.medicalHubButton}
                              onPress={() => handleFileUpload(subStage.id)}
                            >
                              <Text style={styles.medicalHubIcon}>🏥</Text>
                              <Text style={styles.medicalHubText}>Manage in Medical Hub</Text>
                            </TouchableOpacity>
                          ) : (
                            <>
                              <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => handleFileUpload(subStage.id)}
                              >
                                <Text style={styles.uploadIcon}>📤</Text>
                                <Text style={styles.uploadButtonText}>
                                  {subStage.uploaded ? 'Upload More' : 'Upload Documents'}
                                </Text>
                              </TouchableOpacity>

                              {subStage.uploaded && (
                                <TouchableOpacity
                                  style={styles.viewFilesButton}
                                  onPress={() => viewUploadedFiles(subStage)}
                                >
                                  <Text style={styles.viewFilesText}>
                                    View Files ({subStage.uploadedFiles.length})
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </View>
                      ) : null}

                      <View style={styles.completeSection}>
                        {subStage.completed ? (
                          <View style={styles.checkmarkLarge}>
                            <Text style={styles.checkmarkText}>✓ Completed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.miniCompleteButton}
                            onPress={() => markSubStageComplete(subStage.id)}
                          >
                            <Text style={styles.miniCompleteButtonText}>Mark Complete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {selectedStage.videos.length > 0 && (
                <View style={styles.videosSection}>
                  <Text style={styles.sectionTitle}>🎬 Captain's Tutorials</Text>
                  {selectedStage.videos.map(video => (
                    <TouchableOpacity
                      key={video.id}
                      style={styles.videoCard}
                      onPress={() => watchVideo(video)}
                    >
                      <View style={styles.videoLeft}>
                        <Text style={styles.videoPlayIcon}>▶️</Text>
                        <View style={styles.videoInfo}>
                          <Text style={styles.videoTitle}>{video.title}</Text>
                          <Text style={styles.videoDuration}>{video.duration}</Text>
                        </View>
                      </View>
                      <Text style={styles.videoPrice}>${video.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!selectedStage.completed && (
                <TouchableOpacity
                  style={styles.completeStageButton}
                  onPress={completeEntireStage}
                >
                  <Text style={styles.completeStageButtonText}>
                    💰 Claim All Treasure
                  </Text>
                </TouchableOpacity>
              )}

              {selectedStage.completed && (
                <View style={styles.completedBanner}>
                  <Text style={styles.completedBannerText}>🏆 Treasure Claimed!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ============================================
  // SCREEN RENDERS (ABBREVIATED - Full screens would go here)
  // ============================================
  
  // Landing, Login, Register, Dashboard screens would go here
  // For brevity, I'm showing the main Roadmap screen below

  const renderRoadmapScreen = () => {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏴‍☠️ Pirate's Litigation Map</Text>
        </View>

        <ScrollView style={styles.mapScrollView}>
          <View style={styles.pirateMap}>
            {/* Map decorations */}
            <Text style={[styles.mapDecor, { top: '5%', left: '5%' }]}>⚓</Text>
            <Text style={[styles.mapDecor, { top: '10%', right: '8%' }]}>🦜</Text>
            <Text style={[styles.mapDecor, { top: '30%', left: '85%' }]}>🏴‍☠️</Text>
            <Text style={[styles.mapDecor, { top: '55%', left: '5%' }]}>🗡️</Text>

            {/* Treasure chests */}
            {roadmapStages.map(stage => (
              <View
                key={stage.id}
                style={[styles.treasureContainer, { 
                  top: stage.position.top, 
                  left: stage.position.left 
                }]}
              >
                <TouchableOpacity
                  style={styles.treasureChest}
                  onPress={() => openStageModal(stage)}
                >
                  <Text style={styles.treasureIcon}>
                    {stage.completed ? '🏆' : '💰'}
                  </Text>
                  {stage.completed && (
                    <View style={styles.completeBadge}>
                      <Text style={styles.completeBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.stageName}>{stage.name}</Text>
              </View>
            ))}

            {/* Map legend */}
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>🗺️ Map Legend</Text>
              <Text style={styles.legendItem}>💰 = Treasure to Claim</Text>
              <Text style={styles.legendItem}>🏆 = Treasure Found!</Text>
            </View>
          </View>
        </ScrollView>

        {renderStageModal()}
      </View>
    );
  };

  // Main render based on current screen
  if (!isLoggedIn) {
    // Return Login/Register screens (abbreviated)
    return <View style={styles.container}><Text>Login Screen</Text></View>;
  }

  if (currentScreen === 'roadmap') {
    return renderRoadmapScreen();
  }

  // Default dashboard or other screens
  return (
    <View style={styles.container}>
      <Text>Dashboard</Text>
    </View>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0f3460',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  mapScrollView: {
    flex: 1,
  },
  pirateMap: {
    backgroundColor: '#c9a86a',
    minHeight: height * 1.2,
    margin: 10,
    borderRadius: 15,
    borderWidth: 5,
    borderColor: '#8b7355',
    position: 'relative',
    padding: 20,
  },
  mapDecor: {
    position: 'absolute',
    fontSize: 30,
    opacity: 0.6,
  },
  treasureContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
  },
  treasureChest: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4e4c1',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#8b4513',
  },
  treasureIcon: {
    fontSize: 35,
  },
  stageName: {
    fontSize: 9,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  completeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#f4e4c1',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8b4513',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItem: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.85,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f3460',
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 6,
  },
  coinsSection: {
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
    alignItems: 'center',
  },
  coinsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#654321',
  },
  coinsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  subStagesSection: {
    marginBottom: 20,
  },
  subStageCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  subStageHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  subStageRowIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  subStageInfo: {
    flex: 1,
  },
  subStageRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  subStageDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  subStageRowCoins: {
    fontSize: 13,
    color: '#f39c12',
    fontWeight: '600',
  },
  uploadSection: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewFilesButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewFilesText: {
    color: '#2c3e50',
    fontSize: 12,
    fontWeight: '600',
  },
  medicalHubButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  medicalHubIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  medicalHubText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  dataEntryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#9b59b6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataEntryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dataEntryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dataEntryDisplay: {
    backgroundColor: '#f3e5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9b59b6',
    flex: 1,
  },
  dataEntryLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  dataEntryValue: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },
  completeSection: {
    marginTop: 8,
  },
  miniCompleteButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  miniCompleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkmarkLarge: {
    backgroundColor: '#d5f4e6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videosSection: {
    marginBottom: 20,
  },
  videoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  videoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  videoPlayIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  videoDuration: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  videoPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  completeStageButton: {
    backgroundColor: '#27ae60',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  completeStageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedBanner: {
    backgroundColor: '#d5f4e6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  completedBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});

export default CaseCompassApp;
