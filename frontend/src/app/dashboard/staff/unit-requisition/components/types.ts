export interface UnitRequest {
  id: string;
  qty: number;
  unit: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RELEASED';
  remarks: string | null;
  createdAt: string;
  item: {
    id: string;
    name: string;
    slug: string;
    unit: string;
  };
  user: {
    id: string;
    username: string;
  };
  adminRemarks?: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unit: string;
  stocks: {
    quantity: number;
    location: {
      name: string;
    };
  }[];
}

export interface StaffRelease {
  id: string;
  employeeName: string;
  productName: string;
  itemSlug: string;
  qty: number;
  unit: string;
  department: string;
  supervisor: string;
  date: string;
}
