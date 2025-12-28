import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Wallet, Trash2, ChevronLeft, ChevronRight, 
  Utensils, Car, Home, Film, Pill, ShoppingCart, 
  GraduationCap, Banknote, ArrowRightLeft, TrendingUp 
} from 'lucide-react'

// Importando os componentes filhos
import { TransactionForm } from './components/TransactionForm'
import { SummaryCards } from './components/SummaryCards'
import { FinancialChart } from './components/FinancialChart'

// --- TRADUTOR DE ÍCONES (Banco -> Site) ---
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

function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  
  // ESTADO DE DATA (Igual ao Mobile)
  const [currentDate, setCurrentDate] = useState(new Date())

  // --- FUNÇÕES DE DATA ---
  const formatMonth = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + offset)
    setCurrentDate(newDate)
  }

  // --- BUSCAR DADOS (READ) ---
  const fetchTransactions = async () => {
    setLoading(true)
    try {
      // Prepara filtros para a API
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
      const year = currentDate.getFullYear().toString()

      // Chama o backend com filtro de data
      const response = await axios.get(`https://meu-financeiro-8985.onrender.com/users/1/transactions/?month=${month}&year=${year}`)
      setTransactions(response.data) // Backend já manda ordenado
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- DELETAR (DELETE) ---
  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja apagar essa transação?")) {
      try {
        await axios.delete(`https://meu-financeiro-8985.onrender.com/users/1/transactions/${id}`)
        fetchTransactions() 
      } catch (error) {
        alert("Erro ao deletar!")
      }
    }
  }

  // Atualiza sempre que muda o mês
  useEffect(() => {
    fetchTransactions()
  }, [currentDate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        
        {/* Cabeçalho com Navegação de Data */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Minha Carteira</h1>
              <p className="text-slate-400 text-sm">Dashboard Web</p>
            </div>
          </div>

          {/* Navegador de Mês */}
          <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-full border border-slate-800">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold w-32 text-center capitalize">
              {formatMonth(currentDate)}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 1. Cards de Resumo */}
          <SummaryCards transactions={transactions} currentDate={currentDate} />

        {/* 2. Gráfico Visual */}
        {transactions.length > 0 && (
            <FinancialChart transactions={transactions} />
        )}

        {/* 3. Formulário (Ainda simples, vamos melhorar depois) */}
        <div className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mt-8">
          Nova Transação
        </div>
        <TransactionForm onSuccess={fetchTransactions} currentDate={currentDate} />

        {/* 4. Lista de Histórico Otimizada */}
        <div className="space-y-3 mt-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Extrato de {formatMonth(currentDate)}
          </h2>
          
          {!loading && transactions.map((t) => {
            const IconComponent = getIconComponent(t.category_icon)
            const isExpense = t.type === 'expense'

            return (
              <div key={t.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group">
                
                {/* Lado Esquerdo: Ícone + Infos */}
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

                {/* Lado Direito: Valor + Delete */}
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isExpense ? '- ' : '+ '}
                    R$ {t.amount.toFixed(2)}
                  </span>

                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="text-slate-600 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
          
          {!loading && transactions.length === 0 && (
            <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
              Nenhuma movimentação neste mês.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default App