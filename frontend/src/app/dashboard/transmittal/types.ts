export interface TransmittalHeaderInfo {
  transmittalNo: string;
  date: string;
  department: string;
  endUser: string;
  position: string;
  sourceSupplier: string;
  subject: string;
  subTitle: string;
  customSubHeader: string;
  preparedBy: string;
  checkedBy: string;
  receivedBy: string;
  approvedBy: string;
  showPrepared: boolean;
  showChecked: boolean;
  showReceived: boolean;
  showApproved: boolean;
  remarks?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
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
}

export interface TransmittalItem {
  id: string;
  productId: string;
  logIds: string[];
  name: string;
  sku: string;
  description?: string | null;
  unit: string;
  quantity: number;
  requestedBy?: string;
  dateRequested?: string;
}

export interface PRItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  estimatedCost: number;
}
