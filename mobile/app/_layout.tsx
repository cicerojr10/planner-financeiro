import { Stack } from "expo-router";
import { AuthProvider, AuthContext } from "../context/AuthContext";
import LoginScreen from "./LoginScreen";
import { useContext } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";

function RootNavigation() {
  // Pega o estado do contexto
  const { signed, loading } = useContext(AuthContext) as any;

  // 1. Se estiver lendo o cofre (carregando), mostra rodinha
  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a'}}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // 2. Se estiver logado, libera o App (Tabs)
  // 3. Se NÃO estiver logado, mostra LoginScreen
  return signed ? (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  ) : (
    <LoginScreen />
  );
}

export default function RootLayout() {
  return (
    // Envolvemos tudo no Provider para o contexto funcionar
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <RootNavigation />
    </AuthProvider>
  );
}
