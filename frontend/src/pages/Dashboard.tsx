import { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'; // Ícones novos

// Configuração do Gráfico
ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Busca os dados (Igual ao antigo)
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

  // 2. Cálculos (Igual ao antigo)
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  // 3. Preparação do Gráfico
  const expensesOnly = transactions.filter(t => t.type === 'expense');
  const groupedExpenses: { [key: string]: number } = expensesOnly.reduce((acc, curr) => {
    const name = curr.description;
    acc[name] = (acc[name] || 0) + curr.amount;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = {
    labels: Object.keys(groupedExpenses),
    datasets: [
      {
        data: Object.values(groupedExpenses),
        backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'],
        borderColor: '#0f172a', // Cor do fundo do site para "cortar" a rosca
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', boxWidth: 12, padding: 15, font: { size: 12 } }
      }
    },
    cutout: '75%',
    responsive: true,
    maintainAspectRatio: false,
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-500">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Visão Geral</h1>
        <p className="text-slate-400">Resumo financeiro mensal.</p>
      </div>

      {/* CARDS DE RESUMO (Agora com Tailwind e Ícones) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card Entradas */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">Entradas</p>
            <h3 className="text-2xl font-bold text-emerald-400">R$ {income.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card Saídas */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">Saídas</p>
            <h3 className="text-2xl font-bold text-red-400">R$ {expense.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Card Saldo */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">Saldo Atual</p>
            <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              R$ {balance.toFixed(2)}
            </h3>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL: GRÁFICO E LISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-slate-200 mb-6 w-full">Distribuição</h2>
          {expensesOnly.length > 0 ? (
            <div className="h-64 w-full">
               <Doughnut data={chartData} options={chartOptions} />
            </div>
          ) : (
            <p className="text-slate-500 mt-10">Sem dados de despesas.</p>
          )}
        </div>

        {/* LISTA DE TRANSAÇÕES (Ocupa 2 colunas no desktop) */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Últimas Movimentações</h2>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {transactions.slice().reverse().map((t) => (
              <div 
                key={t.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <strong className="block text-slate-200 text-sm">{t.description}</strong>
                    <span className="text-xs text-slate-500 capitalize">{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'expense' ? '- ' : '+ '}
                  R$ {t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}