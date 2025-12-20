import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../styles/theme';

const LawFirmCalendarSelectionScreen = ({ user, onNavigate, onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendars</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose which calendar to view</Text>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => onNavigate('lawfirm-client-appointments')}
        >
          <View style={styles.optionIconContainer}>
            <Text style={styles.optionIcon}>👥</Text>
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Client Calendars</Text>
            <Text style={styles.optionDescription}>
              View appointments for each client, including medical provider appointments and case-related events
            </Text>
          </View>
          <Text style={styles.optionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => onNavigate('lawfirm-calendar')}
        >
          <View style={styles.optionIconContainer}>
            <Text style={styles.optionIcon}>🏢</Text>
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Law Firm Calendar</Text>
            <Text style={styles.optionDescription}>
              Manage firm-wide availability, schedule appointments, block times, and coordinate team events
            </Text>
          </View>
          <Text style={styles.optionArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  header: {
    backgroundColor: theme.lawFirm.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.primaryDark,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 16,
    color: theme.lawFirm.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.lawFirm.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    lineHeight: 20,
  },
  optionArrow: {
    fontSize: 24,
    color: theme.lawFirm.primary,
    marginLeft: 12,
  },
});

export default LawFirmCalendarSelectionScreen;
