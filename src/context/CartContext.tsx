import React, { createContext, useContext, useState, useEffect } from "react";
import { MenuItem, CartItem, Order, StoreConfig, Table } from "../types";

interface CartContextType {
  cart: CartItem[];
  table: string;
  menu: MenuItem[];
  storeConfig: StoreConfig;
  orderHistory: Order[];
  tableOrders: Order[];
  isLoading: boolean;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  setTableNum: (table: string) => void;
  fetchStoreData: () => Promise<void>;
  fetchTableOrders: (targetTable?: string) => Promise<Order[]>;
  placeOrder: (paymentMethod: string, withCredits: boolean) => Promise<boolean>;
  callStaff: () => Promise<boolean>;
  loadHistory: () => void;
  categories: string[];
  tables: Table[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [table, setTableState] = useState<string>("1");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    name: "ร้านอาหาร BTU",
    logo: "/src/assets/images/store_logo_1783867092729.jpg",
    serviceChargePercent: 10,
    vatPercent: 7,
  });
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // Sync table from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    const initialTable = tableParam || "1";
    if (tableParam) {
      setTableState(tableParam);
    }
    fetchStoreData();
    loadHistory();
    fetchTableOrders(initialTable);

    // Periodic poll for table orders to get live status
    const interval = setInterval(() => {
      fetchTableOrders(tableParam || table);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = () => {
    const saved = localStorage.getItem("papaya_order_history");
    if (saved) {
      try {
        setOrderHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse order history", e);
      }
    }
  };

  const fetchTableOrders = async (targetTable?: string): Promise<Order[]> => {
    try {
      const tbl = targetTable || table;
      const res = await fetch(`/api/orders?table=${tbl}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        setTableOrders(data);

        // Also update local history status if any match
        setOrderHistory((prev) => {
          if (prev.length === 0) return data;
          const updated = prev.map((localOrder) => {
            const serverOrder = data.find((o) => o.id === localOrder.id);
            return serverOrder || localOrder;
          });
          // Include any newly placed orders for this table not in local history
          for (const sOrder of data) {
            if (!updated.some((u) => u.id === sOrder.id)) {
              updated.push(sOrder);
            }
          }
          try {
            localStorage.setItem("papaya_order_history", JSON.stringify(updated));
          } catch (e) {
            // ignore
          }
          return updated;
        });
        return data;
      }
    } catch (e) {
      console.error("Failed to fetch table orders", e);
    }
    return [];
  };

  const fetchStoreData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/store-info");
      if (res.ok) {
        const data = await res.json();
        setMenu(data.menu);
        setStoreConfig(data.config);
        if (data.categories) {
          setCategories(data.categories);
        }
        if (data.tables) {
          const sorted = [...data.tables].sort((a: Table, b: Table) => {
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
          setTables(sorted);
        }
      }
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const setTableNum = (t: string) => {
    setTableState(t);
    try {
      if (typeof window !== "undefined" && window.location) {
        const newUrl = `${window.location.pathname}?table=${encodeURIComponent(t)}`;
        window.history.pushState({ path: newUrl }, "", newUrl);
      }
    } catch {
      // Ignore pushState errors in sandboxed iframes or mobile browser restrictions
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.menuItem.id === itemId ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const callStaff = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/call-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table }),
      });
      return res.ok;
    } catch (e) {
      console.error("Failed to call staff", e);
      return false;
    }
  };

  const placeOrder = async (paymentMethod: string, withCredits: boolean): Promise<boolean> => {
    if (cart.length === 0) return false;

    const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
    const serviceCharge = Math.round((subtotal * storeConfig.serviceChargePercent) / 100);
    const vat = Math.round(((subtotal + serviceCharge) * storeConfig.vatPercent) / 100);
    const total = subtotal + serviceCharge + vat;

    const orderPayload = {
      table,
      items: cart.map((i) => ({
        id: i.menuItem.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.menuItem.price,
      })),
      paymentMethod,
      withCredits,
      subtotal,
      serviceCharge,
      vat,
      total,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local history
        const updatedHistory = [data.order, ...orderHistory];
        setOrderHistory(updatedHistory);
        localStorage.setItem("papaya_order_history", JSON.stringify(updatedHistory));
        // Clear cart
        clearCart();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error placing order:", e);
      return false;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        table,
        menu,
        storeConfig,
        orderHistory,
        tableOrders,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setTableNum,
        fetchStoreData,
        fetchTableOrders,
        placeOrder,
        callStaff,
        loadHistory,
        categories,
        tables,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
