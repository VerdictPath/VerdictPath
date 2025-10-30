import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerWithNav: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 80,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    marginBottom: 15,
    fontSize: 16,
  },
  linkText: {
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  backButton: {
    fontSize: 18,
    color: theme.colors.primary,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
