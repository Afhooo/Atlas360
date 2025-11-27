'use client';

import { useMemo, useState } from 'react';

type SurveyFormProps = {
  token: string;
  customerName: string;
  orderNo: number | null;
};

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const satisfactionOptions = [
  { value: 5, label: 'Excelente' },
  { value: 4, label: 'Muy buena' },
  { value: 3, label: 'Buena' },
  { value: 2, label: 'Regular' },
  { value: 1, label: 'Deficiente' },
];

const yesNoOptions = [
  { value: true, label: 'Sí' },
  { value: false, label: 'No' },
];

export default function SurveyForm({ token, customerName, orderNo }: SurveyFormProps) {
  const [satisfaction, setSatisfaction] = useState<number>();
  const [deliveryMet, setDeliveryMet] = useState<boolean | undefined>(undefined);
  const [productExpectation, setProductExpectation] = useState<boolean | undefined>(undefined);
  const [recommendation, setRecommendation] = useState<number>();
  const [comments, setComments] = useState('');

  const [state, setState] = useState<SubmissionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const shortName = useMemo(
    () => customerName.split(' ').filter(Boolean)[0] ?? 'Cliente',
    [customerName]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !satisfaction ||
      typeof deliveryMet !== 'boolean' ||
      typeof productExpectation !== 'boolean' ||
      recommendation === undefined
    ) {
      setError('Por favor completa todas las preguntas.');
      return;
    }

    setState('submitting');

    try {
      const response = await fetch('/endpoints/delivery-survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          satisfaction,
          deliveryMet,
          productExpectation,
          recommendation,
          comments: comments.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No pudimos guardar la encuesta.');
      }

      setState('success');
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-8 text-white shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">¡Gracias por tu respuesta!</h2>
        <p className="text-white/75 text-sm leading-relaxed">
          Tu opinión nos ayuda a mejorar cada entrega. El equipo de Atlas 360 revisará tu feedback.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <p className="text-sm uppercase tracking-[.35em] text-white/60 mb-3">
          Encuesta rápida
        </p>
        <h2 className="text-2xl font-semibold">
          Hola {shortName}, cuéntanos sobre tu entrega{orderNo ? ` #${orderNo}` : ''}.
        </h2>
        <p className="text-white/70 text-sm mt-2">
          Solo te tomará un minuto. Las respuestas nos ayudan a mejorar la experiencia para ti y toda la comunidad Atlas 360.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-3">¿Qué tan satisfecha/o estás con la experiencia general?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {satisfactionOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  satisfaction === option.value
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-black/20 hover:border-sky-400/60'
                }`}
              >
                <input
                  type="radio"
                  name="satisfaction"
                  value={option.value}
                  checked={satisfaction === option.value}
                  onChange={() => setSatisfaction(option.value)}
                  className="hidden"
                />
                <div className="font-semibold">{option.value}</div>
                <span className="text-sm text-white/70">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-3">¿La entrega se realizó según lo acordado?</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {yesNoOptions.map((option) => (
              <label
                key={`delivery-${option.value}`}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition ${
                  deliveryMet === option.value
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-white/10 bg-black/20 hover:border-emerald-400/60'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMet"
                  value={String(option.value)}
                  checked={deliveryMet === option.value}
                  onChange={() => setDeliveryMet(option.value)}
                  className="hidden"
                />
                <span className="font-semibold">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-3">¿El producto cumplió con lo que esperabas?</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {yesNoOptions.map((option) => (
              <label
                key={`product-${option.value}`}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition ${
                  productExpectation === option.value
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : 'border-white/10 bg-black/20 hover:border-indigo-400/60'
                }`}
              >
                <input
                  type="radio"
                  name="productExpectation"
                  value={String(option.value)}
                  checked={productExpectation === option.value}
                  onChange={() => setProductExpectation(option.value)}
                  className="hidden"
                />
                <span className="font-semibold">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">
            ¿Qué tan probable es que nos recomiendes? <span className="text-white/60 text-sm">(0 = Nada probable, 10 = Definitivamente)</span>
          </h3>
          <input
            type="range"
            min={0}
            max={10}
            value={recommendation ?? 5}
            onChange={(event) => setRecommendation(Number(event.target.value))}
            className="w-full accent-indigo-400"
          />
          <div className="mt-2 text-sm text-white/70">
            Puntuación: <span className="font-semibold text-white">{recommendation ?? 5}</span> / 10
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-3">¿Hay algo que debamos saber?</h3>
          <textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            rows={4}
            placeholder="Comentarios o sugerencias (opcional)"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === 'submitting' ? 'Enviando…' : 'Enviar mi respuesta'}
      </button>
    </form>
  );
}
