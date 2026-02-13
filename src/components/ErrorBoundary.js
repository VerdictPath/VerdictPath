import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
          </Text>
          {this.state.error && (
            <Text style={styles.errorDetail}>
              {String(this.state.error.message || this.state.error).substring(0, 300)}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          {this.props.onBack && (
            <TouchableOpacity style={styles.backButton} onPress={this.props.onBack}>
              <Text style={styles.backText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: '#0d2f54',
    fontWeight: '700',
    fontSize: 16,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backText: {
    color: '#FFD700',
    fontSize: 14,
  },
  errorDetail: {
    fontSize: 11,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    maxWidth: '90%',
  },
});

export default ErrorBoundary;
