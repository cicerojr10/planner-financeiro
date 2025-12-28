import { useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

export function FinancialChart({ transactions }) {
  
  // DADOS BARRAS (Entrada vs Saída)
  const barData = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    return [
      { name: 'Entradas', value: income, color: '#34d399' },
      { name: 'Saídas', value: expense, color: '#f87171' },
    ]
  }, [transactions])

  // DADOS CATEGORIAS (Lista + Rosca)
  const pieData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0)
    
    const grouped = expenses.reduce((acc, curr) => {
      const category = curr.category_name || 'Outros'
      if (!acc[category]) acc[category] = 0
      acc[category] += curr.amount
      return acc
    }, {})

    return Object.keys(grouped).map((key, index) => {
      const value = grouped[key]
      const percent = totalExpense > 0 ? (value / totalExpense) * 100 : 0
      return {
        name: key,
        value: value,
        percent: percent,
        color: COLORS[index % COLORS.length]
      }
    }).sort((a, b) => b.value - a.value)
  }, [transactions])

  if (transactions.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* 1. BALANÇO (Ocupa 1 coluna) */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg lg:col-span-1">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Balanço</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={60} />
              <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. CATEGORIAS (Ocupa 2 colunas para ter espaço!) */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg lg:col-span-2">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">Para onde foi o dinheiro?</h3>
        
        <div className="flex flex-col sm:flex-row gap-8 items-center">
          {/* Gráfico Rosca */}
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />)}
                </Pie>
                <RechartsTooltip formatter={(value) => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Lista de Barras */}
          <div className="flex-1 w-full space-y-4">
            {pieData.map((item) => (
              <div key={item.name} className="w-full">
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="text-slate-200 font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <div className="text-right">
                    <span className="block text-slate-200 font-bold">
  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
</span>
                    <span className="text-xs text-slate-500">{item.percent.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
            {pieData.length === 0 && <span className="text-slate-600 text-sm">Sem despesas registradas.</span>}
          </div>
        </div>
      </div>
    </div>
  )
}