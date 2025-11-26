import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, useWindowDimensions } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import alert from '../utils/alert';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads, authToken }) => {
  const { width, height } = useWindowDimensions();
  
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const handleAddProvider = () => {
    alert(
      '🏴‍☠️ Aye, Not Quite Ready!',
      'Arrr! Our navigators be still plottin\' the course to add medical providers to yer crew! This feature be comin\' soon, so hold fast and keep yer compass handy! ⚓'
    );
  };

  const getContentWidth = () => {
    if (isDesktop) return Math.min(width * 0.6, 800);
    if (isTablet) return width * 0.85;
    return width;
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../attached_assets/Medical Ward_1764038075699.png')}
        style={[styles.backgroundImage, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { alignItems: isDesktop || isTablet ? 'center' : 'stretch' }
            ]}
          >
            <View style={[
              styles.contentWrapper,
              { width: getContentWidth() }
            ]}>
              <View style={[
                styles.header,
                { paddingTop: isDesktop ? 30 : 50 }
              ]}>
                <TouchableOpacity onPress={() => onNavigate('dashboard')}>
                  <Text style={[
                    styles.backButton,
                    { fontSize: isDesktop ? 20 : 18 }
                  ]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[
                  styles.headerTitle,
                  { fontSize: isDesktop ? 28 : isTablet ? 24 : 20 }
                ]}>Medical Documentation Hub</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={[
                styles.secureNotice,
                { padding: isDesktop ? 18 : 15 }
              ]}>
                <Text style={[styles.secureIcon, { fontSize: isDesktop ? 28 : 24 }]}>🔒</Text>
                <Text style={[
                  styles.secureText,
                  { fontSize: isDesktop ? 18 : 16 }
                ]}>HIPAA-Compliant Secure Storage</Text>
              </View>

              <View style={[
                styles.medicalContainer,
                { padding: isDesktop ? 30 : 20 }
              ]}>
                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>💵 Medical Bills</Text>
                    <Text style={[
                      styles.comingSoonBadge,
                      { fontSize: isDesktop ? 13 : 11 }
                    ]}>🏴‍☠️ Coming Soon</Text>
                  </View>
                  <View style={styles.comingSoonMessage}>
                    <Text style={[
                      styles.comingSoonText,
                      { fontSize: isDesktop ? 16 : 14 }
                    ]}>
                      Blimey! This treasure chest be still under construction. Medical Bills upload will be ready soon! ⚓
                    </Text>
                  </View>
                </View>

                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>📋 Medical Records</Text>
                    <Text style={[
                      styles.comingSoonBadge,
                      { fontSize: isDesktop ? 13 : 11 }
                    ]}>🏴‍☠️ Coming Soon</Text>
                  </View>
                  <View style={styles.comingSoonMessage}>
                    <Text style={[
                      styles.comingSoonText,
                      { fontSize: isDesktop ? 16 : 14 }
                    ]}>
                      Arrr! The Medical Records vault be locked tighter than Davy Jones' locker! Upload feature coming soon, savvy? ⚓
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.addProviderButton,
                    { 
                      paddingVertical: isDesktop ? 18 : 15,
                      marginBottom: isDesktop ? 35 : 30,
                    }
                  ]}
                  onPress={handleAddProvider}
                >
                  <Text style={[
                    styles.buttonText,
                    { fontSize: isDesktop ? 18 : 16 }
                  ]}>➕ Add Medical Provider</Text>
                </TouchableOpacity>

                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <Text style={[
                    styles.sectionTitle,
                    { fontSize: isDesktop ? 24 : 20 }
                  ]}>📋 HIPAA Forms</Text>
                  <Text style={[
                    styles.sectionDescription,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>
                    Manage consent forms and authorizations for sharing your medical information
                  </Text>
                  <TouchableOpacity 
                    style={[
                      styles.primaryButton,
                      { paddingVertical: isDesktop ? 18 : 15 }
                    ]}
                    onPress={() => onNavigate('hipaaForms')}
                  >
                    <Text style={[
                      styles.buttonText,
                      { fontSize: isDesktop ? 18 : 16 }
                    ]}>📄 View HIPAA Forms</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  secureNotice: {
    backgroundColor: 'rgba(30, 80, 50, 0.85)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.6)',
  },
  secureIcon: {
    marginRight: 10,
  },
  secureText: {
    color: '#90EE90',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  medicalContainer: {
    paddingHorizontal: 20,
  },
  documentSection: {
    marginBottom: 25,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(180, 120, 40, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '700',
    color: '#FFD700',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    overflow: 'hidden',
  },
  comingSoonMessage: {
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  comingSoonText: {
    color: '#E8D5B0',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionDescription: {
    color: '#B8A080',
    marginBottom: 15,
    lineHeight: 22,
  },
  addProviderButton: {
    backgroundColor: 'rgba(80, 70, 60, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(150, 140, 130, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: 'rgba(40, 80, 120, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 180, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default MedicalHubScreen;
