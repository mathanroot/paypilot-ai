import { getPayPalOrderDetails, capturePayPalOrder } from '../src/lib/paypal.js';

async function testOrders() {
  for (const id of ['8SD03176L6505334H', '5SA00422G50922412']) {
    console.log(`Checking PayPal order ${id}...`);
    try {
      const details = await getPayPalOrderDetails(id);
      console.log(`Order ${id} status on PayPal:`, details.status);
      console.log(`Gross amount:`, details.purchase_units?.[0]?.amount);
      if (details.status === 'APPROVED') {
        console.log(`Order is APPROVED! Capturing...`);
        const capture = await capturePayPalOrder(id);
        console.log(`Captured successfully!`, capture.status, capture.captureId);
      }
    } catch (e) {
      console.error(`Error on ${id}:`, e.message);
    }
  }
}

testOrders();
