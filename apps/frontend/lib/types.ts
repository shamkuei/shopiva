// Mirror of the backend Drizzle models as received over JSON.
// `price` is a string because Drizzle returns the numeric column as a string.

export type Store = {
  id: string;
  name: string;
  subdomain: string;
  ownerId: string | null;
  createdAt: string;
};

export type Product = {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  stock: number;
  category: string | null;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  role: string;
  storeId: string;
};

// Client-side cart line (price stored for display; the server re-reads prices
// on checkout, so a stale/edited value here can't affect the order total).
export type CartItem = {
  productId: string;
  title: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
};

export type Order = {
  id: string;
  storeId: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  totalAmount: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  createdAt: string;
};
