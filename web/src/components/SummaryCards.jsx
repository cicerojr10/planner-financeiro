import { ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'

export function SummaryCards({ transactions, currentDate }) { // Recebemos a DATA agora
  const [stats, setStats] = useState(null)

  // Calcula totais locais (da lista atual)
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
  const balance = income - expense

  // Busca a comparação com mês passado (Backend)
  useEffect(() => {
    if(!currentDate) return;

    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()

    // Chama a inteligência do Python
    axios.get(`https://meu-financeiro-8985.onrender.com/users/1/stats?month=${month}&year=${year}`)
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
  }, [currentDate, transactions]) // Recarrega se mudar a data ou adicionar transação

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      
      {/* CARD 1: ENTRADAS */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium">Entradas</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <ArrowUpCircle className="text-emerald-400" size={24} />
          </div>
        </div>
      </div>

      {/* CARD 2: SAÍDAS + INTELIGÊNCIA 🧠 */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-slate-400 text-sm font-medium">Saídas</p>
            <h3 className="text-2xl font-bold text-red-400 mt-1">
              R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg">
            <ArrowDownCircle className="text-red-400" size={24} />
          </div>
        </div>
        
        {/* A MENSAGEM DO BACKEND */}
        {stats && (
          <div className={`mt-2 text-xs font-semibold px-2 py-1.5 rounded-lg w-fit flex items-center gap-1.5 transition-colors
            ${stats.status === 'good' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
              stats.status === 'warning' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}
          `}>
            {stats.status === 'good' ? <TrendingDown size={14}/> : 
             stats.status === 'warning' ? <TrendingUp size={14}/> : <Minus size={14}/>}
            {stats.message}
          </div>
        )}
      </div>

      {/* CARD 3: SALDO */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium">Saldo Total</p>
            <h3 className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 bg-emerald-600/20 rounded-lg">
            <DollarSign className="text-emerald-400" size={24} />
          </div>
        </div>
      </div>

    </div>
  )
}