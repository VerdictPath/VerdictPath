import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import { lawFirmTheme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const LawFirmClientDetailsScreen = ({
  user,
  clientId,
  onBack,
  onNavigate,
}) => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientDetails();
  }, [clientId]);

  const loadClientDetails = async () => {
    try {
      const response = await apiRequest(
        `${API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS}/${clientId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user.token}` },
        }
      );

      setClient(response.client);
    } catch (error) {
      console.error('[ClientDetails] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !client) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            lawFirmTheme.colors.deepNavy,
            lawFirmTheme.colors.midnightBlue,
          ]}
          style={styles.background}
        />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={[
          lawFirmTheme.colors.deepNavy,
          lawFirmTheme.colors.midnightBlue,
          lawFirmTheme.colors.professionalBlue,
        ]}
        style={styles.background}
      />

      <BlurView intensity={20} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Details</Text>
          <View style={{ width: 60 }} />
        </View>
      </BlurView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard variant="dark" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <LinearGradient
              colors={[lawFirmTheme.colors.accentBlue, lawFirmTheme.colors.professionalBlue]}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileInitials}>
                {client.firstName?.[0]}{client.lastName?.[0]}
              </Text>
            </LinearGradient>

            <View style={styles.profileInfo}>
              <Text style={styles.clientName}>
                {client.firstName} {client.lastName}
              </Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: lawFirmTheme.colors.success + '30' }
              ]}>
                <Text style={[styles.statusText, { color: lawFirmTheme.colors.success }]}>
                  Active Case
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <StatCard
            label="Stages Complete"
            value={client.completedStages || 0}
            icon="✅"
            color={lawFirmTheme.colors.success}
            size="small"
          />
          <View style={{ width: 12 }} />
          <StatCard
            label="Coins Earned"
            value={client.coins || 0}
            icon="⚓"
            color={lawFirmTheme.colors.gold}
            size="small"
          />
          <View style={{ width: 12 }} />
          <StatCard
            label="Login Streak"
            value={`${client.streak || 0}d`}
            icon="🔥"
            color={lawFirmTheme.colors.warning}
            size="small"
          />
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionButton
            icon="🗺️"
            label="View Roadmap"
            onPress={() => onNavigate('client-roadmap', {
              clientId: client.id,
              clientData: client.progress,
            })}
          />
          <ActionButton
            icon="📨"
            label="Send Message"
            onPress={() => {}}
          />
          <ActionButton
            icon="📄"
            label="Documents"
            onPress={() => {}}
          />
          <ActionButton
            icon="📅"
            label="Calendar"
            onPress={() => {}}
          />
        </View>

        <Text style={styles.sectionTitle}>Case Information</Text>
        <GlassCard variant="medium" style={styles.infoCard}>
          <InfoRow label="Case Type" value="Personal Injury" />
          <InfoRow label="Status" value="Pre-Litigation" />
          <InfoRow label="Date Joined" value="Jan 15, 2025" />
          <InfoRow label="Last Active" value="2 hours ago" />
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const ActionButton = ({ icon, label, onPress }) => (
  <GlassCard
    variant="medium"
    onPress={onPress}
    style={styles.actionButton}
    shadowIntensity="small"
  >
    <Text style={styles.actionButtonIcon}>{icon}</Text>
    <Text style={styles.actionButtonLabel}>{label}</Text>
  </GlassCard>
);

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lawFirmTheme.colors.deepNavy,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    ...lawFirmTheme.typography.h2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    padding: 20,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  clientEmail: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 16,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  sectionTitle: {
    ...lawFirmTheme.typography.h3,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    width: '48%',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCard: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default LawFirmClientDetailsScreen;
