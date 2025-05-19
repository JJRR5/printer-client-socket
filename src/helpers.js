export const getShortMexDate = (date) =>
  date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
export const formatPrice = (price) => `$${Number(price).toFixed(2)}`;
export const truncateText = (text, maxLen) =>
  text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text.padEnd(maxLen);
