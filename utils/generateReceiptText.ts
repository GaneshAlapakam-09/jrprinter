export function generateReceiptText(items: any[], total: number): string {
    let text = '*** RECEIPT ***\n\n';
  
    items.forEach((item) => {
      text += `${item.name} x${item.quantity}  ₹${item.price * item.quantity}\n`;
    });
  
    text += '\n------------------------\n';
    text += `Total: ₹${total.toFixed(2)}\n`;
    text += 'Thank you!\n\n\n\n';
    return text;
  }