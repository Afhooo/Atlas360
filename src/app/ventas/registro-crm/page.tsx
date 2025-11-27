'use client';

import SalesRegistryForm from '@/components/forms/SalesRegistryForm';

export default function RegistroCrmPage() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="space-y-2">
        <p className="apple-caption text-apple-gray-400">CRM · Ventas</p>
        <h1 className="apple-h1 text-white">Registrar pedido</h1>
        <p className="apple-body text-apple-gray-400">
          Flujo unificado de captura: productos, cliente, pago y entrega en un solo paso.
        </p>
      </div>
      <SalesRegistryForm />
    </div>
  );
}
