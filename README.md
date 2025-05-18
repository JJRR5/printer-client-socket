# printer-client-socket

Node.js client for thermal printing and buzzer control via WebSocket.

## Requirements

- Node.js
- Thermal printer compatible with `node-thermal-printer`
- Environment variables:
  - `API_WS_URL`: WebSocket base URL
  - `PRINTER_TOKEN`: Authentication token

## Installation

```bash
npm install
```

## Usage

1. Create a `.env` file:
    ```
    API_WS_URL=wss://yourserver.com
    PRINTER_TOKEN=your_token
    ```
2. Start the client:
    ```bash
    npm run dev
    ```

## Features

- Connects to `${API_WS_URL}/printer` via WebSocket.
- Listens for events:
  - `print_ticket`: Prints a ticket with received data.
  - `emit_buzzer`: Activates the printer's buzzer.

## Notes

- Ensure your printer is connected and properly configured.
- The printer charset is set to `SLOVENIA`. Adjust if needed for your model.
