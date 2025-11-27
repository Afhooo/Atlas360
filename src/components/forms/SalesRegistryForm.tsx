'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { demoInventory } from '@/lib/demo/mockData';

// --- DEFINICIÓN DE TIPOS ---
interface ProductSearchResult {
  code: string;
  name: string;
  stock: number | null;
  retail_price: number | null;
}

interface OrderItem {
  name: string;
  product_code: string | null;
  qty: number;
  unit_price: number;
  sale_type: 'mayor' | 'detalle' | null;
  is_recognized: boolean;
}

interface OrderState {
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  is_encomienda: boolean | null;
  location: string | null;
  destino: string;
  payment_method: string;
  payment_status: 'pagado' | 'pendiente' | null;
}

interface NewItemState {
  name: string;
  product_code: string | null;
  qty: number;
  unit_price: string;
  sale_type: 'mayor' | 'detalle' | null;
  is_recognized: boolean;
}

interface SuccessInfo {
  id: number;
  order_no: number | string | null;
}

// --- UTILITIES ---
const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((res) =>
    res.ok ? res.json() : Promise.reject(new Error('Error al cargar datos.'))
  );

const normalizeRole = (rawRole?: string): 'admin' | 'promotor' | 'unknown' => {
  const r = (rawRole || '').trim().toUpperCase();
  if (['GERENCIA', 'ADMIN', 'ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR', 'PROMOTORA'].includes(r)) return 'promotor';
  return 'unknown';
};

const mapRoleToSellerRole = (
  role?: string | null,
  rawRole?: string | null
): 'ASESOR' | 'PROMOTOR' | 'delivery' | 'repartidor' | null => {
  const candidates = [role, rawRole].filter(Boolean) as string[];
  for (const value of candidates) {
    const upper = value.trim().toUpperCase();
    if (upper === 'PROMOTOR' || upper === 'PROMOTORA') return 'PROMOTOR';
    if (['DELIVERY', 'LOGISTICA', 'REPARTIDOR', 'REPARTIDORA', 'RUTAS'].includes(upper)) {
      return 'delivery';
    }
  }
  return 'ASESOR';
};

const mapPaymentToEnum = (
  label: string | null | undefined
): 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | null => {
  const v = (label || '').trim().toUpperCase();
  if (v.startsWith('EFECT')) return 'EFECTIVO';
  if (v.includes('QR')) return 'QR';
  if (v.startsWith('TRANSF')) return 'TRANSFERENCIA';
  return null;
};

const getInitialOrderState = (): OrderState => ({
  items: [],
  customer_name: '',
  customer_phone: '',
  is_encomienda: null,
  location: null,
  destino: '',
  payment_method: '',
  payment_status: null,
});

