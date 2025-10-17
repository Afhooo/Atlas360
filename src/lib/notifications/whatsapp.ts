// src/lib/notifications/whatsapp.ts

const DEFAULT_API_URL = 'https://graph.facebook.com/v18.0';

type SendWhatsAppParams = {
  to: string;
  message: string;
  previewUrl?: boolean;
};

export type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string | null;
  error?: string;
  status?: number;
  raw?: unknown;
};

const API_URL = (process.env.WHATSAPP_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
const ACCESS_TOKEN = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const normalizeBoliviaPhone = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const digits = input.replace(/\D+/g, '');
  if (!digits) return null;

  if (digits.startsWith('591')) {
    return digits;
  }

  if (digits.startsWith('00')) {
    const trimmed = digits.slice(2);
    return trimmed.startsWith('591') ? trimmed : `591${trimmed}`;
  }

  if (digits.length === 8) {
    return `591${digits}`;
  }

  if (digits.length === 9 && digits.startsWith('0')) {
    return `591${digits.slice(1)}`;
  }

  return digits.length >= 11 ? digits : null;
};

export const sendWhatsAppText = async ({
  to,
  message,
  previewUrl = true,
}: SendWhatsAppParams): Promise<WhatsAppSendResult> => {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return { ok: false, error: 'config_missing' };
  }

  const normalized = normalizeBoliviaPhone(to);
  if (!normalized) {
    return { ok: false, error: 'invalid_phone' };
  }

  try {
    const response = await fetch(`${API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'text',
        text: {
          body: message,
          preview_url: previewUrl,
        },
      }),
    });

    const raw = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (raw as any)?.error?.message ||
        (raw as any)?.error?.error_user_msg ||
        `WhatsApp error ${response.status}`;
      return { ok: false, error: errorMessage, status: response.status, raw };
    }

    const messageId = Array.isArray((raw as any)?.messages)
      ? (raw as any).messages[0]?.id ?? null
      : null;

    return { ok: true, messageId, raw };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'unknown_error' };
  }
};

export const isWhatsAppConfigured = () =>
  Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID);
