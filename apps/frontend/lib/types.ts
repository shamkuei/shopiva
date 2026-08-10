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
