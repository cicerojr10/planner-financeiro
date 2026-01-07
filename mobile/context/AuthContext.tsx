import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// 1. Adicionamos ID na tipagem do User
interface User {
  id: number;
  email: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  API_URL: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ⚠️ Mantenha seu link do Render aqui
const API_URL = 'https://meu-financeiro-8985.onrender.com';

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = await SecureStore.getItemAsync('user_token');
      const storedEmail = await SecureStore.getItemAsync('user_email');
      const storedId = await SecureStore.getItemAsync('user_id'); // <--- Ler ID

      if (storedToken && storedEmail && storedId) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        setUser({ email: storedEmail, id: Number(storedId) }); // <--- Salvar no Estado
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

      // Agora a resposta traz o ID!
      const { access_token, id } = response.data;

      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await SecureStore.setItemAsync('user_token', access_token);
      await SecureStore.setItemAsync('user_email', email);
      await SecureStore.setItemAsync('user_id', String(id)); // <--- Guardar ID no Cofre
      
      setUser({ email, id });
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
    await SecureStore.deleteItemAsync('user_id');
    delete axios.defaults.headers.common['Authorization'];
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, login, logout, loading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};