// --- COMPONENTE COMPARTIDO DEL FORMULARIO ---
export default function SalesRegistryForm() {
    // Lógica de Permisos
    const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
    const userRole = useMemo(() => normalizeRole(me?.raw_role), [me?.raw_role]);
    const canAccess = me?.ok && (userRole === 'promotor' || userRole === 'admin');

    // Estados del Formulario
    const [order, setOrder] = useState<OrderState>(getInitialOrderState());
    const [isLoading, setIsLoading] = useState(false);
    const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
    const [productQuery, setProductQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
    const [comboOptions, setComboOptions] = useState<ProductSearchResult[]>([]);
    const [newItem, setNewItem] = useState<NewItemState>({
      name: '',
      product_code: null,
      qty: 1,
      unit_price: '',
      sale_type: null,
      is_recognized: false,
    });
    // Efectos

    // Carga inicial de productos para el combo (top 10 activos, con fallback a demoInventory)
    useEffect(() => {
        let active = true;
        (async () => {
          try {
            const res = await fetch('/endpoints/catalog?q=', { cache: 'no-store' });
            let mapped: ProductSearchResult[] = [];
            if (res.ok) {
              const json = await res.json();
              const items = Array.isArray(json?.items) ? json.items : [];
              mapped = items
                .map((p: any) => ({
                  code: String(p.code ?? '').trim(),
                  name: String(p.name ?? '').trim(),
                  stock: p.stock == null ? null : Number(p.stock) || 0,
                  retail_price: p.retail_price == null ? null : Number(p.retail_price) || 0,
                }))
                .filter((p: ProductSearchResult) => p.name && p.code);
            }
            // Fallback: usar catálogo demo si no hay resultados desde backend
            if (!mapped.length) {
              mapped = demoInventory.products.map((p) => ({
                code: String((p as any).sku ?? (p as any).id ?? '').trim(),
                name: String((p as any).name ?? '').trim(),
                stock: Number((p as any).stock ?? 0),
                retail_price: (p as any).price == null ? null : Number((p as any).price),
              }));
            }
            if (active) setComboOptions(mapped.slice(0, 12));
          } catch {
            if (!active) return;
            const mapped: ProductSearchResult[] = demoInventory.products.map((p) => ({
              code: String((p as any).sku ?? (p as any).id ?? '').trim(),
              name: String((p as any).name ?? '').trim(),
              stock: Number((p as any).stock ?? 0),
              retail_price: (p as any).price == null ? null : Number((p as any).price),
            }));
            setComboOptions(mapped.slice(0, 12));
          }
        })();
        return () => {
          active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const search = async () => {
            const q = productQuery.trim();
            if (q.length < 2) {
                if (active) setSearchResults([]);
                return;
            }
            try {
                const res = await fetch(`/endpoints/catalog?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
                let mapped: ProductSearchResult[] = [];
                if (res.ok) {
                  const json = await res.json();
                  const items = Array.isArray(json?.items) ? json.items : [];
                  mapped = items
                    .map((p: any) => ({
                      code: String(p.code ?? '').trim(),
                      name: String(p.name ?? '').trim(),
                      stock: p.stock == null ? null : Number(p.stock) || 0,
                      retail_price: p.retail_price == null ? null : Number(p.retail_price) || 0,
                    }))
                    .filter((p: ProductSearchResult) => p.name && p.code);
                }
                // Fallback local a demoInventory cuando backend no entrega nada
                if (!mapped.length) {
                  const qLower = q.toLowerCase();
                  mapped = demoInventory.products
                    .filter((p) => {
                      const name = String((p as any).name ?? '').toLowerCase();
                      const code = String((p as any).sku ?? (p as any).id ?? '').toLowerCase();
                      return name.includes(qLower) || code.includes(qLower);
                    })
                    .map((p) => ({
                      code: String((p as any).sku ?? (p as any).id ?? '').trim(),
                      name: String((p as any).name ?? '').trim(),
                      stock: Number((p as any).stock ?? 0),
                      retail_price: (p as any).price == null ? null : Number((p as any).price),
                    }));
                }
                if (active) setSearchResults(mapped.slice(0, 20));
            } catch {
                if (active) setSearchResults([]);
            }
        };
        const timeoutId = setTimeout(search, 300);
        return () => {
          active = false;
          clearTimeout(timeoutId);
        };
    }, [productQuery]);

    // Handlers
    const handleAddItem = () => {
        const query = productQuery.trim();
        if (!newItem.name || !newItem.qty) {
            if (query) {
                alert('Selecciona un producto del catálogo (haz clic en una opción) antes de añadir.');
            }
            return;
        }
        const finalItem: OrderItem = {
            name: newItem.name,
            product_code: newItem.product_code,
            qty: newItem.qty,
            unit_price: parseFloat(newItem.unit_price) || 0,
            sale_type: newItem.sale_type,
            is_recognized: newItem.is_recognized,
        };
        setOrder(prev => ({ ...prev, items: [...prev.items, finalItem] }));
        setNewItem({
          name: '',
          product_code: null,
          qty: 1,
          unit_price: '',
          sale_type: null,
          is_recognized: false,
        });
        setProductQuery('');
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setOrder(prev => ({ ...prev, items: prev.items.filter((_, index) => index !== indexToRemove) }));
    };
    
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^[0-9]*$/.test(value)) {
            setOrder(p => ({ ...p, customer_phone: value }));
        }
    };

    const updateItem = (index: number, updates: Partial<OrderItem>) => {
        setOrder(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item)
        }));
    };

    const handleSaveOrder = async () => {
        if (!me?.ok) {
            alert('No se pudo obtener la sesión del vendedor.');
            return;
        }

        // Validación rápida tipo CRM en una sola vista
        if (!order.items.length) {
          alert('Agrega al menos un producto al pedido.');
          return;
        }
        const invalidItem = order.items.find(
          (it) =>
            !it.name?.trim() ||
            !it.sale_type ||
            !Number.isFinite(it.unit_price) ||
            it.unit_price <= 0 ||
            !Number.isFinite(it.qty) ||
            it.qty <= 0
        );
        if (invalidItem) {
          alert('Revisa productos: tipo de venta, cantidad y precio unitario.');
          return;
        }
        if (!order.customer_name?.trim() || !order.customer_phone?.trim()) {
          alert('Completa nombre y teléfono del cliente.');
          return;
        }
        if (order.is_encomienda === null) {
          alert('Selecciona si es entrega local o encomienda.');
          return;
        }
        if (order.is_encomienda && !order.destino?.trim()) {
          alert('Ingresa el destino de la encomienda.');
          return;
        }
        if (!order.is_encomienda && !order.location?.trim()) {
          alert('Ingresa la dirección o referencia de entrega local.');
          return;
        }
        if (!order.payment_method || !order.payment_status) {
          alert('Selecciona método de pago y estado (pagado / pendiente).');
          return;
        }

        setIsLoading(true);

        const sellerName: string = me.full_name || me.username || 'Vendedor CRM';
        const sellerRole = mapRoleToSellerRole(me.role, me.raw_role);
        const salesUserId: string | null = me.person_pk || me.auth_user_id || null;
        const local: 'La Paz' | 'El Alto' | 'Cochabamba' | 'Santa Cruz' | 'Sucre' =
          (me.local as any) && ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz', 'Sucre'].includes(me.local)
            ? (me.local as any)
            : 'Santa Cruz';

        const allWholesale = order.items.length > 0 && order.items.every((i) => i.sale_type === 'mayor');
        const saleTypeOrder: 'unidad' | 'mayor' = allWholesale ? 'mayor' : 'unidad';

        const destino = (order.is_encomienda ? order.destino : order.location) || 'Sin destino';
        const address = order.location || order.destino || null;
        const paymentMethodEnum = mapPaymentToEnum(order.payment_method);
        const paymentNote =
          order.payment_status === 'pendiente'
            ? 'Pago pendiente (registrado desde CRM)'
            : 'Pago registrado como pagado (CRM)';

        const itemsPayload = order.items.map((item) => ({
          product_code: item.product_code || null,
          product_name: item.name,
          quantity: item.qty,
          unit_price: item.unit_price,
          sale_type: item.sale_type,
          image_url: null,
          original_name: item.name,
          is_recognized: item.is_recognized,
          base_product_name: null,
        }));

        try {
          const resp = await fetch('/endpoints/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sale_type: saleTypeOrder,
              local,
              seller: sellerName,
              seller_role: sellerRole,
              sales_user_id: salesUserId,
              sales_role: null,
              destino,
              customer_id: 'S/N',
              customer_phone: order.customer_phone || null,
              numero: null,
              customer_name: order.customer_name,
              payment_method: paymentMethodEnum,
              address,
              notes: paymentNote,
              delivery_date: null,
              delivery_from: null,
              delivery_to: null,
              sistema: false,
              items: itemsPayload,
            }),
          });

          let data: any = null;
          try {
            data = await resp.json();
          } catch {
            // noop
          }

          if (!resp.ok) {
            console.error('ORDERS CRM 4xx/5xx →', resp.status, data);
            alert(data?.details || data?.error || `El servidor rechazó el pedido (${resp.status}).`);
            setIsLoading(false);
            return;
          }

          setSuccessInfo({ id: data.id ?? 0, order_no: data.order_no ?? data.id ?? null });
        } catch (e: any) {
          console.error('Error guardando pedido CRM', e);
          alert(e?.message || 'Error al guardar el pedido.');
        } finally {
          setIsLoading(false);
        }
    };

    // Guardia de Permisos
    if (meLoading) {
        return <div className="text-center text-gray-400 p-8">Verificando permisos...</div>;
    }

    if (!canAccess) {
        return (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-rose-200 max-w-md mx-auto">
                No tienes permisos para esta página.
            </div>
        );
    }
    
    // Vista de Éxito
    if (successInfo) {
        return (
            <div className="text-center p-8 bg-gray-900 rounded-lg max-w-lg mx-auto">
                <h2 className="text-3xl font-bold text-green-400 mb-4">¡Pedido Guardado con Éxito!</h2>
                <p className="text-lg text-gray-300">Se ha registrado el pedido: <strong className="text-white">#{successInfo.order_no || successInfo.id}</strong></p>
                <button 
                  onClick={() => { 
                    setOrder(getInitialOrderState()); 
                    setSuccessInfo(null); 
                  }} 
                  className="mt-8 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg text-lg"
                >
                    Registrar Nuevo Pedido
                </button>
            </div>
        );
    }

    const total = order.items.reduce((sum, item) => sum + (item.qty * (item.unit_price || 0)), 0);
    
    return (
        <div className="glass-card p-4 sm:p-6 space-y-6">
            <h1 className="apple-h2 text-white mb-2">Nuevo pedido</h1>
            
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Productos</h2>
                    <p className="text-xs text-gray-400">
                      Busca en catálogo, selecciona el producto y agrégalo al pedido. Debajo verás el detalle consolidado.
                    </p>
                  </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end p-4 border border-gray-700 rounded-lg bg-gray-900/60">
                    <div className="md:col-span-4 relative">
                        <label className="block text-sm font-medium text-gray-300">Buscar / seleccionar Producto</label>
                        <input
                          type="text"
                          role="combobox"
                          aria-expanded={searchResults.length > 0}
                          aria-autocomplete="list"
                          value={productQuery}
                          onChange={(e) => setProductQuery(e.target.value)}
                          className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                          placeholder="Escribe nombre o código (ej: IP15) y elige de la lista"
                        />
                        {/* Combo fijo con los más usados */}
                        {comboOptions.length > 0 && (
                          <select
                            className="mt-2 w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                            defaultValue=""
                            onChange={(e) => {
                              const code = e.target.value;
                              if (!code) return;
                              const p = comboOptions.find((opt) => opt.code === code);
                              if (!p) return;
                              setNewItem((prev) => ({
                                ...prev,
                                name: p.name,
                                product_code: p.code,
                                unit_price: (p.retail_price ?? 0).toString(),
                                is_recognized: true,
                              }));
                              setProductQuery(`${p.name} (${p.code})`);
                            }}
                          >
                            <option value="">Seleccionar desde catálogo rápido…</option>
                            {comboOptions.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name} ({p.code}){p.stock !== null ? ` · Stock ${p.stock}` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                                {searchResults.map((p) => (
                                  <button
                                    type="button"
                                    key={p.code}
                                    onClick={() => {
                                      setNewItem(prev => ({
                                        ...prev,
                                        name: p.name,
                                        product_code: p.code,
                                        unit_price: (p.retail_price ?? 0).toString(),
                                        is_recognized: true,
                                      }));
                                      setProductQuery(`${p.name} (${p.code})`);
                                      setSearchResults([]);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                                  >
                                    <div className="text-white">{p.name}</div>
                                    <div className="text-xs text-gray-400">
                                      SKU {p.code}
                                      {p.stock !== null && ` · Stock ${p.stock}`}
                                      {p.retail_price !== null && ` · Bs ${p.retail_price.toFixed(2)}`}
                                    </div>
                                  </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Cant.</label>
                        <input
                          type="number"
                          min={1}
                          value={newItem.qty}
                          onChange={(e) => setNewItem(p => ({...p, qty: parseInt(e.target.value) || 1}))}
                          className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <button
                          onClick={handleAddItem}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm"
                        >
                          Añadir al Pedido
                        </button>
                    </div>
                </div>

                {/* Tabla de resumen de ítems */}
                {order.items.length > 0 && (
                  <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-800 text-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Producto</th>
                          <th className="px-3 py-2 text-left hidden md:table-cell">SKU</th>
                          <th className="px-3 py-2 text-right">Cant.</th>
                          <th className="px-3 py-2 text-right hidden md:table-cell">Precio</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-900/40">
                        {order.items.map((item, index) => {
                          const subtotal = item.qty * (item.unit_price || 0);
                          return (
                            <tr key={`${item.product_code || item.name}-${index}`}>
                              <td className="px-3 py-2">
                                <div className="text-white text-sm font-medium truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  {item.is_recognized ? 'Vinculado a inventario' : 'Sin normalizar'}
                                  {item.sale_type && ` · ${item.sale_type}`}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-300 hidden md:table-cell">
                                {item.product_code || '—'}
                              </td>
                              <td className="px-3 py-2 text-right">{item.qty}</td>
                              <td className="px-3 py-2 text-right hidden md:table-cell">
                                {item.unit_price ? `Bs ${item.unit_price.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {subtotal ? `Bs ${subtotal.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                  aria-label="Quitar producto"
                                >
                                  Quitar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </section>

            {/* Cliente */}
            <section className="mt-6 grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Cliente</h2>
                <label className="block text-sm text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={order.customer_name}
                  onChange={(e) => setOrder((p) => ({ ...p, customer_name: e.target.value }))}
                  className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                  placeholder="Nombre completo del cliente"
                />
              </div>
              <div className="mt-6 md:mt-0">
                <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={order.customer_phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                  placeholder="Solo números (WhatsApp)"
                />
              </div>
            </section>

            {/* Entrega */}
            <section className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold">Entrega</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setOrder((p) => ({ ...p, is_encomienda: false }))}
                  className={`px-3 py-2 rounded text-sm border ${
                    order.is_encomienda === false
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-200'
                  }`}
                >
                  🛵 Entrega local
                </button>
                <button
                  type="button"
                  onClick={() => setOrder((p) => ({ ...p, is_encomienda: true }))}
                  className={`px-3 py-2 rounded text-sm border ${
                    order.is_encomienda === true
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-200'
                  }`}
                >
                  📦 Encomienda
                </button>
              </div>
              {order.is_encomienda === true && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Destino de la encomienda</label>
                  <input
                    type="text"
                    value={order.destino}
                    onChange={(e) => setOrder((p) => ({ ...p, destino: e.target.value }))}
                    className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                    placeholder="Ciudad / departamento / referencia"
                  />
                </div>
              )}
              {order.is_encomienda === false && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Dirección de entrega</label>
                  <input
                    type="text"
                    value={order.location || ''}
                    onChange={(e) => setOrder((p) => ({ ...p, location: e.target.value }))}
                    className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-600 text-sm"
                    placeholder="Dirección o link de Google Maps"
                  />
                </div>
              )}
            </section>

            {/* Pago */}
            <section className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold">Pago</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Forma de pago</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setOrder((p) => ({ ...p, payment_method: 'Efectivo' }))}
                      className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm ${
                        order.payment_method === 'Efectivo' ? 'ring-2 ring-yellow-300' : ''
                      }`}
                    >
                      💵 Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrder((p) => ({ ...p, payment_method: 'QR' }))}
                      className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm ${
                        order.payment_method === 'QR' ? 'ring-2 ring-yellow-300' : ''
                      }`}
                    >
                      📲 QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrder((p) => ({ ...p, payment_method: 'Transferencia' }))}
                      className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm ${
                        order.payment_method === 'Transferencia' ? 'ring-2 ring-yellow-300' : ''
                      }`}
                    >
                      🏦 Transferencia
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Estado del pago</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrder((p) => ({ ...p, payment_status: 'pagado' }))}
                      className={`flex-1 py-2 px-3 rounded bg-green-600 text-white text-sm font-semibold ${
                        order.payment_status === 'pagado' ? 'ring-2 ring-green-300' : ''
                      }`}
                    >
                      Pagado
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrder((p) => ({ ...p, payment_status: 'pendiente' }))}
                      className={`flex-1 py-2 px-3 rounded bg-yellow-500 text-gray-900 text-sm font-semibold ${
                        order.payment_status === 'pendiente' ? 'ring-2 ring-yellow-300' : ''
                      }`}
                    >
                      Pendiente
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Resumen y Confirmar */}
            <section className="mt-8 pt-4 border-t border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-gray-300">
                <p>
                  <span className="font-semibold text-white">{order.items.length}</span> producto(s){' '}
                  · Total estimado:{' '}
                  <span className="font-semibold text-green-300">Bs. {total.toFixed(2)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Cliente: {order.customer_name || '—'} {order.customer_phone && `(${order.customer_phone})`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={isLoading || !order.items.length}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded text-sm md:text-base"
              >
                {isLoading ? 'Guardando...' : 'Confirmar y Guardar Pedido'}
              </button>
            </section>
        </div>
    );
}
