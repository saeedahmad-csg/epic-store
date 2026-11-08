export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPercent: number;
  stockQuantity: number;
  description: string;
  eligibleForRefund: boolean;
  imageUrl?: string;
}

export interface Order {
  orderId: string;
  customerEmail: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  orderStatus: "Delivered" | "Shipped" | "Processing" | "Cancelled";
}

export interface Customer {
  customerId: string;
  name: string;
  email: string;
  loyaltyTier: "Gold" | "Silver" | "Bronze";
  registeredDate: string;
}

export interface RefundRequest {
  refundId: string;
  orderId: string;
  customerEmail: string;
  productId: string;
  refundAmount: number;
  reason: string;
  policyCitation: string;
  eligibilityStatus: "Approved" | "Pending_Admin_Review" | "Rejected";
  adminStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  approvedAt: string;
}

export interface InteractionLog {
  interactionId: string;
  timestamp: string;
  customerEmail: string;
  customerQuery: string;
  agentResponse: string;
  toolCallsUsed: string;
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "PROD-101",
    name: "Apex Pulse ANC Wireless Headphones",
    category: "Electronics",
    price: 199.99,
    discountPercent: 15, // Net $169.99
    stockQuantity: 42,
    description: "Premium over-ear noise-cancelling headphones with 40-hour battery life and spatial audio.",
    eligibleForRefund: true,
    imageUrl: "/products/headphones.jpg",
  },
  {
    id: "PROD-102",
    name: "Apex Chrono Pro Smartwatch",
    category: "Wearables",
    price: 249.99,
    discountPercent: 20, // Net $199.99
    stockQuantity: 18,
    description: "Titanium casing smartwatch with ECG sensor, GPS routing, and 5 ATM water resistance.",
    eligibleForRefund: true,
    imageUrl: "/products/smartwatch.jpg",
  },
  {
    id: "PROD-103",
    name: "Apex Sonic In-Ear True Wireless Earbuds",
    category: "Audio",
    price: 89.99,
    discountPercent: 0,
    stockQuantity: 65,
    description: "Compact wireless earbuds with deep bass. Note: Hygiene sealed package.",
    eligibleForRefund: true, // Only if unsealed/unopened per policy
    imageUrl: "/products/earbuds.jpg",
  },
  {
    id: "PROD-104",
    name: "Apex Ultra-Slim 65W GaN Fast Charger",
    category: "Accessories",
    price: 39.99,
    discountPercent: 10,
    stockQuantity: 120,
    description: "Dual USB-C and USB-A high-speed fast charger compatible with laptops and smartphones.",
    eligibleForRefund: true,
    imageUrl: "/products/charger.jpg",
  },
  {
    id: "PROD-105",
    name: "Apex Ergonomic Mechanical Gaming Keyboard",
    category: "Computing",
    price: 129.99,
    discountPercent: 25,
    stockQuantity: 24,
    description: "Hot-swappable tactile mechanical keyboard with RGB backlighting and wrist rest.",
    eligibleForRefund: true,
    imageUrl: "/products/keyboard.jpg",
  },
  {
    id: "PROD-106",
    name: "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    category: "Computing",
    price: 549.99,
    discountPercent: 5,
    stockQuantity: 9,
    description: "165Hz IPS 1ms HDR curved gaming and productivity monitor with USB-C hub.",
    eligibleForRefund: true,
    imageUrl: "/products/monitor.jpg",
  },
  {
    id: "PROD-107",
    name: "Apex Digital Gift Card ($50)",
    category: "Digital",
    price: 50.0,
    discountPercent: 0,
    stockQuantity: 999,
    description: "Instant electronic store voucher code for any ApexStore purchase. Non-refundable.",
    eligibleForRefund: false,
    imageUrl: "/products/giftcard.jpg",
  },
  {
    id: "PROD-108",
    name: "Apex Vintage Canvas Laptop Backpack",
    category: "Apparel & Bags",
    price: 69.99,
    discountPercent: 50, // Final Sale clearance item!
    stockQuantity: 7,
    description: "Water-resistant canvas travel backpack. Clearance 50% off - Final Sale.",
    eligibleForRefund: false, // Final Sale clearance per policy
    imageUrl: "/products/backpack.jpg",
  },
];

