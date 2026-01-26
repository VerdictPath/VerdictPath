import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, useWindowDimensions, Animated, TextInput, Platform, ActivityIndicator, Image, ImageBackground } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import CelebrationAnimation from '../components/CelebrationAnimation';
import Svg, { Path } from 'react-native-svg';
import { API_BASE_URL } from '../config/api';
import alert from '../utils/alert';
import { getCurrentPhase, checkPhaseTransition, getPhaseCelebrationMessage, formatPhaseDisplay, getPhaseProgress } from '../utils/analyticsTracker';
import { AVATARS } from '../constants/avatars';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ProgressBar = ({ progressPercentage, completedSubstages, totalSubstages, avatarType }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const avatar = avatarType ? AVATARS[avatarType.toUpperCase()] : null;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        {avatar && (
          <View style={styles.avatarBadge}>
            <Image 
              source={avatar.thumbnail} 
              style={styles.avatarThumbnail}
              resizeMode="cover"
            />
          </View>
        )}
        <View style={styles.progressTitleContainer}>
          <Text style={styles.progressTitle}>⚓ Your Journey Progress</Text>
          {avatar && (
            <Text style={[styles.avatarLabel, { color: avatar.primaryColor }]}>
              {avatar.name}
            </Text>
          )}
        </View>
        <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { width: widthInterpolated, backgroundColor: avatar?.primaryColor || '#8B4513' }
          ]} 
        />
      </View>
      <Text style={styles.progressSubtext}>
        {completedSubstages} of {totalSubstages} milestones completed
      </Text>
    </View>
  );
};

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
  const { width, height } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [animatingPaths, setAnimatingPaths] = useState([]);
  const animationValues = useRef({});
  const [dataEntryModalVisible, setDataEntryModalVisible] = useState(false);
  const [dataEntryValue, setDataEntryValue] = useState('');
  const [dataEntrySubStage, setDataEntrySubStage] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedMilestone, setCompletedMilestone] = useState('');
  const [celebrationCoins, setCelebrationCoins] = useState(100);
  const [uploadingSubstage, setUploadingSubstage] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    if (authToken && !readOnly) {
      fetchUploadedEvidence();
    }
  }, [authToken, readOnly]);

  const fetchUploadedEvidence = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/my-evidence`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const filesMap = {};
        data.evidence.forEach(doc => {
          const substageId = doc.evidence_type;
          if (!filesMap[substageId]) {
            filesMap[substageId] = [];
          }
          filesMap[substageId].push({
            id: doc.id,
            fileName: doc.file_name,
            title: doc.title,
            uploadedAt: doc.uploaded_at,
            mimeType: doc.mime_type
          });
        });
        setUploadedFiles(filesMap);
      }
    } catch (error) {
    }
  };

  // Dynamic styles that depend on window dimensions
  const dynamicStyles = {
    mapContainer: {
      minHeight: height,
    },
    pirateMap: {
      minHeight: height,
      height: height,
    },
    modalContent: {
      maxHeight: height * 0.85,
    },
  };

  const openStageModal = (stage) => {
    setSelectedStage(stage);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedStage(null), 300);
  };

  const handleFileUpload = (subStageId) => {
    setUploadingSubstage(subStageId);
  };

  const handleUploadModalTakePhoto = async (subStage) => {
    await pickImageFromCamera(selectedStage?.id, subStage.id, subStage.name);
  };

  const handleUploadModalChooseFile = async (subStage) => {
    await pickDocumentFromDevice(selectedStage?.id, subStage.id, subStage.name);
  };

  const handlePlayAudio = (subStage) => {
    if (subStage.audioFile) {
      alert('🎧 Playing Audio', `Audio description for "${subStage.name}" would play here.`);
    } else {
      alert('🎧 Audio Description', `Audio description for "${subStage.name}" is coming soon!\n\nThis feature will help you understand each step with detailed audio explanations.`);
    }
  };

  const pickImageFromGallery = async (stageId, subStageId, substageName) => {
    try {
      if (Platform.OS === 'web') {
        pickFileFromWeb(stageId, subStageId, substageName, 'image/*');
        return;
      }
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission Required', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadEvidenceFile(asset, stageId, subStageId, substageName);
      }
    } catch (error) {
      alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const pickFileFromWeb = (stageId, subStageId, substageName, acceptTypes) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptTypes;
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const webFile = {
          uri: URL.createObjectURL(file),
          name: file.name,
          fileName: file.name,
          type: file.type,
          mimeType: file.type,
          file: file,
        };
        await uploadEvidenceFile(webFile, stageId, subStageId, substageName);
      }
    };
    input.click();
  };

  const pickImageFromCamera = async (stageId, subStageId, substageName) => {
    try {
      if (Platform.OS === 'web') {
        alert('Camera Not Available', 'Camera is not available on web. Please use the gallery or document picker.');
        return;
      }

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission Required', 'Please grant camera permission to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadEvidenceFile(asset, stageId, subStageId, substageName);
      }
    } catch (error) {
      alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickDocumentFromDevice = async (stageId, subStageId, substageName) => {
    try {
      if (Platform.OS === 'web') {
        pickFileFromWeb(stageId, subStageId, substageName, '.pdf,.doc,.docx,image/*');
        return;
      }
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadEvidenceFile(asset, stageId, subStageId, substageName);
      }
    } catch (error) {
      alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadEvidenceFile = async (file, stageId, subStageId, substageName) => {
    if (!authToken) {
      alert('Error', 'You must be logged in to upload files.');
      return;
    }

    setUploadingSubstage(subStageId);
    setUploadProgress(prev => ({ ...prev, [subStageId]: 0 }));

    try {
      const formData = new FormData();
      
      const fileUri = file.uri;
      const fileName = file.fileName || file.name || `evidence_${Date.now()}.jpg`;
      const fileType = file.mimeType || file.type || 'application/octet-stream';
      
      if (Platform.OS === 'web') {
        if (file.file) {
          formData.append('file', file.file, fileName);
        } else {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          formData.append('file', blob, fileName);
        }
      } else {
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType,
        });
      }
      
      formData.append('title', substageName || 'Evidence Upload');
      formData.append('evidenceType', subStageId);
      formData.append('description', `Uploaded for: ${substageName}`);

      setUploadProgress(prev => ({ ...prev, [subStageId]: 30 }));

      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/uploads/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          // Don't set Content-Type for FormData - browser sets it automatically with boundary
        },
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      setUploadProgress(prev => ({ ...prev, [subStageId]: 80 }));

      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${Array.isArray(errorData.details) ? errorData.details.join(', ') : errorData.details}`
          : (errorData.error || 'Upload failed');
        throw new Error(errorMessage);
      }

      const uploadData = await uploadResponse.json();
      
      setUploadProgress(prev => ({ ...prev, [subStageId]: 100 }));

      setUploadedFiles(prev => ({
        ...prev,
        [subStageId]: [...(prev[subStageId] || []), {
          id: uploadData.id,
          fileName: fileName,
          uploadedAt: new Date().toISOString(),
        }]
      }));

      alert('🏴‍☠️ Upload Successful!', `Your evidence "${fileName}" has been uploaded and will be available to your connected law firm.`);

      if (uploadData.substageCompleted) {
        onCompleteSubStage(stageId, subStageId, uploadData.coinsEarned || 0);
      }

    } catch (error) {
      alert('Upload Failed', error.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploadingSubstage(null);
      setUploadProgress(prev => ({ ...prev, [subStageId]: 0 }));
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
    
    if (!authToken) {
      alert('Error', 'You must be logged in to complete tasks.');
      return;
    }

    // NO VALIDATION - Go directly to backend completion
    await completeSubstageOnBackend(subStageId, subStageCoins);
  };

  const completeSubstageOnBackend = async (subStageId, subStageCoins) => {
    try {
      const currentStage = litigationStages.find(s => s.id === selectedStage.id);
      const subStage = currentStage.subStages.find(s => s.id === subStageId);

      // Check for phase transition BEFORE completing
      const completedSubstageIds = litigationStages.flatMap(stage => 
        stage.subStages.filter(sub => sub.completed).map(sub => sub.id)
      );
      const phaseTransition = checkPhaseTransition(subStageId);

      const requestBody = { 
        stageId: currentStage.id,
        stageName: currentStage.name,
        substageId: subStageId,
        substageName: subStage.name,
        substageType: subStage.isDataEntry ? 'data_entry' : 'upload',
        coinsEarned: subStageCoins
      };


      const response = await fetch(`${API_BASE_URL}/api/litigation/substage/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        
        // Update local state with ACTUAL coins earned (may be 0 if already earned before)
        const actualCoinsEarned = data.coinsEarned || 0;
        onCompleteSubStage(selectedStage.id, subStageId, actualCoinsEarned);
        
        // Trigger celebration animation for new completions
        if (!data.coinsAlreadyEarnedBefore && actualCoinsEarned > 0) {
          setCompletedMilestone(subStage.name);
          setCelebrationCoins(actualCoinsEarned);
          setShowCelebration(true);
          
          // If phase transition, show additional alert after celebration
          if (phaseTransition) {
            setTimeout(() => {
              const celebrationMessage = getPhaseCelebrationMessage(phaseTransition);
              alert('🎉 Major Milestone!', celebrationMessage);
            }, 2800);
          }
        } else {
          // Silently handle already-completed tasks - no need to alert for re-completions
          // The UI update (checkmark appearing) is feedback enough
        }
      } else {
        // Handle duplicate completion gracefully
        if (data.error && data.error.includes('already completed')) {
          // Silently update UI to reflect that it's already completed - no annoying alerts!
          onCompleteSubStage(selectedStage.id, subStageId, 0); // 0 coins since already awarded
          // The checkmark will appear, button will disappear - clean UX
        } else {
          alert('Error', data.error || 'Failed to complete task.');
        }
      }
    } catch (error) {
      alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  const completeEntireStage = () => {
    const currentStage = litigationStages.find(s => s.id === selectedStage.id);
    
    if (!currentStage.subStages || currentStage.subStages.length === 0) {
      onCompleteStage(currentStage.id, currentStage.coins);
      
      // Trigger celebration for stage completion
      if (currentStage.coins > 0) {
        setCompletedMilestone(`${currentStage.name} Complete! 🏆`);
        setCelebrationCoins(currentStage.coins);
        setShowCelebration(true);
      }
      
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
              
              // Trigger celebration for stage completion
              if (totalCoins > 0) {
                setCompletedMilestone(`${currentStage.name} Complete! 🏆`);
                setCelebrationCoins(totalCoins);
                setShowCelebration(true);
              }
              
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
        message: `Mark "${currentStage.name}" as incomplete?\n\n💰 Note: Previously earned coins (${totalCoins} total) are preserved and cannot be earned again when you re-complete this stage.\n\nThis prevents coin farming while allowing you to update your progress.`,
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
        `Mark "${currentStage.name}" as incomplete?\n\n💰 Note: Previously earned coins (${totalCoins} total) are preserved and cannot be earned again when you re-complete this stage.\n\nThis prevents coin farming while allowing you to update your progress.`,
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
    // Add paths only for fully completed stages
    litigationStages.forEach((stage, index) => {
      // Show path only if ALL substages are completed (stage.completed should be true when all substages are done)
      const isFullyComplete = stage.completed;
      
      if (isFullyComplete && index < litigationStages.length - 1) {
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

    // Remove paths for stages that are not fully completed
    setAnimatingPaths(prev => {
      return prev.filter(path => {
        // Find the stage that this path originates from
        const fromStage = litigationStages.find(s => s.id === path.from.id);
        // Keep the path only if the stage is fully completed
        const isFullyComplete = fromStage && fromStage.completed;
        return isFullyComplete;
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
          
          // Gentler wave amplitude for subtle curves
          const waveAmplitude = Math.min(distance * 0.25, 60);
          
          // Create a subtle S-curve with multiple control points
          // Point 1: First curve bends one way (gentle)
          const cp1x = x1 + dx * 0.25 + perpX * waveAmplitude * 0.5;
          const cp1y = y1 + dy * 0.25 + perpY * waveAmplitude * 0.5;
          
          // Midpoint for the S-curve
          const midX = x1 + dx * 0.5;
          const midY = y1 + dy * 0.5;
          
          // Point 2: Curve back the other way (gentle)
          const cp2x = x1 + dx * 0.45 - perpX * waveAmplitude * 0.4;
          const cp2y = y1 + dy * 0.45 - perpY * waveAmplitude * 0.4;
          
          // Point 3: Continue the wave (gentle finish)
          const cp3x = x1 + dx * 0.75 + perpX * waveAmplitude * 0.3;
          const cp3y = y1 + dy * 0.75 + perpY * waveAmplitude * 0.3;

          // Create gentle winding path with subtle cubic Bezier curves
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
          {isCurrent && selectedAvatar && !stage.completed && !readOnly ? (
            <Text style={styles.avatarIcon}>{selectedAvatar.emoji}</Text>
          ) : stage.completed ? (
            <Text style={styles.treasureIcon}>🏆</Text>
          ) : (
            <Image 
              source={require('../../attached_assets/X marks the Spot_1762186694664.png')}
              style={styles.xMarksSpotImage}
              resizeMode="contain"
            />
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
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
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
                        <TouchableOpacity
                          style={styles.audioButton}
                          onPress={() => handlePlayAudio(subStage)}
                        >
                          <Image 
                            source={require('../../attached_assets/Speaker_1762189140530.png')}
                            style={styles.audioIcon}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
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
                          {readOnly ? (
                            <View style={styles.readOnlyUploadBanner}>
                              <Text style={styles.readOnlyUploadText}>📁 Upload section (view only)</Text>
                            </View>
                          ) : (
                            <>
                              <Text style={styles.uploadLabel}>📤 Upload Evidence</Text>
                              <View style={styles.uploadButtonsRow}>
                                {Platform.OS !== 'web' && (
                                  <TouchableOpacity 
                                    style={[styles.uploadButton, uploadingSubstage === subStage.id && styles.uploadButtonDisabled]}
                                    onPress={() => pickImageFromCamera(selectedStage?.id, subStage.id, subStage.name)}
                                    disabled={uploadingSubstage === subStage.id}
                                  >
                                    <Text style={styles.uploadButtonIcon}>📷</Text>
                                    <Text style={styles.uploadButtonText}>Camera</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                  style={[styles.uploadButton, uploadingSubstage === subStage.id && styles.uploadButtonDisabled]}
                                  onPress={() => pickImageFromGallery(selectedStage?.id, subStage.id, subStage.name)}
                                  disabled={uploadingSubstage === subStage.id}
                                >
                                  <Text style={styles.uploadButtonIcon}>🖼️</Text>
                                  <Text style={styles.uploadButtonText}>Gallery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={[styles.uploadButton, uploadingSubstage === subStage.id && styles.uploadButtonDisabled]}
                                  onPress={() => pickDocumentFromDevice(selectedStage?.id, subStage.id, subStage.name)}
                                  disabled={uploadingSubstage === subStage.id}
                                >
                                  <Text style={styles.uploadButtonIcon}>📄</Text>
                                  <Text style={styles.uploadButtonText}>Document</Text>
                                </TouchableOpacity>
                              </View>
                              {uploadingSubstage === subStage.id && (
                                <View style={styles.uploadProgressContainer}>
                                  <ActivityIndicator size="small" color="#8B4513" />
                                  <Text style={styles.uploadProgressText}>Uploading...</Text>
                                </View>
                              )}
                              {uploadedFiles[subStage.id] && uploadedFiles[subStage.id].length > 0 && (
                                <View style={styles.uploadedFilesList}>
                                  <Text style={styles.uploadedFilesLabel}>✅ Uploaded Files:</Text>
                                  {uploadedFiles[subStage.id].map((file, index) => (
                                    <Text key={index} style={styles.uploadedFileName}>• {file.fileName}</Text>
                                  ))}
                                </View>
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
                        ) : readOnly ? (
                          <View style={styles.incompleteBadge}>
                            <Text style={styles.incompleteBadgeText}>Not Completed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.miniCompleteButton}
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

              {!currentStage.completed && !readOnly && (
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
    <View style={commonStyles.containerWithNav}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Litigation Map</Text>
        {selectedAvatar && !readOnly && (
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={() => onSelectAvatar(null)}
          >
            <Text style={styles.heroEmoji}>{selectedAvatar.emoji}</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedAvatar && (() => {
        const completedSubstageIds = litigationStages.flatMap(stage => 
          stage.subStages.filter(sub => sub.completed).map(sub => sub.id)
        );
        const currentPhase = getCurrentPhase(completedSubstageIds);
        const phaseProgress = getPhaseProgress(completedSubstageIds);
        
        return (
          <View style={[styles.phaseIndicator, { backgroundColor: currentPhase.color }]}>
            <Text style={styles.phaseIndicatorText}>
              {formatPhaseDisplay(currentPhase)} • {phaseProgress.completedStages}/{phaseProgress.totalStages} stages completed
            </Text>
          </View>
        );
      })()}

      {!readOnly && (() => {
        const totalSubstages = litigationStages.reduce((sum, stage) => sum + stage.subStages.length, 0);
        const completedSubstages = litigationStages.reduce((sum, stage) => 
          sum + stage.subStages.filter(s => s.completed).length, 0
        );
        const progressPercentage = totalSubstages > 0 ? Math.round((completedSubstages / totalSubstages) * 100) : 0;

        return <ProgressBar progressPercentage={progressPercentage} completedSubstages={completedSubstages} totalSubstages={totalSubstages} avatarType={user?.avatarType} />;
      })()}

      <ScrollView 
        style={styles.mapScrollView}
        contentContainerStyle={[styles.mapContainer, dynamicStyles.mapContainer]}
      >
        <ImageBackground 
            source={require('../../attached_assets/MAP_1763356928680.png')}
            style={[styles.pirateMap, dynamicStyles.pirateMap]}
            resizeMode="stretch"
            imageStyle={styles.treasureMapImage}
          >
            <View style={styles.mapOverlay}>
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
                <View style={styles.legendItemWithIcon}>
                  <Image 
                    source={require('../../attached_assets/X marks the Spot_1762186694664.png')}
                    style={styles.legendIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.legendItemText}> = Treasure to Claim</Text>
                </View>
                <Text style={styles.legendItem}>🏆 = Treasure Found!</Text>
              </View>
            </View>
          </ImageBackground>
        </ScrollView>

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

      <CelebrationAnimation 
        visible={showCelebration}
        milestone={completedMilestone}
        coinsEarned={celebrationCoins}
        onComplete={() => setShowCelebration(false)}
      />
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
  phaseIndicator: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    backgroundColor: '#f9f6f0',
    padding: 20,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#d4a574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarThumbnail: {
    width: '100%',
    height: '100%',
  },
  progressTitleContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 2,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4a574',
  },
  progressBarBackground: {
    height: 20,
    backgroundColor: '#e0d9cc',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8b4513',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d4a574',
    borderRadius: 10,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
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
  },
  pirateMap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#c9a86a',
  },
  treasureMapImage: {
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
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
  xMarksSpotImage: {
    width: 40,
    height: 40,
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
  legendItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  legendIcon: {
    width: 14,
    height: 14,
  },
  legendItemText: {
    fontSize: 10,
    color: '#654321',
    marginLeft: 4,
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
  audioButton: {
    width: 46,
    height: 46,
    backgroundColor: '#3498db',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 2,
    borderColor: '#2980b9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  audioIcon: {
    width: 32,
    height: 32,
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
    flexDirection: 'column',
    marginBottom: 10,
    gap: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  uploadProgressText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
  },
  uploadedFilesList: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  uploadedFilesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 5,
  },
  uploadedFileName: {
    fontSize: 12,
    color: '#333',
    marginLeft: 5,
  },
  readOnlyUploadBanner: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  readOnlyUploadText: {
    color: '#666',
    fontSize: 13,
  },
  comingSoonBanner: {
    backgroundColor: '#fff3cd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    alignItems: 'center',
    flex: 1,
  },
  comingSoonText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadIcon: {
    fontSize: 16,
    marginRight: 6,
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
    backgroundColor: '#e74c3c',
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
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
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
  incompleteBadge: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  incompleteBadgeText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RoadmapScreen;
