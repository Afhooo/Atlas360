// src/lib/demo/state.ts
// Estado demo compartido para simular ventas, inventario y caja en memoria.
import { useSyncExternalStore } from 'react';
import { demoInventory } from './mockData';

type Sale = {
  id: string;
  productId: string;
  productName: string;
  branch: string;
  qty: number;
  price: number;
  total: number;
  ts: number;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  branch: string;
  stock: number;
  price?: number;
};

type DemoState = {
  inventory: InventoryItem[];
  sales: Sale[];
  cash: number;
};

let state: DemoState = {
  inventory: demoInventory.products.map((p) => ({
    ...p,
    price:
      p.name.includes('iPhone') ? 2600 :
      p.name.includes('MacBook') ? 7800 :
      p.name.includes('Watch') ? 1200 :
      p.name.includes('AirPods') ? 500 : 500,
  })),
  sales: [],
  cash: 0,
};

const listeners = new Set<() => void>();

function setState(next: DemoState) {
  state = next;
  listeners.forEach((l) => l());
}

export function recordDemoSale(productId: string, qty: number, price: number) {
  const product = state.inventory.find((p) => p.id === productId);
  if (!product) throw new Error('Producto no encontrado');
  if (qty <= 0 || price <= 0) throw new Error('Cantidad y precio deben ser mayores a 0');
  if (qty > product.stock) throw new Error('Stock insuficiente');

  const total = qty * price;
  const sale: Sale = {
    id: `sale-${Date.now()}`,
    productId,
    productName: product.name,
    branch: product.branch,
    qty,
    price,
    total,
    ts: Date.now(),
  };

  const nextInventory = state.inventory.map((p) =>
    p.id === productId ? { ...p, stock: p.stock - qty } : p
  );

  setState({
    inventory: nextInventory,
    sales: [sale, ...state.sales],
    cash: state.cash + total,
  });

  return sale;
}

export function useDemoOps() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
}

export function resetDemoState() {
  setState({
    inventory: state.inventory.map((p) => ({ ...p, stock: demoInventory.products.find((d) => d.id === p.id)?.stock ?? p.stock })),
    sales: [],
    cash: 0,
  });
}
