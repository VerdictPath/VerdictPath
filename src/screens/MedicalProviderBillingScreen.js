import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { medicalProviderTheme as theme } from '../styles/medicalProviderTheme';
import ReceivedDisbursementsScreen from './ReceivedDisbursementsScreen';
import NegotiationsScreen from './NegotiationsScreen';

const MedicalProviderBillingScreen = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('negotiations');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💰 Billing</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'negotiations' && styles.activeTab]}
            onPress={() => setActiveTab('negotiations')}
          >
            <Text style={[styles.tabText, activeTab === 'negotiations' && styles.activeTabText]}>
              🤝 Negotiations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'disbursements' && styles.activeTab]}
            onPress={() => setActiveTab('disbursements')}
          >
            <Text style={[styles.tabText, activeTab === 'disbursements' && styles.activeTabText]}>
              💰 Disbursements
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'negotiations' ? (
            <NegotiationsScreen 
              user={{...user, userType: 'medical_provider'}} 
              onBack={onBack} 
              hideHeader={true}
              bottomPadding={100}
            />
          ) : (
            <ReceivedDisbursementsScreen 
              user={user} 
              userType="medical_provider" 
              onBack={onBack}
              hideHeader={true}
              bottomPadding={100}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.offWhite,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.deepTeal,
    ...theme.shadows.header,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.clinicalWhite,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.clinicalWhite,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.clinicalTeal,
    backgroundColor: theme.colors.offWhite,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.darkGray,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.deepTeal,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 80 : 70,
  },
});

export default MedicalProviderBillingScreen;
