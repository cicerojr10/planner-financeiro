import { createContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "../services/api"; // Vamos criar isso jájá

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ao carregar a página, verifica se tem token salvo
    const token = Cookies.get("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser({ email: "usuario@logado" }); // Simplificado por enquanto
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Chama a rota /token que acabamos de testar
      const response = await api.post("/token", 
        new URLSearchParams({
          username: email,
          password: password,
        })
      );

      const { access_token } = response.data;

      // Salva o token no navegador e na API
      Cookies.set("token", access_token, { expires: 7 }); // Dura 7 dias
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser({ email });
      
      return true;
    } catch (error) {
      console.error("Erro no login", error);
      return false;
    }
  };

  const logout = () => {
    Cookies.remove("token");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, signed: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
