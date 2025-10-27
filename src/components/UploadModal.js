import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';

const UploadModal = ({ visible, onClose, onTakePhoto, onChooseFile, subStage }) => {
  return (
    <Modal
      visible={visible && subStage !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerIcon}>📤</Text>
              <Text style={styles.headerTitle}>Upload Documents</Text>
              <Text style={styles.headerSubtitle}>{subStage?.name || 'Document Upload'}</Text>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                Choose how you'd like to add your documents:
              </Text>
            </View>

            {/* Upload Options */}
            <View style={styles.optionsContainer}>
              {/* Take Photo Option */}
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => onTakePhoto(subStage)}
              >
                <View style={styles.optionIconContainer}>
                  <Text style={styles.optionIcon}>📷</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionDescription}>
                    Use your camera to capture documents
                  </Text>
                </View>
                <Text style={styles.optionArrow}>›</Text>
              </TouchableOpacity>

              {/* Choose Files Option */}
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => onChooseFile(subStage)}
              >
                <View style={styles.optionIconContainer}>
                  <Text style={styles.optionIcon}>📁</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Choose Files</Text>
                  <Text style={styles.optionDescription}>
                    Select from your device's storage
                  </Text>
                </View>
                <Text style={styles.optionArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* File Format Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoTitle}>Accepted File Types</Text>
              </View>
              <Text style={styles.infoText}>
                {subStage?.acceptedFormats || 'PDF, JPG, PNG, DOC, DOCX'}
              </Text>
              <Text style={styles.infoHint}>
                You can upload multiple files at once
              </Text>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: theme.colors.cream,
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 3,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 10000,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.colors.navy,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: theme.colors.cream,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  optionArrow: {
    fontSize: 32,
    color: theme.colors.warmGray,
    fontWeight: '300',
  },
  infoContainer: {
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 8,
    lineHeight: 20,
  },
  infoHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  cancelButton: {
    backgroundColor: theme.colors.warmGray,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.cream,
  },
});

export default UploadModal;
