import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const LoginScreen = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  onLogin, 
  onNavigate 
}) => {
  return (
    <View style={commonStyles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Welcome Back</Text>
        
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
});

export default LoginScreen;
