'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Textarea } from '@/components/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Separator } from '@/components/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Plus, Trash2, Search, CheckCircle, XCircle,
  AlertTriangle, User, CreditCard, Truck, ClipboardPaste, PackageSearch, Check,
  MapPin, ExternalLink, Copy
} from 'lucide-react';

type ProductSearchResult = { name: string; code: string; image_url?: string | null };
type PaymentMethod = { method: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA'; amount: number };
type DisplayOrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  product_code?: string | null;
  sale_type?: 'WHOLESALE' | 'RETAIL';
  image_url?: string | null;
  is_uploading_image?: boolean;
  is_recognized?: boolean | null;
  original_name?: string;
  similar_options: ProductSearchResult[];
};

type PartialOrder = {
  items: DisplayOrderItem[];
  is_encomienda: boolean;
  address: string;
  normalized_address: string | null;
  normalized_details?: {
    street?: string;
    neighbourhood?: string;
    suburb?: string;
    district?: string;
    city?: string;
    state?: string;
    county?: string;
    postcode?: string;
    country?: string;
  } | null;
  normalized_confidence?: number | null;
  normalized_source?: 'opencage' | 'nominatim' | 'fallback' | null;
  address_url: string;
  lat?: number;
  lng?: number;
  destino: string;
  delivery_date: string;
  delivery_from: string;
  delivery_to: string;
  notes: string;
  customer_name: string;
  customer_id: string;
  customer_phone: string;
  payments: PaymentMethod[];
  seller_name: string;
  seller_role: 'ASESOR' | 'PROMOTOR' | 'delivery' | 'repartidor' | null;
  sales_user_id: string | null;
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const formatTime = (date: Date): string => date.toTimeString().slice(0, 5);

const getInitialOrderState = (
  sellerName = 'Vendedor',
  sellerRole: PartialOrder['seller_role'] = null,
  salesUserId: string | null = null
): PartialOrder => {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    items: [],
    is_encomienda: false,
    address: '',
    normalized_address: null,
    normalized_details: null,
    normalized_confidence: null,
    normalized_source: null,
    address_url: '',
    destino: '',
    delivery_date: formatDate(now),
    delivery_from: formatTime(now),
    delivery_to: formatTime(oneHour),
    notes: '',
    customer_name: '',
    customer_id: 'S/N',
    customer_phone: '',
    payments: [],
    seller_name: sellerName,
    seller_role: sellerRole,
    sales_user_id: salesUserId,
  };
};

const normalizePhone = (phone: string) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('591')) return cleaned;
  if (cleaned.length === 8 && (cleaned.startsWith('6') || cleaned.startsWith('7'))) return `591${cleaned}`;
  return cleaned;
};

function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

