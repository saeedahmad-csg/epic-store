import * as fs from "fs";
import * as path from "path";

const customers = [
  { name: "Sarah Connor", email: "sarah.connor@example.com" },
  { name: "John Wick", email: "john.wick@example.com" },
  { name: "Alex Mercer", email: "alex.mercer@example.com" },
  { name: "Elena Fisher", email: "elena.fisher@example.com" },
  { name: "Bruce Wayne", email: "bruce.wayne@example.com" },
  { name: "Diana Prince", email: "diana.prince@example.com" },
  { name: "Clark Kent", email: "clark.kent@example.com" },
  { name: "Peter Parker", email: "peter.parker@example.com" },
  { name: "Tony Stark", email: "tony.stark@example.com" },
  { name: "Natasha Romanoff", email: "natasha.r@example.com" },
  { name: "Steve Rogers", email: "steve.rogers@example.com" },
  { name: "Wanda Maximoff", email: "wanda.m@example.com" },
  { name: "Stephen Strange", email: "dr.strange@example.com" },
  { name: "Barry Allen", email: "barry.allen@example.com" },
  { name: "Arthur Curry", email: "arthur.curry@example.com" },
  { name: "Victor Stone", email: "victor.stone@example.com" },
  { name: "Hal Jordan", email: "hal.jordan@example.com" },
  { name: "Oliver Queen", email: "oliver.queen@example.com" },
  { name: "Miles Morales", email: "miles.m@example.com" },
  { name: "Gwen Stacy", email: "gwen.stacy@example.com" },
];

const products = [
  { id: "PROD-101", name: "Apex Pulse ANC Wireless Headphones", price: 169.99 },
  { id: "PROD-102", name: "Apex Chrono Pro Smartwatch", price: 199.99 },
  { id: "PROD-103", name: "Apex Sonic In-Ear True Wireless Earbuds", price: 89.99 },
  { id: "PROD-104", name: "Apex Ultra-Slim 65W GaN Fast Charger", price: 35.99 },
  { id: "PROD-105", name: "Apex Ergonomic Mechanical Gaming Keyboard", price: 97.49 },
  { id: "PROD-106", name: "Apex 4K Ultra-Wide 34-Inch Curved Monitor", price: 522.49 },
  { id: "PROD-107", name: "Apex Digital Gift Card ($50)", price: 50.0 },
  { id: "PROD-108", name: "Apex Vintage Canvas Laptop Backpack", price: 34.99 },
];

const paymentMethods = [
  "Credit Card (Visa ending 4242)",
  "Credit Card (Mastercard ending 8819)",
  "Credit Card (Amex ending 1004)",
  "PayPal",
  "Apple Pay",
  "Google Pay",
];

function getIsoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

const orders: any[] = [];

for (let i = 1; i <= 50; i++) {
  const orderId = `ORD-${1000 + i}`;
  const cust = customers[(i - 1) % customers.length];
  const prod = products[(i * 3) % products.length];
  const qty = (i % 7 === 0) ? 2 : 1;
  const totalAmount = parseFloat((prod.price * qty).toFixed(2));
  const paymentMethod = paymentMethods[i % paymentMethods.length];

  let orderStatus = "Delivered";
  let orderDaysAgo = 0;
  let deliveryDate = "";

  if (i === 4 || i === 18 || i === 32 || i === 46) {
    orderStatus = "Shipped";
    orderDaysAgo = 2;
    deliveryDate = "Pending Delivery";
  } else if (i === 10 || i === 25 || i === 40) {
    orderStatus = "Processing";
    orderDaysAgo = 1;
    deliveryDate = "Pending Delivery";
  } else {
    // Delivered orders spread over 3 to 65 days
    // Some DOA window (3-12 days ago)
    // Some normal policy window (14-28 days ago)
    // Some expired window (35-65 days ago)
    const delDaysAgo = ((i * 7) % 60) + 3;
    orderDaysAgo = delDaysAgo + 3;
    deliveryDate = getIsoDateDaysAgo(delDaysAgo);
  }

  orders.push({
    orderId,
    customerEmail: cust.email,
    customerName: cust.name,
    orderDate: getIsoDateDaysAgo(orderDaysAgo),
    deliveryDate,
    productId: prod.id,
    productName: prod.name,
    quantity: qty,
    totalAmount,
    paymentMethod,
    orderStatus,
  });
}

console.log(`Generated ${orders.length} orders.`);

// Update src/lib/sampleData.ts
const sampleDataPath = path.join(process.cwd(), "src", "lib", "sampleData.ts");
let content = fs.readFileSync(sampleDataPath, "utf8");

const ordersRegex = /export const INITIAL_ORDERS: Order\[\] = \[[\s\S]*?\];/;
const newOrdersArrayString = `export const INITIAL_ORDERS: Order[] = ${JSON.stringify(orders, null, 2)};`;

content = content.replace(ordersRegex, newOrdersArrayString);
fs.writeFileSync(sampleDataPath, content, "utf8");

console.log("✅ Successfully updated INITIAL_ORDERS in src/lib/sampleData.ts with 50 diverse orders!");
