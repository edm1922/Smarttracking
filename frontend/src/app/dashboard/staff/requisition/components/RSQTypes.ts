export interface ProductStock {
  locationId?: string;
  location?: { id: string; name: string };
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  stocks: ProductStock[];
  totalStock?: number;
  unit?: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Employee {
  name: string;
  position: string;
  department: string;
}

export interface SelectedItem {
  productId: string;
  productName: string;
  sku: string;
  quantities: Record<string, number>;
  maxQuantity: number;
  description: string | null;
}

export interface DraftEntry {
  name: string;
  position: string;
  department: string;
  items: DraftItem[];
}

export interface DraftItem {
  productId: string;
  name: string;
  sku: string;
  availableQty: number;
  quantity: number;
  description: string | null;
}
