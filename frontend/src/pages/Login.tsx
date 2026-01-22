import { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, LogIn } from 'lucide-react';

const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para Cadastro (Simples Toggle)
  const [isRegistering, setIsRegistering] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // --- CADASTRO ---
        await axios.post(`${API_URL}/users/`, { email, password });
        alert("Conta criada! Agora faça login.");
        setIsRegistering(false); // Volta para tela de login
      } else {
        // --- LOGIN ---
        // O Backend espera Form-Data, não JSON comum
        const formData = new URLSearchParams();
        formData.append('username', email); // O padrão OAuth2 chama email de 'username'
        formData.append('password', password);

        const response = await axios.post(`${API_URL}/token`, formData);
        
        // Salva o token no navegador
        localStorage.setItem('token', response.data.access_token);
        
        // Avisa o App que logou
        onLoginSuccess();
      }
    } catch (err) {
      console.error(err);
      setError('Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            {isRegistering ? 'Criar Conta' : 'Bem-vindo'}
          </h1>
          <p className="text-slate-400">Gerencie suas finanças com segurança.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="email" 
              placeholder="seu@email.com" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="password" 
              placeholder="Sua senha secreta" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : (
              <>
                {isRegistering ? 'Cadastrar' : 'Entrar'} <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-slate-400 hover:text-emerald-400 text-sm transition-colors"
          >
            {isRegistering ? 'Já tem conta? Faça Login' : 'Não tem conta? Crie agora'}
          </button>
        </div>
      </div>
    </div>
  );
}