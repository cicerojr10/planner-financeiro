import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login } = useContext(AuthContext) as any;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;

    setLoadingAuth(true);
    const success = await login(email, password);
    setLoadingAuth(false);

    if (!success) {
      Alert.alert("Erro", "Email ou senha inválidos.");
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Ionicons name="wallet" size={60} color="#10b981" />
        <Text style={styles.title}>Meu Financeiro</Text>
        <Text style={styles.subtitle}>Controle total no seu bolso</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput 
          style={styles.input}
          placeholder="exemplo@email.com"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput 
          style={styles.input}
          placeholder="******"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loadingAuth}
        >
          {loadingAuth ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f1f5f9', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 5 },
  form: { width: '100%' },
  label: { color: '#cbd5e1', marginBottom: 8, fontWeight: '600' },
  input: { 
    backgroundColor: '#1e293b', 
    color: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  button: { 
    backgroundColor: '#10b981', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 10 
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});