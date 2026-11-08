import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-server";

// Interfaces from types or local definitions
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  category: string;
  tags: string[];
  nutritionTags: string[];
  image: string;
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

// Global In-Memory Fallbacks
let inMemoryStoreConfig: StoreConfig = {
  name: "ร้านอาหาร BTU",
  logo: "/src/assets/images/store_logo_1783867092729.jpg",
  serviceChargePercent: 10,
  vatPercent: 7,
  publicUrl: "https://ais-dev-yipyl6o27wx7rhovnc3rz6-518758351720.asia-southeast1.run.app",
};

let inMemoryCategories: string[] = ["อาหารจานหลัก", "ยำ/ส้มตำ", "ซุป/แกง", "อาหารทานเล่น", "เครื่องดื่ม", "ของหวาน"];

let inMemoryTables: Table[] = [
  { id: "1", seats: 4, status: "active" },
  { id: "2", seats: 4, status: "active" },
  { id: "3", seats: 2, status: "active" },
  { id: "4", seats: 6, status: "active" },
  { id: "5", seats: 4, status: "active" },
  { id: "6", seats: 4, status: "active" },
  { id: "7", seats: 2, status: "active" },
  { id: "8", seats: 8, status: "active" },
  { id: "9", seats: 4, status: "active" },
  { id: "10", seats: 4, status: "active" }
];

let inMemoryMenuItems: MenuItem[] = [];
let inMemoryOrders: Order[] = [];
let inMemoryStaffCalls: StaffCall[] = [];

// Sync Helper to initialize database if empty
export async function syncDatabase(defaultMenuItems: MenuItem[]) {
  const db = getFirebaseDb();
  if (!db) {
    inMemoryMenuItems = [...defaultMenuItems];
    return;
  }

  try {
    console.log("Syncing database with Firestore...");

    // 1. Store Config
    const storeDocRef = doc(db, "config", "store");
    const storeSnap = await getDoc(storeDocRef);
    if (storeSnap.exists()) {
      const data = storeSnap.data() as StoreConfig;
      if (data.logo === "/src/assets/images/btu_logo_1783953808431.jpg") {
        data.logo = "/src/assets/images/store_logo_1783867092729.jpg";
        await setDoc(storeDocRef, data);
        console.log("Migrated store config logo to the new store logo.");
      }
      if (!data.publicUrl) {
        data.publicUrl = "https://ais-dev-yipyl6o27wx7rhovnc3rz6-518758351720.asia-southeast1.run.app";
        await setDoc(storeDocRef, data);
      }
      inMemoryStoreConfig = data;
    } else {
      await setDoc(storeDocRef, inMemoryStoreConfig);
      console.log("Initialized store config in Firestore.");
    }

    // 2. Categories
    const catColRef = collection(db, "categories");
    const catSnap = await getDocs(catColRef);
    const firestoreCats = catSnap.docs.map(doc => doc.id);
    const defaultCats = ["อาหารจานหลัก", "ยำ/ส้มตำ", "ซุป/แกง", "อาหารทานเล่น", "เครื่องดื่ม", "ของหวาน"];
    
    let catUpdated = false;
    for (const cat of defaultCats) {
      if (!firestoreCats.includes(cat)) {
        await setDoc(doc(db, "categories", cat), { name: cat });
        console.log(`Added missing category: ${cat}`);
        catUpdated = true;
      }
    }
    
    if (catUpdated) {
      const updatedCatSnap = await getDocs(catColRef);
      inMemoryCategories = updatedCatSnap.docs.map(doc => doc.id);
    } else {
      inMemoryCategories = firestoreCats.length > 0 ? firestoreCats : defaultCats;
    }

    // 3. Tables
    const tablesColRef = collection(db, "tables");
    const tablesSnap = await getDocs(tablesColRef);
    if (tablesSnap.size > 0) {
      inMemoryTables = tablesSnap.docs.map(doc => doc.data() as Table);
    } else {
      for (const t of inMemoryTables) {
        await setDoc(doc(db, "tables", t.id), t);
      }
      console.log("Initialized tables in Firestore.");
    }

    // 4. Menu Items
    const menuColRef = collection(db, "menuItems");
    const menuSnap = await getDocs(menuColRef);
    if (menuSnap.size > 0) {
      const firestoreItems = menuSnap.docs.map(doc => doc.data() as MenuItem);
      let updatedAny = false;
      for (const item of defaultMenuItems) {
        const existing = firestoreItems.find(fi => fi.id === item.id);
        if (!existing || existing.name !== item.name || existing.image !== item.image || existing.description !== item.description) {
          await setDoc(doc(db, "menuItems", item.id), item);
          console.log(`Updated menu item in Firestore: ${item.name}`);
          updatedAny = true;
        }
      }
      if (updatedAny) {
        const updatedMenuSnap = await getDocs(menuColRef);
        inMemoryMenuItems = updatedMenuSnap.docs.map(doc => doc.data() as MenuItem);
      } else {
        inMemoryMenuItems = firestoreItems;
      }
    } else {
      inMemoryMenuItems = [...defaultMenuItems];
      for (const item of defaultMenuItems) {
        await setDoc(doc(db, "menuItems", item.id), item);
      }
      console.log("Initialized menu items in Firestore.");
    }

    // 5. Orders
    const ordersColRef = collection(db, "orders");
    const ordersSnap = await getDocs(ordersColRef);
    inMemoryOrders = ordersSnap.docs.map(doc => doc.data() as Order);

    // 6. Staff Calls
    const callsColRef = collection(db, "staffCalls");
    const callsSnap = await getDocs(callsColRef);
    inMemoryStaffCalls = callsSnap.docs.map(doc => doc.data() as StaffCall);

    console.log("Firestore sync completed successfully.");
  } catch (error) {
    console.error("Error during Firestore sync:", error);
    // fallback to default menu items
    if (inMemoryMenuItems.length === 0) {
      inMemoryMenuItems = [...defaultMenuItems];
    }
  }
}

