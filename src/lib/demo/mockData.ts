// src/lib/demo/mockData.ts
import { SUPABASE_CONFIG } from '@/lib/supabase';
import type { OrderRow, DeliveryUser, EnrichedDeliveryRoute } from '@/lib/types';

const DEMO_FLAG = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';

export const isDemoMode = () => DEMO_FLAG || !SUPABASE_CONFIG.isConfigured;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};

type SellerProfile = {
  id: string;
  fullName: string;
  branch: string;
  role: string;
  channel: 'Asesor' | 'Promotor' | 'Tienda/Caja';
};

type ProductSpec = {
  name: string;
  basePrice: number;
  imageUrl?: string | null;
};

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  channel: string;
  segment: string;
  city: string;
};

const SELLERS: SellerProfile[] = [
  { id: 'admin-demo-id', fullName: 'Ana Delgado', branch: 'Santa Cruz', role: 'ADMIN', channel: 'Asesor' },
  { id: 'coordinator-demo-id', fullName: 'Carlos Rivera', branch: 'La Paz', role: 'COORDINADOR', channel: 'Tienda/Caja' },
  { id: 'asesor-demo-id', fullName: 'Gabriela Rojas', branch: 'Cochabamba', role: 'ASESOR', channel: 'Asesor' },
  { id: 'promotor-demo-id', fullName: 'Marcos Aguirre', branch: 'Santa Cruz', role: 'PROMOTOR', channel: 'Promotor' },
  { id: 'caja-demo-id', fullName: 'Nora Ibarra', branch: 'La Paz', role: 'CAJA', channel: 'Tienda/Caja' },
];

const PRODUCTS: ProductSpec[] = [
  { name: 'iPhone 15 Pro', basePrice: 5200 },
  { name: 'MacBook Air M3', basePrice: 7800 },
  { name: 'Apple Watch Series 9', basePrice: 2100 },
  { name: 'AirPods Pro (2da gen)', basePrice: 1200 },
  { name: 'iPad Air M2', basePrice: 3600 },
  { name: 'MacBook Pro 14" M3', basePrice: 10800 },
];

const CUSTOMER_PROFILES: CustomerProfile[] = [
  { id: 'cust-001', name: 'Mariana Suárez', email: 'mariana.suarez@andina.bo', phone: '+59170011001', channel: 'Retail', segment: 'Premium', city: 'Santa Cruz' },
  { id: 'cust-002', name: 'TecnoSur SRL', email: 'compras@tecnosur.bo', phone: '+59170011002', channel: 'Corporativo', segment: 'Enterprise', city: 'La Paz' },
  { id: 'cust-003', name: 'José Durán', email: 'jose.duran@gmail.com', phone: '+59170011003', channel: 'Retail', segment: 'Mass Market', city: 'Cochabamba' },
  { id: 'cust-004', name: 'Lucía Paredes', email: 'lucia.paredes@icloud.com', phone: '+59170011004', channel: 'E-commerce', segment: 'Premium', city: 'Santa Cruz' },
  { id: 'cust-005', name: 'Andrea Nava', email: 'anava@innova.bo', phone: '+59170011005', channel: 'Corporativo', segment: 'Startup', city: 'La Paz' },
  { id: 'cust-006', name: 'Diego Céspedes', email: 'diego.cespedes@correo.com', phone: '+59170011006', channel: 'Retail', segment: 'Mass Market', city: 'Cochabamba' },
  { id: 'cust-007', name: 'Martha Aguilar', email: 'martha.aguilar@finance.bo', phone: '+59170011007', channel: 'Corporativo', segment: 'Key Account', city: 'Santa Cruz' },
  { id: 'cust-008', name: 'Grupo Altavista', email: 'compras@altavista.bo', phone: '+59170011008', channel: 'Corporativo', segment: 'Enterprise', city: 'Santa Cruz' },
  { id: 'cust-009', name: 'Karen Montaño', email: 'karen.montano@gmail.com', phone: '+59170011009', channel: 'Retail', segment: 'Premium', city: 'La Paz' },
  { id: 'cust-010', name: 'Logística Andina', email: 'logistica@andina.bo', phone: '+59170011010', channel: 'Corporativo', segment: 'Logística', city: 'Cochabamba' },
  { id: 'cust-011', name: 'Carla Mendieta', email: 'carla.mendieta@icloud.com', phone: '+59170011011', channel: 'Retail', segment: 'Premium', city: 'Santa Cruz' },
  { id: 'cust-012', name: 'Farmacias Vitta', email: 'compras@vitta.bo', phone: '+59170011012', channel: 'Corporativo', segment: 'Salud', city: 'La Paz' },
  { id: 'cust-013', name: 'SmartHome Bolivia', email: 'ventas@smarthome.bo', phone: '+59170011013', channel: 'E-commerce', segment: 'Startup', city: 'Santa Cruz' },
  { id: 'cust-014', name: 'Martín Quiroga', email: 'martin.quiroga@gmail.com', phone: '+59170011014', channel: 'Retail', segment: 'Mass Market', city: 'Cochabamba' },
  { id: 'cust-015', name: 'Fresh Market Bolivia', email: 'compras@freshmarket.bo', phone: '+59170011015', channel: 'Corporativo', segment: 'Retail', city: 'Santa Cruz' },
  { id: 'cust-016', name: 'Hotel Laguna Azul', email: 'admin@lagunaazul.bo', phone: '+59170011016', channel: 'Corporativo', segment: 'Hospitality', city: 'La Paz' },
  { id: 'cust-017', name: 'Distribuidora El Puente', email: 'ventas@elpuente.bo', phone: '+59170011017', channel: 'Corporativo', segment: 'Mayorista', city: 'Cochabamba' },
  { id: 'cust-018', name: 'Natalia Ibáñez', email: 'natalia.ibanez@gmail.com', phone: '+59170011018', channel: 'Retail', segment: 'Premium', city: 'Santa Cruz' },
  { id: 'cust-019', name: 'AeroLogix', email: 'contacto@aerologix.bo', phone: '+59170011019', channel: 'Corporativo', segment: 'Tecnología', city: 'La Paz' },
  { id: 'cust-020', name: 'Universidad San Rafael', email: 'adquisiciones@usanrafael.bo', phone: '+59170011020', channel: 'Corporativo', segment: 'Educación', city: 'Cochabamba' },
];

