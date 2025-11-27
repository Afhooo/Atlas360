import { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase';
import SurveyForm from './SurveyForm';

type PageParams = {
  params: { token: string };
};

export const metadata: Metadata = {
  title: 'Encuesta de entrega | Atlas Suite',
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white shadow-2xl backdrop-blur-md">
    <h1 className="text-3xl font-semibold mb-4">{title}</h1>
    <p className="text-white/70 text-base leading-relaxed">{description}</p>
  </div>
);

export default async function DeliverySurveyPage({ params }: PageParams) {
  const token = params.token;
  const supabase = await createServerSupabase();

  const linkResult = await supabase
    .from('delivery_survey_links')
    .select('id, order_id, customer_name, send_status, consumed_at, created_at')
    .eq('survey_token', token)
    .maybeSingle();

  if (linkResult.error) {
    console.error('[delivery-survey] fetch link error:', linkResult.error.message);
  }

  const link = linkResult.data;

  if (!link) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-gray-900 to-black flex items-center justify-center px-6 py-16">
        <EmptyState
          title="Link no disponible"
          description="El enlace de la encuesta no es válido o ya expiró. Si crees que es un error, contáctanos para ayudarte."
        />
      </main>
    );
  }

  const [orderResult, responseResult] = await Promise.all([
    supabase
      .from('orders')
      .select('order_no, customer_name')
      .eq('id', link.order_id)
      .maybeSingle(),
    supabase
      .from('delivery_survey_responses')
      .select('id, created_at, satisfaction_score')
      .eq('survey_link_id', link.id)
      .maybeSingle(),
  ]);

  if (orderResult.error) {
    console.error('[delivery-survey] fetch order error:', orderResult.error.message);
  }
  if (responseResult.error && responseResult.error.message !== 'No rows found') {
    console.error('[delivery-survey] fetch response error:', responseResult.error.message);
  }

  const order = orderResult.data;
  const existingResponse = responseResult.data;

  const customerName =
    order?.customer_name || link.customer_name || 'Cliente Atlas Suite';

  const answered = Boolean(existingResponse);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-gray-900 to-black flex items-center justify-center px-6 py-20">
      <section className="w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_25px_50px_-12px_rgba(59,130,246,0.35)] backdrop-blur-2xl overflow-hidden">
          <header className="bg-gradient-to-r from-sky-500/50 via-indigo-500/50 to-purple-500/40 px-8 py-6 text-white">
            <p className="uppercase tracking-[.35em] text-xs text-white/70">Atlas Suite</p>
            <h1 className="text-3xl font-semibold mt-2">Tu experiencia nos impulsa</h1>
            <p className="text-white/80 mt-3 max-w-lg text-sm leading-relaxed">
              Queremos asegurarnos de que cada entrega supere las expectativas. Comparte tu opinión en menos de un minuto.
            </p>
          </header>

          <div className="px-8 py-10 bg-black/30">
            {answered ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-white shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">¡Gracias por tu tiempo!</h2>
                <p className="text-white/75 text-sm leading-relaxed">
                  Ya registramos tu respuesta y el equipo de Atlas Suite la está revisando. Seguiremos trabajando para entregarte la mejor experiencia.
                </p>
              </div>
            ) : (
              <SurveyForm
                token={token}
                customerName={customerName}
                orderNo={order?.order_no ?? null}
              />
            )}
          </div>
        </div>
        <footer className="mt-10 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Atlas Suite. Todos los derechos reservados.
        </footer>
      </section>
    </main>
  );
}