// Store Config Actions
export async function getStoreConfig(): Promise<StoreConfig> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, "config", "store"));
      if (snap.exists()) {
        inMemoryStoreConfig = snap.data() as StoreConfig;
        if (!inMemoryStoreConfig.publicUrl) {
          inMemoryStoreConfig.publicUrl = "https://ais-dev-yipyl6o27wx7rhovnc3rz6-518758351720.asia-southeast1.run.app";
        }
      }
    } catch (e) {
      console.error("Error fetching store config:", e);
    }
  }
  if (!inMemoryStoreConfig.publicUrl) {
    inMemoryStoreConfig.publicUrl = "https://ais-dev-yipyl6o27wx7rhovnc3rz6-518758351720.asia-southeast1.run.app";
  }
  return inMemoryStoreConfig;
}

export async function saveStoreConfig(config: StoreConfig): Promise<void> {
  inMemoryStoreConfig = config;
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "config", "store"), config);
    } catch (e) {
      console.error("Error saving store config:", e);
    }
  }
}

// Categories Actions
export async function getCategories(): Promise<string[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "categories"));
      inMemoryCategories = snap.docs.map(d => d.id);
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  }
  return inMemoryCategories;
}

export async function addCategory(name: string): Promise<void> {
  if (!inMemoryCategories.includes(name)) {
    inMemoryCategories.push(name);
  }
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "categories", name), { name });
    } catch (e) {
      console.error("Error adding category:", e);
    }
  }
}

export async function deleteCategory(name: string): Promise<void> {
  inMemoryCategories = inMemoryCategories.filter(c => c !== name);
  const db = getFirebaseDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "categories", name));
    } catch (e) {
      console.error("Error deleting category:", e);
    }
  }
}

// Tables Actions
export function sortTablesNumerically(tbls: Table[]): Table[] {
  return [...tbls].sort((a, b) => {
    const matchA = a.id.match(/\d+/);
    const matchB = b.id.match(/\d+/);
    if (matchA && matchB) {
      const numA = parseInt(matchA[0], 10);
      const numB = parseInt(matchB[0], 10);
      if (numA !== numB) {
        return numA - numB;
      }
    }
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
  });
}

export async function getTables(): Promise<Table[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "tables"));
      inMemoryTables = snap.docs.map(d => d.data() as Table);
    } catch (e) {
      console.error("Error fetching tables:", e);
    }
  }
  return sortTablesNumerically(inMemoryTables);
}

