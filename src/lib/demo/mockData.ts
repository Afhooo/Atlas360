// src/lib/demo/mockData.ts
import { SUPABASE_CONFIG } from '@/lib/supabase';
import type { OrderRow, DeliveryUser, EnrichedDeliveryRoute } from '@/lib/types';

const DEMO_FLAG = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';

export const isDemoMode = () => DEMO_FLAG || !SUPABASE_CONFIG.isConfigured;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const month = today.slice(0, 7);

const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};

export const demoSalesSummary = [
  { summary_date: `${month}-01`, branch: 'Santa Cruz', total_revenue: 18250, total_products_sold: 96 },
  { summary_date: `${month}-02`, branch: 'La Paz', total_revenue: 14500, total_products_sold: 74 },
  { summary_date: `${month}-03`, branch: 'Cochabamba', total_revenue: 9800, total_products_sold: 52 },
  { summary_date: today, branch: 'Online', total_revenue: 12350, total_products_sold: 61 },
];

export const demoSalesReport = [
  {
    product_name: 'iPhone 15 Pro',
    quantity: 2,
    subtotal: 5200,
    product_image_url: null,
    order_id: 'ORD-1001',
    order_no: 1001,
    order_date: daysAgo(0),
    branch: 'Santa Cruz',
    seller_full_name: 'Ana Delgado',
    seller_role: 'ADMIN',
    channel: 'Asesor',
  },
  {
    product_name: 'MacBook Air M3',
    quantity: 1,
    subtotal: 7800,
    product_image_url: null,
    order_id: 'ORD-1002',
    order_no: 1002,
    order_date: daysAgo(1),
    branch: 'La Paz',
    seller_full_name: 'Carlos Rivera',
    seller_role: 'ADMIN',
    channel: 'Tienda/Caja',
  },
  {
    product_name: 'Apple Watch S9',
    quantity: 3,
    subtotal: 2100,
    product_image_url: null,
    order_id: 'ORD-1003',
    order_no: 1003,
    order_date: daysAgo(2),
    branch: 'Cochabamba',
    seller_full_name: 'Gabriela Rojas',
    seller_role: 'ADMIN',
    channel: 'Promotor',
  },
  {
    product_name: 'AirPods Pro',
    quantity: 4,
    subtotal: 1200,
    product_image_url: null,
    order_id: 'ORD-1004',
    order_no: 1004,
    order_date: daysAgo(3),
    branch: 'Santa Cruz',
    seller_full_name: 'Equipo Atlas',
    seller_role: 'ADMIN',
    channel: 'Asesor',
  },
];

export const demoReturnsReport = [
  {
    return_id: 501,
    order_no: 1002,
    return_date: today,
    branch: 'La Paz',
    seller_name: 'Carlos Rivera',
    customer_name: 'Lucía Paredes',
    product_name: 'MacBook Air M3',
    quantity: 1,
    return_amount: 7800,
    reason: 'Cambio por defecto de fábrica',
    return_method: 'Reingreso a inventario',
    return_proof_url: null,
  },
  {
    return_id: 502,
    order_no: 1003,
    return_date: today,
    branch: 'Cochabamba',
    seller_name: 'Gabriela Rojas',
    customer_name: 'José Durán',
    product_name: 'Apple Watch S9',
    quantity: 1,
    return_amount: 700,
    reason: 'Error en talla de correa',
    return_method: 'Nota de crédito',
    return_proof_url: null,
  },
];

export const demoTodayReturns = { count: demoReturnsReport.length, amount: demoReturnsReport.reduce((s, r) => s + r.return_amount, 0) };

export const demoMySales = {
  ok: true,
  kpis: { ventas: 3, pedidos: 3, total: 14300 },
  topProducts: [
    { name: 'iPhone 15 Pro', qty: 2, total: 5200 },
    { name: 'MacBook Air M3', qty: 1, total: 7800 },
    { name: 'AirPods Pro', qty: 4, total: 1200 },
  ],
  list: demoSalesReport.map((s, idx) => ({
    id: `MY-${idx + 1}`,
    order_id: s.order_id,
    order_date: s.order_date,
    product_name: s.product_name,
    qty: s.quantity,
    total: s.subtotal,
    person_id: 'admin-demo-id',
    kind: s.channel === 'Promotor' ? 'promoter' : 'order',
    approval_status: 'approved',
    approved_by: 'admin-demo-id',
  })),
};

const todayIso = new Date().toISOString();
export const demoAttendance = {
  ok: true,
  kpis: { dias_con_marca: 3, entradas: 3, salidas: 3, pct_geocerca_ok: 100 },
  days: [
    {
      date: today,
      marks: [],
      first_in: todayIso,
      last_out: todayIso,
      lunch_out: null,
      lunch_in: null,
      lunch_minutes: 45,
      worked_minutes: 480,
    },
    {
      date: today.replace(/\d+$/, (d) => String(Math.max(1, Number(d) - 1)).padStart(2, '0')),
      marks: [],
      first_in: daysAgo(1),
      last_out: daysAgo(1),
      lunch_out: null,
      lunch_in: null,
      lunch_minutes: 60,
      worked_minutes: 450,
    },
    {
      date: today.replace(/\d+$/, (d) => String(Math.max(1, Number(d) - 2)).padStart(2, '0')),
      marks: [],
      first_in: daysAgo(2),
      last_out: daysAgo(2),
      lunch_out: null,
      lunch_in: null,
      lunch_minutes: 50,
      worked_minutes: 430,
    },
  ],
  raw: [],
};

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
    { id: 'p-1', name: 'iPhone 15 Pro', sku: 'IP15-PRO', stock: 24, branch: 'Santa Cruz', rotationDays: 18 },
    { id: 'p-2', name: 'MacBook Air M3', sku: 'MBA-M3', stock: 12, branch: 'La Paz', rotationDays: 25 },
    { id: 'p-3', name: 'Apple Watch S9', sku: 'AW-S9', stock: 30, branch: 'Cochabamba', rotationDays: 12 },
    { id: 'p-4', name: 'AirPods Pro', sku: 'APP-2', stock: 55, branch: 'Santa Cruz', rotationDays: 8 },
  ],
  movements: [
    { id: 'm-1', product: 'iPhone 15 Pro', type: 'Salida', qty: 2, ref: 'Venta #2001', date: today, branch: 'Santa Cruz' },
    { id: 'm-2', product: 'MacBook Air M3', type: 'Entrada', qty: 5, ref: 'Compra proveedor', date: today, branch: 'La Paz' },
    { id: 'm-3', product: 'Apple Watch S9', type: 'Salida', qty: 1, ref: 'Venta #2003', date: today, branch: 'Cochabamba' },
    { id: 'm-4', product: 'AirPods Pro', type: 'Transferencia', qty: 10, ref: 'A La Paz', date: today, branch: 'Santa Cruz' },
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
  { id: 'cx-1', fecha: today, local: 'Santa Cruz', estado: 'Cuadrado', declarado: 15200, sistema: 15200, diferencias: 0 },
  { id: 'cx-2', fecha: today, local: 'La Paz', estado: 'Diferencia', declarado: 9800, sistema: 10000, diferencias: -200 },
  { id: 'cx-3', fecha: today, local: 'Cochabamba', estado: 'Cuadrado', declarado: 7600, sistema: 7600, diferencias: 0 },
];
