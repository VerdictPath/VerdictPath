import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { USER_TYPES } from '../constants/mockData';

const LoginScreen = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  onLogin, 
  onNavigate,
  userType,
  setUserType
}) => {
  return (
    <View style={commonStyles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Welcome Back</Text>
        
        <Text style={styles.sectionLabel}>I am a:</Text>
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === USER_TYPES.INDIVIDUAL && styles.userTypeButtonActive
            ]}
            onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
          >
            <Text style={[
              styles.userTypeText,
              userType === USER_TYPES.INDIVIDUAL && styles.userTypeTextActive
            ]}>Individual</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === USER_TYPES.LAW_FIRM && styles.userTypeButtonActive
            ]}
            onPress={() => setUserType(USER_TYPES.LAW_FIRM)}
          >
            <Text style={[
              styles.userTypeText,
              userType === USER_TYPES.LAW_FIRM && styles.userTypeTextActive
            ]}>Law Firm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === USER_TYPES.MEDICAL_PROVIDER && styles.userTypeButtonActive
            ]}
            onPress={() => setUserType(USER_TYPES.MEDICAL_PROVIDER)}
          >
            <Text style={[
              styles.userTypeText,
              userType === USER_TYPES.MEDICAL_PROVIDER && styles.userTypeTextActive
            ]}>Medical Provider</Text>
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

        <TouchableOpacity style={commonStyles.primaryButton} onPress={onLogin}>
          <Text style={commonStyles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('register')}>
          <Text style={commonStyles.linkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 10,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d4a574',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#d4a574',
    borderColor: '#b8935f',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  userTypeTextActive: {
    color: '#fff',
  },
});

export default LoginScreen;
