'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  UserRound,
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  ClipboardList,
  CreditCard,
  Home,
} from 'lucide-react';
import { useDemoOps, recordDemoSale } from '@/lib/demo/state';

type InventoryItem = ReturnType<typeof useDemoOps>['inventory'][number];

type DeliveryMode = 'pickup' | 'local' | 'encomienda';
type PaymentStatus = 'pagado' | 'pendiente';

type FormState = {
  productId: string;
  qty: number;
  price: number;
  channel: string;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerDocument: string;
  deliveryMode: DeliveryMode;
  pickupBranch: string;
  pickupSlot: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryReference: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
};

const CHANNEL_OPTIONS = ['Tienda física', 'WhatsApp', 'Instagram', 'Referido', 'Ecommerce'];
const PAYMENT_METHODS = ['POS', 'Efectivo', 'Transferencia', 'QR', 'Crédito interno'];
const SLOT_OPTIONS = ['Hoy · 10:00-12:00', 'Hoy · 14:00-16:00', 'Hoy · 16:00-18:00', 'Mañana · 10:00-12:00'];
const DELIVERY_OPTIONS: { value: DeliveryMode; label: string; description: string }[] = [
  { value: 'pickup', label: 'Retiro en tienda', description: 'Cliente recoge en mostrador' },
  { value: 'local', label: 'Entrega local', description: 'Moto o courier dentro de la ciudad' },
  { value: 'encomienda', label: 'Encomienda', description: 'Despacho a otra ciudad / agencia' },
];

