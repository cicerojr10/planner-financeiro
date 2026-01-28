import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trash2, Plus, 
  Utensils, Car, Gamepad2, Activity, Home, Banknote, ShoppingBag, CircleHelp,
  Coffee, GraduationCap, Zap, Smartphone, Plane, Heart
} from 'lucide-react';

const API_URL = 'https://meu-financeiro-8985.onrender.com'; // ⚠️ Seu link aqui

// Mapa de ícones disponíveis para escolha
const availableIcons: Record<string, any> = {
  'utensils': Utensils, 'car': Car, 'gamepad-2': Gamepad2,
  'activity': Activity, 'home': Home, 'banknote': Banknote,
  'shopping-bag': ShoppingBag, 'circle': CircleHelp,
  'coffee': Coffee, 'graduation-cap': GraduationCap, 
  'zap': Zap, 'smartphone': Smartphone, 'plane': Plane, 'heart': Heart
};

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#34d399'); // Verde padrão
  const [selectedIcon, setSelectedIcon] = useState('circle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  function loadCategories() {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
    }).then(res => setCategories(res.data));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    axios.post(`${API_URL}/categories/`, {
      name: newName,
      color: newColor,
      icon: selectedIcon
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setCategories([...categories, res.data]);
      setNewName('');
      setLoading(false);
    })
    .catch(err => {
    console.error(err); // <--- Adicione isso
    alert("Erro ao criar (Talvez o nome já exista?)");
    setLoading(false);
    });
  }

  function handleDelete(id: number) {
    if(!confirm("Tem certeza? Só é possível apagar categorias que não têm transações.")) return;
    
    const token = localStorage.getItem('token');
    axios.delete(`${API_URL}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
        setCategories(categories.filter(c => c.id !== id));
    })
    .catch(err => {
        alert(err.response?.data?.detail || "Erro ao deletar");
    });
  }

  const RenderIcon = ({ name, size = 20 }: { name: string, size?: number }) => {
    const Icon = availableIcons[name] || CircleHelp;
    return <Icon size={size} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Categorias</h1>
        <p className="text-slate-400">Crie e personalize suas categorias.</p>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nome */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome</label>
              <input 
                type="text" required placeholder="Ex: Investimentos"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"
                value={newName} onChange={e => setNewName(e.target.value)}
              />
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cor da Etiqueta</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  className="h-10 w-20 bg-transparent cursor-pointer rounded overflow-hidden"
                  value={newColor} onChange={e => setNewColor(e.target.value)}
                />
                <span className="text-slate-500 text-sm">{newColor}</span>
              </div>
            </div>
          </div>

          {/* Seleção de Ícone */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Escolha um Ícone</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(availableIcons).map(iconKey => (
                <button
                  key={iconKey} type="button"
                  onClick={() => setSelectedIcon(iconKey)}
                  className={`p-3 rounded-lg transition-all border ${selectedIcon === iconKey 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                >
                  <RenderIcon name={iconKey} size={24} />
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : <><Plus size={20} /> Criar Categoria</>}
          </button>
        </form>
      </div>

      {/* LISTA DE CATEGORIAS EXISTENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-900" 
                style={{ backgroundColor: cat.color }}
              >
                <RenderIcon name={cat.icon} />
              </div>
              <span className="font-medium text-slate-200">{cat.name}</span>
            </div>
            
            <button 
              onClick={() => handleDelete(cat.id)}
              className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
              title="Excluir Categoria"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}