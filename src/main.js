import * as dotenv from 'dotenv';
import { io } from 'socket.io-client';
import {
  printer as ThermalPrinter,
  types as PrinterTypes,
  characterSet,
} from 'node-thermal-printer';
import process from 'process';
import { Buffer } from 'buffer';

dotenv.config();

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: '/dev/usb/lp0', // or the correct device path for your printer
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

socket.on('print_ticket', async (data) => {
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error('[❌] Printer is not connected');
    return;
  }
  const { order, customer, items, total, qrCodeUrl } = data;
  console.log('[🖨️] Printing ticket:', data);
  try {
    printer.clear();

    printer.alignCenter();
    printer.bold(true);
    printer.setTypeFontA();    
    printer.println(`Venta #${order}`);
    printer.println(`Cliente: ${customer}`);
    printer.println('Fecha: ' + new Date().toLocaleString());
    printer.drawLine();

    printer.bold(false);
    printer.setTypeFontB();
    printer.setTextSize(10, 10);
    printer.alignLeft();
    items.forEach((item) => {
      printer.println(`${item.quantity}x ${item.name} - $${item.price}`);
    });

    printer.drawLine();
    printer.alignRight();
    printer.println(`Total: $${total}`);

    printer.alignCenter();
    printer.printQR(qrCodeUrl);
    printer.cut();

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
