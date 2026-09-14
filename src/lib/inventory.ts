// Central inventory calculations
export function inventoryValue(stock: number, purchasePrice: number) {
  return Math.round(stock * purchasePrice * 100) / 100;
}
export function profitPerUnit(sellingPrice: number, purchasePrice: number) {
  return Math.round((sellingPrice - purchasePrice) * 100) / 100;
}
export function marginPercent(sellingPrice: number, purchasePrice: number) {
  if (!sellingPrice || sellingPrice === 0) return 0;
  return Math.round(((sellingPrice - purchasePrice) / sellingPrice) * 10000) / 100;
}
export function stockStatus(stock: number, minimumStock: number) {
  if (stock <= 0) return 'out';
  if (stock <= minimumStock) return 'low';
  return 'in';
}
