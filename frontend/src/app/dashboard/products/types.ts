export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  supplier: string | null;
  markupPercent: number | null;
  unit: string;
  purchaseUnit?: string | null;
  price: number;
  threshold: number;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  showInInventory: boolean;
  stocks: {
    locationId: string;
    quantity: number;
    location: { name: string };
  }[];
  logs?: any[];
}

export interface Location {
  id: string;
  name: string;
}
