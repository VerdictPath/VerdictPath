import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

const LawFirmDashboardScreen = ({ user, onNavigateToClient, onLogout }) => {
  const [clients, setClients] = useState([]);
  const [firmData, setFirmData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/lawfirm/dashboard`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFirmData(data);
        setClients(data.clients);
      }
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
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.firmName}>{firmData?.firmName || 'Law Firm Portal'}</Text>
        <Text style={styles.firmCode}>Firm Code: {firmData?.firmCode}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{clients.length}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Clients</Text>
        
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No clients registered yet.</Text>
            <Text style={styles.emptySubtext}>
              Clients can register using your firm code: {firmData?.firmCode}
            </Text>
          </View>
        ) : (
          clients.map(client => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              onPress={() => onNavigateToClient(client.id)}
            >
              <Text style={styles.clientName}>{client.displayName}</Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
              <Text style={styles.clientDate}>
                Registered: {new Date(client.registeredDate).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sand,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
    marginBottom: 20,
  },
  firmName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  firmCode: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  section: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  clientCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  clientDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.warmGray,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: theme.colors.secondary,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  logoutText: {
    color: theme.colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LawFirmDashboardScreen;
