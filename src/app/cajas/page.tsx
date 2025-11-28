'use client';

import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, CircleDollarSign, ScanLine, Plus, Minus, Trash2 } from 'lucide-react';
import { demoCajas } from '@/lib/demo/mockData';
import { useDemoOps, recordDemoSale } from '@/lib/demo/state';
import { SectionCard } from '@/components/ui/SectionCard';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { findProductByCode, normalizeBarcode } from '@/lib/utils/barcodes';

type Cierre = (typeof demoCajas)[number] & { cajero?: string };
type PosLine = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  branch: string;
  code: string;
};

export default function CajasPage() {
  const snapshot = useDemoOps();
  const inventory = snapshot.inventory;
  const [cart, setCart] = useState<PosLine[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState<{ type: 'ok' | 'error'; code: string; message: string } | null>(null);
  const [posMessage, setPosMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cartTotals = useMemo(() => {
    const total = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
    const items = cart.reduce((sum, line) => sum + line.qty, 0);
    return { total, items };
  }, [cart]);

  const handleScan = useCallback(
    (rawCode: string) => {
      const normalized = normalizeBarcode(rawCode);
      if (!normalized) return;
      const product = findProductByCode(inventory, normalized);

      if (!product) {
        setScanStatus({ type: 'error', code: normalized, message: 'Código no encontrado' });
        return;
      }
      if (product.stock <= 0) {
        setScanStatus({ type: 'error', code: normalized, message: `${product.name} sin stock` });
        return;
      }

      let nextQty = 1;
      setCart((prev) => {
        const existing = prev.find((line) => line.productId === product.id);
        const maxQty = product.stock;
        if (existing) {
          nextQty = Math.min(existing.qty + 1, maxQty);
          return prev.map((line) =>
            line.productId === product.id ? { ...line, qty: nextQty } : line
          );
        }
        nextQty = 1;
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            qty: 1,
            price: product.price || 0,
            branch: product.branch,
            code: product.barcode || product.sku || product.id,
          },
        ];
      });

      setScanStatus({ type: 'ok', code: normalized, message: `${product.name} x${nextQty}` });
    },
    [inventory]
  );

  useBarcodeScanner({ onScan: handleScan });

  const handleManualAdd = () => {
    if (!manualCode.trim()) return;
    handleScan(manualCode);
    setManualCode('');
  };

  const adjustQty = (productId: string, delta: number) => {
    const product = inventory.find((p) => p.id === productId);
    const maxQty = product?.stock ?? Infinity;
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.productId !== productId) return line;
          const nextQty = Math.min(Math.max(line.qty + delta, 0), maxQty);
          return { ...line, qty: nextQty };
        })
        .filter((line) => line.qty > 0)
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPosMessage(null);
  };

  const finalizeCart = () => {
    if (!cart.length) return;
    try {
      cart.forEach((line) => {
        recordDemoSale({
          productId: line.productId,
          qty: line.qty,
          price: line.price,
          channel: 'Caja supermercado',
          payment: { method: 'POS', status: 'pagado' },
          customer: { name: 'Cliente supermercado' },
          notes: 'Lectura con escáner en caja rápida',
        });
      });
      setCart([]);
      setPosMessage({ type: 'success', text: 'Ticket enviado a caja y registrado en ventas.' });
      setScanStatus(null);
    } catch (error: any) {
      setPosMessage({ type: 'error', text: error?.message || 'No se pudo registrar la venta.' });
    }
  };
  const cierres: Cierre[] = demoCajas.map((c, idx) =>
    idx === 0
      ? { ...c, declarado: snapshot.cash, sistema: snapshot.cash, estado: 'Cuadrado', diferencias: 0 }
      : c
  );
  const cuadradas = cierres.filter((c) => c.estado === 'Cuadrado').length;
  const pendientes = cierres.length - cuadradas;

  const hoy = cierres[0];
  const totalDeclarado = cierres.reduce((sum, c) => sum + (c.declarado || 0), 0);
  const totalSistema = cierres.reduce((sum, c) => sum + (c.sistema || 0), 0);
  const totalDiferencias = cierres.reduce((sum, c) => sum + (c.diferencias || 0), 0);
  const diffPct = totalSistema === 0 ? 0 : (totalDiferencias / totalSistema) * 100;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Cajas y Cuadraturas</h1>
        <p className="apple-body text-apple-gray-400">
          Aperturas y cierres diarios con estado de cuadratura.
        </p>
      </header>

      {hoy && (
        <section className="glass-card p-4 sm:p-6 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2 space-y-1">
            <p className="apple-caption text-apple-gray-400">Fecha</p>
            <p className="apple-body font-semibold text-white">{hoy.fecha}</p>
            <p className="apple-caption text-apple-gray-500">Sucursal: {hoy.local}</p>
          </div>
          <div className="space-y-1">
            <p className="apple-caption text-apple-gray-400">Cajero responsable</p>
            <p className="apple-body font-semibold text-white">{hoy.cajero || 'Cajero demo'}</p>
          </div>
          <div className="space-y-1">
            <p className="apple-caption text-apple-gray-400">Estado</p>
            <p className={`apple-body font-semibold ${hoy.diferencias === 0 ? 'text-apple-green-300' : 'text-apple-orange-300'}`}>
              {hoy.estado} · Dif: {money(hoy.diferencias)}
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<CheckCircle2 size={18} />} label="Cuadradas" value={cuadradas} tone="green" />
        <Kpi icon={<AlertTriangle size={18} />} label="Con diferencia" value={pendientes} tone="orange" />
        <Kpi icon={<CircleDollarSign size={18} />} label="Cierres revisados" value={cierres.length} tone="blue" />
      </section>

      <section className="glass-card p-4 sm:p-6 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2 space-y-2">
          <h2 className="apple-h3 text-white">Resumen financiero del día</h2>
          <p className="apple-caption text-apple-gray-400">
            Consolidado de todas las cajas: declarado vs sistema y diferencia total.
          </p>
        </div>
        <div className="space-y-1">
          <p className="apple-caption text-apple-gray-400">Total declarado</p>
          <p className="font-mono text-sm text-white">{money(totalDeclarado)}</p>
        </div>
        <div className="space-y-1">
          <p className="apple-caption text-apple-gray-400">Total sistema</p>
          <p className="font-mono text-sm text-white">{money(totalSistema)}</p>
        </div>
        <div className="space-y-1">
          <p className="apple-caption text-apple-gray-400">Diferencia global</p>
          <p className={`font-mono text-sm ${totalDiferencias === 0 ? 'text-apple-green-300' : totalDiferencias < 0 ? 'text-apple-red-300' : 'text-apple-orange-300'}`}>
            {money(totalDiferencias)} ({diffPct.toFixed(2)}%)
          </p>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="apple-h3 text-white flex items-center gap-2">
              <ScanLine size={18} className="text-apple-blue-300" />
              Caja supermercado (beta)
            </h2>
            <p className="apple-caption text-apple-gray-400">
              Escanea códigos de barra para sumar ítems y enviarlos a caja sin tocar el mouse.
            </p>
          </div>
          <span className="apple-caption text-apple-gray-400">
            {cartTotals.items} ítems · {money(cartTotals.total)}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="input-apple"
                placeholder="Escanea o escribe código / SKU"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualAdd();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleManualAdd}
                disabled={!manualCode.trim()}
              >
                Añadir
              </button>
            </div>
            {scanStatus && (
              <div
                className={`rounded-apple border px-3 py-2 text-sm flex items-center gap-2 ${
                  scanStatus.type === 'ok'
                    ? 'border-apple-green-500/40 bg-apple-green-500/10 text-apple-green-100'
                    : 'border-apple-red-500/40 bg-apple-red-500/10 text-apple-red-100'
                }`}
              >
                <ScanLine size={14} />
                <span>
                  {scanStatus.type === 'ok'
                    ? `${scanStatus.message} listo (${scanStatus.code})`
                    : `${scanStatus.message} (${scanStatus.code})`}
                </span>
              </div>
            )}
            <div className="rounded-apple border border-white/5 bg-black/20 overflow-hidden">
              {cart.length === 0 ? (
                <p className="apple-caption text-apple-gray-400 p-4">
                  Escanea productos para comenzar. Cada beep suma unidades y calcula el total.
                </p>
              ) : (
                <div className="overflow-auto max-h-72">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-apple-gray-400">
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3">Cantidad</th>
                        <th className="py-2 px-3 text-right">Precio</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {cart.map((line) => (
                        <tr key={line.productId} className="text-white/90">
                          <td className="py-2 px-3">
                            <div className="font-semibold">{line.name}</div>
                            <div className="apple-caption text-apple-gray-500">{line.branch}</div>
                          </td>
                          <td className="py-2 px-3">{line.code}</td>
                          <td className="py-2 px-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2 py-1 bg-black/30">
                              <button type="button" onClick={() => adjustQty(line.productId, -1)} className="text-apple-gray-300 hover:text-white">
                                <Minus size={12} />
                              </button>
                              <span className="font-semibold">{line.qty}</span>
                              <button type="button" onClick={() => adjustQty(line.productId, 1)} className="text-apple-gray-300 hover:text-white">
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">{money(line.price)}</td>
                          <td className="py-2 px-3 text-right">{money(line.price * line.qty)}</td>
                          <td className="py-2 px-3 text-right">
                            <button type="button" onClick={() => removeLine(line.productId)} className="text-apple-red-300 hover:text-apple-red-200">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-apple border border-white/10 bg-white/5 p-4 space-y-1">
              <p className="apple-caption text-apple-gray-400">Total carrito</p>
              <p className="apple-h2 text-white">{money(cartTotals.total)}</p>
              <p className="apple-caption text-apple-gray-500">{cartTotals.items} ítems listos para cobrar</p>
            </div>
            {posMessage && (
              <div
                className={`rounded-apple border px-3 py-2 text-sm ${
                  posMessage.type === 'success'
                    ? 'border-apple-green-500/40 bg-apple-green-500/10 text-apple-green-100'
                    : 'border-apple-red-500/40 bg-apple-red-500/10 text-apple-red-100'
                }`}
              >
                {posMessage.text}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={clearCart}
                disabled={!cart.length}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={finalizeCart}
                disabled={!cart.length}
              >
                Registrar en caja
              </button>
            </div>
          </div>
        </div>
      </section>

      <SectionCard title="Cierres recientes">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4 text-right">Declarado</th>
                <th className="py-2 pr-4 text-right">Sistema</th>
                <th className="py-2 pr-4 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cierres.map((c) => (
                <tr key={c.id} className="text-white/90">
                  <td className="py-2 pr-4">{c.fecha}</td>
                  <td className="py-2 pr-4">{c.local}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        c.estado === 'Cuadrado'
                          ? 'bg-apple-green-500/20 text-apple-green-200'
                          : 'bg-apple-orange-500/20 text-apple-orange-200'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{money(c.declarado)}</td>
                  <td className="py-2 pr-4 text-right">{money(c.sistema)}</td>
                  <td className={`py-2 pr-4 text-right ${c.diferencias === 0 ? 'text-apple-gray-300' : 'text-apple-orange-300'}`}>
                    {money(c.diferencias)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(n || 0);
}

function Kpi({
  icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'orange';
}) {
  const colorMap: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
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
