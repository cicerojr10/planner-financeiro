import { useState, useEffect, useContext } from 'react'
import { AuthProvider, AuthContext } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import api from './services/api' // Usamos a API configurada em vez do axios direto

import { 
  Wallet, Trash2, ChevronLeft, ChevronRight, 
  Utensils, Car, Home, Film, Pill, ShoppingCart, 
  GraduationCap, Banknote, ArrowRightLeft, TrendingUp, LogOut 
} from 'lucide-react'

// Seus componentes (verifique se os caminhos estão certos)
import { TransactionForm } from './components/TransactionForm'
import { SummaryCards } from './components/SummaryCards'
import { FinancialChart } from './components/FinancialChart'

// --- 1. COMPONENTE QUE PROTEGE A ROTA ---
const PrivateRoute = ({ children }) => {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Carregando...</div>;
  }

  if (!signed) {
    return <LoginPage />;
  }

  return children;
};

// --- 2. TRADUTOR DE ÍCONES ---
const getIconComponent = (iconName) => {
  const map = {
    'fast-food': Utensils,
    'car-sport': Car,
    'home': Home,
    'film': Film,
    'medkit': Pill,
    'cart': ShoppingCart,
    'school': GraduationCap,
    'cash-outline': Banknote,
    'swap-horizontal': ArrowRightLeft,
    'trending-up': TrendingUp,
    'wallet-outline': Wallet
  }
  return map[iconName] || Wallet
}

// --- 3. SEU DASHBOARD (O ANTIGO APP) ---
function Dashboard() {
  const { logout, user } = useContext(AuthContext); // Pegamos a função de sair
  const [transactions, setTransactions] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  const formatMonth = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + offset)
    setCurrentDate(newDate)
  }

  // --- BUSCAR DADOS (USANDO API CENTRALIZADA) ---
  const fetchTransactions = async () => {
    setLoadingData(true)
    try {
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
      const year = currentDate.getFullYear().toString()

      // OBS: Substituímos o axios direto e a URL longa por 'api.get'
      // O Header de autorização vai automático graças ao AuthContext
      const response = await api.get(`/users/1/transactions/?month=${month}&year=${year}`)
      
      setTransactions(response.data)
    } catch (err) {
      console.error("Erro ao buscar dados", err)
      // Se der erro 401 (Token expirado), o usuário será deslogado eventualmente
    } finally {
      setLoadingData(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja apagar essa transação?")) {
      try {
        await api.delete(`/users/1/transactions/${id}`)
        fetchTransactions() 
      } catch (error) {
        alert("Erro ao deletar!")
      }
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [currentDate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        
        {/* Cabeçalho com Botão de Sair */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Minha Carteira</h1>
              <p className="text-slate-400 text-sm">{user?.email || 'Bem-vindo'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Navegador de Mês */}
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-full border border-slate-800">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-semibold w-24 text-center capitalize text-sm md:text-base">
                {formatMonth(currentDate)}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* BOTÃO DE LOGOUT NOVO 🔴 */}
            <button 
              onClick={logout}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors border border-red-500/20"
              title="Sair do sistema"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Componentes Filhos */}
        <SummaryCards transactions={transactions} currentDate={currentDate} />
        
        {transactions.length > 0 && (
            <FinancialChart transactions={transactions} />
        )}

        <div className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mt-8">
          Nova Transação
        </div>
        
        {/* Passamos o 'api' implicitamente pois o TransactionForm deve ser atualizado para usar api.js também, 
            mas se ele usar axios direto vai funcionar se a URL estiver completa, porém sem auth. 
            O ideal é atualizar o TransactionForm.jsx depois para usar api.js */}
        <TransactionForm onSuccess={fetchTransactions} currentDate={currentDate} />

        {/* Lista de Histórico */}
        <div className="space-y-3 mt-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Extrato de {formatMonth(currentDate)}
          </h2>
          
          {!loadingData && transactions.map((t) => {
            const IconComponent = getIconComponent(t.category_icon)
            const isExpense = t.type === 'expense'

            return (
              <div key={t.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">{t.description}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      {t.category_name || 'Sem Categoria'} • {new Date(t.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isExpense ? '- ' : '+ '}
                    R$ {t.amount.toFixed(2)}
                  </span>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="text-slate-600 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
          
          {!loadingData && transactions.length === 0 && (
            <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
              Nenhuma movimentação neste mês.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// --- 4. APP PRINCIPAL (PROVIDER) ---
export default function App() {
  return (
    <AuthProvider>
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    </AuthProvider>
  );
}