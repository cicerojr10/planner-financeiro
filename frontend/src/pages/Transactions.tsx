import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Search, ArrowUpCircle, ArrowDownCircle, Plus, X } from 'lucide-react';

const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS DO MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    loadTransactions();
  }, []);

  function loadTransactions() {
    axios.get(`${API_URL}/transactions/1`)
      .then(response => {
        setTransactions(response.data);
        setLoading(false);
      })
      .catch(error => console.error("Erro:", error));
  }

  function handleDelete(id: number) {
    if (confirm('Tem certeza?')) {
      const backup = [...transactions];
      setTransactions(transactions.filter(t => t.id !== id));
      
      axios.delete(`${API_URL}/transactions/${id}`)
        .catch(err => {
          alert("Erro ao deletar (Backend atualizando?)");
          setTransactions(backup);
        });
    }
  }

  // 💾 FUNÇÃO DE SALVAR (CREATE)
  function handleSave(e: React.FormEvent) {
    e.preventDefault(); // Não recarregar a página

    const payload = {
      description: newDesc,
      amount: parseFloat(newAmount), // Converte texto pra numero
      type: newType,
      user_id: 1 // Fixo por enquanto
    };

    axios.post(`${API_URL}/transactions/`, payload)
      .then(response => {
        // Sucesso! Adiciona na lista e fecha modal
        setTransactions([...transactions, response.data]);
        setIsModalOpen(false);
        // Limpa campos
        setNewDesc('');
        setNewAmount('');
      })
      .catch(error => {
        console.error(error);
        alert("Erro ao salvar. Verifique se o Render já terminou o deploy.");
      });
  }

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice().reverse();

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER + BOTÃO NOVA */}
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
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Nova</span>
          </button>
        </div>
      </div>

      {/* TABELA (IDÊNTICA A ANTERIOR) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase">
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 group">
                    <td className="p-4 text-slate-400 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-200 font-medium flex items-center gap-3">
                      {t.type === 'income' ? <ArrowUpCircle size={18} className="text-emerald-500" /> : <ArrowDownCircle size={18} className="text-red-500" />}
                      {t.description}
                    </td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
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

      {/* 🟢 O MODAL (JANELA FLUTUANTE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            
            {/* Fechar Modal */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6">Nova Transação</h2>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Descrição */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ex: Coxinha"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              {/* Valor e Tipo (Lado a Lado) */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                  />
                </div>
                
                <div className="w-1/3">
                  <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                  <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-1">
                     <button
                       type="button"
                       onClick={() => setNewType('income')}
                       className={`flex-1 rounded py-2 flex justify-center ${newType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}
                     >
                       <ArrowUpCircle size={20} />
                     </button>
                     <button
                       type="button"
                       onClick={() => setNewType('expense')}
                       className={`flex-1 rounded py-2 flex justify-center ${newType === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-500'}`}
                     >
                       <ArrowDownCircle size={20} />
                     </button>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-lg mt-4 transition-transform active:scale-95"
              >
                Salvar Transação
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
// Forçando atualização da Vercel