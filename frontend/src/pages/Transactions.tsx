import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Trash2, Pencil, Search, ArrowUpCircle, ArrowDownCircle, Plus, X, 
  Utensils, Car, Gamepad2, Activity, Home, Banknote, ShoppingBag, CircleHelp
} from 'lucide-react';

// ⚠️ CONFIRA SE ESSE É O SEU LINK (Sem barra no final)
const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: Category;
  category_id?: number; // Importante para a edição saber qual ID estava salvo
}

const iconMap: Record<string, any> = {
  'utensils': Utensils, 'car': Car, 'gamepad-2': Gamepad2, 
  'activity': Activity, 'home': Home, 'banknote': Banknote, 
  'shopping-bag': ShoppingBag, 'circle': CircleHelp
};

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS DO MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // NULL = Criando, NUMERO = Editando

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setLoading(true);
    axios.get(`${API_URL}/categories`).then(res => setCategories(res.data));
    axios.get(`${API_URL}/transactions/1`).then(res => {
        setTransactions(res.data);
        setLoading(false);
    });
  }

  function handleDelete(id: number) {
    if (confirm('Tem certeza que deseja excluir?')) {
      const backup = [...transactions];
      setTransactions(transactions.filter(t => t.id !== id));
      axios.delete(`${API_URL}/transactions/${id}`).catch(() => {
          alert("Erro ao deletar");
          setTransactions(backup);
      });
    }
  }

  // ✏️ PREPARA O MODAL PARA EDIÇÃO
  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id); // Marca que estamos editando
    setNewDesc(transaction.description);
    setNewAmount(transaction.amount.toString());
    setNewType(transaction.type);
    
    // Tenta pegar o ID da categoria (pode vir dentro do objeto ou direto)
    const catId = transaction.category?.id || transaction.category_id;
    setSelectedCatId(catId ? String(catId) : '');
    
    setIsModalOpen(true);
  }

  // ✨ PREPARA O MODAL PARA CRIAÇÃO (Limpa tudo)
  function handleNew() {
    setEditingId(null); // Marca que é novo
    setNewDesc('');
    setNewAmount('');
    setNewType('expense');
    setSelectedCatId('');
    setIsModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCatId) return alert("Selecione uma categoria!");

    const payload = {
      description: newDesc,
      amount: parseFloat(newAmount),
      type: newType,
      user_id: 1,
      category_id: parseInt(selectedCatId)
    };

    if (editingId) {
      // 🔄 MODO EDIÇÃO (PUT)
      axios.put(`${API_URL}/transactions/${editingId}`, payload)
        .then(response => {
          // Atualiza a lista trocando o antigo pelo novo
          setTransactions(transactions.map(t => t.id === editingId ? response.data : t));
          setIsModalOpen(false);
        })
        .catch(err => alert("Erro ao editar. Verifique se o Backend atualizou."));
    } else {
      // ➕ MODO CRIAÇÃO (POST)
      axios.post(`${API_URL}/transactions/`, payload)
        .then(response => {
          setTransactions([...transactions, response.data]);
          setIsModalOpen(false);
        })
        .catch(err => alert("Erro ao criar."));
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || CircleHelp;
    return <IconComponent size={18} />;
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice().reverse();

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transações</h1>
          <p className="text-slate-400">Gerencie suas finanças.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Buscar..." 
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 outline-none focus:border-emerald-500/50"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleNew} // 👈 Chama a função de limpar antes de abrir
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Nova</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase">
                <th className="p-4">Data</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 group">
                    <td className="p-4 text-slate-400 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      {t.category ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-medium" style={{ color: t.category.color }}>
                          {renderIcon(t.category.icon)}
                          {t.category.name}
                        </span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="p-4 text-slate-200 font-medium">{t.description}</td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {/* BOTÃO EDITAR */}
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-500 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100">
                        <Pencil size={18} />
                      </button>
                      {/* BOTÃO DELETAR */}
                      <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"><X size={24} /></button>
            <h2 className="text-xl font-bold text-slate-100 mb-6">
              {editingId ? 'Editar Transação' : 'Nova Transação'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <input autoFocus type="text" placeholder="Ex: Coxinha" required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Categoria</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCatId(String(cat.id))}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedCatId === String(cat.id) 
                        ? 'bg-slate-800 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <span style={{ color: selectedCatId === String(cat.id) ? 'inherit' : cat.color }}>
                        {renderIcon(cat.icon)}
                      </span>
                      <span className="text-[10px] mt-1 font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                    value={newAmount} onChange={e => setNewAmount(e.target.value)}
                  />
                </div>
                
                <div className="w-1/3">
                  <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                  <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-1">
                     <button type="button" onClick={() => setNewType('income')} className={`flex-1 rounded py-2 flex justify-center ${newType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}><ArrowUpCircle size={20} /></button>
                     <button type="button" onClick={() => setNewType('expense')} className={`flex-1 rounded py-2 flex justify-center ${newType === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-500'}`}><ArrowDownCircle size={20} /></button>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-lg mt-4 transition-transform active:scale-95">
                {editingId ? 'Salvar Alterações' : 'Criar Transação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}