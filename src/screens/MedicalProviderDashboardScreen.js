import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

const MedicalProviderDashboardScreen = ({ user, onNavigateToPatient, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [providerData, setProviderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Connect to backend API
      // For now, show empty state
      setProviderData({
        providerName: user.providerName || 'Medical Provider',
        providerCode: user.providerCode
      });
      setPatients([]);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.providerName}>{providerData?.providerName || 'Medical Provider Portal'}</Text>
        <Text style={styles.providerCode}>Provider Code: {providerData?.providerCode}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Patients</Text>
        
        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No patients registered yet.</Text>
            <Text style={styles.emptySubtext}>
              Patients can register using your provider code: {providerData?.providerCode}
            </Text>
          </View>
        ) : (
          patients.map(patient => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => onNavigateToPatient(patient.id)}
            >
              <Text style={styles.patientName}>{patient.displayName}</Text>
              <Text style={styles.patientEmail}>{patient.email}</Text>
              <View style={styles.patientStats}>
                <Text style={styles.patientStat}>Records: {patient.recordCount || 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sand
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.warmGray
  },
  header: {
    padding: 24,
    backgroundColor: theme.colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.warmGold
  },
  providerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.navy,
    marginBottom: 8
  },
  providerCode: {
    fontSize: 14,
    color: theme.colors.warmGray,
    fontFamily: 'monospace'
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.warmGray,
    textAlign: 'center'
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.navy,
    marginBottom: 16
  },
  emptyState: {
    backgroundColor: theme.colors.cream,
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.navy,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.warmGray,
    textAlign: 'center'
  },
  patientCard: {
    backgroundColor: theme.colors.cream,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
    marginBottom: 12
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.navy,
    marginBottom: 4
  },
  patientEmail: {
    fontSize: 14,
    color: theme.colors.warmGray,
    marginBottom: 8
  },
  patientStats: {
    flexDirection: 'row',
    gap: 16
  },
  patientStat: {
    fontSize: 13,
    color: theme.colors.warmGray
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.mahogany,
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default MedicalProviderDashboardScreen;
