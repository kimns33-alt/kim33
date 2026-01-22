
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, DashboardStats } from './types';
import { INITIAL_ITEMS, ICONS, CATEGORIES } from './constants';
import DashboardCard from './components/DashboardCard';
import InventoryTable from './components/InventoryTable';
import { getInventoryInsights, parseBulkInventory, parseCSVTransactions } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const App: React.FC = () => {
  // State
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('smart-stock-items-v4');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('smart-stock-transactions-v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'reorder' | 'transactions'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // Advanced Features State
  const [selectedForPO, setSelectedForPO] = useState<string[]>([]);
  const [showPOPreview, setShowPOPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('smart-stock-items-v4', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('smart-stock-transactions-v4', JSON.stringify(transactions));
  }, [transactions]);

  // Fix: Added missing fetchAiInsights function to handle AI analysis triggering.
  const fetchAiInsights = async () => {
    if (items.length === 0) {
      setAiInsights("분석할 품목 데이터가 없습니다.");
      return;
    }
    setIsLoadingInsights(true);
    try {
      const insights = await getInventoryInsights(items);
      setAiInsights(insights || "분석 결과를 가져오는 데 실패했습니다.");
    } catch (error) {
      console.error("Fetch AI Insights Error:", error);
      setAiInsights("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Stats calculation
  const stats: DashboardStats = useMemo(() => {
    const lowStockItems = items.filter(i => i.quantity <= i.minQuantity);
    const reorderValue = lowStockItems.reduce((acc, curr) => {
      const needed = Math.max(0, curr.optimalQuantity - curr.quantity);
      return acc + (needed * curr.price);
    }, 0);

    return {
      totalItems: items.length,
      totalValue: items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
      lowStockCount: lowStockItems.length,
      outOfStockCount: items.filter(i => i.quantity <= 0).length,
      reorderValue
    };
  }, [items]);

  const stockHealthData = useMemo(() => {
    const counts = { Healthy: 0, Warning: 0, Critical: 0 };
    items.forEach(i => {
      if (i.quantity <= i.minQuantity * 0.5) counts.Critical++;
      else if (i.quantity <= i.minQuantity) counts.Warning++;
      else counts.Healthy++;
    });
    return [
      { name: '건전', value: counts.Healthy, color: '#10b981' },
      { name: '주의', value: counts.Warning, color: '#f59e0b' },
      { name: '위험', value: counts.Critical, color: '#ef4444' }
    ];
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + i.quantity;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  const reorderList = useMemo(() => {
    return items.filter(i => i.quantity <= i.minQuantity).sort((a, b) => (a.quantity/a.minQuantity) - (b.quantity/b.minQuantity));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setIsLoadingInsights(true);
      const parsedTransactions = await parseCSVTransactions(text);
      
      if (parsedTransactions && Array.isArray(parsedTransactions)) {
        let updatedCount = 0;
        const newTxs: Transaction[] = [];
        const newItems = [...items];

        parsedTransactions.forEach((pt: any) => {
          const index = newItems.findIndex(i => i.sku === pt.sku || i.name === pt.name);
          if (index !== -1) {
            const item = newItems[index];
            const change = pt.type === 'IN' ? pt.quantity : -pt.quantity;
            const newQty = Math.max(0, item.quantity + change);
            
            newItems[index] = { ...item, quantity: newQty, lastUpdated: new Date().toISOString() };
            newTxs.push({
              id: Math.random().toString(36).substr(2, 9),
              itemId: item.id,
              itemName: `${item.brand} ${item.name}`,
              type: pt.type as TransactionType,
              quantity: Math.abs(pt.quantity),
              timestamp: new Date().toISOString(),
              note: `벌크 업데이트 (${file.name})`
            });
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          setItems(newItems);
          setTransactions([...newTxs, ...transactions]);
        }
      }
      setIsLoadingInsights(false);
    };
    reader.readAsText(file);
  };

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9),
      sku: formData.get('sku') as string,
      brand: formData.get('brand') as string,
      name: formData.get('name') as string,
      size: formData.get('size') as string,
      color: formData.get('color') as string,
      category: formData.get('category') as string,
      quantity: Number(formData.get('quantity')),
      minQuantity: Number(formData.get('minQuantity')),
      optimalQuantity: Number(formData.get('optimalQuantity')),
      price: Number(formData.get('price')),
      location: formData.get('location') as string,
      lastUpdated: new Date().toISOString()
    };

    if (editingItem) setItems(items.map(i => i.id === editingItem.id ? newItem : i));
    else setItems([...items, newItem]);

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const executePO = () => {
    const itemsToUpdate = items.filter(i => selectedForPO.includes(i.id));
    const newItems = items.map(i => {
      if (selectedForPO.includes(i.id)) return { ...i, quantity: i.optimalQuantity, lastUpdated: new Date().toISOString() };
      return i;
    });

    const newTxs = itemsToUpdate.map(i => ({
      id: Math.random().toString(36).substr(2, 9),
      itemId: i.id,
      itemName: `${i.brand} ${item.name}`,
      type: TransactionType.PURCHASE,
      quantity: i.optimalQuantity - i.quantity,
      timestamp: new Date().toISOString(),
      note: '발주서 자동 입고'
    }));

    setItems(newItems);
    setTransactions([...newTxs, ...transactions]);
    setSelectedForPO([]);
    setShowPOPreview(false);
  };

  const handleBulkParse = async () => {
    if (!bulkInput.trim()) return;
    setIsLoadingInsights(true);
    const parsed = await parseBulkInventory(bulkInput);
    if (parsed && Array.isArray(parsed)) {
      const newItems = parsed.map((p: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        sku: p.sku || `${p.brand?.slice(0,3).toUpperCase()}-${Math.floor(Math.random()*1000)}`,
        brand: p.brand || 'Unknown',
        name: p.name,
        size: p.size || '-',
        color: p.color || '-',
        category: p.category || 'Others',
        quantity: p.quantity || 0,
        minQuantity: 5,
        optimalQuantity: (p.quantity || 0) + 10,
        price: p.price || 0,
        location: 'Storage',
        lastUpdated: new Date().toISOString()
      }));
      setItems([...items, ...newItems]);
      setIsBulkModalOpen(false);
      setBulkInput('');
    }
    setIsLoadingInsights(false);
  };

  const poItems = items.filter(i => selectedForPO.includes(i.id));
  const totalPOAmount = poItems.reduce((acc, curr) => acc + ((curr.optimalQuantity - curr.quantity) * curr.price), 0);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 print:bg-white font-['Inter']">
      {/* Sidebar */}
      <aside className="w-68 bg-slate-900 text-white flex-shrink-0 flex flex-col hidden md:flex sticky top-0 h-screen border-r border-slate-800 print:hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10">
              <ICONS.Inventory className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">SMART<span className="text-indigo-400">STOCK</span></h1>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inventory Pro v4.0</span>
            </div>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: ICONS.Dashboard, label: '대시보드' },
              { id: 'inventory', icon: ICONS.Inventory, label: '재고 현황' },
              { id: 'reorder', icon: ICONS.Cart, label: '발주 관리', badge: stats.lowStockCount },
              { id: 'transactions', icon: ICONS.Transactions, label: '입출고 이력' }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${activeTab === tab.id ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-4">
                  <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} /> 
                  <span className="font-bold text-sm tracking-tight">{tab.label}</span>
                </div>
                {tab.badge ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === tab.id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>{tab.badge}</span> : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
              <ICONS.AI className="w-4 h-4" /> AI 스마트 분석
            </div>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed font-medium">브랜드 및 세부 품목별 데이터 분석을 통해 발주 시점을 제안합니다.</p>
            <button onClick={fetchAiInsights} disabled={isLoadingInsights} className="w-full bg-slate-700 hover:bg-indigo-600 text-white py-3 rounded-xl text-xs font-black transition-all">
              {isLoadingInsights ? '분석 중...' : '데이터 분석 실행'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 print:hidden">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-1">
              {activeTab === 'dashboard' && '대시보드'}
              {activeTab === 'inventory' && '상세 재고 현황'}
              {activeTab === 'reorder' && '발주서 생성'}
              {activeTab === 'transactions' && '시스템 로그'}
            </h2>
            <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 시스템 정상</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>총 {items.length}개의 세부 품목 관리 중</span>
            </div>
          </div>

          <div className="flex gap-3">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="px-6 py-3 border border-slate-200 text-slate-700 rounded-2xl hover:bg-white hover:border-indigo-300 transition-all flex items-center gap-2 text-sm font-black shadow-sm cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              CSV 입출력
            </label>
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all flex items-center gap-2 text-sm font-black shadow-xl">
              <ICONS.Plus className="w-4 h-4" /> 신규 등록
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard title="총 재고 자산" value={`₩${stats.totalValue.toLocaleString()}`} icon={<ICONS.Plus />} color="bg-indigo-600" />
              <DashboardCard title="예상 발주 총액" value={`₩${stats.reorderValue.toLocaleString()}`} icon={<ICONS.Cart />} color="bg-rose-600" />
              <DashboardCard title="부족 품목 (SKU)" value={stats.lowStockCount} icon={<ICONS.Alert />} color="bg-amber-500" />
              <DashboardCard title="재고 건전성" value={`${Math.round(((items.length - stats.lowStockCount) / items.length) * 100)}%`} icon={<ICONS.Inventory />} color="bg-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3"><ICONS.AI className="w-6 h-6 text-indigo-400" /> 세부 분석 리포트</h3>
                <div className="flex-1 text-sm text-indigo-100/80 leading-relaxed font-medium whitespace-pre-line overflow-y-auto custom-scrollbar">
                  {aiInsights || "데이터 분석을 실행하면 품목 규격별 재고 최적화 분석 결과가 표시됩니다."}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-8">카테고리별 재고량</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40}>
                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
              <input type="text" placeholder="브랜드, 품명, SKU로 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-6 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" />
            </div>
            <InventoryTable 
              items={filteredItems} 
              onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }}
              onDelete={(id) => setItems(items.filter(i => i.id !== id))}
              onAdjustStock={(item, amount) => {
                const newQty = Math.max(0, item.quantity + amount);
                setItems(items.map(i => i.id === item.id ? { ...i, quantity: newQty, lastUpdated: new Date().toISOString() } : i));
              }}
              onReorder={(item) => { setActiveTab('reorder'); setSelectedForPO([item.id]); }}
            />
          </div>
        )}

        {activeTab === 'reorder' && (
          <div className="space-y-6">
            {!showPOPreview ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
                <div className="p-8 border-b border-slate-100 bg-indigo-50/30 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">발주 품목 선택</h3>
                    <p className="text-xs text-slate-500 font-bold">현재 {reorderList.length}개의 품목이 안전 재고 미달 상태입니다.</p>
                  </div>
                  <button onClick={() => setSelectedForPO(reorderList.map(i => i.id))} className="text-xs font-black text-indigo-600">전체 선택</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-4 w-10"></th>
                        <th className="px-8 py-4">브랜드/품명</th>
                        <th className="px-8 py-4">규격(사이즈/컬러)</th>
                        <th className="px-8 py-4 text-center">현재고</th>
                        <th className="px-8 py-4 text-center">발주수량</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reorderList.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50 ${selectedForPO.includes(item.id) ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-8 py-5">
                            <input type="checkbox" checked={selectedForPO.includes(item.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedForPO([...selectedForPO, item.id]);
                              else setSelectedForPO(selectedForPO.filter(id => id !== item.id));
                            }} className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-[10px] font-black text-indigo-500 uppercase">{item.brand}</div>
                            <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-xs font-bold text-slate-500">{item.size} / {item.color}</div>
                          </td>
                          <td className="px-8 py-5 text-center font-bold text-slate-600">{item.quantity}</td>
                          <td className="px-8 py-5 text-center font-black text-indigo-600">+{item.optimalQuantity - item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                  <div className="text-xl font-black text-indigo-600">총 ₩{totalPOAmount.toLocaleString()}</div>
                  <button disabled={selectedForPO.length === 0} onClick={() => setShowPOPreview(true)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl disabled:bg-slate-300">발주서 미리보기</button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-12 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
                <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-8">
                  <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">발 주 서</h1>
                    <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">Granular Purchase Order</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900">SMARTSTOCK Corp.</div>
                    <p className="text-slate-500 text-sm font-medium">일자: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full border-collapse mb-16">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4 text-left">Brand & Product Name</th>
                      <th className="px-6 py-4 text-center">Spec (Size/Color)</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-900">
                    {poItems.map(item => (
                      <tr key={item.id} className="text-slate-800">
                        <td className="px-6 py-5">
                          <div className="text-[9px] font-black text-indigo-600 uppercase">{item.brand}</div>
                          <div className="font-black text-sm">{item.name}</div>
                        </td>
                        <td className="px-6 py-5 text-center text-xs font-bold text-slate-500">{item.size} / {item.color}</td>
                        <td className="px-6 py-5 text-center font-black">{(item.optimalQuantity - item.quantity)}</td>
                        <td className="px-6 py-5 text-right font-black">₩{((item.optimalQuantity - item.quantity) * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-right font-black text-lg text-slate-500">합 계 (VAT 포함)</td>
                      <td className="px-6 py-8 text-right font-black text-3xl text-slate-900">₩{totalPOAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-between items-center print:hidden">
                  <button onClick={() => setShowPOPreview(false)} className="text-slate-400 font-black text-xs uppercase">뒤로가기</button>
                  <div className="flex gap-4">
                    <button onClick={() => window.print()} className="px-8 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs uppercase">인쇄하기</button>
                    <button onClick={executePO} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">발주 완료 및 입고</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between"><h3 className="text-xl font-black text-slate-800">입출고 히스토리</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">시간</th>
                    <th className="px-8 py-5">품목</th>
                    <th className="px-8 py-5 text-center">유형</th>
                    <th className="px-8 py-5 text-center">수량</th>
                    <th className="px-8 py-5">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 text-xs font-black text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="px-8 py-5 font-black text-slate-800 text-sm">{tx.itemName}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tx.type === TransactionType.PURCHASE ? 'bg-indigo-600 text-white' : tx.type === TransactionType.IN ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{tx.type}</span>
                      </td>
                      <td className="px-8 py-5 text-center font-mono font-black text-sm">
                        <span className={tx.type === TransactionType.OUT ? 'text-rose-600' : 'text-emerald-600'}>{tx.type === TransactionType.OUT ? '-' : '+'}{tx.quantity}</span>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400 font-bold italic">{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{editingItem ? '정보 수정' : '새 품목 등록'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors bg-white p-3 rounded-2xl shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">브랜드</label>
                  <input required name="brand" defaultValue={editingItem?.brand} placeholder="예: Nike" className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-bold shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">품명</label>
                  <input required name="name" defaultValue={editingItem?.name} placeholder="예: Air Jordan 1" className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-bold shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">사이즈</label>
                  <input required name="size" defaultValue={editingItem?.size} placeholder="예: 270, L, 14-inch" className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-bold shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">컬러</label>
                  <input required name="color" defaultValue={editingItem?.color} placeholder="예: Black, Red" className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-bold shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SKU</label>
                  <input required name="sku" defaultValue={editingItem?.sku} className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-mono font-bold shadow-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">카테고리</label>
                  <select name="category" defaultValue={editingItem?.category || 'Electronics'} className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 bg-white font-bold shadow-sm appearance-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">현재고</label>
                    <input required type="number" name="quantity" defaultValue={editingItem?.quantity || 0} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-center font-black" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 text-center">안전재고(ROP)</label>
                    <input required type="number" name="minQuantity" defaultValue={editingItem?.minQuantity || 5} className="w-full border border-amber-200 rounded-xl px-4 py-2 text-center font-black" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 text-center">적정재고(Target)</label>
                    <input required type="number" name="optimalQuantity" defaultValue={editingItem?.optimalQuantity || 20} className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-center font-black" />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">단가(₩)</label>
                  <input required type="number" name="price" defaultValue={editingItem?.price || 0} className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-black" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">위치</label>
                  <input name="location" defaultValue={editingItem?.location} className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 font-bold" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase">닫기</button>
                <button type="submit" className="flex-1 py-5 bg-slate-900 text-white font-black text-xs uppercase rounded-2xl shadow-xl hover:bg-indigo-600 transition-all">등록/수정 완료</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
