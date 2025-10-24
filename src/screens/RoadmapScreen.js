import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Dimensions, Animated, TextInput, Platform, ActivityIndicator } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import AvatarSelector from '../components/AvatarSelector';
import Svg, { Path } from 'react-native-svg';
import { API_URL } from '../config/api';
import { pickDocument, pickImage, createFormDataFromFile } from '../utils/fileUpload';
import alert from '../utils/alert';

const { width, height } = Dimensions.get('window');

const AnimatedPath = Animated.createAnimatedComponent(Path);

const RoadmapScreen = ({ 
  litigationStages, 
  onCompleteStage, 
  onUncompleteStage, 
  onNavigate, 
  selectedAvatar, 
  onSelectAvatar, 
  onCompleteSubStage, 
  onPurchaseVideo, 
  onUploadFile, 
  onDataEntry, 
  medicalHubUploads, 
  authToken,
  readOnly = false,
  clientId = null,
  clientRoadmapData = null,
  user = null
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [animatingPaths, setAnimatingPaths] = useState([]);
  const animationValues = useRef({});
  const [dataEntryModalVisible, setDataEntryModalVisible] = useState(false);
  const [dataEntryValue, setDataEntryValue] = useState('');
  const [dataEntrySubStage, setDataEntrySubStage] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const openStageModal = (stage) => {
    setSelectedStage(stage);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedStage(null), 300);
  };

  const handleFileUpload = (subStageId) => {
    const currentStage = litigationStages.find(s => s.id === selectedStage.id);
    const subStage = currentStage.subStages.find(s => s.id === subStageId);
    
    if (subStage.linkToMedicalHub) {
      alert(
        '🏥 Medical Hub',
        `This document is managed in your Medical Hub. Would you like to go there now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Medical Hub', 
            onPress: () => {
              closeModal();
              onNavigate('medical');
            }
          }
        ]
      );
      return;
    }

    alert(
      '📁 Upload Document',
      `Select files to upload for "${subStage.name}"\n\nAccepted formats: ${subStage.acceptedFormats}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => simulateUpload(selectedStage.id, subStageId, 'photo')
        },
        { 
          text: 'Choose Files', 
          onPress: () => simulateUpload(selectedStage.id, subStageId, 'file')
        }
      ]
    );
  };

  const pickImageFromCamera = async (stageId, subStageId) => {
    try {
      const result = await pickImage();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadEvidenceFile(result.assets[0], stageId, subStageId);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (error.message === 'Camera permission is required') {
        alert('Permission Required', 'Camera permission is required to take photos.');
      } else {
        alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const pickDocumentFromDevice = async (stageId, subStageId) => {
    try {
      const result = await pickDocument();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadEvidenceFile(result.assets[0], stageId, subStageId);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const uploadEvidenceFile = async (file, stageId, subStageId) => {
    if (!authToken) {
      alert('Error', 'You must be logged in to upload files.');
      return;
    }

    setUploading(true);

    try {
      const currentStage = litigationStages.find(s => s.id === stageId);
      const subStage = currentStage.subStages.find(s => s.id === subStageId);

      const formData = createFormDataFromFile(file, 'file', {
        evidenceType: subStage.name,
        title: subStage.name
      });

      const response = await fetch(`${API_URL}/uploads/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onUploadFile(stageId, subStageId, data.document.file_name);
        alert(
          '✅ Upload Successful!',
          `${data.document.file_name} has been uploaded successfully.`
        );
      } else {
        alert('Upload Failed', data.error || 'Failed to upload file.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload Failed', 'An error occurred while uploading the file.');
    } finally {
      setUploading(false);
    }
  };

  const simulateUpload = (stageId, subStageId, uploadType) => {
    if (uploadType === 'photo') {
      pickImageFromCamera(stageId, subStageId);
    } else {
      pickDocumentFromDevice(stageId, subStageId);
    }
  };

  const viewUploadedFiles = (subStage) => {
    if (!subStage.uploaded || !subStage.uploadedFiles || subStage.uploadedFiles.length === 0) {
      alert('No Files', 'No files have been uploaded yet.');
      return;
    }

    const fileList = subStage.uploadedFiles.map((file, index) => 
      `${index + 1}. ${file}`
    ).join('\n');

    alert(
      '📁 Uploaded Files',
      fileList,
      [{ text: 'OK' }]
    );
  };

  const handleDataEntry = (subStageId, subStageName, currentValue) => {
    if (Platform.OS === 'web') {
      setDataEntrySubStage({ id: subStageId, name: subStageName });
      setDataEntryValue(currentValue || '');
      setDataEntryModalVisible(true);
    } else {
      Alert.prompt(
        `✏️ ${subStageName}`,
        'Please enter the information:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save', 
            onPress: (text) => {
              if (text && text.trim()) {
                onDataEntry(selectedStage.id, subStageId, text.trim());
                alert('✅ Saved!', 'Information has been saved successfully.');
              }
            }
          }
        ],
        'plain-text',
        currentValue || ''
      );
    }
  };

  const handleDataEntrySave = () => {
    if (dataEntryValue && dataEntryValue.trim() && dataEntrySubStage) {
      onDataEntry(selectedStage.id, dataEntrySubStage.id, dataEntryValue.trim());
      setDataEntryModalVisible(false);
      setDataEntryValue('');
      setDataEntrySubStage(null);
      alert('✅ Saved!', 'Information has been saved successfully.');
    }
  };

  const handleDataEntryCancel = () => {
    setDataEntryModalVisible(false);
    setDataEntryValue('');
    setDataEntrySubStage(null);
  };

  const handleSubStageComplete = async (subStageId, subStageCoins) => {
    // VERSION 2.0 - NO UPLOAD REQUIREMENTS - MANUAL COMPLETION ENABLED
    console.log('[RoadmapScreen] handleSubStageComplete v2.0 - NO UPLOAD VALIDATION');
    console.log('[RoadmapScreen] SubstageId:', subStageId, 'Coins:', subStageCoins);
    
    if (!authToken) {
      console.error('[RoadmapScreen] No auth token - user not logged in');
      alert('Error', 'You must be logged in to complete tasks.');
      return;
    }

    // NO VALIDATION - Go directly to backend completion
    await completeSubstageOnBackend(subStageId, subStageCoins);
  };

  const completeSubstageOnBackend = async (subStageId, subStageCoins) => {
    console.log('[RoadmapScreen] completeSubstageOnBackend started');
    try {
      const currentStage = litigationStages.find(s => s.id === selectedStage.id);
      const subStage = currentStage.subStages.find(s => s.id === subStageId);

      const requestBody = { 
        stageId: currentStage.id,
        stageName: currentStage.name,
        substageId: subStageId,
        substageName: subStage.name,
        substageType: subStage.isDataEntry ? 'data_entry' : 'upload',
        coinsEarned: subStageCoins
      };

      console.log('[RoadmapScreen] Making API request to:', `${API_URL}/litigation/substage/complete`);
      console.log('[RoadmapScreen] Request body:', requestBody);
      console.log('[RoadmapScreen] Auth token present:', !!authToken);

      const response = await fetch(`${API_URL}/litigation/substage/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[RoadmapScreen] Response status:', response.status);
      const data = await response.json();
      console.log('[RoadmapScreen] Response data:', data);

      if (response.ok) {
        console.log('[RoadmapScreen] Success! Updating local state...');
        // Update local state
        onCompleteSubStage(selectedStage.id, subStageId, subStageCoins);
        
        alert(
          '✅ Task Completed!',
          `You earned ${subStageCoins} coins! Your progress has been updated.`
        );
      } else {
        console.error('[RoadmapScreen] API error:', data.error);
        // Handle duplicate completion gracefully
        if (data.error && data.error.includes('already completed')) {
          alert('Already Completed', 'This task has already been completed.');
        } else {
          alert('Error', data.error || 'Failed to complete task.');
        }
      }
    } catch (error) {
      console.error('[RoadmapScreen] Exception in completeSubstageOnBackend:', error);
      alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  const completeEntireStage = () => {
    const currentStage = litigationStages.find(s => s.id === selectedStage.id);
    
    if (!currentStage.subStages || currentStage.subStages.length === 0) {
      onCompleteStage(currentStage.id, currentStage.coins);
      closeModal();
    } else {
      const incompleteSubs = currentStage.subStages.filter(sub => !sub.completed);
      const subStageCoins = incompleteSubs.reduce((sum, sub) => sum + sub.coins, 0);
      const totalCoins = subStageCoins + currentStage.coins;

      alert(
        'Complete Stage?',
        `Mark "${currentStage.name}" as complete?\n\nYou'll earn:\n• ${subStageCoins} coins from ${incompleteSubs.length} steps\n• ${currentStage.coins} bonus coins\n\nTotal: ${totalCoins} coins`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete All',
            onPress: () => {
              incompleteSubs.forEach(sub => {
                onCompleteSubStage(currentStage.id, sub.id, sub.coins);
              });
              closeModal();
            }
          }
        ]
      );
    }
  };

  const uncompleteEntireStage = () => {
    const currentStage = litigationStages.find(s => s.id === selectedStage.id);
    
    const completedSubs = currentStage.subStages?.filter(sub => sub.completed) || [];
    const subStageCoins = completedSubs.reduce((sum, sub) => sum + sub.coins, 0);
    const totalCoins = subStageCoins + currentStage.coins;

    if (Platform.OS === 'web') {
      setConfirmModalData({
        title: 'Revert Stage?',
        message: `Mark "${currentStage.name}" as incomplete?\n\nYou'll lose:\n• ${subStageCoins} coins from ${completedSubs.length} completed steps\n• ${currentStage.coins} bonus coins\n\nTotal: ${totalCoins} coins will be removed`,
        onConfirm: () => {
          onUncompleteStage(currentStage.id, currentStage.coins);
          setConfirmModalVisible(false);
          closeModal();
        },
        onCancel: () => {
          setConfirmModalVisible(false);
        }
      });
      setConfirmModalVisible(true);
    } else {
      alert(
        'Revert Stage?',
        `Mark "${currentStage.name}" as incomplete?\n\nYou'll lose:\n• ${subStageCoins} coins from ${completedSubs.length} completed steps\n• ${currentStage.coins} bonus coins\n\nTotal: ${totalCoins} coins will be removed`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revert',
            style: 'destructive',
            onPress: () => {
              onUncompleteStage(currentStage.id, currentStage.coins);
              closeModal();
            }
          }
        ]
      );
    }
  };

  const getCurrentStageIndex = () => {
    const firstIncomplete = litigationStages.findIndex(stage => !stage.completed);
    return firstIncomplete === -1 ? litigationStages.length - 1 : Math.max(0, firstIncomplete);
  };

  const currentStageIndex = getCurrentStageIndex();

  useEffect(() => {
    // Add paths for completed stages
    litigationStages.forEach((stage, index) => {
      if (stage.completed && index < litigationStages.length - 1) {
        const pathKey = `${stage.id}-${litigationStages[index + 1].id}`;
        
        if (!animatingPaths.find(p => p.key === pathKey)) {
          const nextStage = litigationStages[index + 1];
          
          if (!animationValues.current[pathKey]) {
            animationValues.current[pathKey] = new Animated.Value(0);
          }
          
          setAnimatingPaths(prev => [...prev, {
            key: pathKey,
            from: stage,
            to: nextStage,
            animValue: animationValues.current[pathKey]
          }]);
          
          Animated.timing(animationValues.current[pathKey], {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false
          }).start();
        }
      }
    });

    // Remove paths for uncompleted stages
    setAnimatingPaths(prev => {
      return prev.filter(path => {
        // Find the stage that this path originates from
        const fromStage = litigationStages.find(s => s.id === path.from.id);
        // Keep the path only if the stage is still completed
        return fromStage && fromStage.completed;
      });
    });
  }, [litigationStages]);

  const parsePosition = (posStr, dimension) => {
    const value = parseFloat(posStr);
    const mapDimension = dimension === 'width' ? width - 40 : (height * 1.1) - 40;
    return (value / 100) * mapDimension;
  };

  const renderAnimatedPaths = () => {
    if (!animatingPaths || animatingPaths.length === 0) return null;

    const mapWidth = width - 40;
    const mapHeight = (height * 1.1) - 40;

    return (
      <Svg 
        style={StyleSheet.absoluteFill} 
        width={mapWidth} 
        height={mapHeight}
      >
        {animatingPaths.map(path => {
          const x1 = parsePosition(path.from.position.left, 'width') + 40;
          const y1 = parsePosition(path.from.position.top, 'height') + 30;
          const x2 = parsePosition(path.to.position.left, 'width') + 40;
          const y2 = parsePosition(path.to.position.top, 'height') + 30;

          // Calculate control points for a snake-like winding path
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Create perpendicular offset for wave effect
          const perpX = -dy / distance;
          const perpY = dx / distance;
          
          // Even stronger wave amplitude for more dramatic curves
          const waveAmplitude = Math.min(distance * 0.6, 100);
          
          // Create a more complex S-curve with multiple control points
          // Point 1: First curve bends one way
          const cp1x = x1 + dx * 0.2 + perpX * waveAmplitude;
          const cp1y = y1 + dy * 0.2 + perpY * waveAmplitude;
          
          // Midpoint for the S-curve
          const midX = x1 + dx * 0.5;
          const midY = y1 + dy * 0.5;
          
          // Point 2: Curve back the other way (stronger)
          const cp2x = x1 + dx * 0.5 - perpX * waveAmplitude * 0.9;
          const cp2y = y1 + dy * 0.5 - perpY * waveAmplitude * 0.9;
          
          // Point 3: Continue the wave
          const cp3x = x1 + dx * 0.8 + perpX * waveAmplitude * 0.7;
          const cp3y = y1 + dy * 0.8 + perpY * waveAmplitude * 0.7;

          // Create snake-like winding path with multiple cubic Bezier curves
          const wavyPath = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${midX} ${midY} S ${cp3x} ${cp3y}, ${x2} ${y2}`;
          
          // Calculate path length for dash animation (longer due to curves)
          const pathLength = distance * 1.8; // Approximate length with more curves

          const animatedDashoffset = path.animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [pathLength, 0]
          });

          return (
            <AnimatedPath
              key={path.key}
              d={wavyPath}
              stroke="#27ae60"
              strokeWidth="4"
              strokeDasharray="10, 5"
              strokeDashoffset={animatedDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
    );
  };

  const renderTreasure = (stage, index) => {
    const isCurrent = currentStageIndex === index && !stage.completed;
    return (
      <View
        key={stage.id}
        style={[
          styles.treasureContainer,
          { top: stage.position.top, left: stage.position.left }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.treasureChest,
            isCurrent && !stage.completed && styles.treasureChestCurrent
          ]}
          onPress={() => openStageModal(stage)}
          activeOpacity={0.7}
        >
          {isCurrent && selectedAvatar && !stage.completed ? (
            <Text style={styles.avatarIcon}>{selectedAvatar.emoji}</Text>
          ) : (
            <Text style={styles.treasureIcon}>{stage.completed ? '🏆' : '💰'}</Text>
          )}
          {stage.completed && (
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.stageName}>{stage.name}</Text>
      </View>
    );
  };

  const renderStageModal = () => {
    if (!selectedStage) return null;

    const currentStage = litigationStages.find(s => s.id === selectedStage.id) || selectedStage;

    const completedSubStages = currentStage.subStages?.filter(s => s.completed).length || 0;
    const totalSubStages = currentStage.subStages?.length || 0;
    const progress = totalSubStages > 0 ? Math.round((completedSubStages / totalSubStages) * 100) : 0;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible && !dataEntryModalVisible && !confirmModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentStage.name}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>{currentStage.description}</Text>

              {totalSubStages > 0 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Progress: {completedSubStages}/{totalSubStages} steps</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.coinsSection}>
                <Text style={styles.coinsSectionTitle}>🪙 Bonus Reward</Text>
                <Text style={styles.coinsAmount}>{currentStage.coins} coins</Text>
              </View>

              {currentStage.subStages && currentStage.subStages.length > 0 && (
                <View style={styles.subStagesSection}>
                  <Text style={styles.sectionTitle}>📋 Steps in this Stage</Text>
                  {currentStage.subStages.map(subStage => (
                    <View key={subStage.id} style={styles.subStageCard}>
                      <View style={styles.subStageHeader}>
                        <Text style={styles.subStageRowIcon}>{subStage.icon}</Text>
                        <View style={styles.subStageInfo}>
                          <Text style={styles.subStageRowName}>{subStage.name}</Text>
                          <Text style={styles.subStageDescription}>{subStage.description}</Text>
                          <Text style={styles.subStageRowCoins}>+{subStage.coins} coins</Text>
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
                                  {subStage.uploaded ? 'Upload More' : 'Upload Files'}
                                </Text>
                              </TouchableOpacity>

                              {subStage.uploaded && (
                                <TouchableOpacity
                                  style={styles.viewFilesButton}
                                  onPress={() => viewUploadedFiles(subStage)}
                                >
                                  <Text style={styles.viewFilesText}>
                                    View Files ({subStage.uploadedFiles?.length || 0})
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
                            style={[
                              styles.miniCompleteButton,
                              selectedAvatar && { backgroundColor: selectedAvatar.color }
                            ]}
                            onPress={() => handleSubStageComplete(subStage.id, subStage.coins)}
                          >
                            <Text style={styles.miniCompleteButtonText}>Mark Complete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {currentStage.videos && currentStage.videos.length > 0 && (
                <View style={styles.videosSection}>
                  <Text style={styles.sectionTitle}>🎬 Tutorial Videos</Text>
                  {currentStage.videos.map(video => (
                    <TouchableOpacity
                      key={video.id}
                      style={styles.videoCard}
                      onPress={() => onPurchaseVideo(video)}
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

              {!currentStage.completed && (
                <TouchableOpacity
                  style={[styles.completeStageButton, selectedAvatar && { backgroundColor: selectedAvatar.color }]}
                  onPress={completeEntireStage}
                >
                  <Text style={styles.completeStageButtonText}>
                    ✓ Mark Entire Stage Complete
                  </Text>
                </TouchableOpacity>
              )}

              {currentStage.completed && (
                <>
                  <View style={styles.completedBanner}>
                    <Text style={styles.completedBannerText}>🏆 Stage Completed!</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.uncompleteStageButton}
                    onPress={uncompleteEntireStage}
                  >
                    <Text style={styles.uncompleteStageButtonText}>
                      ↩️ Unmark as Complete
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const handleBackPress = () => {
    if (readOnly && user) {
      // If viewing a client/patient roadmap, go back to client/patient details
      if (user.userType === 'lawfirm') {
        onNavigate('lawfirm-client-details');
      } else if (user.userType === 'medicalprovider') {
        onNavigate('medicalprovider-patient-details');
      } else {
        onNavigate('dashboard');
      }
    } else {
      // Regular user viewing their own roadmap
      onNavigate('dashboard');
    }
  };

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Litigation Map</Text>
        {selectedAvatar && (
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={() => onSelectAvatar(null)}
          >
            <Text style={styles.heroEmoji}>{selectedAvatar.emoji}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedAvatar ? (
        <View style={styles.avatarSelectorContainer}>
          <AvatarSelector 
            selectedAvatar={selectedAvatar} 
            onSelectAvatar={onSelectAvatar}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.mapScrollView}
          contentContainerStyle={styles.mapContainer}
        >
          <View style={styles.pirateMap}>
            <Text style={[styles.mapDecor, { top: '5%', left: '5%' }]}>⚓</Text>
            <Text style={[styles.mapDecor, { top: '10%', right: '8%' }]}>🦜</Text>
            <Text style={[styles.mapDecor, { top: '30%', left: '85%' }]}>🏴‍☠️</Text>
            <Text style={[styles.mapDecor, { top: '55%', left: '5%' }]}>🗡️</Text>
            <Text style={[styles.mapDecor, { top: '70%', right: '10%' }]}>🌊</Text>
            <Text style={[styles.mapDecor, { bottom: '8%', left: '15%' }]}>🧭</Text>

            <View style={styles.treasurePath} />

            {renderAnimatedPaths()}

            {litigationStages.map((stage, index) => renderTreasure(stage, index))}

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>🗺️ Map Legend</Text>
              <Text style={styles.legendItem}>💰 = Treasure to Claim</Text>
              <Text style={styles.legendItem}>🏆 = Treasure Found!</Text>
              <Text style={styles.legendItem}>{selectedAvatar.emoji} = Your Position</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {renderStageModal()}

      <Modal
        animationType="fade"
        transparent={true}
        visible={dataEntryModalVisible}
        onRequestClose={handleDataEntryCancel}
      >
        <View style={styles.dataEntryModalOverlay}>
          <View style={styles.dataEntryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ {dataEntrySubStage?.name}</Text>
              <TouchableOpacity onPress={handleDataEntryCancel} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dataEntryInstruction}>Please enter the information:</Text>
            <TextInput
              style={styles.dataEntryInput}
              value={dataEntryValue}
              onChangeText={setDataEntryValue}
              placeholder="Type here..."
              autoFocus={true}
            />
            <View style={styles.dataEntryButtons}>
              <TouchableOpacity
                style={[styles.dataEntryButton, styles.dataEntryCancelButton]}
                onPress={handleDataEntryCancel}
              >
                <Text style={styles.dataEntryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dataEntryButton, styles.dataEntrySaveButton]}
                onPress={handleDataEntrySave}
              >
                <Text style={styles.dataEntrySaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => confirmModalData?.onCancel()}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{confirmModalData?.title}</Text>
            <Text style={styles.confirmModalMessage}>{confirmModalData?.message}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => confirmModalData?.onCancel()}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmRevertButton]}
                onPress={() => confirmModalData?.onConfirm()}
              >
                <Text style={styles.confirmRevertText}>Revert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0f3460',
    padding: 20,
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#d4af37',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    flex: 1,
    textAlign: 'center',
  },
  changeAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  heroEmoji: {
    fontSize: 22,
  },
  avatarSelectorContainer: {
    flex: 1,
    backgroundColor: '#c9a86a',
  },
  mapScrollView: {
    flex: 1,
  },
  mapContainer: {
    minHeight: height * 1.2,
  },
  pirateMap: {
    flex: 1,
    backgroundColor: '#c9a86a',
    margin: 10,
    borderRadius: 15,
    borderWidth: 5,
    borderColor: '#8b7355',
    minHeight: height * 1.1,
    position: 'relative',
    padding: 20,
  },
  treasurePath: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '10%',
    borderWidth: 3,
    borderColor: '#654321',
    borderStyle: 'dashed',
    borderRadius: 20,
    opacity: 0.3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
  treasureChestCurrent: {
    borderWidth: 4,
    borderColor: '#f39c12',
    backgroundColor: '#fff',
  },
  treasureIcon: {
    fontSize: 35,
  },
  avatarIcon: {
    fontSize: 32,
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
    borderWidth: 2,
    borderColor: '#fff',
  },
  completeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapDecor: {
    position: 'absolute',
    fontSize: 30,
    opacity: 0.6,
  },
  legend: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    backgroundColor: '#f4e4c1',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8b4513',
    maxWidth: 140,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#654321',
    marginBottom: 5,
  },
  legendItem: {
    fontSize: 10,
    color: '#654321',
    marginBottom: 2,
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
    flex: 1,
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
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    overflow: 'hidden',
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
    marginBottom: 5,
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
    marginTop: 5,
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
    marginBottom: 4,
  },
  subStageDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
    lineHeight: 18,
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
    justifyContent: 'center',
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
  disabledButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 3,
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
  uncompleteStageButton: {
    backgroundColor: '#e74c3c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uncompleteStageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataEntryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  dataEntryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  dataEntryInstruction: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  dataEntryInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dataEntryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dataEntryButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  dataEntryCancelButton: {
    backgroundColor: '#ecf0f1',
  },
  dataEntrySaveButton: {
    backgroundColor: '#27ae60',
  },
  dataEntryCancelText: {
    color: '#34495e',
    fontSize: 16,
    fontWeight: '600',
  },
  dataEntrySaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 100000,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    color: '#34495e',
    marginBottom: 25,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  confirmButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#95a5a6',
  },
  confirmRevertButton: {
    backgroundColor: '#e74c3c',
  },
  confirmCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmRevertText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RoadmapScreen;