const CUSTOMER_NAMES = CUSTOMER_PROFILES.map((c) => c.name);
const RETURN_REASONS = [
  'Cambio de color solicitado',
  'Producto con detalles estéticos',
  'Cliente decidió cambiar de modelo',
  'Garantía aprobada',
  'Entrega fuera de tiempo',
];
const RETURN_METHODS = ['Reingreso a inventario', 'Nota de crédito', 'Devolución parcial'];

const SIMULATION_DAYS = 90;

const SIMULATION_REFERENCE = new Date();
SIMULATION_REFERENCE.setUTCHours(0, 0, 0, 0);
const SIMULATION_START = new Date(SIMULATION_REFERENCE);
SIMULATION_START.setUTCDate(SIMULATION_START.getUTCDate() - (SIMULATION_DAYS - 1));

function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20240909);
const pad = (n: number) => String(n).padStart(2, '0');
const pick = <T,>(items: T[]): T => items[Math.floor(rng() * items.length)];

type DemoSaleRecord = {
  product_name: string;
  quantity: number;
  subtotal: number;
  product_image_url: string | null;
  order_id: string;
  order_no: number;
  order_date: string;
  branch: string;
  seller_full_name: string;
  seller_role: string;
  channel: 'Asesor' | 'Promotor' | 'Tienda/Caja';
  delivery_date: string | null;
  payment_proof_url: string | null;
  sale_type: 'Por Mayor' | 'Al Detalle';
  order_type: 'Pedido' | 'Encomienda';
  customer_id: string;
  customer_name: string;
};

type DemoSalesSummaryRow = {
  summary_date: string;
  branch: string;
  total_revenue: number;
  total_products_sold: number;
  cantidad_productos: number;
};

