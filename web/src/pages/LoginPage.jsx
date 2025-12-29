import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api'; // Para fazer o cadastro
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useContext(AuthContext); // Pega a função de login do contexto
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Controla se é Login ou Cadastro
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // --- LÓGICA DE LOGIN ---
      const success = await login(email, password);
      if (!success) {
        setError('Email ou senha incorretos.');
      }
    } else {
      // --- LÓGICA DE CADASTRO ---
      try {
        await api.post('/signup', { email, password });
        // Se der certo, tenta logar automaticamente
        const success = await login(email, password);
        if (!success) setError('Conta criada, mas erro ao logar.');
      } catch (err) {
        setError('Erro ao criar conta. Email já existe?');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">
          {isLogin ? 'Entrar no Planner' : 'Criar Nova Conta'}
        </h1>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            {isLogin ? 'Acessar Sistema' : 'Cadastrar'}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Crie agora' : 'Faça login'}
          </span>
        </p>
      </div>
    </div>
  );
}