import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

const LawFirmClientDetailsScreen = ({ user, clientId, onBack }) => {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:5000'}/api/lawfirm/client/${clientId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setClientData(data);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  if (!clientData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load client data</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { client, medicalRecords, medicalBilling, evidenceDocuments, litigationStage } = clientData;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={onBack}>
        <Text style={styles.backLinkText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.clientName}>{client.displayName}</Text>
        <Text style={styles.clientEmail}>{client.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medicalRecords.total}</Text>
          <Text style={styles.statLabel}>Medical Records</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medicalBilling.total}</Text>
          <Text style={styles.statLabel}>Medical Bills</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${medicalBilling.totalAmountBilled?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Total Billed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{evidenceDocuments.total}</Text>
          <Text style={styles.statLabel}>Evidence Docs</Text>
        </View>
      </View>

      {/* Litigation Stage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Litigation Stage</Text>
        {litigationStage ? (
          <View>
            <View style={styles.litigationStatus}>
              <Text style={styles.litigationStageText}>
                {litigationStage.current_stage?.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            {litigationStage.case_number && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Case Number:</Text> {litigationStage.case_number}
              </Text>
            )}
            {litigationStage.case_value && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Case Value:</Text> ${parseFloat(litigationStage.case_value).toFixed(2)}
              </Text>
            )}
            {litigationStage.next_step_description && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Next Step:</Text> {litigationStage.next_step_description}
              </Text>
            )}
            {litigationStage.notes && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Notes:</Text> {litigationStage.notes}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>No litigation stage information available</Text>
        )}
      </View>

      {/* Medical Records */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Records ({medicalRecords.total})</Text>
        {medicalRecords.records.length === 0 ? (
          <Text style={styles.emptyText}>No medical records uploaded yet</Text>
        ) : (
          medicalRecords.records.map((record) => (
            <View key={record.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>
                {record.record_type?.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.documentMeta}>
                {record.facility_name && `Facility: ${record.facility_name} | `}
                {record.date_of_service && `Date: ${new Date(record.date_of_service).toLocaleDateString()} | `}
                Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
              </Text>
              {record.description && (
                <Text style={styles.documentDescription}>{record.description}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Medical Billing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Billing ({medicalBilling.total})</Text>
        <Text style={styles.billingSummary}>
          Total Billed: ${medicalBilling.totalAmountBilled?.toFixed(2) || '0.00'} | 
          Total Due: ${medicalBilling.totalAmountDue?.toFixed(2) || '0.00'}
        </Text>
        {medicalBilling.bills.length === 0 ? (
          <Text style={styles.emptyText}>No medical bills uploaded yet</Text>
        ) : (
          medicalBilling.bills.map((bill) => (
            <View key={bill.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>
                {bill.billing_type?.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.documentMeta}>
                {bill.facility_name && `Facility: ${bill.facility_name} | `}
                {bill.bill_number && `Bill #: ${bill.bill_number} | `}
                Amount: ${parseFloat(bill.total_amount).toFixed(2)}
                {bill.bill_date && ` | Date: ${new Date(bill.bill_date).toLocaleDateString()}`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Evidence Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidence Documents ({evidenceDocuments.total})</Text>
        {evidenceDocuments.documents.length === 0 ? (
          <Text style={styles.emptyText}>No evidence documents uploaded yet</Text>
        ) : (
          evidenceDocuments.documents.map((doc) => (
            <View key={doc.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>{doc.title}</Text>
              <Text style={styles.documentMeta}>
                Type: {doc.evidence_type?.replace(/_/g, ' ').toUpperCase()}
                {doc.date_of_incident && ` | Incident: ${new Date(doc.date_of_incident).toLocaleDateString()}`}
                | Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
              </Text>
              {doc.description && (
                <Text style={styles.documentDescription}>{doc.description}</Text>
              )}
            </View>
          ))
        )}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.deepMaroon,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    padding: 15,
    marginLeft: 5,
  },
  backLinkText: {
    color: theme.colors.mahogany,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
    marginBottom: 20,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: theme.colors.cream,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    width: '48%',
    margin: '1%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  litigationStatus: {
    backgroundColor: theme.colors.secondary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  litigationStageText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  billingSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 15,
  },
  documentItem: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 5,
  },
  documentMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  documentDescription: {
    fontSize: 14,
    color: theme.colors.navy,
    marginTop: 5,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});

export default LawFirmClientDetailsScreen;