function generateSalesData() {
  const sales: DemoSaleRecord[] = [];
  const summary = new Map<string, DemoSalesSummaryRow>();
  let orderSeq = 2400;

  for (let day = 0; day < SIMULATION_DAYS; day += 1) {
    const baseDate = new Date(SIMULATION_START);
    baseDate.setUTCDate(baseDate.getUTCDate() + day);
    const isoDay = baseDate.toISOString().slice(0, 10);
    const salesCount = 3 + Math.floor(rng() * 4);

    for (let i = 0; i < salesCount; i += 1) {
      const seller = i === 0 ? SELLERS[0] : pick(SELLERS);
      const product = pick(PRODUCTS);
      const customer = pick(CUSTOMER_PROFILES);
      const qty = 1 + Math.floor(rng() * 3);
      const price = Math.round(product.basePrice * (0.9 + rng() * 0.25));
      const subtotal = price * qty;
      const hour = 8 + Math.floor(rng() * 10);
      const minute = Math.floor(rng() * 60);
      const orderMoment = new Date(`${isoDay}T${pad(hour)}:${pad(minute)}:00Z`);
      const orderNo = orderSeq++;
      const sale_type: DemoSaleRecord['sale_type'] = qty >= 3 ? 'Por Mayor' : 'Al Detalle';
      const order_type: DemoSaleRecord['order_type'] = rng() > 0.7 ? 'Encomienda' : 'Pedido';

      sales.push({
        product_name: product.name,
        quantity: qty,
        subtotal,
        product_image_url: product.imageUrl ?? null,
        order_id: `ORD-${orderNo}`,
        order_no: orderNo,
        order_date: orderMoment.toISOString(),
        branch: seller.branch,
        seller_full_name: seller.fullName,
        seller_role: seller.role,
        channel: seller.channel,
        delivery_date: null,
        payment_proof_url: null,
        sale_type,
        order_type,
        customer_id: customer.id,
        customer_name: customer.name,
      });

      const monthKey = isoDay.slice(0, 7);
      const summaryKey = `${monthKey}-${seller.branch}`;
      const existing = summary.get(summaryKey);
      if (existing) {
        existing.total_revenue += subtotal;
        existing.total_products_sold += qty;
        existing.cantidad_productos = existing.total_products_sold;
      } else {
        summary.set(summaryKey, {
          summary_date: `${monthKey}-01`,
          branch: seller.branch,
          total_revenue: subtotal,
          total_products_sold: qty,
          cantidad_productos: qty,
        });
      }
    }
  }

  sales.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
  const summaryRows = Array.from(summary.values()).sort(
    (a, b) => new Date(a.summary_date).getTime() - new Date(b.summary_date).getTime()
  );

  return { salesReport: sales, salesSummary: summaryRows };
}

const generatedSalesData = generateSalesData();
export const demoSalesReport = generatedSalesData.salesReport;
export const demoSalesSummary = generatedSalesData.salesSummary;

type DemoCustomer = CustomerProfile & {
  created_at: string;
  owner_id: string;
  ltv: number;
  orders_count: number;
  last_order_at: string | null;
};

function buildDemoCustomers(sales: DemoSaleRecord[]): DemoCustomer[] {
  const stats = new Map<string, { total: number; orders: number; last: string | null }>();

  sales.forEach((sale) => {
    const stat = stats.get(sale.customer_id) ?? { total: 0, orders: 0, last: null };
    stat.total += sale.subtotal;
    stat.orders += 1;
    if (!stat.last || sale.order_date > stat.last) {
      stat.last = sale.order_date;
    }
    stats.set(sale.customer_id, stat);
  });

  return CUSTOMER_PROFILES.map((profile, idx) => {
    const owner = SELLERS[idx % SELLERS.length];
    const created = new Date(SIMULATION_START);
    created.setUTCDate(created.getUTCDate() + idx * 2);
    const stat = stats.get(profile.id) ?? { total: 0, orders: 0, last: null };

    return {
      ...profile,
      created_at: created.toISOString(),
      owner_id: owner.id,
      ltv: stat.total,
      orders_count: stat.orders,
      last_order_at: stat.last,
    };
  });
}

export const demoCustomers = buildDemoCustomers(demoSalesReport);

type DemoOpportunity = {
  id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  stage: string;
  amount: number;
  currency: string;
  owner_id: string | null;
  probability: number;
  close_date: string | null;
  source: string | null;
  created_at: string;
  customers: { name: string } | null;
};

const OPPORTUNITY_BLUEPRINTS = [
  { title: 'Renovación flota iPhone', stage: 'CALIFICADO', base: 28000, source: 'Referido', description: '20 unidades iPhone 15 Pro para equipo comercial', probability: 0.45 },
  { title: 'Proyecto Mac Studio - Altavista', stage: 'PROPUESTA', base: 42000, source: 'Upsell', description: 'Equipamiento creativo para agencia', probability: 0.55 },
  { title: 'Kits productividad iPad', stage: 'LEAD', base: 12000, source: 'Evento', description: '10 combos iPad Air + Pencil', probability: 0.25 },
  { title: 'Contrato soporte TecnoSur', stage: 'GANADO', base: 18000, source: 'Renovación', description: 'Soporte anual y AppleCare+', probability: 0.9 },
  { title: 'Digitalización Fresh Market', stage: 'PROPUESTA', base: 26000, source: 'Web', description: 'POS móviles y tabletas para tiendas', probability: 0.5 },
  { title: 'Reemplazo MacBook Banco Norte', stage: 'CALIFICADO', base: 38000, source: 'Canal', description: '25 MacBook Air para analistas', probability: 0.4 },
  { title: 'Kits promotores retail', stage: 'LEAD', base: 9000, source: 'Promotor', description: 'Equipamiento para nuevos promotores', probability: 0.2 },
  { title: 'Centro de control AeroLogix', stage: 'PROPUESTA', base: 33000, source: 'Referido', description: 'MacBook Pro + monitores externos', probability: 0.6 },
  { title: 'Upgrade SmartHome', stage: 'GANADO', base: 14500, source: 'Upsell', description: 'Inventario demos y accesorios', probability: 0.95 },
  { title: 'Implementación Universidad San Rafael', stage: 'PERDIDO', base: 50000, source: 'Licitación', description: 'Laboratorio completo macOS', probability: 0.05 },
];

