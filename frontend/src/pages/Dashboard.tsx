import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, DollarSign, AlertCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// ✅ SEU LINK CORRETO
const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Category {
  name: string;
  color: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: Category;
}

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // 📅 ESTADO DA DATA (Começa hoje)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Carrega os dados sempre que a data mudar
  useEffect(() => {
    setLoading(true);
    const month = currentDate.getMonth() + 1; // Javascript conta Janeiro como 0
    const year = currentDate.getFullYear();

    // Passamos o filtro na URL
    axios.get(`${API_URL}/transactions/1?month=${month}&year=${year}`)
      .then(response => {
        setTransactions(response.data);
        processChartData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro:", error);
        setLoading(false);
      });
  }, [currentDate]); // Dependência: Roda de novo se a data mudar

  // Função para navegar entre meses
  function changeMonth(offset: number) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  }

  function processChartData(data: Transaction[]) {
    const expensesMap: Record<string, { value: number, color: string }> = {};

    data.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.category?.name || 'Sem Categoria';
      const catColor = t.category?.color || '#94a3b8';

      if (expensesMap[catName]) {
        expensesMap[catName].value += t.amount;
      } else {
        expensesMap[catName] = { value: t.amount, color: catColor };
      }
    });

    const formatted = Object.keys(expensesMap).map(key => ({
      name: key,
      value: expensesMap[key].value,
      color: expensesMap[key].color
    }));

    setChartData(formatted);
  }

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  // Formata o nome do mês (Ex: "Janeiro de 2026")
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO COM NAVEGADOR DE DATA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Visão Geral</h1>
          <p className="text-slate-400">Acompanhe seu fluxo mensal.</p>
        </div>

        {/* 📅 NAVEGADOR DE MÊS */}
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 px-4 py-1 min-w-[160px] justify-center text-slate-200 font-medium capitalize">
            <Calendar size={18} className="text-emerald-500" />
            {monthName}
          </div>

          <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Carregando dados de {monthName}...</div>
      ) : (
        <>
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between">
              <div><p className="text-slate-400 text-sm mb-1">Entradas</p><h3 className="text-2xl font-bold text-emerald-400">R$ {income.toFixed(2)}</h3></div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 h-fit"><TrendingUp size={24} /></div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between">
              <div><p className="text-slate-400 text-sm mb-1">Saídas</p><h3 className="text-2xl font-bold text-red-400">R$ {expense.toFixed(2)}</h3></div>
              <div className="p-2 bg-red-500/10 rounded-lg text-red-400 h-fit"><TrendingDown size={24} /></div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between">
              <div><p className="text-slate-400 text-sm mb-1">Saldo</p><h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {balance.toFixed(2)}</h3></div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 h-fit"><Wallet size={24} /></div>
            </div>
          </div>

          {/* ÁREA CENTRAL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 w-full">Gastos de {currentDate.toLocaleString('pt-BR', { month: 'long' })}</h2>
              {chartData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-slate-500 flex flex-col items-center gap-2">
                  <AlertCircle size={32} />
                  <p>Sem gastos neste mês.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Movimentações do Mês</h2>
              {transactions.length > 0 ? (
                <div className="overflow-y-auto pr-2 space-y-3 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                  {transactions.slice().reverse().map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-transparent hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <strong className="block text-slate-200 text-sm">{t.description}</strong>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400" style={{ color: t.category?.color }}>
                              {t.category?.name || 'Geral'}
                            </span>
                            <span className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'expense' ? '- ' : '+ '} R$ {t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-10">Nenhuma movimentação encontrada.</p>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}