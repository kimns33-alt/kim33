import React from 'react';
import { InventoryItem } from '../types';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAdjustStock: (item: InventoryItem, amount: number) => void;
  onReorder: (item: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onDelete,
  onAdjustStock,
  onReorder
}) => {
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return { label: '품절', color: 'bg-rose-100 text-rose-700' };
    if (item.quantity <= item.minQuantity * 0.5) return { label: '위험', color: 'bg-rose-100 text-rose-700' };
    if (item.quantity <= item.minQuantity) return { label: '주의', color: 'bg-amber-100 text-amber-700' };
    return { label: '정상', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="px-8 py-5">SKU</th>
            <th className="px-8 py-5">브랜드/품명</th>
            <th className="px-8 py-5">규격</th>
            <th className="px-8 py-5">카테고리</th>
            <th className="px-8 py-5 text-center">재고</th>
            <th className="px-8 py-5 text-center">상태</th>
            <th className="px-8 py-5 text-right">단가</th>
            <th className="px-8 py-5 text-center">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-mono text-xs font-black text-slate-400">{item.sku}</td>
                <td className="px-8 py-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase">{item.brand}</div>
                  <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                </td>
                <td className="px-8 py-5 text-xs text-slate-500 font-bold">
                  {item.size} / {item.color}
                </td>
                <td className="px-8 py-5 text-xs text-slate-500 font-bold">{item.category}</td>
                <td className="px-8 py-5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onAdjustStock(item, -1)}
                      className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 font-black text-sm"
                    >
                      -
                    </button>
                    <span className="font-black text-slate-800 min-w-[40px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => onAdjustStock(item, 1)}
                      className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 font-black text-sm"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-800">
                  ₩{item.price.toLocaleString()}
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black text-slate-600"
                    >
                      수정
                    </button>
                    {item.quantity <= item.minQuantity && (
                      <button
                        onClick={() => onReorder(item)}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black"
                      >
                        발주
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg text-[10px] font-black"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
