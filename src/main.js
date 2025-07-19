import * as dotenv from 'dotenv';
import { io } from 'socket.io-client';
import {
  printer as ThermalPrinter,
  types as PrinterTypes,
  characterSet,
} from 'node-thermal-printer';
import process from 'process';
import { Buffer } from 'buffer';
import { getShortMexDate, formatPrice, truncateText } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: '/dev/usb/lp0',
  characterSet: characterSet.SLOVENIA,
  removeSpecialCharacters: false,
  lineCharacter: '-',
  options: {
    timeout: 5000,
  },
});

const socket = io(process.env.API_WS_URL, {
  transports: ['websocket'],
  auth: {
    token: process.env.PRINTER_TOKEN,
  },
});

socket.on('connect', () => {
  console.log('[🖨️] Connected to API WebSocket');
});

socket.on('connect_error', (err) => {
  console.error('[❌] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.warn('[⚠️] Disconnected:', reason);
});

const printHeader = async (printer, order, customer = 'Cliente sin nombre') => {
  printer.alignCenter();
  const logoPath = path.resolve(__dirname, 'assets', 'logo-resized.png');
  await printer.printImage(logoPath);
  printer.println('');
  printer.bold(true);
  printer.println(`Número de orden: ${order}`);
  printer.println(`Emburguizer: ${customer}`);
  printer.println('Fecha: ' + getShortMexDate(new Date()));
  printer.drawLine();
  printer.bold(false);
};

const printPriceSection = (printer, subtotal, tax, total, showTax = false) => {
  printer.alignRight();
  if (showTax && tax > 0 && subtotal > 0) {
    printer.println(`Subtotal: ${formatPrice(subtotal)}`);
    printer.println(`IVA: ${formatPrice(tax)}`);
    printer.bold(true);
    printer.println(`Total: ${formatPrice(total)}`);
  } else {
    printer.bold(true);
    printer.println(`Total: ${formatPrice(total)}`);
  }
  printer.println('');
  printer.bold(false);
};

const printSaleOrderItems = (printer, items, subtotal, tax, total) => {
  printer.alignLeft();
  printer.println('Cant  Producto           P.Unit    Subtot');
  printer.drawLine();
  items.forEach((item) => {
    const { quantity, name, price } = item;
    const itemSubtotal = price * quantity;

    const qty = `${quantity}x`.padEnd(5);
    const prod = truncateText(name, 18);
    const unit = formatPrice(price).padStart(9);
    const totalTxt = formatPrice(itemSubtotal).padStart(10);

    printer.println(`${qty}${prod}${unit}${totalTxt}`);
  });
  printer.drawLine();
  printPriceSection(printer, subtotal, tax, total, false);
};

const printFooter = (printer, qrCodeUrl) => {
  printer.alignCenter();
  printer.println('¡Escanea el código QR y ganate una emburguiza!');
  printer.println('');
  printer.printQR(qrCodeUrl, { cellSize: 5 });
  printer.println('¡Gracias por tu compra!');
  printer.cut();
};

const printKitchenOrder = (printer, customer, items) => {
  printer.clear();
  printer.alignCenter();
  printer.bold(true);
  printer.println('');
  printer.println(
    `Cliente: ${customer} - Fecha: ${getShortMexDate(new Date())}`,
  );
  printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.println('CANT  PRODUCTO');
  printer.drawLine();

  items.forEach((item) => {
    const qty = `${item.quantity}x`.padEnd(6);
    const product = truncateText(item.name, 26);
    printer.println(`${qty}${product}`);
  });

  printer.drawLine();
  printer.alignCenter();
  printer.println('');
  printer.cut();
};

socket.on('print_ticket', async (data) => {
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error('[❌] Printer is not connected');
    return;
  }
  const { order, customer, items, subtotal, tax, total, qrCodeUrl } = data;
  console.log('[🖨️] Printing ticket:', data);
  try {
    printer.clear();
    await printHeader(printer, order, customer);
    printSaleOrderItems(printer, items, subtotal, tax, total);
    printFooter(printer, qrCodeUrl);
    await printer.execute();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    printKitchenOrder(printer, customer, items);
    await printer.execute();
  } catch (err) {
    console.error('[❌] Error printing:', err);
  }
});

socket.on('check_connection', async () => {
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error('[❌] Printer is not connected');
    return;
  }
  try {
    printer.clear();
    const buzzerCommand = Buffer.from([0x1b, 0x42, 2, 2]);
    printer.raw(buzzerCommand);
    await printer.execute();
  } catch (err) {
    console.error('[❌] Error sounding buzzer:', err);
  }
});
