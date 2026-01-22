
import React from 'react';
import { InventoryItem } from './types';

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: '1',
    sku: 'APP-MBP-14-GR',
    brand: 'Apple',
    name: 'MacBook Pro 14"',
    size: '14-inch',
    color: 'Space Gray',
    category: 'Electronics',
    quantity: 15,
    minQuantity: 5,
    optimalQuantity: 20,
    price: 2500000,
    location: 'Shelf A1',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '2',
    sku: 'LOG-MXM-3S-BK',
    brand: 'Logitech',
    name: 'MX Master 3S',
    size: 'Standard',
    color: 'Graphite',
    category: 'Accessories',
    quantity: 8,
    minQuantity: 10,
    optimalQuantity: 50,
    price: 150000,
    location: 'Shelf B2',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '3',
    sku: 'NIKE-AJ1-RED-270',
    brand: 'Nike',
    name: 'Air Jordan 1 Low',
    size: '270mm',
    color: 'Chicago Red',
    category: 'Fashion',
    quantity: 2,
    minQuantity: 5,
    optimalQuantity: 15,
    price: 139000,
    location: 'Shelf C1',
    lastUpdated: new Date().toISOString()
  }
];

export const CATEGORIES = ['Electronics', 'Accessories', 'Fashion', 'Furniture', 'Office Supplies', 'Others'];

export const ICONS = {
  Dashboard: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  ),
  Inventory: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
  ),
  Transactions: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M7 21v-4"/><path d="M7 14v-4"/><path d="M7 7V3"/><path d="M17 21v-4"/><path d="M17 14v-4"/><path d="M17 7V3"/><path d="M3 14h18"/><path d="M3 7h18"/><path d="M3 21h18"/></svg>
  ),
  Plus: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  Alert: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
  ),
  AI: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  ),
  Cart: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
  )
};
