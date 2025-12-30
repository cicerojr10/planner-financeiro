import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// 1. Definimos o "formato" do nosso Usuário
interface User {
  email: string;
}

// 2. Definimos o que existe dentro do Contexto
interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  API_URL: string;
}

// 3. Tipamos as propriedades do Provider (recebe children)
interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = 'https://meu-financeiro-8985.onrender.com';

// Iniciamos o contexto informando o tipo "AuthContextData"
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // 4. Avisamos que pode ser User OU null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = await SecureStore.getItemAsync('user_token');
      const storedEmail = await SecureStore.getItemAsync('user_email');

      if (storedToken && storedEmail) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        setUser({ email: storedEmail });
      }
      setLoading(false);
    }
    loadStorageData();
  }, []);

  async function login(email: string, password: string) {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${API_URL}/token`, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;

      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await SecureStore.setItemAsync('user_token', access_token);
      await SecureStore.setItemAsync('user_email', email);
      
      setUser({ email });
      return true;
    } catch (error) {
      console.log("Erro Login Mobile:", error);
      return false;
    }
  }

  async function logout() {
    setUser(null);
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_email');
    delete axios.defaults.headers.common['Authorization'];
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, login, logout, loading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};