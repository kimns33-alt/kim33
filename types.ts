
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUST = 'ADJUST',
  PURCHASE = 'PURCHASE'
}

export interface InventoryItem {
  id: string;
  sku: string;
  brand: string;      // 브랜드 추가
  name: string;       // 품명
  size: string;       // 사이즈 추가
  color: string;      // 컬러 추가
  category: string;
  quantity: number;
  minQuantity: number; 
  optimalQuantity: number; 
  price: number;
  location: string;
  lastUpdated: string;
  supplier?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  timestamp: string;
  note: string;
}

export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  reorderValue: number;
}
