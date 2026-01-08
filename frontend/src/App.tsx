import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

// 👇 SEU LINK DO RENDER AQUI
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
    // Busca dados do usuário de teste (ID 1)
    // Se você criou outro usuário, o ID pode mudar, mas vamos testar a conexão primeiro
    axios.get(`${API_URL}/users/1/transactions/?month=01&year=2026`)
      .then(response => {
        setTransactions(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Meu Financeiro Web</h1>
          <p style={{ color: '#94a3b8' }}>Painel de Controle Integrado</p>
        </header>

        {/* LISTA */}
        {loading ? (
          <p style={{ textAlign: 'center' }}>Carregando dados da nuvem...</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#1e293b', borderRadius: '10px', textAlign: 'center' }}>
                <p>Nenhuma transação encontrada neste mês (ou usuário não encontrado).</p>
                <p style={{fontSize: '0.9rem', color: '#64748b', marginTop: '10px'}}>Dica: Adicione algo pelo App Mobile!</p>
              </div>
            ) : (
              transactions.map(t => (
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
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{new Date(t.date).toLocaleDateString()}</span>
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