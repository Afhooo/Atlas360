// src/lib/demo/state.ts
// Estado demo compartido para simular ventas, inventario y caja en memoria.
import { useSyncExternalStore } from 'react';
import { demoInventory } from './mockData';

type SaleCustomer = {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
};

type SaleDelivery = {
  mode: 'pickup' | 'delivery';
  branch?: string;
  address?: string;
  references?: string;
  scheduledSlot?: string;
  label?: string;
};

type SalePayment = {
  method: string;
  status: 'pagado' | 'pendiente';
};

type Sale = {
  id: string;
  productId: string;
  productName: string;
  branch: string;
  qty: number;
  price: number;
  total: number;
  ts: number;
  channel?: string;
  customer?: SaleCustomer;
  delivery?: SaleDelivery;
  payment?: SalePayment;
  notes?: string;
};

export type SalePayload = {
  productId: string;
  qty: number;
  price: number;
  channel?: string;
  customer?: SaleCustomer;
  delivery?: SaleDelivery;
  payment?: SalePayment;
  notes?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  branch: string;
  stock: number;
  price?: number;
  cost?: number;
  category?: string;
  type?: 'individual' | 'combo';
  rotationDays?: number;
  reorderPoint?: number;
  components?: { id: string; name: string; qty: number }[];
};

type DemoState = {
  inventory: InventoryItem[];
  sales: Sale[];
  cash: number;
};

const fallbackPrice = (name: string, current?: number) => {
  if (current && current > 0) return current;
  if (/macbook/i.test(name)) return 8000;
  if (/iphone/i.test(name)) return 5000;
  if (/ipad/i.test(name)) return 3500;
  if (/watch/i.test(name)) return 1500;
  if (/airpods/i.test(name)) return 800;
  return 600;
};

const baseInventorySnapshot = (): InventoryItem[] =>
  demoInventory.products.map((p: any): InventoryItem => ({
    id: String(p.id),
    name: String(p.name),
    sku: String(p.sku),
    branch: String(p.branch),
    stock: Number(p.stock ?? 0),
    price: fallbackPrice(String(p.name), p.price),
    cost: p.cost == null ? undefined : Number(p.cost),
    category: p.category ?? undefined,
    type: p.type === 'combo' ? 'combo' : 'individual',
    rotationDays: p.rotationDays == null ? undefined : Number(p.rotationDays),
    reorderPoint: p.reorderPoint == null ? undefined : Number(p.reorderPoint),
    components: Array.isArray(p.components) ? p.components : undefined,
  }));

let state: DemoState = {
  inventory: baseInventorySnapshot(),
  sales: [],
  cash: 0,
};

const listeners = new Set<() => void>();

function setState(next: DemoState) {
  state = next;
  listeners.forEach((l) => l());
}

export function recordDemoSale(payload: SalePayload) {
  const { productId, qty, price, channel, customer, delivery, payment, notes } = payload;

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
    channel,
    customer,
    delivery,
    payment,
    notes,
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
    () => state,
    () => state
  );
}

export function resetDemoState() {
  setState({
    inventory: baseInventorySnapshot(),
    sales: [],
    cash: 0,
  });
}
