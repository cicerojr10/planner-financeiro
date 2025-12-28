import { useState, useEffect } from 'react'
import axios from 'axios'
import { PlusCircle, Loader2 } from 'lucide-react'

export function TransactionForm({ onSuccess, currentDate }) {
  const [description, setDescription] = useState('')
  const [amountRaw, setAmountRaw] = useState(0) // Valor numérico puro (para o banco)
  const [amountDisplay, setAmountDisplay] = useState('') // Valor formatado (para o usuário ver)
  
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get('https://meu-financeiro-8985.onrender.com/categories')
      .then(response => setCategories(response.data))
      .catch(error => console.error(error))
  }, [])

  // --- MÁGICA DA MÁSCARA DE MOEDA ---
  const handleAmountChange = (e) => {
    const value = e.target.value
    // 1. Remove tudo que não é número
    const onlyNums = value.replace(/\D/g, "")

    if (onlyNums === "") {
      setAmountDisplay("")
      setAmountRaw(0)
      return
    }

    // 2. Transforma em centavos (ex: 150 vira 1.50)
    const numberValue = parseInt(onlyNums) / 100
    setAmountRaw(numberValue)

    // 3. Formata para BRL (ex: R$ 1,50)
    const formatted = numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    setAmountDisplay(formatted)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!categoryId) { alert("Selecione uma categoria!"); return }
    if (amountRaw <= 0) { alert("O valor deve ser maior que zero!"); return }

    setLoading(true)
    try {
      await axios.post('https://meu-financeiro-8985.onrender.com/users/1/transactions/', {
        description,
        amount: amountRaw, // Manda o número puro pro Python
        type,
        category_id: categoryId,
        date: currentDate.toISOString()
      })
      setDescription('')
      setAmountDisplay('')
      setAmountRaw(0)
      setCategoryId(null)
      onSuccess()
    } catch (error) {
      alert("Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === type)

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
      <div className="flex gap-2 mb-4 bg-slate-950 p-1 rounded-lg">
        <button type="button" onClick={() => { setType('expense'); setCategoryId(null) }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-slate-800 text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Saída (Despesa)</button>
        <button type="button" onClick={() => { setType('income'); setCategoryId(null) }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Entrada (Receita)</button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input 
          type="text" 
          placeholder="Descrição (ex: Almoço)" 
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-emerald-500/50 outline-none"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
        
        {/* INPUT COM MÁSCARA */}
        <input 
          type="text" 
          placeholder="R$ 0,00" 
          className="w-full md:w-40 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 font-mono text-right focus:border-emerald-500/50 outline-none"
          value={amountDisplay}
          onChange={handleAmountChange} // Chama nossa função mágica
          required
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Categoria</label>
        <div className="flex flex-wrap gap-2">
          {filteredCategories.map(cat => (
            <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${categoryId === cat.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
        {loading ? "Salvando..." : "Adicionar Transação"}
      </button>
    </form>
  )
}