const mapRoleToSellerRole = (
  role?: string | null,
  rawRole?: string | null
): PartialOrder['seller_role'] => {
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

export default function CapturaPage() {
  const [order, setOrder] = useState<PartialOrder>(getInitialOrderState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  // ---- CARGA VENDEDOR ----
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok || !d?.ok) throw new Error(d?.error || 'Sesión inválida');
        const mappedRole = mapRoleToSellerRole(d.role, d.raw_role);
        const salesUserId = d.person_pk || d.auth_user_id || null;
        setOrder(p => ({
          ...p,
          seller_name: d.full_name || 'Vendedor',
          seller_role: mappedRole,
          sales_user_id: salesUserId,
        }));
      } catch {
        setOrder(p => ({
          ...p,
          seller_name: 'Vendedor',
          seller_role: 'ASESOR',
          sales_user_id: null,
        }));
      }
    })();
  }, []);

  // ---- MAP SEARCH RESPONSE ----
  const mapSearchResponse = (j: any): ProductSearchResult[] => {
    const arr = j?.results || j?.items || j || [];
    return (Array.isArray(arr) ? arr : []).map((x: any) => ({
      name: x.name || x.product_name || x.title || '',
      code: x.code || x.sku || x.id || '',
      image_url: x.image_url || x.thumbnail || null,
    })).filter((x: ProductSearchResult) => x.name);
  };

  // ---- INVENTORY SEARCH ----
  const fetchSimilar = useCallback(async (term: string): Promise<ProductSearchResult[]> => {
    const q = (term || '').trim();
    if (q.length < 2) return [];
    try {
      const r = await fetch(`/endpoints/products/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Error buscando en inventario');
      return mapSearchResponse(j);
    } catch {
      return [];
    }
  }, []);

  const debouncers = useRef<Record<number, (v: string) => void>>({});

  const makeDebouncedSimilarUpdater = useCallback((idx: number) => {
    if (!debouncers.current[idx]) {
      debouncers.current[idx] = debounce(async (value: string) => {
        const options = await fetchSimilar(value);
        setOrder(p => {
          const items = [...p.items];
          const it = items[idx];
          if (!it) return p;
          items[idx] = { ...it, similar_options: options, is_recognized: options.length ? false : null };
          return { ...p, items };
        });
      }, 350);
    }
    return debouncers.current[idx];
  }, [fetchSimilar]);

  // ---- VALIDACIONES POR PASO ----
  const isStep2Valid = useMemo(() =>
    order.items.length > 0 &&
    order.items.every(it =>
      it.product_name.trim() !== '' &&
      Number(it.quantity) > 0 &&
      Number(it.unit_price) > 0 &&
      it.is_recognized === true
    ), [order.items]);

  // Ubicación obligatoria (dirección o URL normalizada)
  const isStep3Valid = useMemo(() =>
    !!order.address.trim() || !!order.normalized_address
  , [order.address, order.normalized_address]);

  const isStep4Valid = useMemo(() =>
    !!order.customer_name.trim() &&
    !!order.customer_phone.trim()
  , [order.customer_name, order.customer_phone]);

  // ---- TOTAL ----
  const total = useMemo(
    () => order.items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0),
    [order.items]
  );

  const normalizedDetailEntries = useMemo(() => {
    const details = order.normalized_details || {};
    const entries = [
      { label: 'Calle', value: details?.street },
      { label: 'Barrio / Zona', value: details?.neighbourhood || details?.suburb },
      { label: 'Distrito', value: details?.district },
      { label: 'Ciudad', value: details?.city },
      { label: 'Departamento', value: details?.state || details?.county },
      { label: 'Código Postal', value: details?.postcode },
      { label: 'País', value: details?.country },
    ].filter(entry => entry.value);

    if (order.lat !== undefined && order.lng !== undefined) {
      entries.push({ label: 'Coordenadas', value: `${order.lat.toFixed(6)}, ${order.lng.toFixed(6)}` });
    }

    return entries;
  }, [order.normalized_details, order.lat, order.lng]);

  const mapUrl = useMemo(() => {
    if (order.address_url) return order.address_url;
    if (order.lat !== undefined && order.lng !== undefined) {
      return `https://www.google.com/maps/?q=${order.lat},${order.lng}`;
    }
    return '';
  }, [order.address_url, order.lat, order.lng]);

  // ---- ITEM HELPERS ----
  const updateItem = (index: number, patch: Partial<DisplayOrderItem>) => {
    setOrder(p => {
      const items = [...p.items];
      items[index] = { ...items[index], ...patch };
      return { ...p, items };
    });
  };
  const removeItem = (index: number) => {
    setOrder(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const addEmptyItem = () => {
    setOrder(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_name: '',
          original_name: '',
          quantity: 1,
          unit_price: 0,
          sale_type: 'RETAIL',
          product_code: null,
          image_url: null,
          is_uploading_image: false,
          is_recognized: null,
          similar_options: [],
        },
      ],
    }));
  };

  const handleCopyToClipboard = useCallback(async (value: string, successMessage: string) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('Clipboard API no disponible');
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }, []);

  // ---- GEOCODING (paso 3) ----
  const handleGeocodeAddress = async () => {
    const text = order.address?.trim() || '';
    if (!text) { toast.error('Ingresa la dirección o URL'); return; }
    if (text.length < 5) { toast.error('Dirección demasiado corta'); return; }
    setIsGeocoding(true);
    setGeocodeMsg(null);
    try {
      const r = await fetch('/endpoints/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Error geocodificando');

      let formatted: string | null = null;
      let lat: number | undefined;
      let lng: number | undefined;
      let details: PartialOrder['normalized_details'] = null;
      let confidence: number | null = null;
      let source: PartialOrder['normalized_source'] = null;

      if (d?.formatted) {
        formatted = d.formatted;
        lat = d.lat;
        lng = d.lng;
        details = d.components || null;
        confidence = typeof d.confidence === 'number' ? d.confidence : null;
        source = d.source || null;
      } else if (Array.isArray(d?.results) && d.results[0]) {
        formatted = d.results[0].formatted || null;
        lat = d.results[0].geometry?.lat;
        lng = d.results[0].geometry?.lng;
        details = d.results[0].components || null;
        confidence = typeof d.results[0].confidence === 'number' ? d.results[0].confidence : null;
        source = (d.results[0].source as PartialOrder['normalized_source']) || null;
      }

      if (!formatted) throw new Error('Sin resultados');

      const maybeUrl = /^https?:\/\//i.test(text) ? text : '';
      const fallbackMapUrl = lat !== undefined && lng !== undefined
        ? `https://www.google.com/maps/?q=${lat},${lng}`
        : '';

      setOrder(p => {
        const next: PartialOrder = {
          ...p,
          normalized_address: formatted,
          normalized_details: details,
          normalized_confidence: confidence,
          normalized_source: source,
          lat,
          lng,
          address_url: maybeUrl || fallbackMapUrl || p.address_url,
        };

        const suggestedDestino = [
          details?.neighbourhood || details?.suburb || details?.district,
          details?.city,
        ].filter(Boolean).join(', ');

        if (!p.destino.trim() && suggestedDestino) {
          next.destino = suggestedDestino;
        }

        return next;
      });

      setGeocodeMsg({ ok: true, msg: formatted });
      toast.success('Dirección verificada');
    } catch (e: any) {
      setGeocodeMsg({ ok: false, msg: e?.message || 'Error' });
      toast.error('No se pudo verificar');
    } finally {
      setIsGeocoding(false);
    }
  };

  // ---- SUBMIT (paso 5) ----
  const submitOrder = async () => {
    if (order.items.length === 0) return toast.error('Agrega al menos 1 producto.');
    if (!order.customer_phone?.trim()) return toast.error('Falta el número del cliente.');
    if (!order.customer_name?.trim()) return toast.error('Falta el nombre del cliente.');
    if (!(order.normalized_address || order.address?.trim())) return toast.error('Falta la ubicación (dirección o URL).');

    const invalidItem = order.items.find(it =>
      !it.product_name?.trim() ||
      Number(it.quantity) <= 0 ||
      Number(it.unit_price) <= 0 ||
      it.is_recognized !== true
    );
    if (invalidItem) return toast.error('Revisa productos: nombre/cantidad/precio/normalización.');

    const payTotal = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const productsTotal = order.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
    if (Math.abs(productsTotal - payTotal) > 0.01) return toast.error('El total de pagos no cuadra.');
    if (payTotal > 0 && order.payments.length !== 1) return toast.error('Por ahora usa un solo método de pago.');

    setIsProcessing(true);
    try {
      const allWholesale = order.items.length > 0 && order.items.every(i => i.sale_type === 'WHOLESALE');
      const saleTypeOrder: 'unidad' | 'mayor' = allWholesale ? 'mayor' : 'unidad';
      const mainMethod = payTotal > 0 ? order.payments[0].method : null;
      const sellerRole = order.seller_role ?? 'ASESOR';
      const salesRole: 'ASESOR' | 'PROMOTOR' | null =
        sellerRole === 'PROMOTOR' ? 'PROMOTOR' : sellerRole === 'ASESOR' ? 'ASESOR' : null;

      const payload = {
        seller: order.seller_name,
        seller_role: sellerRole,
        sales_user_id: order.sales_user_id,
        sales_role: salesRole,
        sale_type: saleTypeOrder,
        local: 'Santa Cruz' as const, // default sucursal
        destino: order.destino || null,
        customer_id: order.customer_id.trim() || 'S/N',
        customer_phone: normalizePhone(order.customer_phone),
        customer_name: order.customer_name.trim(),
        numero: null as string | null,
        payment_method: mainMethod,
        address: order.normalized_address || order.address || null,
        notes: order.notes || null,
        delivery_date: order.delivery_date || null,
        delivery_from: order.delivery_from || null,
        delivery_to: order.delivery_to || null,
        sistema: false,
        items: order.items.map(it => ({
          product_code: it.product_code || null,
          product_name: it.product_name,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          sale_type: it.sale_type || null,
          image_url: it.image_url || null,
          original_name: it.original_name || null,
          is_recognized: typeof it.is_recognized === 'boolean' ? it.is_recognized : null,
          base_product_name: null,
        })),
      };

      const resp = await fetch('/endpoints/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try { data = await resp.json(); } catch { /* noop */ }

      if (!resp.ok) {
        console.error('ORDERS 4xx/5xx →', resp.status, data);
        toast.error(data?.details || data?.error || `El servidor rechazó el pedido (${resp.status}).`);
        return;
      }

      toast.success(`✅ Pedido #${data.order_no ?? 'creado'} guardado con éxito`);
      setOrder(getInitialOrderState(order.seller_name, order.seller_role, order.sales_user_id));
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Estado local para inputs del PASO 3 ----
  const [localName, setLocalName] = useState('');
  const [localPhone, setLocalPhone] = useState('');

  useEffect(() => {
    setLocalName(order.customer_name || '');
    setLocalPhone(order.customer_phone || '');
  }, [order.customer_name, order.customer_phone]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Registro de ventas (asesoras)</h1>
            <p className="text-white/60 text-lg">Vendedor: <span className="font-semibold text-blue-400">{order.seller_name}</span></p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
            Total estimado: <span className="font-semibold text-green-300">Bs. {total.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-white/50">Completa productos normalizados, ubicación obligatoria, datos de cliente y pago en una sola vista.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/15 border border-green-500/30 rounded-lg">
                  <PackageSearch className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Productos</h2>
                  <p className="text-white/60 text-sm">Busca, selecciona y confirma cantidad y precio.</p>
                </div>
              </div>

              {order.items.length === 0 && (
                <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-center space-y-3">
                  <p>No hay productos agregados.</p>
                  <Button
                    onClick={addEmptyItem}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/30 to-green-600/30 border border-green-500/30 text-white hover:from-green-500/40 hover:to-green-600/40 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Añadir producto
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {order.items.map((it, idx) => (
                  <motion.div 
                    key={idx} 
                    className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-white/70 font-medium">Producto</Label>
                        <Input
                          value={it.product_name ?? ''}
                          placeholder="Ej: soporte de celular..."
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                          onChange={(e) => {
                            const v = e.target.value;
                            updateItem(idx, { product_name: v, original_name: v, product_code: null, is_recognized: null, similar_options: [] });
                            makeDebouncedSimilarUpdater(idx)(v);
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                            onClick={async () => {
                              const opts = await fetchSimilar(it.product_name);
                              updateItem(idx, { similar_options: opts, is_recognized: opts.length ? false : null });
                            }}
                          >
                            <Search className="w-4 h-4 mr-1" /> Buscar en inventario
                          </Button>
                          {it.product_code && (
                            <span className="text-xs rounded-full px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-300">
                              Normalizado: {it.product_code}
                            </span>
                          )}
                        </div>

                        {Array.isArray(it.similar_options) && it.similar_options.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                            <p className="text-sm text-white/70">Selecciona el producto correcto:</p>
                            <div className="flex flex-wrap gap-2">
                              {it.similar_options.map((opt, j) => (
                                <button
                                  key={j}
                                  onClick={() =>
                                    updateItem(idx, {
                                      product_name: opt.name,
                                      product_code: opt.code,
                                      is_recognized: true,
                                      similar_options: [],
                                    })
                                  }
                                  className="px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                  title={opt.code || ''}
                                >
                                  {opt.name}{opt.code && ` (${opt.code})`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 font-medium">Cantidad</Label>
                        <Input
                          type="text"
                          defaultValue={String(it.quantity ?? '')}
                          onBlur={(e) => updateItem(idx, { quantity: Number(e.target.value.replace(',', '.')) || 0 })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 font-medium">Precio Unitario</Label>
                        <Input
                          type="text"
                          defaultValue={String(it.unit_price ?? '')}
                          onBlur={(e) => updateItem(idx, { unit_price: Number(e.target.value.replace(',', '.')) || 0 })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        {it.is_recognized === true && (
                          <span className="text-green-400 inline-flex items-center gap-1">
                            <Check className="w-4 h-4" /> Normalizado
                          </span>
                        )}
                        {it.is_recognized !== true && it.similar_options.length === 0 && (
                          <span className="text-yellow-400 inline-flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> Falta normalizar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={it.sale_type === 'RETAIL' ? 'default' : 'outline'}
                          className={it.sale_type === 'RETAIL'
                            ? 'bg-gradient-to-r from-green-500/30 to-green-600/30 border border-green-500/30 text-white'
                            : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'}
                          onClick={() => updateItem(idx, { sale_type: 'RETAIL' })}
                        >
                          <User className="w-4 h-4 mr-1" /> Minorista
                        </Button>
                        <Button
                          type="button"
                          variant={it.sale_type === 'WHOLESALE' ? 'default' : 'outline'}
                          className={it.sale_type === 'WHOLESALE'
                            ? 'bg-gradient-to-r from-blue-500/30 to-blue-600/30 border border-blue-500/30 text-white'
                            : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'}
                          onClick={() => updateItem(idx, { sale_type: 'WHOLESALE' })}
                        >
                          <PackageSearch className="w-4 h-4 mr-1" /> Mayorista
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeItem(idx)}
                          className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={addEmptyItem}
                  className="w-full bg-gradient-to-r from-green-500/30 to-green-600/30 border border-green-500/30 text-white font-semibold py-3 rounded-xl hover:from-green-500/40 hover:to-green-600/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> {order.items.length > 0 ? 'Añadir otro producto' : 'Añadir producto'}
                </Button>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white/70">Total estimado</span>
                  <span className="text-green-400 font-semibold">Bs. {total.toFixed(2)}</span>
                </div>
                {!isStep2Valid && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Completa cantidad, precio y normalización de cada producto.
                  </div>
                )}
              </div>
            </section>

            {/* Cliente */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/15 border border-purple-500/30 rounded-lg">
                  <User className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Cliente</h2>
                  <p className="text-white/60 text-sm">Nombre y teléfono obligatorios.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70 font-medium">Nombre</Label>
                  <input 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                    defaultValue={localName}
                    onChange={e => setLocalName(e.target.value)}
                    onBlur={e => setOrder(p => ({ ...p, customer_name: e.target.value.trim() }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 font-medium">Teléfono</Label>
                  <input 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                    defaultValue={localPhone}
                    onChange={e => setLocalPhone(e.target.value)}
                    onBlur={e => setOrder(p => ({ ...p, customer_phone: normalizePhone(e.target.value) }))}
                  />
                </div>
              </div>
              {!isStep4Valid && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Nombre y teléfono son obligatorios.
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {/* Ubicación */}
            <section id="ubicacion-card" className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/15 border border-orange-500/30 rounded-lg">
                  <Truck className="w-5 h-5 text-orange-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Ubicación</h2>
                  <p className="text-white/60 text-sm">Dirección o URL de Maps (obligatoria).</p>
                </div>
              </div>

              <div className="space-y-3">
                <Input 
                  value={order.address} 
                  onChange={e => setOrder(p => ({ ...p, address: e.target.value }))} 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                  placeholder="Av. … o URL de Google Maps"
                />
                <Button 
                  onClick={handleGeocodeAddress} 
                  disabled={isGeocoding || order.address.trim().length < 5}
                  className="w-full bg-gradient-to-r from-purple-500/30 to-purple-600/30 border border-purple-500/30 text-white font-semibold py-3 rounded-xl hover:from-purple-500/40 hover:to-purple-600/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {isGeocoding ? 'Verificando…' : 'Verificar dirección'}
                </Button>

                {geocodeMsg && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 border ${
                    geocodeMsg.ok ? 'bg-green-500/15 border-green-500/30 text-green-200' : 'bg-red-500/15 border-red-500/30 text-red-200'
                  }`}>
                    {geocodeMsg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span className="flex-1 text-sm">{geocodeMsg.msg}</span>
                  </div>
                )}

                {order.normalized_address && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-300 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="font-semibold text-white">Dirección normalizada</span>
                          {order.normalized_source && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 border border-white/20 text-white/70">
                              {order.normalized_source === 'opencage' ? 'OpenCage' : order.normalized_source === 'nominatim' ? 'OpenStreetMap' : 'Coordenadas'}
                            </span>
                          )}
                          {typeof order.normalized_confidence === 'number' && (
                            <span className="text-xs text-white/60">Confianza {Math.round(order.normalized_confidence)}/10</span>
                          )}
                        </div>
                        <p className="text-white/80 leading-relaxed break-words">{order.normalized_address}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => handleCopyToClipboard(order.normalized_address || '', 'Dirección copiada')}>
                        <Copy className="w-4 h-4 mr-2" /> Copiar
                      </Button>
                      {mapUrl && (
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => window.open(mapUrl, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink className="w-4 h-4 mr-2" /> Abrir en Maps
                        </Button>
                      )}
                      {order.lat !== undefined && order.lng !== undefined && (
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => handleCopyToClipboard(`${order.lat},${order.lng}`, 'Coordenadas copiadas')}>
                          <ClipboardPaste className="w-4 h-4 mr-2" /> Copiar coord.
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-white/70 font-medium">Notas</Label>
                  <Textarea 
                    rows={3} 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all resize-none" 
                    value={order.notes} 
                    onChange={e => setOrder(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                {!isStep3Valid && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Ingresa una dirección o URL válida y verifícala.
                  </div>
                )}
              </div>
            </section>

            {/* Pago y resumen */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/15 border border-green-500/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Pago y confirmación</h2>
                  <p className="text-white/60 text-sm">Un método de pago por ahora.</p>
                </div>
              </div>

              <AnimatePresence>
                {order.payments.map((p, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <Select 
                      value={p.method} 
                      onValueChange={(v) => setOrder(prev => ({
                        ...prev, 
                        payments: prev.payments.map((x, ix) => ix === i ? { ...x, method: v as any } : x)
                      }))}
                    >
                      <SelectTrigger className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all">
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border border-white/20 text-white">
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="QR">QR</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="text" 
                      defaultValue={String(p.amount ?? '')}
                      onBlur={(e) => setOrder(prev => ({
                        ...prev, 
                        payments: prev.payments.map((x, ix) => ix === i ? { ...x, amount: Number(e.target.value.replace(',', '.')) || 0 } : x)
                      }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                      placeholder="Monto"
                    />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setOrder(prev => ({ ...prev, payments: prev.payments.filter((_, ix) => ix !== i) }))}
                      className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button 
                onClick={() => {
                  const productsTotal = order.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
                  if (order.payments.length >= 1) return toast.error('Por ahora solo 1 método de pago.');
                  setOrder(p => ({ ...p, payments: [...p.payments, { method: 'EFECTIVO', amount: productsTotal }] }));
                }}
                className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 border border-blue-500/30 text-white font-semibold py-3 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Añadir pago (auto = total)
              </Button>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/70">Total a pagar</span>
                <span className="text-green-300 font-semibold">Bs. {order.payments.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}</span>
              </div>

              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between"><span>Cliente</span><span className="text-white">{order.customer_name || '—'}</span></div>
                <div className="flex justify-between"><span>Teléfono</span><span className="text-white">{order.customer_phone || '—'}</span></div>
                <div className="flex justify-between"><span>Productos</span><span className="text-white">{order.items.length}</span></div>
                <div className="flex justify-between"><span>Ubicación</span><span className="text-white truncate max-w-[220px]">{order.normalized_address || order.address || '—'}</span></div>
              </div>

              <Button 
                onClick={submitOrder} 
                disabled={
                  isProcessing ||
                  Math.abs(total - order.payments.reduce((s, p) => s + Number(p.amount || 0), 0)) > 0.01 ||
                  !isStep2Valid || !isStep3Valid || !isStep4Valid
                }
                className="w-full bg-gradient-to-r from-green-500/30 to-green-600/30 border border-green-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-green-500/40 hover:to-green-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Confirmar venta'
                )}
              </Button>

              {Math.abs(total - order.payments.reduce((s, p) => s + Number(p.amount || 0), 0)) > 0.01 && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
                  El total de pagos debe coincidir con el total de productos.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
