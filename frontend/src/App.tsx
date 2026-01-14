import { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './App.css';

// Registrando os componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

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

  // --- CÁLCULOS DOS CARDS ---
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  // --- PREPARAÇÃO DE DADOS PARA O GRÁFICO ---
  // 1. Pega apenas despesas
  const expensesOnly = transactions.filter(t => t.type === 'expense');
  
  // 2. Agrupa por descrição e soma os valores (Ex: Junta todas as "Pizza")
  const groupedExpenses: { [key: string]: number } = expensesOnly.reduce((acc, curr) => {
    const name = curr.description; // Usando descrição por enquanto (depois usaremos categorias reais)
    acc[name] = (acc[name] || 0) + curr.amount;
    return acc;
  }, {} as { [key: string]: number });

  // 3. Configura os dados para o Chart.js
  const chartData = {
    labels: Object.keys(groupedExpenses), // Nomes (Pizza, Uber...)
    datasets: [
      {
        data: Object.values(groupedExpenses), // Valores (100, 40...)
        backgroundColor: [
          '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'
        ],
        borderColor: '#1e293b', // Cor do fundo para dar efeito de corte
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', boxWidth: 15, padding: 15, font: { size: 12 } }
      }
    },
    cutout: '70%', // Deixa a rosca mais fina e elegante
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '30px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '5px', fontWeight: 'bold' }}>Meu Painel</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Visão Geral Financeira</p>
        </header>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Carregando...</p>
        ) : (
          <>
            {/* CARDS DE RESUMO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: '4px solid #34d399' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Entradas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>R$ {income.toFixed(2)}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: '4px solid #f87171' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Saídas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>R$ {expense.toFixed(2)}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: '4px solid #38bdf8' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>R$ {balance.toFixed(2)}</div>
              </div>
            </div>

            {/* ÁREA PRINCIPAL: GRÁFICO + LISTA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              
              {/* SEÇÃO DO GRÁFICO */}
              <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '20px', textAlign: 'center' }}>Distribuição de Gastos</h2>
                {expensesOnly.length > 0 ? (
                  <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <Doughnut data={chartData} options={chartOptions} />
                  </div>
                ) : (
                   <p style={{textAlign: 'center', color: '#64748b', padding: '20px'}}>Sem gastos para gerar gráfico.</p>
                )}
              </div>

              {/* SEÇÃO DA LISTA */}
              <div>
                 <h2 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '20px' }}>Últimas Transações</h2>
                 <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                  {transactions.slice().reverse().map(t => (
                    <div key={t.id} style={{ 
                      backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155'
                    }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{t.description}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                      <span style={{ color: t.type === 'income' ? '#34d399' : '#f87171', fontWeight: 'bold', fontSize: '1rem' }}>
                        {t.type === 'expense' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;