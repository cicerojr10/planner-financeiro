import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

// 👇 SEU LINK DO RENDER
const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/transactions/1`)
      .then(response => {
        setTransactions(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar:", error);
        setLoading(false);
      });
  }, []);

  // 🧮 CÁLCULOS MATEMÁTICOS (O cérebro do Dashboard)
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = income - expense;

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: 'bold' }}>Meu Financeiro Web</h1>
          <p style={{ color: '#94a3b8' }}>Painel de Controle Integrado</p>
        </header>

        {/* 📊 CARDS DE RESUMO (Novidade!) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          {/* Card Entradas */}
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #34d399' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Entradas</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399', marginTop: '5px' }}>
              R$ {income.toFixed(2)}
            </div>
          </div>

          {/* Card Saídas */}
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #f87171' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Saídas</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f87171', marginTop: '5px' }}>
              R$ {expense.toFixed(2)}
            </div>
          </div>

          {/* Card Saldo */}
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #38bdf8' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Saldo Atual</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginTop: '5px' }}>
              R$ {balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* LISTA DE TRANSAÇÕES */}
        <h2 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '20px' }}>Histórico Recente</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center' }}>Carregando dados da nuvem...</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#1e293b', borderRadius: '10px', textAlign: 'center' }}>
                <p>Nenhuma transação encontrada.</p>
              </div>
            ) : (
              // Invertendo a lista para mostrar o mais recente primeiro (.slice().reverse())
              transactions.slice().reverse().map(t => (
                <div key={t.id} style={{ 
                  backgroundColor: '#1e293b', 
                  padding: '20px', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{t.description}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(t.date).toLocaleDateString()} às {new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <span style={{ 
                    color: t.type === 'income' ? '#34d399' : '#f87171',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    {t.type === 'expense' ? '- ' : '+ '}
                    R$ {t.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;