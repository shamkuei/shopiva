// Mirror of the backend Drizzle models as received over JSON.
// `price` is a string because Drizzle returns the numeric column as a string.

export type Store = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  sku: string | null;
  stock: number;
  active: boolean;
  storeId: string;
  createdAt: string;
  updatedAt: string;
};
