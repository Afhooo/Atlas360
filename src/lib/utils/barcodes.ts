type ProductWithCodes = {
  id: string;
  sku?: string | null;
  barcode?: string | null;
};

export function normalizeBarcode(code: string) {
  return String(code || '').trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function findProductByCode<T extends ProductWithCodes>(
  inventory: T[],
  rawCode: string
): T | undefined {
  const target = normalizeBarcode(rawCode);
  if (!target) return undefined;

  return inventory.find((item) => {
    const candidates = [item.barcode, item.sku, item.id];
    return candidates.some((value) => value && normalizeBarcode(value) === target);
  });
}
