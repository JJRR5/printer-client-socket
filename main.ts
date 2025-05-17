import * as dotenv from 'dotenv';
import { io } from 'socket.io-client';
import {
  printer as ThermalPrinter,
  types as PrinterTypes,
  characterSet,
} from 'node-thermal-printer';
import { CreatePrintTicket } from './types';

dotenv.config();

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: 'usb',
  characterSet: characterSet.SLOVENIA,
  removeSpecialCharacters: false,
  lineCharacter: '-',
  options: {
    timeout: 5000,
  },
});

const socket = io(`${process.env.API_WS_URL}/printer`, {
  transports: ['websocket'],
  auth: {
    token: process.env.PRINTER_TOKEN,
  },
});

socket.on('connect', () => {
  console.log('[🖨️] Conectado al WebSocket de la API');
});

socket.on('print_ticket', async (data: CreatePrintTicket) => {
  const { order, customer, items, total, qrUrl } = data;
  try {
    printer.clear();

    printer.alignCenter();
    printer.println(`🧾 Venta #${order}`);
    printer.println(`Cliente: ${customer}`);
    printer.println('Fecha: ' + new Date().toLocaleString());
    printer.drawLine();

    printer.alignLeft();
    items.forEach((item) => {
      printer.println(`${item.quantity}x ${item.name} - $${item.price}`);
    });

    printer.drawLine();
    printer.alignRight();
    printer.println(`Total: $${total}`);

    printer.alignCenter();
    printer.printQR(qrUrl);
    printer.cut();

    await printer.execute();
  } catch (err) {
    console.error('[❌] Error al imprimir:', err);
  }
});

socket.on('emit_buzzer', async () => {
  try {
    const buzzerCommand = Buffer.from([0x1b, 0x42, 2, 2]);
    printer.raw(buzzerCommand);
    await printer.execute();
  } catch (err) {
    console.error('[❌] Error al sonar el buzzer:', err);
  }
});