function buildDemoOpportunities(customers: DemoCustomer[]): DemoOpportunity[] {
  return OPPORTUNITY_BLUEPRINTS.map((blueprint, idx) => {
    const customer = customers[idx % customers.length];
    const owner = SELLERS[idx % SELLERS.length];
    const created = new Date(SIMULATION_REFERENCE);
    created.setUTCDate(created.getUTCDate() - (idx * 3 + 4));
    const close = new Date(created);
    close.setUTCDate(close.getUTCDate() + 12 + (idx % 7));
    const amount = Math.round(blueprint.base * (0.9 + rng() * 0.25));

    return {
      id: `opp-demo-${idx + 1}`,
      customer_id: customer?.id ?? null,
      title: blueprint.title,
      description: blueprint.description,
      stage: blueprint.stage,
      amount,
      currency: 'BOB',
      owner_id: owner.id,
      probability: blueprint.probability,
      close_date: close.toISOString().slice(0, 10),
      source: blueprint.source,
      created_at: created.toISOString(),
      customers: customer ? { name: customer.name } : null,
    };
  });
}

export const demoOpportunities = buildDemoOpportunities(demoCustomers);

type DemoReturnRecord = {
  return_id: number;
  order_no: number;
  return_date: string;
  branch: string;
  seller_name: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  return_amount: number;
  reason: string;
  return_method: string;
  return_proof_url: string | null;
};

function generateReturnsData(sourceSales: DemoSaleRecord[]): DemoReturnRecord[] {
  const returns: DemoReturnRecord[] = [];
  const step = Math.max(1, Math.floor(sourceSales.length / 24));

  for (let idx = 0; idx < sourceSales.length; idx += step) {
    const sale = sourceSales[idx];
    if (!sale) continue;
    const returnDate = new Date(sale.order_date);
    returnDate.setUTCDate(returnDate.getUTCDate() + Math.floor(rng() * 6));
    if (returnDate > SIMULATION_REFERENCE) {
      returnDate.setTime(SIMULATION_REFERENCE.getTime());
    }

    returns.push({
      return_id: 500 + returns.length,
      order_no: sale.order_no,
      return_date: returnDate.toISOString().slice(0, 10),
      branch: sale.branch,
      seller_name: sale.seller_full_name || 'Equipo Atlas',
      customer_name: pick(CUSTOMER_NAMES),
      product_name: sale.product_name,
      quantity: sale.quantity,
      return_amount: Math.round(sale.subtotal * (0.85 + rng() * 0.2)),
      reason: pick(RETURN_REASONS),
      return_method: pick(RETURN_METHODS),
      return_proof_url: null,
    });
  }

  return returns.sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime());
}

export const demoReturnsReport = generateReturnsData(demoSalesReport);
const todaysReturns = demoReturnsReport.filter((r) => r.return_date === today);
export const demoTodayReturns = {
  count: todaysReturns.length,
  amount: todaysReturns.reduce((sum, r) => sum + r.return_amount, 0),
};

