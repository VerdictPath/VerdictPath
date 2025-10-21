import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  primaryButton: {
    backgroundColor: '#3498db',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    fontSize: 16,
  },
  linkText: {
    color: '#3498db',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    fontSize: 18,
    color: '#3498db',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});
