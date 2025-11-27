'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, ShoppingBag, DollarSign, Package, Layers, Sparkles } from 'lucide-react';
import { useDemoOps, recordDemoSale } from '@/lib/demo/state';

type InventoryItem = ReturnType<typeof useDemoOps>['inventory'][number];

export default function RegistrarVentaPage() {
  const snapshot = useDemoOps();
  const inventory = snapshot.inventory;
  const sales = snapshot.sales;
  const cash = snapshot.cash;

  const [form, setForm] = useState({ productId: inventory[0]?.id ?? '', qty: 1, price: inventory[0]?.price ?? 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const groupedInventory = useMemo<Record<string, InventoryItem[]>>(() => {
    return inventory.reduce<Record<string, InventoryItem[]>>((acc, item) => {
      const key = item.category || (item.type === 'combo' ? 'Combos / Kits' : 'Otros');
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const selectedProduct: InventoryItem | undefined = useMemo(
    () => inventory.find((p) => p.id === form.productId),
    [inventory, form.productId]
  );
  const suggestedPrice = selectedProduct?.price ?? form.price;
  const totalPreview = Number(form.qty || 0) * Number(form.price || 0);
  const marginPct = selectedProduct?.cost ? ((form.price - selectedProduct.cost) / selectedProduct.cost) * 100 : null;

  const totals = useMemo(() => {
    const soldItems = sales.reduce((sum, s) => sum + s.qty, 0);
    return { soldItems, salesCount: sales.length };
  }, [sales]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      recordDemoSale(form.productId, form.qty, form.price);
      setMessage({ type: 'success', text: 'Venta registrada, inventario actualizado y caja sumada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo registrar la venta.' });
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Registrar venta</h1>
        <p className="apple-body text-apple-gray-400">Flujo demo: rebaja stock y suma a caja.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Caja acumulada" value={money(cash)} icon={<DollarSign size={18} />} tone="blue" />
        <Kpi label="Ventas registradas" value={totals.salesCount} icon={<ShoppingBag size={18} />} tone="green" />
        <Kpi label="Items vendidos" value={totals.soldItems} icon={<Package size={18} />} tone="orange" />
        <Kpi
          label="Stock total"
          value={inventory.reduce((sum, p) => sum + p.stock, 0)}
          icon={<Package size={18} />}
          tone="purple"
        />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
            <ArrowRight size={16} />
          </div>
          <div>
            <h2 className="apple-h3 text-white">Nueva venta</h2>
            <p className="apple-caption text-apple-gray-400">Selecciona producto, cantidad y precio</p>
          </div>
        </div>
        {message && (
          <div
            className={`rounded-apple border p-3 flex items-center gap-2 ${
              message.type === 'success'
                ? 'border-apple-green-500/40 bg-apple-green-500/10 text-apple-green-100'
                : 'border-apple-red-500/40 bg-apple-red-500/10 text-apple-red-100'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="apple-body">{message.text}</span>
          </div>
        )}
        <form className="grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <label className="space-y-2 lg:col-span-2">
            <span className="apple-caption text-apple-gray-400">Producto / combo</span>
            <select
              className="input-apple w-full"
              value={form.productId}
              onChange={(e) => {
                const prod = inventory.find((p) => p.id === e.target.value);
                setForm((prev) => ({ ...prev, productId: e.target.value, price: prod?.price ?? prev.price }));
              }}
            >
              {Object.entries(groupedInventory)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.branch} · stock {p.stock}{p.type === 'combo' ? ' (Combo)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Precio a facturar</span>
            <input
              className="input-apple w-full"
              type="number"
              min={1}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
            />
            <div className="flex gap-2 text-apple-gray-500 text-xs">
              <button
                type="button"
                className="underline decoration-dotted"
                onClick={() => setForm((prev) => ({ ...prev, price: Number(suggestedPrice || prev.price) }))}
              >
                Usar lista ({money(suggestedPrice || 0)})
              </button>
              <button
                type="button"
                className="underline decoration-dotted"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    price: Number(((prev.price || 0) * 0.95).toFixed(2)),
                  }))
                }
              >
                -5% promo
              </button>
            </div>
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Cantidad</span>
            <input
              className="input-apple w-full"
              type="number"
              min={1}
              max={selectedProduct?.stock ?? undefined}
              value={form.qty}
              onChange={(e) => setForm((prev) => ({ ...prev, qty: Number(e.target.value) }))}
            />
            {selectedProduct && (
              <p className="apple-caption text-apple-gray-500">Stock disponible: {selectedProduct.stock} uds.</p>
            )}
          </label>
          {selectedProduct && (
            <div className="lg:col-span-4 grid gap-4 md:grid-cols-2">
              <ProductSummaryCard product={selectedProduct} marginPct={marginPct} total={totalPreview} qty={form.qty} />
            </div>
          )}
          <div className="lg:col-span-4 flex items-center justify-between border-t border-white/5 pt-4">
            <div className="text-left">
              <p className="apple-caption text-apple-gray-500">Total estimado</p>
              <p className="apple-h3 text-white">{money(totalPreview)}</p>
            </div>
            <button className="btn-primary" type="submit">
              Registrar y rebajar stock
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="apple-h3 text-white">Cartera de ventas</h3>
            <span className="apple-caption text-apple-gray-400">Actualizado en vivo</span>
          </div>
          <div className="divide-y divide-white/5">
            {sales.length === 0 && <p className="apple-caption text-apple-gray-400">Aún no registras ventas.</p>}
            {sales.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="apple-body text-white font-semibold">{s.productName}</div>
                  <div className="apple-caption text-apple-gray-400">
                    {s.branch} · {s.qty} unid · {money(s.price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="apple-body text-white">{money(s.total)}</div>
                  <div className="apple-caption text-apple-gray-500">{new Date(s.ts).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="apple-h3 text-white">Inventario en línea</h3>
            <span className="apple-caption text-apple-gray-400">Se rebaja al vender</span>
          </div>
          <div className="divide-y divide-white/5">
            {inventory.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="apple-body text-white font-semibold flex items-center gap-2">
                    {p.name}
                    {p.type === 'combo' && (
                      <span className="apple-caption px-2 py-0.5 rounded-full bg-apple-blue-500/20 border border-apple-blue-500/30 text-apple-blue-200">Combo</span>
                    )}
                  </div>
                  <div className="apple-caption text-apple-gray-400">{p.branch} · SKU {p.sku}</div>
                </div>
                <div className="text-right">
                  <div className={`apple-body ${p.stock <= (p.reorderPoint ?? 5) ? 'text-apple-orange-300' : 'text-white'}`}>
                    {p.stock} unid
                  </div>
                  <div className="apple-caption text-apple-gray-500">Precio ref. {money(p.price || 0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductSummaryCard({
  product,
  marginPct,
  total,
  qty,
}: {
  product: InventoryItem;
  marginPct: number | null;
  total: number;
  qty: number;
}) {
  return (
    <div className="glass-card p-4 border border-white/10 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="apple-caption text-apple-gray-400">Resumen de inventario</p>
          <p className="apple-body text-white font-semibold">{product.name}</p>
        </div>
        <div className="p-2 rounded-apple bg-apple-blue-500/20 border border-apple-blue-500/30 text-apple-blue-200">
          {product.type === 'combo' ? <Layers size={16} /> : <Package size={16} />}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="apple-caption text-apple-gray-500">Sucursal</dt>
          <dd className="text-white">{product.branch}</dd>
        </div>
        <div>
          <dt className="apple-caption text-apple-gray-500">SKU</dt>
          <dd className="text-white">{product.sku}</dd>
        </div>
        <div>
          <dt className="apple-caption text-apple-gray-500">Stock</dt>
          <dd className={product.stock <= (product.reorderPoint ?? 5) ? 'text-apple-orange-300' : 'text-white'}>
            {product.stock} unidades
          </dd>
        </div>
        <div>
          <dt className="apple-caption text-apple-gray-500">Rotación</dt>
          <dd className="text-white">{product.rotationDays ?? '—'} días</dd>
        </div>
        {product.cost && (
          <div>
            <dt className="apple-caption text-apple-gray-500">Costo reposición</dt>
            <dd className="text-white">{money(product.cost)}</dd>
          </div>
        )}
        <div>
          <dt className="apple-caption text-apple-gray-500">Cantidad pedido</dt>
          <dd className="text-white">{qty} unid.</dd>
        </div>
        <div>
          <dt className="apple-caption text-apple-gray-500">Total estimado</dt>
          <dd className="text-white">{money(total)}</dd>
        </div>
        {marginPct !== null && (
          <div>
            <dt className="apple-caption text-apple-gray-500">Margen</dt>
            <dd className={marginPct < 15 ? 'text-apple-orange-300' : 'text-apple-green-300'}>
              {marginPct.toFixed(1)}%
            </dd>
          </div>
        )}
      </dl>
      {product.components && product.components.length > 0 && (
        <div className="mt-4 rounded-apple bg-white/5 border border-white/10 p-3">
          <p className="apple-caption text-apple-gray-400 mb-2 flex items-center gap-1">
            <Sparkles size={14} /> Este combo incluye:
          </p>
          <ul className="list-disc list-inside text-apple-gray-200 text-sm space-y-1">
            {product.components.map((component) => (
              <li key={`${product.id}-${component.id}`}>{component.qty} × {component.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(n || 0);
}

function Kpi({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorMap: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  };
  return (
    <div className="glass-card p-4 border bg-white/5 hover:shadow-apple-lg transition-all duration-300">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-apple border bg-gradient-to-br ${colorMap[tone]}`}>
        {icon}
      </div>
      <div className="mt-3">
        <p className="apple-caption text-apple-gray-400">{label}</p>
        <p className="apple-h3 text-white">{value}</p>
      </div>
    </div>
  );
}
