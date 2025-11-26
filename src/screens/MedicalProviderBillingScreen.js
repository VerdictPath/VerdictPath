import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { theme } from '../styles/theme';
import ReceivedDisbursementsScreen from './ReceivedDisbursementsScreen';
import NegotiationsScreen from './NegotiationsScreen';

const MedicalProviderBillingScreen = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('negotiations');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Billing & Negotiations</Text>
          <View style={styles.placeholder} />
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
            <NegotiationsScreen user={user} onBack={onBack} hideHeader={true} />
          ) : (
            <ReceivedDisbursementsScreen 
              user={user} 
              userType="medical_provider" 
              onBack={onBack}
              hideHeader={true}
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
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#0d4d4d',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  placeholder: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f1e7',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#d4af37',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    color: '#8B6F47',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0d4d4d',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});

export default MedicalProviderBillingScreen;