export default function RegistrarVentaPage() {
  const snapshot = useDemoOps();
  const inventory = snapshot.inventory;
  const sales = snapshot.sales;
  const cash = snapshot.cash;

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((item) => item.branch && set.add(item.branch));
    return Array.from(set);
  }, [inventory]);

  const defaultProduct = inventory[0];
  const defaultBranch = branchOptions[0] || defaultProduct?.branch || 'Santa Cruz · Flagship';
  const [form, setForm] = useState<FormState>(() => ({
    productId: defaultProduct?.id ?? '',
    qty: 1,
    price: defaultProduct?.price ?? 0,
    channel: CHANNEL_OPTIONS[0],
    notes: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerDocument: '',
    deliveryMode: 'pickup',
    pickupBranch: defaultBranch,
    pickupSlot: SLOT_OPTIONS[1],
    deliveryAddress: '',
    deliveryCity: defaultBranch,
    deliveryReference: '',
    deliverySlot: SLOT_OPTIONS[2],
    paymentMethod: PAYMENT_METHODS[0],
    paymentStatus: 'pagado',
  }));
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

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      recordDemoSale({
        productId: form.productId,
        qty: form.qty,
        price: form.price,
        channel: form.channel,
        notes: form.notes,
        customer: form.customerName
          ? {
              name: form.customerName,
              phone: form.customerPhone,
              email: form.customerEmail,
              document: form.customerDocument,
            }
          : undefined,
        delivery:
          form.deliveryMode === 'pickup'
            ? {
                mode: 'pickup',
                branch: form.pickupBranch,
                scheduledSlot: form.pickupSlot,
                label: 'Retiro en tienda',
              }
            : {
                mode: 'delivery',
                label: form.deliveryMode === 'local' ? 'Entrega local' : 'Encomienda',
                branch: form.pickupBranch,
                address: form.deliveryAddress,
                references: form.deliveryReference,
                scheduledSlot: form.deliverySlot,
              },
        payment: {
          method: form.paymentMethod,
          status: form.paymentStatus,
        },
      });
      setMessage({ type: 'success', text: 'Venta registrada, inventario actualizado y logística coordinada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo registrar la venta.' });
    }
  };

  const canSubmit = Boolean(form.productId && form.qty > 0 && form.price > 0 && form.customerName.trim());
  const deliveryLabel =
    form.deliveryMode === 'pickup' ? 'Retiro en tienda' : form.deliveryMode === 'local' ? 'Entrega local' : 'Encomienda';

  return (
    <div className="space-y-8">
      <section className="glass-card relative overflow-hidden p-5 lg:p-7">
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-500/20 via-transparent to-apple-green-500/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-apple-gray-100">
                <Sparkles size={14} />
                <span>Retail + Delivery</span>
              </div>
              <h1 className="apple-h1 text-white mt-3">Registrar venta omnicanal</h1>
              <p className="apple-body text-apple-gray-200 max-w-2xl">
                Diseñado para asesoras en tienda y equipos de despacho: captura al cliente, define entrega local o
                encomienda y confirma el pago en una sola vista con estándares enterprise.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setForm((prev) => ({ ...prev, channel: CHANNEL_OPTIONS[0] }))}>
                <ArrowRight size={14} />
                Continuar flujo tienda
              </button>
              <button className="btn-primary btn-sm" onClick={() => setForm((prev) => ({ ...prev, deliveryMode: 'local' }))}>
                Programar despacho
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroTile label="Check-in clientes" value="En tienda + delivery" description="Recopila datos y preferencias" />
            <HeroTile label="Entrega local" value="Moto/courier" description="Coordinación en 2 clics" />
            <HeroTile label="Encomienda" value="Agencias disponibles" description="Para pedidos interciudad" />
          </div>
        </div>
      </section>

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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
        <div className="space-y-6">
          <FormSection
            icon={<UserRound size={18} />}
            title="Cliente y contexto"
            description="Identifica quién compra, por qué canal llegó y cómo contactarlo para la entrega."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Nombre completo"
                placeholder="Ej. Sofía Mercado"
                value={form.customerName}
                onChange={(value) => updateForm('customerName', value)}
                required
              />
              <InputField
                label="Canal de origen"
                value={form.channel}
                onChange={(value) => updateForm('channel', value)}
                as="select"
                options={CHANNEL_OPTIONS}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Teléfono"
                placeholder="700-00000"
                value={form.customerPhone}
                onChange={(value) => updateForm('customerPhone', value)}
                icon={<Phone size={14} />}
              />
              <InputField
                label="Email"
                placeholder="cliente@email.com"
                value={form.customerEmail}
                onChange={(value) => updateForm('customerEmail', value)}
                icon={<Mail size={14} />}
              />
              <InputField
                label="Documento"
                placeholder="CI / NIT"
                value={form.customerDocument}
                onChange={(value) => updateForm('customerDocument', value)}
              />
            </div>
            <div>
              <InputField
                label="Notas"
                placeholder="Preferencias especiales, recordatorios internos"
                value={form.notes}
                onChange={(value) => updateForm('notes', value)}
                as="textarea"
              />
            </div>
          </FormSection>

          <FormSection
            icon={<ShoppingBag size={18} />}
            title="Detalle de la venta"
            description="Selecciona el producto o combo y ajusta precio y cantidad con acciones rápidas."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Producto / combo</span>
                <select
                  className="input-apple w-full"
                  value={form.productId}
                  onChange={(e) => {
                    const prod = inventory.find((p) => p.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      productId: e.target.value,
                      price: prod?.price ?? prev.price,
                      pickupBranch: prod?.branch ?? prev.pickupBranch,
                    }));
                  }}
                >
                  {Object.entries(groupedInventory)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, items]) => (
                      <optgroup key={category} label={category}>
                        {items.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.branch} · stock {p.stock}
                            {p.type === 'combo' ? ' (Combo)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Sucursal logística</span>
                <select
                  className="input-apple w-full"
                  value={form.pickupBranch}
                  onChange={(e) => updateForm('pickupBranch', e.target.value)}
                >
                  {[...branchOptions, form.pickupBranch].filter(Boolean).filter((v, idx, arr) => arr.indexOf(v) === idx).map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Precio"
                type="number"
                min={1}
                step="0.01"
                value={form.price}
                onChange={(value) => updateForm('price', Number(value) || 0)}
                helper={
                  <div className="flex gap-2 text-apple-gray-500 text-xs">
                    <button
                      type="button"
                      className="underline decoration-dotted"
                      onClick={() => updateForm('price', Number(suggestedPrice || form.price))}
                    >
                      Usar lista ({money(suggestedPrice || 0)})
                    </button>
                    <button
                      type="button"
                      className="underline decoration-dotted"
                      onClick={() => updateForm('price', Number(((form.price || 0) * 0.95).toFixed(2)))}
                    >
                      -5% promo
                    </button>
                  </div>
                }
              />
              <InputField
                label="Cantidad"
                type="number"
                min={1}
                max={selectedProduct?.stock ?? undefined}
                value={form.qty}
                onChange={(value) => updateForm('qty', Number(value) || 1)}
                helper={selectedProduct ? `Stock disponible: ${selectedProduct.stock}` : undefined}
              />
              <InputField
                label="Slot de preparación"
                as="select"
                value={form.pickupSlot}
                onChange={(value) => updateForm('pickupSlot', value)}
                options={SLOT_OPTIONS}
              />
            </div>
            {selectedProduct && (
              <ProductSummaryCard
                product={selectedProduct}
                marginPct={marginPct}
                total={totalPreview}
                qty={form.qty}
                deliveryLabel={deliveryLabel}
                slot={form.deliveryMode === 'pickup' ? form.pickupSlot : form.deliverySlot}
              />
            )}
          </FormSection>

          <FormSection
            icon={<Truck size={18} />}
            title="Entrega y experiencia"
            description="Define si el cliente recoge en tienda o requiere entrega local / encomienda."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {DELIVERY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => updateForm('deliveryMode', option.value)}
                  className={`rounded-apple border px-3 py-3 text-left transition ${
                    form.deliveryMode === option.value
                      ? 'border-apple-green-400 bg-apple-green-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
                  }`}
                >
                  <p className="font-semibold">{option.label}</p>
                  <p className="apple-caption text-apple-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
            {form.deliveryMode === 'pickup' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Mostrador / Tienda"
                  as="select"
                  value={form.pickupBranch}
                  onChange={(value) => updateForm('pickupBranch', value)}
                  options={[...branchOptions, form.pickupBranch].filter(Boolean).filter((v, idx, arr) => arr.indexOf(v) === idx)}
                />
                <InputField
                  label="Horario de entrega"
                  as="select"
                  value={form.pickupSlot}
                  onChange={(value) => updateForm('pickupSlot', value)}
                  options={SLOT_OPTIONS}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Ciudad / Zona"
                    placeholder="Ej. Santa Cruz Centro"
                    value={form.deliveryCity}
                    onChange={(value) => updateForm('deliveryCity', value)}
                    icon={<MapPin size={14} />}
                  />
                  <InputField
                    label="Horario de despacho"
                    as="select"
                    value={form.deliverySlot}
                    onChange={(value) => updateForm('deliverySlot', value)}
                    options={SLOT_OPTIONS}
                  />
                </div>
                <InputField
                  label={form.deliveryMode === 'local' ? 'Dirección completa' : 'Agencia / Dirección de encomienda'}
                  placeholder="Calle, número, referencia"
                  value={form.deliveryAddress}
                  onChange={(value) => updateForm('deliveryAddress', value)}
                  icon={form.deliveryMode === 'local' ? <Home size={14} /> : <Truck size={14} />}
                />
                <InputField
                  label="Notas para el courier"
                  placeholder="Ej. entregar a seguridad, llamada previa"
                  value={form.deliveryReference}
                  onChange={(value) => updateForm('deliveryReference', value)}
                  as="textarea"
                />
              </div>
            )}
          </FormSection>

          <FormSection
            icon={<CreditCard size={18} />}
            title="Pago y confirmación"
            description="Confirma método de pago, estado y registra la orden."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Método de pago"
                as="select"
                value={form.paymentMethod}
                onChange={(value) => updateForm('paymentMethod', value)}
                options={PAYMENT_METHODS}
              />
              <div className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Estado</span>
                <div className="inline-flex rounded-apple border border-white/10 bg-white/5 p-1">
                  {(['pagado', 'pendiente'] as PaymentStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateForm('paymentStatus', status)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-[10px] transition ${
                        form.paymentStatus === status ? 'bg-white/25 text-white shadow-apple-sm' : 'text-apple-gray-400'
                      }`}
                    >
                      {status === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-apple border border-white/10 bg-white/5 px-3 py-2">
                <p className="apple-caption text-apple-gray-400">Total estimado</p>
                <p className="text-2xl font-semibold text-white">{money(totalPreview)}</p>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-left">
                <p className="apple-caption text-apple-gray-500">Resumen</p>
                <p className="apple-body text-white">
                  {form.customerName || 'Cliente retail'} · {deliveryLabel} · {form.paymentMethod}
                </p>
              </div>
              <button className="btn-primary flex-1 lg:flex-none" type="submit" disabled={!canSubmit}>
                Registrar venta y rebajar stock
              </button>
            </div>
          </FormSection>
        </div>

        <aside className="space-y-4">
          <div className="glass-card p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-apple bg-white/5 border border-white/10 flex items-center justify-center">
                <ClipboardList size={18} />
              </div>
              <div>
                <h3 className="apple-h3 text-white">Checklist de la visita</h3>
                <p className="apple-caption text-apple-gray-400">Cliente tienda + despacho integrado</p>
              </div>
            </div>
            <TimelineItem
              title="Check-in"
              description={`${form.channel} · ${form.customerName || 'Cliente retail'}`}
              status="done"
            />
            <TimelineItem
              title={form.paymentStatus === 'pagado' ? 'Pago confirmado' : 'Pago pendiente'}
              description={form.paymentMethod}
              status={form.paymentStatus === 'pagado' ? 'done' : 'pending'}
            />
            <TimelineItem
              title={deliveryLabel}
              description={
                form.deliveryMode === 'pickup'
                  ? `${form.pickupBranch} · ${form.pickupSlot}`
                  : `${form.deliveryCity} · ${form.deliverySlot}`
              }
              status="pending"
            />
          </div>

          <div className="glass-card p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-apple bg-white/5 border border-white/10 flex items-center justify-center">
                <Store size={18} />
              </div>
              <div>
                <h3 className="apple-h3 text-white">Cartera de ventas</h3>
                <p className="apple-caption text-apple-gray-400">En tienda + domicilio</p>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {sales.length === 0 && <p className="apple-caption text-apple-gray-400">Aún no registras ventas.</p>}
              {sales.map((s) => (
                <div key={s.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{s.productName}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Tag>{s.channel || 'Tienda'}</Tag>
                        {s.delivery?.label && <Tag tone="green">{s.delivery.label}</Tag>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{money(s.total)}</p>
                      <p className="apple-caption text-apple-gray-500">{new Date(s.ts).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-sm text-apple-gray-300 flex flex-wrap gap-3">
                    <span>{s.customer?.name || 'Cliente retail'}</span>
                    {s.customer?.phone && <span>{s.customer.phone}</span>}
                    {s.delivery?.mode === 'delivery' && s.delivery.address && <span>{s.delivery.address}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-apple bg-white/5 border border-white/10 flex items-center justify-center">
                <Package size={18} />
              </div>
              <div>
                <h3 className="apple-h3 text-white">Inventario en línea</h3>
                <p className="apple-caption text-apple-gray-400">Se rebaja al vender</p>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {inventory.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="apple-body text-white font-semibold flex items-center gap-2">
                      {p.name}
                      {p.type === 'combo' && (
                        <span className="apple-caption px-2 py-0.5 rounded-full bg-apple-blue-500/20 border border-apple-blue-500/30 text-apple-blue-200">
                          Combo
                        </span>
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
        </aside>
      </form>
    </div>
  );
}

function HeroTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-apple border border-white/10 bg-white/5 p-3">
      <p className="apple-caption text-apple-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="apple-caption text-apple-gray-500">{description}</p>
    </div>
  );
}

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card p-4 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-apple bg-white/5 border border-white/15 flex items-center justify-center text-apple-gray-100">
          {icon}
        </div>
        <div>
          <h2 className="apple-h3 text-white">{title}</h2>
          <p className="apple-caption text-apple-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  as = 'input',
  options,
  icon,
  helper,
  required,
  min,
  max,
  step,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  type?: string;
  as?: 'input' | 'select' | 'textarea';
  options?: string[];
  icon?: ReactNode;
  helper?: ReactNode | string;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}) {
  return (
    <label className="flex flex-col space-y-2 text-sm text-white/90">
      <span className="apple-caption text-apple-gray-400">{label}</span>
      {as === 'select' ? (
        <select className="input-apple" value={value} onChange={(e) => onChange(e.target.value)}>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          className="input-apple min-h-[90px]"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500">{icon}</span>}
          <input
            className={`input-apple w-full ${icon ? 'pl-10' : ''}`}
            type={type}
            value={value}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
      {helper && <span className="apple-caption text-apple-gray-500">{helper}</span>}
    </label>
  );
}

function TimelineItem({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: 'done' | 'pending';
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 h-3 w-3 rounded-full ${status === 'done' ? 'bg-apple-green-400' : 'bg-white/30'} border border-white/10`}
      />
      <div>
        <p className="text-white font-semibold">{title}</p>
        <p className="apple-caption text-apple-gray-400">{description}</p>
      </div>
    </div>
  );
}

function Tag({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' }) {
  const styles =
    tone === 'green'
      ? 'bg-apple-green-500/20 border-apple-green-500/30 text-apple-green-200'
      : 'bg-apple-blue-500/20 border-apple-blue-500/30 text-apple-blue-200';
  return <span className={`apple-caption px-2 py-0.5 rounded-full border ${styles}`}>{children}</span>;
}

function ProductSummaryCard({
  product,
  marginPct,
  total,
  qty,
  deliveryLabel,
  slot,
}: {
  product: InventoryItem;
  marginPct: number | null;
  total: number;
  qty: number;
  deliveryLabel?: string;
  slot?: string;
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
      {(deliveryLabel || slot) && (
        <div className="mt-4 rounded-apple bg-white/5 border border-white/10 p-3 text-sm text-apple-gray-200">
          <p className="font-semibold text-white">{deliveryLabel}</p>
          {slot && <p className="apple-caption text-apple-gray-400">{slot}</p>}
        </div>
      )}
      {product.components && product.components.length > 0 && (
        <div className="mt-4 rounded-apple bg-white/5 border border-white/10 p-3">
          <p className="apple-caption text-apple-gray-400 mb-2 flex items-center gap-1">
            <Sparkles size={14} /> Este combo incluye:
          </p>
          <ul className="list-disc list-inside text-apple-gray-200 text-sm space-y-1">
            {product.components.map((component) => (
              <li key={`${product.id}-${component.id}`}>
                {component.qty} × {component.name}
              </li>
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
  icon: ReactNode;
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
