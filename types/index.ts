export interface PrintTicketItem {
    name: string;
    quantity: number;
    price: number;
}
  
export interface CreatePrintTicket {
    order: string;
    customer: string;
    items: PrintTicketItem[];
    total: number;
    qrUrl: string;
}