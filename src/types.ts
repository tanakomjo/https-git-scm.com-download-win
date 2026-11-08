export interface MenuItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  category: string;
  tags: string[]; // e.g. ["Recommended", "Only 3 left!", "Best seller"]
  nutritionTags: string[]; // e.g. ["V", "VG"]
  image: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  table: string;
  items: OrderItem[];
  status: "Pending" | "Cooking" | "Served" | "Completed" | "Cancelled";
  subtotal: number;
  serviceCharge: number;
  vat: number;
  total: number;
  paymentMethod: string;
  orderTime: string;
  withCredits: boolean;
  pointsEarned: number;
}

export interface StaffCall {
  id: string;
  table: string;
  timestamp: string;
  status: "Active" | "Dismissed";
}

export interface StoreConfig {
  name: string;
  logo: string;
  serviceChargePercent: number;
  vatPercent: number;
  publicUrl?: string;
}

export interface Table {
  id: string;
  seats: number;
  status?: "active" | "inactive";
}