// Helper to calculate realistic relative dates (e.g. 5 days ago, 22 days ago, 45 days ago)
function getIsoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export const INITIAL_ORDERS: Order[] = [
  {
    "orderId": "ORD-1001",
    "customerEmail": "sarah.connor@example.com",
    "customerName": "Sarah Connor",
    "orderDate": "2026-10-09",
    "deliveryDate": "2026-10-12",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1002",
    "customerEmail": "john.wick@example.com",
    "customerName": "John Wick",
    "orderDate": "2026-10-02",
    "deliveryDate": "2026-10-05",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1003",
    "customerEmail": "alex.mercer@example.com",
    "customerName": "Alex Mercer",
    "orderDate": "2026-09-25",
    "deliveryDate": "2026-09-28",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 1,
    "totalAmount": 199.99,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1004",
    "customerEmail": "elena.fisher@example.com",
    "customerName": "Elena Fisher",
    "orderDate": "2026-10-20",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 1,
    "totalAmount": 97.49,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Shipped"
  },
  {
    "orderId": "ORD-1005",
    "customerEmail": "bruce.wayne@example.com",
    "customerName": "Bruce Wayne",
    "orderDate": "2026-09-11",
    "deliveryDate": "2026-09-14",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 1,
    "totalAmount": 34.99,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1006",
    "customerEmail": "diana.prince@example.com",
    "customerName": "Diana Prince",
    "orderDate": "2026-09-04",
    "deliveryDate": "2026-09-07",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 1,
    "totalAmount": 89.99,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1007",
    "customerEmail": "clark.kent@example.com",
    "customerName": "Clark Kent",
    "orderDate": "2026-08-28",
    "deliveryDate": "2026-08-31",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 2,
    "totalAmount": 1044.98,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1008",
    "customerEmail": "peter.parker@example.com",
    "customerName": "Peter Parker",
    "orderDate": "2026-08-21",
    "deliveryDate": "2026-08-24",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1009",
    "customerEmail": "tony.stark@example.com",
    "customerName": "Tony Stark",
    "orderDate": "2026-10-13",
    "deliveryDate": "2026-10-16",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1010",
    "customerEmail": "natasha.r@example.com",
    "customerName": "Natasha Romanoff",
    "orderDate": "2026-10-21",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Processing"
  },
  {
    "orderId": "ORD-1011",
    "customerEmail": "steve.rogers@example.com",
    "customerName": "Steve Rogers",
    "orderDate": "2026-09-29",
    "deliveryDate": "2026-10-02",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 1,
    "totalAmount": 199.99,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1012",
    "customerEmail": "wanda.m@example.com",
    "customerName": "Wanda Maximoff",
    "orderDate": "2026-09-22",
    "deliveryDate": "2026-09-25",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 1,
    "totalAmount": 97.49,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1013",
    "customerEmail": "dr.strange@example.com",
    "customerName": "Stephen Strange",
    "orderDate": "2026-09-15",
    "deliveryDate": "2026-09-18",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 1,
    "totalAmount": 34.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1014",
    "customerEmail": "barry.allen@example.com",
    "customerName": "Barry Allen",
    "orderDate": "2026-09-08",
    "deliveryDate": "2026-09-11",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 2,
    "totalAmount": 179.98,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1015",
    "customerEmail": "arthur.curry@example.com",
    "customerName": "Arthur Curry",
    "orderDate": "2026-09-01",
    "deliveryDate": "2026-09-04",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 1,
    "totalAmount": 522.49,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1016",
    "customerEmail": "victor.stone@example.com",
    "customerName": "Victor Stone",
    "orderDate": "2026-08-25",
    "deliveryDate": "2026-08-28",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1017",
    "customerEmail": "hal.jordan@example.com",
    "customerName": "Hal Jordan",
    "orderDate": "2026-08-18",
    "deliveryDate": "2026-08-21",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1018",
    "customerEmail": "oliver.queen@example.com",
    "customerName": "Oliver Queen",
    "orderDate": "2026-10-20",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Shipped"
  },
  {
    "orderId": "ORD-1019",
    "customerEmail": "miles.m@example.com",
    "customerName": "Miles Morales",
    "orderDate": "2026-10-03",
    "deliveryDate": "2026-10-06",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 1,
    "totalAmount": 199.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1020",
    "customerEmail": "gwen.stacy@example.com",
    "customerName": "Gwen Stacy",
    "orderDate": "2026-09-26",
    "deliveryDate": "2026-09-29",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 1,
    "totalAmount": 97.49,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1021",
    "customerEmail": "sarah.connor@example.com",
    "customerName": "Sarah Connor",
    "orderDate": "2026-09-19",
    "deliveryDate": "2026-09-22",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 2,
    "totalAmount": 69.98,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1022",
    "customerEmail": "john.wick@example.com",
    "customerName": "John Wick",
    "orderDate": "2026-09-12",
    "deliveryDate": "2026-09-15",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 1,
    "totalAmount": 89.99,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1023",
    "customerEmail": "alex.mercer@example.com",
    "customerName": "Alex Mercer",
    "orderDate": "2026-09-05",
    "deliveryDate": "2026-09-08",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 1,
    "totalAmount": 522.49,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1024",
    "customerEmail": "elena.fisher@example.com",
    "customerName": "Elena Fisher",
    "orderDate": "2026-08-29",
    "deliveryDate": "2026-09-01",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1025",
    "customerEmail": "bruce.wayne@example.com",
    "customerName": "Bruce Wayne",
    "orderDate": "2026-10-21",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Processing"
  },
  {
    "orderId": "ORD-1026",
    "customerEmail": "diana.prince@example.com",
    "customerName": "Diana Prince",
    "orderDate": "2026-10-14",
    "deliveryDate": "2026-10-17",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1027",
    "customerEmail": "clark.kent@example.com",
    "customerName": "Clark Kent",
    "orderDate": "2026-10-07",
    "deliveryDate": "2026-10-10",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 1,
    "totalAmount": 199.99,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1028",
    "customerEmail": "peter.parker@example.com",
    "customerName": "Peter Parker",
    "orderDate": "2026-09-30",
    "deliveryDate": "2026-10-03",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 2,
    "totalAmount": 194.98,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1029",
    "customerEmail": "tony.stark@example.com",
    "customerName": "Tony Stark",
    "orderDate": "2026-09-23",
    "deliveryDate": "2026-09-26",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 1,
    "totalAmount": 34.99,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1030",
    "customerEmail": "natasha.r@example.com",
    "customerName": "Natasha Romanoff",
    "orderDate": "2026-09-16",
    "deliveryDate": "2026-09-19",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 1,
    "totalAmount": 89.99,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1031",
    "customerEmail": "steve.rogers@example.com",
    "customerName": "Steve Rogers",
    "orderDate": "2026-09-09",
    "deliveryDate": "2026-09-12",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 1,
    "totalAmount": 522.49,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1032",
    "customerEmail": "wanda.m@example.com",
    "customerName": "Wanda Maximoff",
    "orderDate": "2026-10-20",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Shipped"
  },
  {
    "orderId": "ORD-1033",
    "customerEmail": "dr.strange@example.com",
    "customerName": "Stephen Strange",
    "orderDate": "2026-08-26",
    "deliveryDate": "2026-08-29",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1034",
    "customerEmail": "barry.allen@example.com",
    "customerName": "Barry Allen",
    "orderDate": "2026-08-19",
    "deliveryDate": "2026-08-22",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1035",
    "customerEmail": "arthur.curry@example.com",
    "customerName": "Arthur Curry",
    "orderDate": "2026-10-11",
    "deliveryDate": "2026-10-14",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 2,
    "totalAmount": 399.98,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1036",
    "customerEmail": "victor.stone@example.com",
    "customerName": "Victor Stone",
    "orderDate": "2026-10-04",
    "deliveryDate": "2026-10-07",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 1,
    "totalAmount": 97.49,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1037",
    "customerEmail": "hal.jordan@example.com",
    "customerName": "Hal Jordan",
    "orderDate": "2026-09-27",
    "deliveryDate": "2026-09-30",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 1,
    "totalAmount": 34.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1038",
    "customerEmail": "oliver.queen@example.com",
    "customerName": "Oliver Queen",
    "orderDate": "2026-09-20",
    "deliveryDate": "2026-09-23",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 1,
    "totalAmount": 89.99,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1039",
    "customerEmail": "miles.m@example.com",
    "customerName": "Miles Morales",
    "orderDate": "2026-09-13",
    "deliveryDate": "2026-09-16",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 1,
    "totalAmount": 522.49,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1040",
    "customerEmail": "gwen.stacy@example.com",
    "customerName": "Gwen Stacy",
    "orderDate": "2026-10-21",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Processing"
  },
  {
    "orderId": "ORD-1041",
    "customerEmail": "sarah.connor@example.com",
    "customerName": "Sarah Connor",
    "orderDate": "2026-08-30",
    "deliveryDate": "2026-09-02",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 1,
    "totalAmount": 35.99,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1042",
    "customerEmail": "john.wick@example.com",
    "customerName": "John Wick",
    "orderDate": "2026-08-23",
    "deliveryDate": "2026-08-26",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 2,
    "totalAmount": 100,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1043",
    "customerEmail": "alex.mercer@example.com",
    "customerName": "Alex Mercer",
    "orderDate": "2026-10-15",
    "deliveryDate": "2026-10-18",
    "productId": "PROD-102",
    "productName": "Apex Chrono Pro Smartwatch",
    "quantity": 1,
    "totalAmount": 199.99,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1044",
    "customerEmail": "elena.fisher@example.com",
    "customerName": "Elena Fisher",
    "orderDate": "2026-10-08",
    "deliveryDate": "2026-10-11",
    "productId": "PROD-105",
    "productName": "Apex Ergonomic Mechanical Gaming Keyboard",
    "quantity": 1,
    "totalAmount": 97.49,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1045",
    "customerEmail": "bruce.wayne@example.com",
    "customerName": "Bruce Wayne",
    "orderDate": "2026-10-01",
    "deliveryDate": "2026-10-04",
    "productId": "PROD-108",
    "productName": "Apex Vintage Canvas Laptop Backpack",
    "quantity": 1,
    "totalAmount": 34.99,
    "paymentMethod": "PayPal",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1046",
    "customerEmail": "diana.prince@example.com",
    "customerName": "Diana Prince",
    "orderDate": "2026-10-20",
    "deliveryDate": "Pending Delivery",
    "productId": "PROD-103",
    "productName": "Apex Sonic In-Ear True Wireless Earbuds",
    "quantity": 1,
    "totalAmount": 89.99,
    "paymentMethod": "Apple Pay",
    "orderStatus": "Shipped"
  },
  {
    "orderId": "ORD-1047",
    "customerEmail": "clark.kent@example.com",
    "customerName": "Clark Kent",
    "orderDate": "2026-09-17",
    "deliveryDate": "2026-09-20",
    "productId": "PROD-106",
    "productName": "Apex 4K Ultra-Wide 34-Inch Curved Monitor",
    "quantity": 1,
    "totalAmount": 522.49,
    "paymentMethod": "Google Pay",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1048",
    "customerEmail": "peter.parker@example.com",
    "customerName": "Peter Parker",
    "orderDate": "2026-09-10",
    "deliveryDate": "2026-09-13",
    "productId": "PROD-101",
    "productName": "Apex Pulse ANC Wireless Headphones",
    "quantity": 1,
    "totalAmount": 169.99,
    "paymentMethod": "Credit Card (Visa ending 4242)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1049",
    "customerEmail": "tony.stark@example.com",
    "customerName": "Tony Stark",
    "orderDate": "2026-09-03",
    "deliveryDate": "2026-09-06",
    "productId": "PROD-104",
    "productName": "Apex Ultra-Slim 65W GaN Fast Charger",
    "quantity": 2,
    "totalAmount": 71.98,
    "paymentMethod": "Credit Card (Mastercard ending 8819)",
    "orderStatus": "Delivered"
  },
  {
    "orderId": "ORD-1050",
    "customerEmail": "natasha.r@example.com",
    "customerName": "Natasha Romanoff",
    "orderDate": "2026-08-27",
    "deliveryDate": "2026-08-30",
    "productId": "PROD-107",
    "productName": "Apex Digital Gift Card ($50)",
    "quantity": 1,
    "totalAmount": 50,
    "paymentMethod": "Credit Card (Amex ending 1004)",
    "orderStatus": "Delivered"
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    customerId: "CUST-001",
    name: "Sarah Connor",
    email: "sarah.connor@example.com",
    loyaltyTier: "Gold", // 45-day return window & waived restocking fee perk!
    registeredDate: "2024-03-15",
  },
  {
    customerId: "CUST-002",
    name: "John Wick",
    email: "john.wick@example.com",
    loyaltyTier: "Silver", // Free return shipping perk
    registeredDate: "2024-08-20",
  },
  {
    customerId: "CUST-003",
    name: "Alex Mercer",
    email: "alex.mercer@example.com",
    loyaltyTier: "Bronze", // Standard policy
    registeredDate: "2025-01-10",
  },
  {
    customerId: "CUST-004",
    name: "Elena Fisher",
    email: "elena.fisher@example.com",
    loyaltyTier: "Gold",
    registeredDate: "2023-11-04",
  },
];

export const INITIAL_REFUNDS: RefundRequest[] = [
  {
    refundId: "REF-2026-001",
    orderId: "ORD-1001",
    customerEmail: "sarah.connor@example.com",
    productId: "PROD-101",
    refundAmount: 169.99,
    reason: "Audio crackling on left ear cup after 3 days of use (Defective on Arrival)",
    policyCitation: "Section 3: Defective on Arrival (DOA) - 100% full refund + waived fee",
    eligibilityStatus: "Approved",
    adminStatus: "APPROVED",
    createdAt: getIsoDateDaysAgo(2),
    approvedAt: getIsoDateDaysAgo(2),
  },
];
