import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { USER_TYPES } from '../constants/mockData';

const RegisterScreen = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  confirmPassword, 
  setConfirmPassword,
  userType,
  setUserType,
  firmCode,
  setFirmCode,
  onRegister, 
  onNavigate 
}) => {
  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Create Your Account</Text>
        
        <Text style={styles.label}>I am a:</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.INDIVIDUAL && styles.toggleButtonActive]}
            onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.INDIVIDUAL && styles.toggleTextActive]}>
              Individual
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.LAW_FIRM && styles.toggleButtonActive]}
            onPress={() => setUserType(USER_TYPES.LAW_FIRM)}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.LAW_FIRM && styles.toggleTextActive]}>
              Law Firm
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.MEDICAL_PROVIDER && styles.toggleButtonActive]}
            onPress={() => setUserType(USER_TYPES.MEDICAL_PROVIDER)}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.MEDICAL_PROVIDER && styles.toggleTextActive]}>
              Medical Provider
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={commonStyles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {userType === USER_TYPES.INDIVIDUAL && (
          <TextInput
            style={commonStyles.input}
            placeholder="Law Firm or Provider Code (Optional)"
            value={firmCode}
            onChangeText={setFirmCode}
          />
        )}

        <TouchableOpacity style={commonStyles.primaryButton} onPress={onRegister}>
          <Text style={commonStyles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('login')}>
          <Text style={commonStyles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By creating an account, you agree to our Terms of Service and Privacy Policy. 
          This app provides educational information, not legal advice.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#bdc3c7',
    backgroundColor: '#fff',
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#3498db',
  },
  toggleText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  disclaimer: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});

export default RegisterScreen;
