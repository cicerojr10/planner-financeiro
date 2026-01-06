import { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, ActivityIndicator, 
  Platform, StatusBar, SafeAreaView, TouchableOpacity, 
  Modal, TextInput, Alert, ScrollView 
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

// --- TIPOS ---
interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  category_name?: string;
  category_icon?: string;
  category_id?: number;
}

// Cores para os gráficos
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

// const API_URL = 'http://192.168.1.16:8000';
const API_URL = 'https://meu-financeiro-8985.onrender.com';

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext) as any;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [newDescription, setNewDescription] = useState('');
  
  // INPUT PRO 💰
  const [newAmountRaw, setNewAmountRaw] = useState(0);
  const [newAmountDisplay, setNewAmountDisplay] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // --- CÁLCULO DOS DADOS DO GRÁFICO (NOVO) ---
  const getChartData = () => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

    // Agrupa por categoria
    const grouped: Record<string, number> = {};
    expenses.forEach(t => {
      const catName = t.category_name || 'Outros';
      grouped[catName] = (grouped[catName] || 0) + t.amount;
    });

    // Transforma em lista ordenada
    return Object.keys(grouped)
      .map((key, index) => ({
        name: key,
        value: grouped[key],
        percent: totalExpense > 0 ? (grouped[key] / totalExpense) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value); // Do maior para o menor
  };

  const chartData = getChartData();

  // --- FUNÇÕES GERAIS ---
  const getMonthName = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleAmountChange = (text: string) => {
    const onlyNums = text.replace(/\D/g, "");
    if (onlyNums === "") {
        setNewAmountDisplay("");
        setNewAmountRaw(0);
        return;
    }
    const numberValue = parseInt(onlyNums) / 100;
    setNewAmountRaw(numberValue);
    setNewAmountDisplay(numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const year = currentDate.getFullYear().toString();
      
      // 1. Buscamos Categorias e Transações em paralelo (mais rápido)
      const [catResponse, transResponse] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/users/${user?.id}/transactions/?month=${month}&year=${year}`)
      ]);

      const categoriesData = catResponse.data;
      const transactionsData = transResponse.data;

      // 2. A MÁGICA: Cruzamos os dados aqui no celular 📱
      // Se a transação tem "category_id: 2", buscamos qual é o nome e ícone da categoria 2
      const enrichedTransactions = transactionsData.map((t: any) => {
        const relatedCategory = categoriesData.find((c: any) => c.id === t.category_id);
        
        return {
          ...t,
          // Se o backend não mandou nome, usamos o da lista de categorias
          category_name: t.category_name || (relatedCategory ? relatedCategory.name : 'Outros'),
          category_icon: t.category_icon || (relatedCategory ? relatedCategory.icon : 'help-circle-outline'),
          // Garante que amount seja número
          amount: Number(t.amount)
        };
      });

      setCategories(categoriesData);
      setTransactions(enrichedTransactions);

    } catch (error: any) { 
      console.error("Erro ao buscar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null); setNewDescription(''); setNewAmountRaw(0); setNewAmountDisplay(''); setSelectedCategory(null); setNewType('expense'); setModalVisible(true);
  };

  const handleOpenEdit = (item: Transaction) => {
    setEditingId(item.id); setNewDescription(item.description);
    setNewAmountRaw(item.amount);
    setNewAmountDisplay(item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    setNewType(item.type); setSelectedCategory(item.category_id || null); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!newDescription || newAmountRaw <= 0 || !selectedCategory) { Alert.alert("Ops!", "Preencha tudo."); return; }
    setSaving(true);
    const payload = {
      description: newDescription,
      amount: newAmountRaw,
      type: newType,
      category_id: selectedCategory,
      date: currentDate.toISOString() };
    try {
      if (editingId) await axios.put(`${API_URL}/users/${user?.id}/transactions/${editingId}`, payload);
      else await axios.post(`${API_URL}/users/${user?.id}/transactions/`, payload);
      setModalVisible(false); fetchData();
    } catch (error) { Alert.alert("Erro", "Falha ao salvar."); } 
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Excluir", "Apagar?", [{ text: "Não" }, { text: "Sim", onPress: async () => { await axios.delete(`${API_URL}/users/${user?.id}/transactions/${id}`); fetchData(); }}]);
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const renderItem = ({ item }: { item: Transaction }) => {
    const iconName = item.category_icon || 'wallet-outline';
    const iconColor = item.type === 'income' ? '#10b981' : '#f87171';
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleOpenEdit(item)} activeOpacity={0.7}>
        <View style={styles.cardInfo}>
          <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}> 
            <Ionicons name={iconName as any} size={24} color={iconColor} />
          </View>
          <View>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.categoryLabel}>{item.category_name || 'Sem categoria'}</Text>
          </View>
        </View>
        <View style={styles.rightSide}>
          <Text style={[styles.amount, { color: iconColor }]}>{item.type === 'expense' ? '- ' : '+ '}{item.amount.toFixed(2)}</Text>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color="#475569" /></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // --- COMPONENTE DO HEADER DA LISTA (GRÁFICOS) ---
  const ListHeader = () => (
    <View style={{ marginBottom: 20 }}>
      {/* BALANÇO */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo do Mês</Text>
        <Text style={[styles.balanceValue, { color: balance >= 0 ? '#10b981' : '#f87171' }]}>R$ {balance.toFixed(2)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}><Ionicons name="arrow-down-circle" size={16} color="#f87171" /><Text style={styles.summaryText}>R$ {totalExpense.toFixed(2)}</Text></View>
          <View style={styles.summaryItem}><Ionicons name="arrow-up-circle" size={16} color="#10b981" /><Text style={styles.summaryText}>R$ {totalIncome.toFixed(2)}</Text></View>
        </View>
      </View>

      {/* NOVO: BARRAS DE CATEGORIA 📊 */}
      {chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Gastos por Categoria</Text>
          {chartData.map((item) => (
            <View key={item.name} style={styles.barRow}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                <Text style={styles.barLabel}>{item.name}</Text>
                <Text style={styles.barValue}>{item.percent.toFixed(0)}% • R$ {item.value.toFixed(2)}</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        {/* Lado Esquerdo: Seletor de Data */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.arrowButton}>
             <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.dateText}>{getMonthName(currentDate)}</Text>
          
          <TouchableOpacity onPress={() => changeMonth('next')} style={styles.arrowButton}>
             <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Lado Direito: Botão Sair (NOVO) */}
        <TouchableOpacity 
          onPress={logout} 
          style={{ padding: 10, marginRight: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 12 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {loading && transactions.length === 0 ? (
        <ActivityIndicator size="large" color="#34d399" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader} // Aqui inserimos o gráfico
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma movimentação.</Text>}
          onRefresh={fetchData}
          refreshing={loading}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleOpenCreate}><Ionicons name="add" size={30} color="#fff" /></TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'}</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity style={[styles.typeButton, newType === 'expense' && styles.typeExpenseActive]} onPress={() => setNewType('expense')}><Text style={[styles.typeText, newType === 'expense' && styles.typeTextActive]}>Saída</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, newType === 'income' && styles.typeIncomeActive]} onPress={() => setNewType('income')}><Text style={[styles.typeText, newType === 'income' && styles.typeTextActive]}>Entrada</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Descrição" placeholderTextColor="#94a3b8" value={newDescription} onChangeText={setNewDescription} />
            <TextInput style={[styles.input, { textAlign: 'right', fontSize: 18, fontWeight: 'bold', color: '#fff' }]} placeholder="R$ 0,00" placeholderTextColor="#94a3b8" keyboardType="numeric" value={newAmountDisplay} onChangeText={handleAmountChange} />
            <Text style={styles.sectionTitle}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
              {categories.filter(c => c.type === newType).map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat.id)}>
                  <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { backgroundColor: '#1e293b', paddingBottom: 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  arrowButton: { padding: 8 },
  dateText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
  
  balanceCard: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  balanceLabel: { color: '#94a3b8', fontSize: 14 },
  balanceValue: { fontSize: 32, fontWeight: 'bold', marginVertical: 4 },
  summaryRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryText: { color: '#cbd5e1', fontWeight: '600' },

  // ESTILOS DO GRÁFICO MOBILE 📊
  chartContainer: { marginTop: 10, backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 10 },
  chartTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
  barRow: { marginBottom: 12 },
  barLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  barValue: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' },
  barBg: { height: 8, backgroundColor: '#334155', borderRadius: 4, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  list: { padding: 20, paddingBottom: 100 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 50 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rightSide: { alignItems: 'flex-end', gap: 4 },
  description: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  categoryLabel: { color: '#64748b', fontSize: 12 },
  amount: { fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  deleteButton: { padding: 4 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  typeContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  typeExpenseActive: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' },
  typeIncomeActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' },
  typeText: { color: '#94a3b8', fontWeight: '600' },
  typeTextActive: { color: '#fff' },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', marginBottom: 8, fontWeight: 'bold' },
  categoriesList: { marginBottom: 20, maxHeight: 40 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#334155', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: '#10b981', borderColor: '#059669' },
  categoryChipText: { color: '#cbd5e1', fontSize: 13 },
  categoryChipTextActive: { color: '#fff', fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#334155' },
  saveButton: { backgroundColor: '#10b981' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
