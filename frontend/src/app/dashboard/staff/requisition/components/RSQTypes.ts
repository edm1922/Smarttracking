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
  lastName: string;
  firstName: string;
  position: string;
  department: string;
}

export interface SelectedItem {
  productId: string;
  productName: string;
  sku: string;
  unit?: string;
  quantities: Record<string, number>;
  maxQuantity: number;
  description: string | null;
}

export interface DraftEntry {
  lastName: string;
  firstName: string;
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
  unit?: string;
}

export const formatEmpName = (lastName: string, firstName: string) =>
  `${lastName.toUpperCase()}, ${firstName.toUpperCase()}`;

export const displayEmpName = (lastName: string, firstName: string) =>
  `${lastName.toUpperCase()}, ${firstName.toUpperCase()}`;

export const parseEmpName = (name: string) => {
  if (!name) return { lastName: '', firstName: '' };
  const commaIdx = name.indexOf(',');
  if (commaIdx >= 0) {
    return { lastName: name.slice(0, commaIdx).trim().toUpperCase(), firstName: name.slice(commaIdx + 1).trim().toUpperCase() };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { lastName: parts.pop()!.toUpperCase(), firstName: parts.join(' ').toUpperCase() };
  }
  return { lastName: name.trim().toUpperCase(), firstName: '' };
};

export const employeeKey = (emp: Employee) => formatEmpName(emp.lastName, emp.firstName);
