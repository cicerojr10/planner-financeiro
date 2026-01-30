import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Trash2, Pencil, Search, ArrowUpCircle, ArrowDownCircle, Plus, X, 
  ChevronLeft, ChevronRight,
  Utensils, Car, Gamepad2, Activity, Home, Banknote, ShoppingBag, CircleHelp,
  Coffee, GraduationCap, Zap, Smartphone, Plane, Heart
} from 'lucide-react';

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
  is_fixed?: boolean; // 👈 NOVO CAMPO
  category?: Category;
  category_id?: number;
}

const iconMap: Record<string, any> = { 
  'utensils': Utensils, 'car': Car, 'gamepad-2': Gamepad2, 
  'activity': Activity, 'home': Home, 'banknote': Banknote, 
  'shopping-bag': ShoppingBag, 'circle': CircleHelp,
  'coffee': Coffee, 'graduation-cap': GraduationCap, 
  'zap': Zap, 'smartphone': Smartphone, 'plane': Plane, 'heart': Heart
};

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 📅 ESTADO PARA CONTROLAR O MÊS ATUAL
  const [currentDate, setCurrentDate] = useState(new Date());

  // ESTADOS DO MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [isFixed, setIsFixed] = useState(false); // 👈 ESTADO DO CHECKBOX

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get(`${API_URL}/categories`, config).then(res => setCategories(res.data));

    axios.get(`${API_URL}/transactions/`, config)
      .then(res => {
        setTransactions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.reload();
        }
      });
  }

  function prevMonth() {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  }

  function nextMonth() {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  }

  function handleDelete(id: number) {
    if (confirm('Tem certeza que deseja excluir?')) {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const backup = [...transactions];
      setTransactions(transactions.filter(t => t.id !== id));
      axios.delete(`${API_URL}/transactions/${id}`, config)
        .catch((err) => {
          console.error(err);
          alert("Erro ao deletar.");
          setTransactions(backup);
        });
    }
  }

  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setNewDesc(transaction.description);
    setNewAmount(transaction.amount.toString());
    setNewType(transaction.type);
    const catId = transaction.category?.id || transaction.category_id;
    setSelectedCatId(catId ? String(catId) : '');
    setIsFixed(transaction.is_fixed || false); // 👈 CARREGA O VALOR
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingId(null);
    setNewDesc('');
    setNewAmount('');
    setNewType('expense');
    setSelectedCatId('');
    setIsFixed(false); // 👈 RESETA O VALOR
    setIsModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCatId) return alert("Selecione uma categoria!");

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const payload = {
      description: newDesc,
      amount: parseFloat(newAmount),
      type: newType,
      category_id: parseInt(selectedCatId),
      is_fixed: isFixed, // 👈 ENVIA PRO BANCO
      date: editingId ? undefined : currentDate.toISOString() 
    };

    if (editingId) {
      axios.put(`${API_URL}/transactions/${editingId}`, payload, config)
        .then(response => {
          setTransactions(transactions.map(t => t.id === editingId ? { ...response.data, category: categories.find(c => c.id === parseInt(selectedCatId)) } : t));
          setIsModalOpen(false);
          loadData();
        })
        .catch(err => { console.error(err); alert("Erro ao editar."); });
    } else {
      axios.post(`${API_URL}/transactions/`, payload, config)
        .then(response => {
          setTransactions([...transactions, { ...response.data, category: categories.find(c => c.id === parseInt(selectedCatId)) }]);
          setIsModalOpen(false);
          loadData();
        })
        .catch(err => { console.error(err); alert("Erro ao criar."); });
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || CircleHelp;
    return <IconComponent size={18} />;
  };

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const isSameMonth = transactionDate.getMonth() === currentDate.getMonth();
    const isSameYear = transactionDate.getFullYear() === currentDate.getFullYear();
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return isSameMonth && isSameYear && matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthTitle = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const formattedTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  return (
    <div className="space-y-6 relative animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transações</h1>
          <p className="text-slate-400">Gerencie suas entradas e saídas.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-medium text-slate-200 min-w-[140px] text-center">
              {formattedTitle}
            </span>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative flex-1 md:w-48 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Buscar..." 
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 outline-none focus:border-emerald-500/50"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={handleNew}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
          >
            <Plus size={20} />
            <span className="">Nova</span>
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
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma transação neste mês.</td></tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 group transition-colors">
                    <td className="p-4 text-slate-400 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      {t.category ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-medium" style={{ color: t.category.color }}>
                          {renderIcon(t.category.icon)}
                          {t.category.name}
                        </span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="p-4 text-slate-200 font-medium flex items-center gap-2">
                      {t.description}
                      {/* 📌 ÍCONE DE FIXA NA LISTA */}
                      {t.is_fixed && <span className="text-yellow-500" title="Despesa Fixa (Mensal)">📌</span>}
                    </td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative animate-scale-in">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"><X size={24} /></button>
            <h2 className="text-xl font-bold text-slate-100 mb-6">
              {editingId ? 'Editar Transação' : 'Nova Transação'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <input autoFocus type="text" placeholder="Ex: Aluguel" required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              {/* CHECKBOX DE DESPESA FIXA */}
              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 cursor-pointer" onClick={() => setIsFixed(!isFixed)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isFixed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                  {isFixed && <span className="text-slate-900 text-xs font-bold">✓</span>}
                </div>
                <label className="text-sm text-slate-300 cursor-pointer select-none">
                  Esta é uma despesa fixa 📌
                </label>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Categoria</label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setSelectedCatId(String(cat.id))}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedCatId === String(cat.id) ? 'bg-slate-800 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <span style={{ color: selectedCatId === String(cat.id) ? 'inherit' : cat.color }}>{renderIcon(cat.icon)}</span>
                      <span className="text-[10px] mt-1 font-medium truncate w-full text-center">{cat.name}</span>
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