export async function saveTable(table: Table): Promise<void> {
  const idx = inMemoryTables.findIndex(t => t.id === table.id);
  if (idx >= 0) {
    inMemoryTables[idx] = table;
  } else {
    inMemoryTables.push(table);
  }
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "tables", table.id), table);
    } catch (e) {
      console.error("Error saving table:", e);
    }
  }
}

export async function toggleTableStatus(id: string): Promise<Table | null> {
  const table = inMemoryTables.find(t => t.id === id);
  if (!table) return null;
  table.status = table.status === "active" ? "inactive" : "active";
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "tables", id), table);
    } catch (e) {
      console.error("Error toggling table status:", e);
    }
  }
  return table;
}

export async function deleteTable(id: string): Promise<void> {
  inMemoryTables = inMemoryTables.filter(t => t.id !== id);
  const db = getFirebaseDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "tables", id));
    } catch (e) {
      console.error("Error deleting table:", e);
    }
  }
}

// Menu Items Actions
export async function getMenuItems(): Promise<MenuItem[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "menuItems"));
      inMemoryMenuItems = snap.docs.map(d => d.data() as MenuItem);
    } catch (e) {
      console.error("Error fetching menu items:", e);
    }
  }
  return inMemoryMenuItems;
}

export async function saveMenuItem(item: MenuItem): Promise<void> {
  const idx = inMemoryMenuItems.findIndex(m => m.id === item.id);
  if (idx >= 0) {
    inMemoryMenuItems[idx] = item;
  } else {
    inMemoryMenuItems.push(item);
  }
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "menuItems", item.id), item);
    } catch (e) {
      console.error("Error saving menu item:", e);
    }
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  inMemoryMenuItems = inMemoryMenuItems.filter(m => m.id !== id);
  const db = getFirebaseDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "menuItems", id));
    } catch (e) {
      console.error("Error deleting menu item:", e);
    }
  }
}

export async function resetMenuToDefault(defaultMenuItems: MenuItem[]): Promise<void> {
  inMemoryMenuItems = [...defaultMenuItems];
  const db = getFirebaseDb();
  if (db) {
    try {
      // Clear existing first
      const snap = await getDocs(collection(db, "menuItems"));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "menuItems", d.id));
      }
      // Re-add default
      for (const item of defaultMenuItems) {
        await setDoc(doc(db, "menuItems", item.id), item);
      }
    } catch (e) {
      console.error("Error resetting menu:", e);
    }
  }
}

// Orders Actions
export async function getOrders(): Promise<Order[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "orders"));
      inMemoryOrders = snap.docs.map(d => d.data() as Order);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  }
  return inMemoryOrders;
}

export async function saveOrder(order: Order): Promise<void> {
  inMemoryOrders.push(order);
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "orders", order.id), order);
    } catch (e) {
      console.error("Error saving order:", e);
    }
  }
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> {
  const order = inMemoryOrders.find(o => o.id === id);
  if (!order) return null;
  order.status = status;
  const db = getFirebaseDb();
  if (db) {
    try {
      await updateDoc(doc(db, "orders", id), { status });
    } catch (e) {
      console.error("Error updating order status:", e);
    }
  }
  return order;
}

// Staff Calls Actions
export async function getStaffCalls(): Promise<StaffCall[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "staffCalls"));
      inMemoryStaffCalls = snap.docs.map(d => d.data() as StaffCall);
    } catch (e) {
      console.error("Error fetching staff calls:", e);
    }
  }
  return inMemoryStaffCalls;
}

export async function createStaffCall(call: StaffCall): Promise<void> {
  inMemoryStaffCalls.push(call);
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "staffCalls", call.id), call);
    } catch (e) {
      console.error("Error creating staff call:", e);
    }
  }
}

export async function dismissStaffCall(id: string): Promise<StaffCall | null> {
  const call = inMemoryStaffCalls.find(c => c.id === id);
  if (!call) return null;
  call.status = "Dismissed";
  const db = getFirebaseDb();
  if (db) {
    try {
      await updateDoc(doc(db, "staffCalls", id), { status: "Dismissed" });
    } catch (e) {
      console.error("Error dismissing staff call:", e);
    }
  }
  return call;
}