function buildDemoMySales(primarySellerName: string) {
  const listSource = demoSalesReport.filter((sale) => sale.seller_full_name === primarySellerName).slice(0, 60);
  const total = listSource.reduce((sum, sale) => sum + sale.subtotal, 0);
  const productTotals = new Map<string, { qty: number; total: number }>();

  listSource.forEach((sale) => {
    const current = productTotals.get(sale.product_name) ?? { qty: 0, total: 0 };
    current.qty += sale.quantity;
    current.total += sale.subtotal;
    productTotals.set(sale.product_name, current);
  });

  const topProducts = Array.from(productTotals.entries())
    .map(([name, stats]) => ({ name, qty: stats.qty, total: stats.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    ok: true,
    kpis: {
      ventas: listSource.length,
      pedidos: listSource.length,
      total: Math.round(total),
    },
    topProducts,
    list: listSource.map((sale, idx) => ({
      id: `MY-${idx + 1}`,
      order_id: sale.order_id,
      order_date: sale.order_date,
      product_name: sale.product_name,
      qty: sale.quantity,
      total: sale.subtotal,
      person_id: 'admin-demo-id',
      kind: sale.channel === 'Promotor' ? 'promoter' : 'order',
      approval_status: 'approved',
      approved_by: 'admin-demo-id',
    })),
  };
}

export const demoMySales = buildDemoMySales(SELLERS[0].fullName);

function buildDemoAttendanceDays(count: number) {
  const records: {
    date: string;
    marks: unknown[];
    first_in: string;
    last_out: string;
    lunch_out: string | null;
    lunch_in: string | null;
    lunch_minutes: number;
    worked_minutes: number;
  }[] = [];

  for (let day = 0; day < count; day += 1) {
    const base = new Date(SIMULATION_REFERENCE);
    base.setUTCDate(base.getUTCDate() - day);
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(base);
    const firstIn = new Date(base);
    firstIn.setUTCHours(12, Math.floor(5 + rng() * 40), 0, 0);
    const lastOut = new Date(base);
    lastOut.setUTCHours(20, Math.floor(5 + rng() * 30), 0, 0);

    records.push({
      date: dateStr,
      marks: [],
      first_in: firstIn.toISOString(),
      last_out: lastOut.toISOString(),
      lunch_out: null,
      lunch_in: null,
      lunch_minutes: 45 + Math.round((rng() - 0.5) * 10),
      worked_minutes: Math.max(360, 450 + Math.round((rng() - 0.5) * 40)),
    });
  }

  return records;
}

const attendanceDays = buildDemoAttendanceDays(SIMULATION_DAYS);
export const demoAttendance = {
  ok: true,
  kpis: {
    dias_con_marca: attendanceDays.length,
    entradas: attendanceDays.length,
    salidas: attendanceDays.length,
    pct_geocerca_ok: 98,
  },
  days: attendanceDays,
  raw: [],
};

const todayIso = new Date().toISOString();

export const demoWeather = {
  ok: true,
  cached: false,
  ts: Date.now(),
  cities: [
    { city: 'Santa Cruz', temp: 28, condition: 'Soleado', icon: '01d', rain_1h: 0, wind_kmh: 12, risk: 'low', updatedAt: todayIso, source: 'demo' },
    { city: 'La Paz', temp: 14, condition: 'Parcialmente nublado', icon: '02d', rain_1h: 0.2, wind_kmh: 18, risk: 'med', updatedAt: todayIso, source: 'demo' },
    { city: 'Cochabamba', temp: 22, condition: 'Nublado', icon: '03d', rain_1h: 1.1, wind_kmh: 10, risk: 'low', updatedAt: todayIso, source: 'demo' },
  ],
};

export const demoTraffic = {
  incidents: [
    { id: 't1', city: 'Santa Cruz', title: 'Obras viales', area: 'Av. Cristo Redentor', severity: 'med', updatedAt: todayIso, source: 'demo' },
    { id: 't2', city: 'La Paz', title: 'Congestión pico', area: 'Zona Sopocachi', severity: 'high', updatedAt: todayIso, source: 'demo' },
    { id: 't3', city: 'Cochabamba', title: 'Accidente leve', area: 'Av. Blanco Galindo', severity: 'low', updatedAt: todayIso, source: 'demo' },
  ],
  provider: 'demo',
  updatedAt: Date.now(),
};

export const demoOrders: OrderRow[] = [
  {
    id: 'ord-demo-1',
    created_at: daysAgo(0),
    order_no: 2001,
    customer_name: 'Mariana Suárez',
    customer_phone: '+59170000001',
    address: 'Av. Principal #123',
    delivery_address: 'Equipetrol, Santa Cruz',
    delivery_geo_lat: -17.7833,
    delivery_geo_lng: -63.1821,
    notes: 'Entregar en recepción',
    amount: 2600,
    local: 'Santa Cruz',
    payment_method: 'Tarjeta',
    delivery_date: today,
    delivery_from: '09:00',
    delivery_to: '12:00',
    confirmed_at: daysAgo(0),
    delivered_at: null,
    status: 'out_for_delivery',
    seller: 'Ana Delgado',
    sales_user_id: 'admin-demo-id',
    delivery_assigned_to: 'delivery-1',
    destino: 'Santa Cruz',
    seller_profile: { full_name: 'Ana Delgado' },
    delivery_profile: { full_name: 'Luis Pérez' },
    order_items: [
      { id: 'item-1', product_name: 'iPhone 15 Pro', quantity: 1, unit_price: 2600, subtotal: 2600 },
    ],
    order_media: [],
    is_encomienda: false,
  },
  {
    id: 'ord-demo-2',
    created_at: daysAgo(1),
    order_no: 2002,
    customer_name: 'José Durán',
    customer_phone: '+59170000002',
    address: 'Calle 21 de Calacoto',
    delivery_address: 'Calacoto, La Paz',
    delivery_geo_lat: -16.528,
    delivery_geo_lng: -68.109,
    notes: 'Llamar al llegar',
    amount: 1200,
    local: 'La Paz',
    payment_method: 'Efectivo',
    delivery_date: today,
    delivery_from: '14:00',
    delivery_to: '18:00',
    confirmed_at: daysAgo(1),
    delivered_at: null,
    status: 'assigned',
    seller: 'Carlos Rivera',
    sales_user_id: 'admin-demo-id',
    delivery_assigned_to: 'delivery-2',
    destino: 'La Paz',
    seller_profile: { full_name: 'Carlos Rivera' },
    delivery_profile: { full_name: 'Laura Vargas' },
    order_items: [
      { id: 'item-2', product_name: 'Apple Watch S9', quantity: 1, unit_price: 1200, subtotal: 1200 },
    ],
    order_media: [],
    is_encomienda: true,
    fecha_salida_bodega: daysAgo(1),
    fecha_entrega_encomienda: null,
  },
  {
    id: 'ord-demo-3',
    created_at: daysAgo(2),
    order_no: 2003,
    customer_name: 'Lucía Paredes',
    customer_phone: '+59170000003',
    address: 'Av. Blanco Galindo',
    delivery_address: 'Blanco Galindo, Cochabamba',
    delivery_geo_lat: -17.3895,
    delivery_geo_lng: -66.1568,
    notes: 'Cliente solicita foto al entregar',
    amount: 900,
    local: 'Cochabamba',
    payment_method: 'QR',
    delivery_date: today,
    delivery_from: '10:00',
    delivery_to: '13:00',
    confirmed_at: daysAgo(2),
    delivered_at: null,
    status: 'pending',
    seller: 'Gabriela Rojas',
    sales_user_id: 'admin-demo-id',
    delivery_assigned_to: 'delivery-1',
    destino: 'Cochabamba',
    seller_profile: { full_name: 'Gabriela Rojas' },
    delivery_profile: { full_name: 'Luis Pérez' },
    order_items: [
      { id: 'item-3', product_name: 'AirPods Pro', quantity: 2, unit_price: 450, subtotal: 900 },
    ],
    order_media: [],
    is_encomienda: false,
  },
];

export const demoDeliveries: DeliveryUser[] = [
  { id: 'delivery-1', full_name: 'Luis Pérez', role: 'delivery', active: true, local: 'Santa Cruz', created_at: daysAgo(5) },
  { id: 'delivery-2', full_name: 'Laura Vargas', role: 'delivery', active: true, local: 'La Paz', created_at: daysAgo(5) },
];

export const demoRoutes: EnrichedDeliveryRoute[] = [
  {
    id: 'route-1',
    delivery_user_id: 'delivery-1',
    order_id: 'ord-demo-1',
    status: 'in_progress',
    created_at: daysAgo(0),
    route_date: today,
    order_no: 2001,
  },
  {
    id: 'route-2',
    delivery_user_id: 'delivery-2',
    order_id: 'ord-demo-2',
    status: 'pending',
    created_at: daysAgo(1),
    route_date: today,
    order_no: 2002,
  },
];

export const demoUsers = [
  {
    id: 'admin-demo-id',
    full_name: 'Admin Atlas',
    fenix_role: 'ADMIN',
    privilege_level: 10,
    username: 'admin',
    email: 'admin@atlas360.local',
    active: true,
    created_at: daysAgo(7),
    branch_id: 'site-sc',
    phone: '+59170000000',
    vehicle_type: null,
    site_id: 'site-sc',
  },
  {
    id: 'coordinator-demo-id',
    full_name: 'Coordinador Norte',
    fenix_role: 'COORDINADOR',
    privilege_level: 5,
    username: 'coord',
    email: 'coord@atlas360.local',
    active: true,
    created_at: daysAgo(6),
    branch_id: 'site-lp',
    phone: '+59170000011',
    vehicle_type: null,
    site_id: 'site-lp',
  },
  {
    id: 'asesor-demo-id',
    full_name: 'Asesor Demo',
    fenix_role: 'ASESOR',
    privilege_level: 1,
    username: 'asesor',
    email: 'asesor@atlas360.local',
    active: true,
    created_at: daysAgo(5),
    branch_id: 'site-cbba',
    phone: '+59170000022',
    vehicle_type: null,
    site_id: 'site-cbba',
  },
];

export const demoSites = [
  { id: 'site-sc', name: 'Sucursal Santa Cruz', lat: -17.7833, lng: -63.1821, radius_m: 200, is_active: true },
  { id: 'site-lp', name: 'Sucursal La Paz', lat: -16.5, lng: -68.15, radius_m: 200, is_active: true },
  { id: 'site-cbba', name: 'Sucursal Cochabamba', lat: -17.3895, lng: -66.1568, radius_m: 200, is_active: true },
];

export const demoInventory = {
  products: [
    {
      id: 'p-iph15pro-256',
      name: 'iPhone 15 Pro · 256GB',
      sku: 'IP15-PRO-256',
      branch: 'Santa Cruz',
      stock: 26,
      rotationDays: 15,
      category: 'Smartphones',
      type: 'individual',
      cost: 8200,
      price: 10490,
      reorderPoint: 10,
    },
    {
      id: 'p-iph15-128',
      name: 'iPhone 15 · 128GB',
      sku: 'IP15-128',
      branch: 'La Paz',
      stock: 34,
      rotationDays: 18,
      category: 'Smartphones',
      type: 'individual',
      cost: 6300,
      price: 8490,
      reorderPoint: 12,
    },
    {
      id: 'p-iph14plus',
      name: 'iPhone 14 Plus · 128GB',
      sku: 'IP14-PLUS',
      branch: 'Cochabamba',
      stock: 19,
      rotationDays: 21,
      category: 'Smartphones',
      type: 'individual',
      cost: 5600,
      price: 7590,
      reorderPoint: 8,
    },
    {
      id: 'p-macair-m3',
      name: 'MacBook Air 13" · M3 · 16GB/512GB',
      sku: 'MBA13-M3-16-512',
      branch: 'La Paz',
      stock: 14,
      rotationDays: 24,
      category: 'Mac',
      type: 'individual',
      cost: 10200,
      price: 13500,
      reorderPoint: 6,
    },
    {
      id: 'p-macpro-14',
      name: 'MacBook Pro 14" · M3 Pro',
      sku: 'MBP14-M3P',
      branch: 'Santa Cruz',
      stock: 9,
      rotationDays: 27,
      category: 'Mac',
      type: 'individual',
      cost: 14500,
      price: 18600,
      reorderPoint: 4,
    },
    {
      id: 'p-ipad-air',
      name: 'iPad Air M2 · 256GB',
      sku: 'IPAD-AIR-M2',
      branch: 'Santa Cruz',
      stock: 22,
      rotationDays: 19,
      category: 'iPad',
      type: 'individual',
      cost: 4200,
      price: 5690,
      reorderPoint: 10,
    },
    {
      id: 'p-ipad-mini',
      name: 'iPad mini 6 · 64GB',
      sku: 'IPAD-MINI-6',
      branch: 'Cochabamba',
      stock: 17,
      rotationDays: 23,
      category: 'iPad',
      type: 'individual',
      cost: 3600,
      price: 4890,
      reorderPoint: 8,
    },
    {
      id: 'p-watch-s9',
      name: 'Apple Watch Series 9 GPS',
      sku: 'AW-S9-GPS',
      branch: 'Cochabamba',
      stock: 28,
      rotationDays: 14,
      category: 'Wearables',
      type: 'individual',
      cost: 2800,
      price: 3690,
      reorderPoint: 12,
    },
    {
      id: 'p-watch-ultra2',
      name: 'Apple Watch Ultra 2',
      sku: 'AW-ULTRA2',
      branch: 'Santa Cruz',
      stock: 6,
      rotationDays: 30,
      category: 'Wearables',
      type: 'individual',
      cost: 5200,
      price: 6990,
      reorderPoint: 3,
    },
    {
      id: 'p-airpods-pro2',
      name: 'AirPods Pro (2da generación)',
      sku: 'APP-PRO2',
      branch: 'Santa Cruz',
      stock: 48,
      rotationDays: 9,
      category: 'Audio',
      type: 'individual',
      cost: 1350,
      price: 1990,
      reorderPoint: 20,
    },
    {
      id: 'p-pencil-pro',
      name: 'Apple Pencil Pro',
      sku: 'PENCIL-PRO',
      branch: 'La Paz',
      stock: 25,
      rotationDays: 16,
      category: 'Accesorios',
      type: 'individual',
      cost: 900,
      price: 1350,
      reorderPoint: 10,
    },
    {
      id: 'combo-iphone-care',
      name: 'Combo iPhone 15 Pro + AppleCare+',
      sku: 'CB-IP15-CARE',
      branch: 'Santa Cruz',
      stock: 11,
      rotationDays: 12,
      category: 'Combos / Kits',
      type: 'combo',
      cost: 9300,
      price: 11990,
      reorderPoint: 4,
      components: [
        { id: 'p-iph15pro-256', name: 'iPhone 15 Pro · 256GB', qty: 1 },
        { id: 'svc-applecare', name: 'AppleCare+ 2 años', qty: 1 },
      ],
    },
    {
      id: 'combo-macair-creative',
      name: 'Kit MacBook Air + AirPods Pro',
      sku: 'CB-MBA-AUDIO',
      branch: 'La Paz',
      stock: 7,
      rotationDays: 14,
      category: 'Combos / Kits',
      type: 'combo',
      cost: 11500,
      price: 14990,
      reorderPoint: 3,
      components: [
        { id: 'p-macair-m3', name: 'MacBook Air 13" · M3', qty: 1 },
        { id: 'p-airpods-pro2', name: 'AirPods Pro (2da generación)', qty: 1 },
      ],
    },
    {
      id: 'combo-ipad-productividad',
      name: 'Combo Productividad iPad Air + Pencil + Smart Keyboard',
      sku: 'CB-IPAD-PROD',
      branch: 'Santa Cruz',
      stock: 10,
      rotationDays: 11,
      category: 'Combos / Kits',
      type: 'combo',
      cost: 5150,
      price: 6890,
      reorderPoint: 4,
      components: [
        { id: 'p-ipad-air', name: 'iPad Air M2', qty: 1 },
        { id: 'p-pencil-pro', name: 'Apple Pencil Pro', qty: 1 },
        { id: 'acc-smart-keyboard', name: 'Smart Keyboard Folio', qty: 1 },
      ],
    },
  ],
  movements: [
    { id: 'm-001', product: 'iPhone 15 Pro · 256GB', type: 'Salida', qty: 3, ref: 'Venta #3205', date: today, branch: 'Santa Cruz' },
    { id: 'm-002', product: 'iPhone 15 · 128GB', type: 'Entrada', qty: 10, ref: 'Compra importador', date: today, branch: 'La Paz' },
    { id: 'm-003', product: 'MacBook Air 13" · M3 · 16GB/512GB', type: 'Salida', qty: 2, ref: 'Pedido corporativo', date: today, branch: 'La Paz' },
    { id: 'm-004', product: 'Combo iPhone 15 Pro + AppleCare+', type: 'Salida', qty: 1, ref: 'Venta ecommerce', date: today, branch: 'Santa Cruz' },
    { id: 'm-005', product: 'Apple Watch Series 9 GPS', type: 'Transferencia', qty: 5, ref: 'A sucursal La Paz', date: today, branch: 'Cochabamba' },
    { id: 'm-006', product: 'AirPods Pro (2da generación)', type: 'Salida', qty: 8, ref: 'Venta retail', date: today, branch: 'Santa Cruz' },
    { id: 'm-007', product: 'Kit MacBook Air + AirPods Pro', type: 'Salida', qty: 1, ref: 'Venta #3210', date: today, branch: 'La Paz' },
  ],
};

export const demoAttendanceMarks = [
  { id: 'att-1', person: 'Ana Delgado', type: 'Entrada', time: `${today} 08:58`, site: 'Santa Cruz', geo: 'GPS ok' },
  { id: 'att-2', person: 'Carlos Rivera', type: 'Entrada', time: `${today} 09:05`, site: 'La Paz', geo: 'GPS ok' },
  { id: 'att-3', person: 'Gabriela Rojas', type: 'Salida', time: `${today} 18:05`, site: 'Cochabamba', geo: 'GPS ok' },
];

export const demoProductividad = {
  resumen: [
    { person: 'Ana Delgado', horas: 7.5, ventas: 4, tareas: 9 },
    { person: 'Carlos Rivera', horas: 7.2, ventas: 3, tareas: 7 },
    { person: 'Gabriela Rojas', horas: 6.8, ventas: 2, tareas: 6 },
  ],
  kpis: [
    { label: 'Horas efectivas', value: '7.2h' },
    { label: 'Tickets/hora', value: '0.9' },
    { label: 'Tareas/hora', value: '1.2' },
  ],
};

export const demoCajas = [
  { id: 'cx-1', fecha: today, local: 'Santa Cruz', estado: 'Cuadrado', declarado: 15200, sistema: 15200, diferencias: 0, cajero: 'Cajero demo' },
  { id: 'cx-2', fecha: today, local: 'La Paz', estado: 'Diferencia', declarado: 9800, sistema: 10000, diferencias: -200, cajero: 'Cajero La Paz' },
  { id: 'cx-3', fecha: today, local: 'Cochabamba', estado: 'Cuadrado', declarado: 7600, sistema: 7600, diferencias: 0, cajero: 'Cajero Cochabamba' },
];
