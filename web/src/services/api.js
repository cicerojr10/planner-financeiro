import axios from "axios";

const api = axios.create({
  // COMENTE O LOCALHOST
  // baseURL: "http://127.0.0.1:8000", 
  
  // USE O DA NUVEM (Sem a barra / no final)
  baseURL: "https://meu-financeiro-8985.onrender.com", 
});

export default api;