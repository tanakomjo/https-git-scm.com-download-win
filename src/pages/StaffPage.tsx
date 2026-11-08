import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/CartContext";
import {
  ChefHat,
  Bell,
  SlidersHorizontal,
  Settings,
  ArrowLeft,
  Check,
  X,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Clock,
  Play,
  CheckSquare,
  TrendingUp,
  Tag,
  QrCode,
  History,
  Search,
  Printer,
  Users,
  LayoutGrid,
  Utensils,
  Lock,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Sparkles,
  MoveRight,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Globe
} from "lucide-react";
import QRCode from "qrcode";
import { Order, MenuItem, StaffCall } from "../types";
import { getImageFallback } from "../lib/image-helper";
import { useThaiLiveClock } from "../lib/thai-time";
import { getTableOrderUrl, copyToClipboardSafe, DEFAULT_PUBLIC_URL } from "../lib/url-helper";

export const StaffPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeConfig, menu, fetchStoreData, categories, tables } = useCart();

  type UserRole = "staff" | "owner";
  type StaffTab = "kitchen" | "calls" | "inventory" | "settings" | "manager_overview" | "manager_categories" | "manager_tables" | "manager_orders";

  const initialRole: UserRole = searchParams.get("role") === "owner" ? "owner" : "staff";
  const initialTab: StaffTab = initialRole === "owner" ? "manager_overview" : "kitchen";

  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [activeTab, setActiveTab] = useState<StaffTab>(initialTab);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffCalls, setStaffCalls] = useState<StaffCall[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [hasNewOrderAlert, setHasNewOrderAlert] = useState(false);

  // Category management edit states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryToAssignItems, setCategoryToAssignItems] = useState<string | null>(null);
  const [selectedItemIdsToAssign, setSelectedItemIdsToAssign] = useState<string[]>([]);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [isAssigningItems, setIsAssigningItems] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  // Category normalization and matching helpers
  const normalizeCategory = (cat: string) => {
    if (!cat) return "";
    return cat.replace(/[\/\s_-]+/g, "").trim().toLowerCase();
  };

  const isCategoryMatch = (catA: string, catB: string) => {
    if (!catA || !catB) return false;
    if (catA.trim().toLowerCase() === catB.trim().toLowerCase()) return true;
    return normalizeCategory(catA) === normalizeCategory(catB);
  };

  const getItemsForCategory = (cat: string) => {
    return menu.filter((item) => isCategoryMatch(item.category, cat));
  };

  const getCategoryEmoji = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("หวาน") || c.includes("ขนม") || c.includes("dessert")) return "🍨";
    if (c.includes("ซุป") || c.includes("แกง") || c.includes("soup") || c.includes("curry")) return "🥣";
    if (c.includes("ยำ") || c.includes("ส้มตำ") || c.includes("salad")) return "🥗";
    if (c.includes("เครื่องดื่ม") || c.includes("น้ำ") || c.includes("drink")) return "🥤";
    if (c.includes("หลัก") || c.includes("ข้าว") || c.includes("main")) return "🍛";
    if (c.includes("เล่น") || c.includes("ทอด") || c.includes("snack")) return "🍟";
    return "🏷️";
  };

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleReassignItemCategory = async (itemId: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/menu-items/${itemId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      if (res.ok) {
        await fetchStoreData();
      }
    } catch (e) {
      console.error("Failed to reassign category", e);
    }
  };

  const handleOpenAssignModal = (cat: string) => {
    setCategoryToAssignItems(cat);
    setSelectedItemIdsToAssign([]);
    setAssignSearchQuery("");
  };

  const handleConfirmAssignItems = async () => {
    if (!categoryToAssignItems || selectedItemIdsToAssign.length === 0) return;
    setIsAssigningItems(true);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(categoryToAssignItems)}/assign-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedItemIdsToAssign }),
      });
      if (res.ok) {
        await fetchStoreData();
        setCategoryToAssignItems(null);
        setSelectedItemIdsToAssign([]);
      }
    } catch (e) {
      console.error("Failed to assign items to category", e);
    } finally {
      setIsAssigningItems(false);
    }
  };

  // Table management edit states
  const [newTableId, setNewTableId] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [qrCodeTable, setQrCodeTable] = useState<string | null>(null); // State to display printed QR Code frame

  // Sorted tables numerically: 1, 2, 3... 10, 11 (least to greatest)
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
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
  }, [tables]);

  // Order history filter states
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("All");

  // Thailand Live Clock (เดินวินาทีต่อวินาที ตามเวลาประเทศไทย Asia/Bangkok)
  const thaiClock = useThaiLiveClock();

  // Store setting edit states
  const [shopName, setShopName] = useState(storeConfig.name);
  const [shopLogo, setShopLogo] = useState(storeConfig.logo);
  const [shopPublicUrl, setShopPublicUrl] = useState(storeConfig.publicUrl || "");
  const [servicePercent, setServicePercent] = useState(storeConfig.serviceChargePercent);
  const [vatPercent, setVatPercent] = useState(storeConfig.vatPercent);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // QR Modal State & Local Generation
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>("");
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  useEffect(() => {
    if (storeConfig.publicUrl) {
      setShopPublicUrl(storeConfig.publicUrl);
    }
  }, [storeConfig.publicUrl]);

  // Generate QR code locally with qrcode whenever a table is selected
  useEffect(() => {
    if (qrCodeTable) {
      const url = getTableOrderUrl(qrCodeTable, shopPublicUrl || storeConfig.publicUrl);
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#ea580c",
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrModalDataUrl(dataUrl))
        .catch((err) => {
          console.error("QR generation error", err);
          // Fallback to online API
          setQrModalDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`
          );
        });
    } else {
      setQrModalDataUrl("");
      setCopiedQrLink(false);
    }
  }, [qrCodeTable, shopPublicUrl, storeConfig.publicUrl]);

  // Menu editor states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImg, setEditImg] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNutrition, setEditNutrition] = useState<string[]>([]);

  // Periodically fetch live orders and active staff calls from backend
  useEffect(() => {
    fetchOrdersAndCalls();
    const interval = setInterval(() => {
      fetchOrdersAndCalls();
    }, 4000); // Poll every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrdersAndCalls = async () => {
    try {
      // 1. Fetch Orders
      const orderRes = await fetch("/api/orders");
      if (orderRes.ok) {
        const contentType = orderRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const orderData: Order[] = await orderRes.json();
          setOrders(orderData);

          // Check if new pending orders came in to trigger audio/visual chime
          const activePendingCount = orderData.filter((o) => o.status === "Pending").length;
          if (orderData.length > lastOrderCount && lastOrderCount > 0) {
            triggerNewOrderAlarm();
          }
          setLastOrderCount(orderData.length);
        } else {
          console.warn("Expected JSON from /api/orders but received:", contentType);
        }
      }

      // 2. Fetch Staff Calls
      const callRes = await fetch("/api/staff-calls");
      if (callRes.ok) {
        const contentType = callRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const callData: StaffCall[] = await callRes.json();
          setStaffCalls(callData.filter((c) => c.status === "Active"));
        }
      }
    } catch (e) {
      console.error("Staff console polling failure", e);
    }
  };

  const triggerNewOrderAlarm = () => {
    setHasNewOrderAlert(true);
    // Play HTML5 synthesizer chime sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.log("Audio alert blocked by autoplay policies");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrdersAndCalls();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dismissStaffCall = async (callId: string) => {
    try {
      const res = await fetch(`/api/staff-calls/${callId}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        fetchOrdersAndCalls();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save general shop configuration
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/store-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName,
          logo: shopLogo,
          serviceChargePercent: Number(servicePercent),
          vatPercent: Number(vatPercent),
          publicUrl: shopPublicUrl || DEFAULT_PUBLIC_URL,
        }),
      });
      if (res.ok) {
        await fetchStoreData();
        alert("บันทึกการตั้งค่าหน้าร้านเรียบร้อยแล้ว!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Edit Item Modal inside inventory tab
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditOriginalPrice(item.originalPrice ? String(item.originalPrice) : "");
    setEditDesc(item.description);
    setEditCategory(item.category);
    setEditImg(item.image);
    setEditTags(item.tags);
    setEditNutrition(item.nutritionTags);
    setIsAddingNew(false);
  };

  const handleOpenAddModal = (defaultCategory?: string) => {
    setEditingItem(null);
    setEditName("");
    setEditPrice("");
    setEditOriginalPrice("");
    setEditDesc("");
    setEditCategory(defaultCategory || categories[0] || "อาหารจานหลัก");
    setEditImg("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80");
    setEditTags(["Recommended"]);
    setEditNutrition([]);
    setIsAddingNew(true);
  };

  const handleSaveItemInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isAddingNew ? undefined : editingItem?.id,
          name: editName,
          price: Number(editPrice),
          originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
          description: editDesc,
          category: editCategory,
          tags: editTags,
          nutritionTags: editNutrition,
          image: editImg,
        }),
      });

      if (res.ok) {
        await fetchStoreData();
        setEditingItem(null);
        setIsAddingNew(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบเมนูนี้ออกจากคลังสินค้า?")) {
      try {
        const res = await fetch(`/api/menu-items/${itemId}`, { method: "DELETE" });
        if (res.ok) {
          await fetchStoreData();
          setEditingItem(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        await fetchStoreData();
        setNewCategoryName("");
        setIsAddingCategory(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    const itemsInCat = menu.filter((item) => isCategoryMatch(item.category, catName));
    const confirmMsg = itemsInCat.length > 0
      ? `หมวดหมู่ "${catName}" มีรายการอาหารอยู่ ${itemsInCat.length} เมนู\nคุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้? (รายการอาหารจะถูกย้ายไปยังหมวดอื่นโดยอัตโนมัติ)`
      : `คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${catName}"?`;
    if (confirm(confirmMsg)) {
      try {
        if (itemsInCat.length > 0) {
          const fallbackCat = categories.find((c) => c !== catName) || "อาหารจานหลัก";
          for (const item of itemsInCat) {
            await fetch(`/api/menu-items/${item.id}/category`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: fallbackCat }),
            });
          }
        }
        const res = await fetch(`/api/categories/${encodeURIComponent(catName)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchStoreData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableId.trim()) return;
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTableId.trim(),
          seats: Number(newTableSeats),
        }),
      });
      if (res.ok) {
        await fetchStoreData();
        setNewTableId("");
        setNewTableSeats("4");
        setIsAddingTable(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (tblId: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบโต๊ะ "${tblId}"?`)) {
      try {
        const res = await fetch(`/api/tables/${tblId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchStoreData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleTableStatus = async (tblId: string) => {
    try {
      const res = await fetch(`/api/tables/${tblId}/toggle`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchStoreData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    setPinError("");
    const newVal = pinValue + digit;
    if (newVal.length <= 4) {
      setPinValue(newVal);
      if (newVal.length === 4) {
        if (newVal === "1234") {
          setActiveRole("owner");
          setActiveTab("manager_overview");
          setShowPinModal(false);
          setPinValue("");
        } else {
          setPinError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
          setPinValue("");
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPinError("");
    if (pinValue.length > 0) {
      setPinValue(pinValue.slice(0, -1));
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrdersAndCalls();
    await fetchStoreData();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F5] flex flex-col font-sans select-none">
      {/* UPPER NAVIGATION BAR (Matches screenshots 2 & 3 header) */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 z-40 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-center justify-between sm:justify-start space-x-2.5 w-full sm:w-auto">
          <div className="flex items-center space-x-2.5">
            <button
              id="staff-back-to-menu"
              onClick={() => navigate(`/`)}
              className="p-1.5 hover:bg-orange-50 rounded-full text-orange-600 transition-colors"
            >
              <ArrowLeft className="h-5.5 w-5.5" />
            </button>
            
            {/* Logo Squircle with Name - Updated dynamically to match the main page */}
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200/20 overflow-hidden">
                {storeConfig.logo ? (
                  <img
                    src={storeConfig.logo}
                    alt={storeConfig.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Utensils className="h-5 w-5 text-orange-500" />
                )}
              </div>
              <span className="font-black text-lg tracking-tight text-slate-800 font-display">
                {storeConfig.name || "ร้านอาหาร QR"}
              </span>
            </div>

            {/* Thailand Live Clock Display (เดินตามเวลาจริงของประเทศไทย UTC+7) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-50/90 border border-orange-200/70 rounded-2xl text-xs font-bold text-orange-900 shadow-2xs font-display">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Clock className="h-3.5 w-3.5 text-orange-600" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-orange-600 font-bold">เวลาไทย:</span>
                <span className="font-mono font-black text-slate-900 text-xs tracking-wider">{thaiClock.time}</span>
                <span className="text-[10px] text-orange-600 font-bold">น.</span>
              </div>
            </div>
          </div>

          {/* Quick Refresh icon for mobile */}
          <button
            id="staff-manual-refresh-mobile"
            onClick={handleManualRefresh}
            className={`sm:hidden p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-all ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* ROLE SELECTOR AND REFRESH CONTROLS (Top right - Language Selector removed) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Role selector switches */}
          {initialRole === "owner" ? (
            <div className="bg-slate-100/80 p-0.5 rounded-2xl flex items-center shadow-inner w-full sm:w-auto justify-center">
              <button
                id="role-switch-staff"
                onClick={() => {
                  setActiveRole("staff");
                  setActiveTab("kitchen");
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeRole === "staff"
                    ? "bg-white text-slate-800 shadow-sm font-black"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                👨‍🍳 พนักงานในครัว
              </button>
              <button
                id="role-switch-owner"
                onClick={() => {
                  setActiveRole("owner");
                  setActiveTab("manager_overview");
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeRole === "owner"
                    ? "bg-orange-500 text-white shadow-md font-black"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                ⚙️ ผู้จัดการ
              </button>
            </div>
          ) : (
            /* For Kitchen Staff, just show a read-only badge indicating role, no switcher, no manager option */
            <div className="bg-orange-50 border border-orange-100/50 px-4 py-2 rounded-2xl text-xs font-bold text-orange-600 flex items-center gap-1.5 shadow-sm">
              👨‍🍳 พนักงานในครัว
            </div>
          )}

          <button
            id="staff-manual-refresh"
            onClick={handleManualRefresh}
            className={`hidden sm:inline-block p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-all ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* NEW ORDER ALARM POPUP */}
      <AnimatePresence>
        {hasNewOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-orange-600 text-white p-3.5 px-4 text-center font-bold text-xs sm:text-sm flex justify-between items-center z-50 border-b border-orange-700 shadow-xl font-display"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-white rounded-full animate-ping" />
              🔔 มีออเดอร์ใหม่จากลูกค้าส่งเข้ามาในครัว!
            </span>
            <button
              onClick={() => setHasNewOrderAlert(false)}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-[11px] font-black"
            >
              รับทราบ
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HORIZONTAL TAB SELECTOR - MODERN PILL COHESIVE SYSTEM (Matches screenshots 2 & 3) */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 flex gap-2 p-3 overflow-x-auto no-scrollbar sticky top-[112px] sm:top-[64px] z-30 shadow-xs">
        {activeRole === "staff" ? (
          <>
            <button
              id="tab-kitchen"
              onClick={() => setActiveTab("kitchen")}
              className={`px-4.5 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "kitchen"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <ChefHat className="h-4.5 w-4.5" />
              <span>ออเดอร์ในครัว ({orders.length})</span>
            </button>

            <button
              id="tab-calls"
              onClick={() => setActiveTab("calls")}
              className={`px-4.5 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "calls"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <Bell className="h-4.5 w-4.5" />
              <span>เรียกพนักงาน ({staffCalls.length})</span>
            </button>
          </>
        ) : (
          <>
            {/* ผู้จัดการ: ภาพรวม */}
            <button
              id="tab-manager-overview"
              onClick={() => setActiveTab("manager_overview")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "manager_overview"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>ภาพรวม</span>
            </button>

            {/* ผู้จัดการ: จัดการเมนู */}
            <button
              id="tab-inventory"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "inventory"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>จัดการเมนู</span>
            </button>

            {/* ผู้จัดการ: จัดการหมวดหมู่ */}
            <button
              id="tab-manager-categories"
              onClick={() => setActiveTab("manager_categories")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "manager_categories"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <Tag className="h-4 w-4" />
              <span>จัดการหมวดหมู่</span>
            </button>

            {/* ผู้จัดการ: จัดการโต๊ะ */}
            <button
              id="tab-manager-tables"
              onClick={() => setActiveTab("manager_tables")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "manager_tables"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>จัดการโต๊ะ</span>
            </button>

            {/* ผู้จัดการ: ประวัติออร์เดอร์ */}
            <button
              id="tab-manager-orders"
              onClick={() => setActiveTab("manager_orders")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "manager_orders"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <History className="h-4 w-4" />
              <span>ประวัติออร์เดอร์</span>
            </button>

            <button
              id="tab-settings"
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2.5 rounded-2xl shrink-0 transition-all font-display text-xs flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "bg-[#FFF0E6] text-orange-600 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>ตั้งค่าหน้าร้าน</span>
            </button>
          </>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 max-w-4xl w-full mx-auto space-y-4 overflow-y-auto">
        
        {/* TAB 1: LIVE KITCHEN ORDERS */}
        {activeTab === "kitchen" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="font-extrabold text-slate-700 text-sm sm:text-base flex items-center gap-1.5 font-display">
                <span>กระดานออเดอร์เข้าครัวแบบเรียลไทม์</span>
                <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                  อัพเดทอัตโนมัติ
                </span>
              </h2>

              {/* Live Thailand Clock in Kitchen */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200/60 rounded-xl text-xs font-bold text-slate-700 shadow-2xs font-display">
                <Clock className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                <span className="text-slate-400 text-[10px]">เวลาปัจจุบัน (ไทย):</span>
                <span className="font-mono font-black text-orange-600">{thaiClock.time} น.</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-orange-100">
                <ChefHat className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-black font-display">ขณะนี้ยังไม่มีลูกค้าส่งออเดอร์สั่งอาหาร</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">เมื่อลูกค้าสั่งอาหารผ่าน QR Code รายการจะมาปรากฏขึ้นที่นี่ทันที!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    id={`staff-order-card-${order.id}`}
                    className={`bg-white rounded-[2rem] border p-5.5 shadow-md space-y-3.5 transition-all ${
                      order.status === "Pending" ? "border-l-4 border-l-red-500 border-orange-100/50" :
                      order.status === "Cooking" ? "border-l-4 border-l-orange-500 border-orange-100/50 animate-pulse bg-orange-50/5" :
                      order.status === "Served" ? "border-l-4 border-l-blue-500 border-orange-100/50" :
                      "border-orange-100/30 opacity-60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-orange-100/40 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-600 text-white font-black text-xs px-3 py-1 rounded-lg font-display">
                            โต๊ะ {order.table}
                          </span>
                          <span className="font-bold text-xs text-slate-700 font-mono">
                            คิว: {order.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">เวลาสั่ง: {order.orderTime} น.</p>
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                        order.status === "Pending" ? "bg-red-50 text-red-700 border border-red-100" :
                        order.status === "Cooking" ? "bg-orange-50 text-orange-700 border border-orange-100 animate-pulse" :
                        order.status === "Served" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        "bg-green-50 text-green-700 border border-green-100"
                      }`}>
                        {order.status === "Pending" ? "รอดำเนินการ" :
                         order.status === "Cooking" ? "กำลังปรุง" :
                         order.status === "Served" ? "เสิร์ฟแล้ว" : "เสร็จสิ้น"}
                      </span>
                    </div>

                    {/* Ordered Items Breakdown */}
                    <div className="space-y-1.5 text-xs text-slate-800 font-bold">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>
                            {it.quantity}x <span className="text-slate-700 font-bold">{it.name}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total billing detail */}
                    <div className="pt-2 border-t border-orange-100/40 flex justify-between items-center text-xs">
                      <div className="text-slate-400 font-semibold">
                        ช่องทาง: <span className="text-slate-700 font-black">{order.paymentMethod}</span>
                      </div>
                      <div className="font-bold text-slate-800 font-display">
                        รวมเงิน: <span className="text-orange-600 font-black">฿{order.total}</span>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="pt-2.5 flex gap-2">
                      {order.status === "Pending" && (
                        <button
                          id={`start-cooking-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, "Cooking")}
                          className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition-all font-display"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>เริ่มปรุงอาหาร</span>
                        </button>
                      )}

                      {order.status === "Cooking" && (
                        <button
                          id={`serve-food-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, "Served")}
                          className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition-all font-display"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>ปรุงเสร็จ-พร้อมเสิร์ฟ</span>
                        </button>
                      )}

                      {order.status === "Served" && (
                        <button
                          id={`complete-order-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, "Completed")}
                          className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition-all font-display"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>ปิดออเดอร์ (เรียบร้อย)</span>
                        </button>
                      )}

                      <button
                        id={`cancel-order-${order.id}`}
                        onClick={() => updateOrderStatus(order.id, "Cancelled")}
                        className="py-2 px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs transition-colors font-bold"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STAFF ASSISTANCE CALL SIGNALS */}
        {activeTab === "calls" && (
          <div className="space-y-4">
            <h2 className="font-extrabold text-slate-700 text-sm sm:text-base font-display">สัญญาณกระดิ่งเรียกพนักงานหน้าร้าน</h2>

            {staffCalls.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-orange-100">
                <Bell className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-black font-display">ขณะนี้ไม่มีสัญญาณเรียกจากโต๊ะอาหารใดๆ</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">เมื่อลูกค้ากดปุ่มเรียกพนักงาน สัญญาณเตือนจะเด้งที่หน้าจอนี้ทันที!</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {staffCalls.map((call) => (
                  <div
                    key={call.id}
                    id={`staff-call-${call.id}`}
                    className="bg-white border border-orange-100 rounded-[1.75rem] p-5.5 flex justify-between items-center shadow-md border-l-4 border-l-orange-500"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-orange-100 rounded-2xl text-orange-600 flex items-center justify-center font-black text-sm font-display shadow-sm">
                        โต๊ะ {call.table}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm font-display">สัญญาณเรียกด่วนจาก โต๊ะ {call.table}</h4>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          ส่งเมื่อเวลา {call.timestamp} น.
                        </p>
                      </div>
                    </div>

                    <button
                      id={`dismiss-call-${call.id}`}
                      onClick={() => dismissStaffCall(call.id)}
                      className="py-2 px-4.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 font-display"
                    >
                      รับเรื่องเรียบร้อย
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MENU INVENTORY MANAGER (CRUD) */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100/40 pb-3">
              <h2 className="font-extrabold text-slate-700 text-sm sm:text-base font-display">คลังสินค้าและรายการอาหารในระบบ</h2>
              <button
                id="add-inventory-item-btn"
                onClick={handleOpenAddModal}
                className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/15 flex items-center gap-1.5 font-display"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มเมนูใหม่</span>
              </button>
            </div>

            {/* List catalog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menu.map((item) => (
                <div
                  key={item.id}
                  id={`inventory-card-${item.id}`}
                  className="bg-white rounded-[1.75rem] p-3.5 border border-orange-100/30 flex items-start space-x-3.5 shadow-md relative"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallbackUrl = getImageFallback(item.name);
                      if (target.src !== fallbackUrl) {
                        target.src = fallbackUrl;
                      }
                    }}
                  />
                  <div className="flex-1 space-y-1 min-w-0">
                    <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-100 font-black px-2 py-0.5 rounded-lg font-display">
                      {item.category}
                    </span>
                    <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate pt-1 font-display">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-1.5 text-xs font-display">
                      <span className="font-black text-orange-600">฿{item.price}</span>
                      {item.originalPrice && <span className="text-[10px] text-slate-400 line-through">฿{item.originalPrice}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      id={`edit-item-inventory-${item.id}`}
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 bg-[#FFF9F5] hover:bg-orange-100 text-slate-600 hover:text-orange-600 rounded-xl transition-colors border border-orange-100/20"
                      title="แก้ไขรายละเอียด"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`delete-item-inventory-${item.id}`}
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-xl transition-colors border border-red-100/20"
                      title="ลบเมนูนี้"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STORE SETTINGS & TAXATION */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-[2rem] p-6.5 border border-orange-100/40 shadow-md max-w-xl mx-auto">
            <h2 className="font-extrabold text-slate-800 text-sm sm:text-base border-b border-orange-100 pb-3 mb-4 flex items-center gap-1.5 font-display">
              <Settings className="h-5 w-5 text-orange-500 animate-spin-slow" />
              ตั้งค่าโครงสร้างหน้าร้านและค่าบริการทางภาษี
            </h2>

            <form onSubmit={handleSaveStoreSettings} className="space-y-4 text-xs sm:text-sm font-medium">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-black uppercase">ชื่อร้านอาหารที่ลูกค้าเห็น</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-slate-800 focus:outline-none focus:border-orange-500"
                  placeholder="เช่น Papaya Gastro CentralWorld"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-black uppercase flex justify-between items-center">
                  <span>โลโก้ร้าน (รูปภาพ)</span>
                  <span className="text-[10px] text-orange-600 font-bold">อัปโหลดไฟล์ หรือ ป้อน URL</span>
                </label>

                {/* File Uploader Container for Store Logo */}
                <div className="border-2 border-dashed border-orange-200 hover:border-orange-500 rounded-2xl p-3 bg-orange-50/10 text-center cursor-pointer transition-colors relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setShopLogo(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {shopLogo ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={shopLogo}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-orange-100"
                      />
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[11px] font-black text-green-600 truncate">เลือกรูปภาพโลโก้แล้ว</p>
                        <p className="text-[9px] text-gray-400 font-medium">คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      <p className="text-[11px] font-black text-orange-600">📤 คลิกเพื่ออัปโหลดโลโก้ร้าน หรือ ลากไฟล์มาที่นี่</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">รองรับไฟล์รูปภาพ PNG, JPG, WEBP</p>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={shopLogo}
                  onChange={(e) => setShopLogo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-slate-800 text-xs focus:outline-none focus:border-orange-500"
                  placeholder="หรือป้อน URL รูปภาพ..."
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShopLogo("https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=200&h=200&q=80")}
                    className="px-3 py-1 text-[10px] bg-orange-50 text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-100 font-bold"
                  >
                    ใช้รูปมีดซ้อมและจานอาหาร (Unsplash)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-black uppercase flex justify-between items-center">
                  <span>🌐 URL ประจำร้าน (สำหรับลูกค้าสแกน / เปิดในโทรศัพท์มือถือและ Chrome)</span>
                  <span className="text-[10px] text-orange-600 font-bold">Public Web Address</span>
                </label>
                <input
                  type="url"
                  value={shopPublicUrl}
                  onChange={(e) => setShopPublicUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-slate-800 focus:outline-none focus:border-orange-500 font-mono text-xs"
                  placeholder={DEFAULT_PUBLIC_URL}
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  เมื่อลูกค้าใช้สมาร์ทโฟนหรือเบราว์เซอร์ Google Chrome สแกน QR Code ประจำโต๊ะ ระบบจะเปิดตาม URL นี้ (ป้องกันปัญหา localhost บนมือถือ)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-black uppercase">ค่าบริการ (Service Charge %)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={servicePercent}
                    onChange={(e) => setServicePercent(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-slate-800 focus:outline-none focus:border-orange-500"
                    placeholder="เช่น 10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-black uppercase">ภาษีมูลค่าเพิ่ม (VAT %)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-slate-800 focus:outline-none focus:border-orange-500"
                    placeholder="เช่น 7"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-orange-100/40 flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-black rounded-2xl text-center shadow-lg shadow-orange-600/20 font-display"
                >
                  {isSavingSettings ? "กำลังบันทึก..." : "💾 บันทึกและซิงค์การตั้งค่า"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: MANAGER OVERVIEW (ภาพรวมและแดชบอร์ด - Matches Screenshot 3 style) */}
        {activeTab === "manager_overview" && (
          <div className="space-y-6">
            <div className="pb-2">
              <h2 className="font-extrabold text-slate-800 text-lg font-display">
                ภาพรวมยอดขายประจำร้าน
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">รายงานความคืบหน้า รายได้ และสถานะออเดอร์เรียลไทม์</p>
            </div>

            {/* KPI Metrics Cards Grid (High-fidelity Screenshot 3 Match) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Sales */}
              <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] text-white p-5 rounded-[2rem] shadow-lg border border-orange-200/25 space-y-1 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-15 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-24 w-24" />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-orange-100 font-display">ยอดขายทั้งหมด</p>
                <p className="text-2xl sm:text-3xl font-black font-display">
                  ฿{orders.filter((o) => o.status !== "Cancelled").reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-orange-100/90 font-medium">จากออร์เดอร์สำเร็จทั้งหมด</p>
              </div>

              {/* Card 2: Total Orders */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xs space-y-1 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-slate-50 group-hover:scale-110 transition-transform">
                  <History className="h-24 w-24" />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-display">จำนวนออเดอร์</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-800 font-display">
                  {orders.length} <span className="text-xs text-slate-400 font-bold">ออร์เดอร์</span>
                </p>
                <p className="text-[9px] text-green-600 font-bold">เสร็จสิ้น {orders.filter(o => o.status === "Completed").length} รายการ</p>
              </div>

              {/* Card 3: Best Seller */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xs space-y-1 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-orange-50/70 group-hover:scale-110 transition-transform">
                  <ChefHat className="h-24 w-24" />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-display">เมนูยอดนิยม</p>
                <p className="text-xl sm:text-2xl font-black text-orange-600 font-display truncate">
                  {(() => {
                    const itemCounts: { [key: string]: number } = {};
                    orders.forEach(o => {
                      o.items.forEach(i => {
                        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
                      });
                    });
                    const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
                    return sorted.length > 0 ? sorted[0][0] : "ผัดกะเพราหมูสับ";
                  })()}
                </p>
                <p className="text-[9px] text-slate-400 font-medium">เมนูที่ลูกค้าสั่งบ่อยที่สุด</p>
              </div>

              {/* Card 4: Active Tables */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xs space-y-1 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-blue-50/70 group-hover:scale-110 transition-transform">
                  <CheckSquare className="h-24 w-24" />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-display">โต๊ะที่เปิดอยู่</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 font-display">
                  {Array.from(new Set(orders.filter(o => o.status !== "Completed" && o.status !== "Cancelled").map(o => o.table))).length} <span className="text-xs text-slate-400 font-bold">โต๊ะ</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium">โต๊ะที่กำลังสั่ง/ทานอาหาร</p>
              </div>
            </div>

            {/* Performance analysis block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales by Category (Bar charts) */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm font-display">สัดส่วนยอดขายตามหมวดหมู่</h3>
                  <p className="text-[10px] text-slate-400 font-medium">วิเคราะห์สัดส่วนรายได้แยกตามประเภทเมนูอาหาร</p>
                </div>

                <div className="space-y-3.5">
                  {categories.map((cat) => {
                    // Calculate revenue for this category
                    const categoryRevenue = menu
                      .filter(item => item.category === cat)
                      .reduce((sum, item) => {
                        let qty = 0;
                        orders.filter(o => o.status !== "Cancelled").forEach(o => {
                          o.items.forEach(orderItem => {
                            if (orderItem.id === item.id) qty += orderItem.quantity;
                          });
                        });
                        return sum + (qty * item.price);
                      }, 0);

                    const totalRevenueAll = orders
                      .filter(o => o.status !== "Cancelled")
                      .reduce((sum, o) => sum + o.total, 0) || 1; // Prevent division by zero

                    const percentage = Math.min(100, Math.round((categoryRevenue / totalRevenueAll) * 100));

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{cat}</span>
                          <span className="text-slate-500 font-display">฿{categoryRevenue.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#FF6B35] h-full rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Status Summary */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm font-display">สรุปสถานะการบริการลูกค้า</h3>
                  <p className="text-[10px] text-slate-400 font-medium">ติดตามสถานะออเดอร์ในระบบทั้งหมด</p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/40 text-center">
                    <p className="text-[10px] text-amber-600 font-extrabold font-display">รอคิวเตรียมปรุง (Pending)</p>
                    <p className="text-xl font-black text-amber-700 mt-1">{orders.filter(o => o.status === "Pending").length}</p>
                  </div>
                  <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100/40 text-center">
                    <p className="text-[10px] text-orange-600 font-extrabold font-display">กำลังปรุงอาหาร (Cooking)</p>
                    <p className="text-xl font-black text-orange-700 mt-1">{orders.filter(o => o.status === "Cooking").length}</p>
                  </div>
                  <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/40 text-center">
                    <p className="text-[10px] text-blue-600 font-extrabold font-display">เสิร์ฟแล้ว/รอปิดโต๊ะ (Served)</p>
                    <p className="text-xl font-black text-blue-700 mt-1">{orders.filter(o => o.status === "Served").length}</p>
                  </div>
                  <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100/40 text-center">
                    <p className="text-[10px] text-red-600 font-extrabold font-display">รายการที่ยกเลิก (Cancelled)</p>
                    <p className="text-xl font-black text-red-700 mt-1">{orders.filter(o => o.status === "Cancelled").length}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-orange-50/10 rounded-2xl border border-orange-100/50 flex justify-between items-center text-xs">
                  <div className="font-bold text-slate-700">💳 ชำระเงินสด / เงินโอน</div>
                  <div className="font-black text-orange-600 font-display">
                    ฿{orders.filter(o => o.status !== "Cancelled" && o.paymentMethod !== "Credits").reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MANAGER CATEGORIES (จัดการหมวดหมู่) */}
        {activeTab === "manager_categories" && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-orange-100 pb-3">
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm sm:text-base font-display flex items-center gap-2">
                  <span>🏷️ จัดการหมวดหมู่อาหารประจำร้าน</span>
                  <span className="text-[11px] bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-bold">
                    {categories.length} หมวดหมู่
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  ซิงค์ข้อมูลกับเมนูอาหาร สามารถกดดูรายการอาหาร เพิ่ม หรือย้าย/ลดเมนูในแต่ละหมวดหมู่ได้ตามต้องการ
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isAddingCategory ? (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/15 flex items-center gap-1.5 font-display transition-transform active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มหมวดหมู่</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(false)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    <span>ยกเลิก</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick search & filter bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-orange-50/30 p-2.5 rounded-2xl border border-orange-100/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="ค้นหาหมวดหมู่ หรือชื่อเมนูอาหารในหมวด..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-orange-100 text-xs text-slate-700 focus:outline-none focus:border-orange-500 placeholder:text-slate-400"
                />
                {categorySearchQuery && (
                  <button
                    onClick={() => setCategorySearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    categories.forEach((c) => (allOpen[c] = true));
                    setExpandedCategories(allOpen);
                  }}
                  className="px-3 py-1.5 bg-white border border-orange-100 hover:bg-orange-50 text-orange-600 rounded-xl font-bold text-[11px] shadow-xs flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>เปิดดูเมนูทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedCategories({})}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-[11px] shadow-xs flex items-center gap-1"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>ย่อทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* Add category form */}
            <AnimatePresence>
              {isAddingCategory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddCategory} className="bg-orange-50/20 p-4 rounded-3xl border border-orange-100 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">ชื่อหมวดหมู่ใหม่</label>
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="เช่น อาหารจานด่วน, อาหารย่าง, สลัด..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl shadow-md font-display"
                    >
                      💾 ยืนยันเพิ่มหมวดหมู่ใหม่
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Categories List Cards */}
            <div className="space-y-3.5">
              {categories
                .filter((cat) => {
                  if (!categorySearchQuery.trim()) return true;
                  const q = categorySearchQuery.toLowerCase();
                  if (cat.toLowerCase().includes(q)) return true;
                  const catItems = getItemsForCategory(cat);
                  return catItems.some((item) => item.name.toLowerCase().includes(q));
                })
                .map((cat) => {
                  const catItems = getItemsForCategory(cat);
                  const isExpanded = expandedCategories[cat] ?? false;
                  const emoji = getCategoryEmoji(cat);

                  return (
                    <div
                      key={cat}
                      className="bg-white border border-orange-100/60 rounded-[1.75rem] shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Category Header Row */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-orange-50/20 to-transparent">
                        <div
                          onClick={() => toggleCategoryExpand(cat)}
                          className="flex items-center space-x-3.5 cursor-pointer flex-1 select-none"
                        >
                          <div className="h-11 w-11 bg-orange-50 rounded-2xl text-orange-600 border border-orange-100 flex items-center justify-center font-black text-lg shadow-xs">
                            {emoji}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">{cat}</h4>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  catItems.length > 0
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {catItems.length} เมนู
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                              {catItems.length > 0
                                ? `คลิกเพื่อ${isExpanded ? "ซ่อน" : "ดู"}รายการอาหารทั้งหมดในหมวดนี้`
                                : "ยังไม่มีเมนูในหมวดนี้ คลิกเพิ่มได้ทันที"}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons on category header */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Toggle Expand Button */}
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(cat)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              isExpanded
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                            }`}
                          >
                            <Utensils className="h-3.5 w-3.5" />
                            <span>{isExpanded ? "ซ่อนเมนู" : `ดูรายการ (${catItems.length})`}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Quick Add Menu to this category */}
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(cat)}
                            title={`เพิ่มเมนูใหม่ในหมวด ${cat}`}
                            className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">เพิ่มเมนู</span>
                          </button>

                          {/* Quick Import / Assign existing items */}
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(cat)}
                            title={`ดึงเมนูที่มีอยู่มาไว้ในหมวด ${cat}`}
                            className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">ดึงเมนูใส่</span>
                          </button>

                          {/* Delete Category */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="ลบหมวดหมู่นี้"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Food Items Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-orange-100/60 bg-slate-50/40 p-4 space-y-3"
                          >
                            {/* Subheader Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-orange-100/40 shadow-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-700 font-display">
                                  📋 รายการอาหารในหมวด: {cat}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({catItems.length} รายการ)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(cat)}
                                  className="py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black rounded-xl shadow-xs flex items-center gap-1 font-display"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>+ เพิ่มเมนูใหม่ในหมวดนี้</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(cat)}
                                  className="py-1.5 px-3 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl shadow-xs flex items-center gap-1 font-display"
                                >
                                  <FolderPlus className="h-3 w-3 text-blue-600" />
                                  <span>ดึงเมนูที่มีอยู่มาใส่หมวดนี้</span>
                                </button>
                              </div>
                            </div>

                            {/* Items list or empty state */}
                            {catItems.length === 0 ? (
                              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-orange-200 space-y-3">
                                <div className="text-3xl">🍽️</div>
                                <div>
                                  <p className="text-xs font-bold text-slate-600">ยังไม่มีรายการอาหารในหมวดหมู่นี้</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    คุณสามารถเพิ่มเมนูอาหารใหม่ หรือดึงเมนูอาหารที่มีอยู่จากหมวดอื่นเข้ามาไว้ที่นี่ได้ทันที
                                  </p>
                                </div>
                                <div className="flex justify-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(cat)}
                                    className="py-1.5 px-3.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>เพิ่มเมนูใหม่ทันที</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignModal(cat)}
                                    className="py-1.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1"
                                  >
                                    <FolderPlus className="h-3.5 w-3.5" />
                                    <span>เลือกเมนูจากหมวดอื่น</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {catItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="bg-white rounded-2xl p-3 border border-orange-100/50 shadow-xs hover:border-orange-200 transition-all flex items-start gap-3 relative group"
                                  >
                                    {/* Food Thumbnail */}
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-16 h-16 rounded-xl object-cover shadow-xs border border-orange-100 shrink-0"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        const fallbackUrl = getImageFallback(item.name);
                                        if (target.src !== fallbackUrl) {
                                          target.src = fallbackUrl;
                                        }
                                      }}
                                    />

                                    {/* Item Details */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div className="flex items-start justify-between gap-1">
                                        <h5 className="font-extrabold text-slate-800 text-xs truncate">
                                          {item.name}
                                        </h5>
                                        <span className="font-black text-orange-600 text-xs font-display shrink-0">
                                          ฿{item.price}
                                        </span>
                                      </div>

                                      {item.description && (
                                        <p className="text-[10px] text-slate-400 line-clamp-1">
                                          {item.description}
                                        </p>
                                      )}

                                      {/* Reassign / Reduce category controls */}
                                      <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100">
                                        {/* Category selector to quickly move/reduce */}
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                          <ArrowRightLeft className="h-3 w-3 text-orange-500 shrink-0" />
                                          <span>ย้ายไป:</span>
                                          <select
                                            value={item.category}
                                            onChange={(e) => handleReassignItemCategory(item.id, e.target.value)}
                                            className="px-2 py-0.5 bg-orange-50/50 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-800 focus:outline-none focus:border-orange-500"
                                          >
                                            {categories.map((c) => (
                                              <option key={c} value={c}>
                                                {c} {c === cat ? "(หมวดนี้)" : ""}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Actions: Edit & Delete */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(item)}
                                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="แก้ไขข้อมูลเมนูนี้"
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="ลบเมนูนี้ทิ้ง"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB: MANAGER TABLES (จัดการโต๊ะและคิวอาร์โค้ด) */}
        {activeTab === "manager_tables" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-3">
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">จัดการโต๊ะอาหารประจำร้าน ({sortedTables.length} โต๊ะ)</h2>
                <p className="text-[10px] text-slate-400 font-medium">เพิ่มหรือลบหมายเลขโต๊ะอาหาร กำหนดจำนวนที่นั่ง และสร้าง QR Code ประจำโต๊ะ</p>
              </div>

              {!isAddingTable ? (
                <button
                  onClick={() => setIsAddingTable(true)}
                  className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/15 flex items-center gap-1 font-display"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มโต๊ะอาหาร</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsAddingTable(false)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  <span>ยกเลิก</span>
                </button>
              )}
            </div>

            {/* Add table form */}
            <AnimatePresence>
              {isAddingTable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddTable} className="bg-orange-50/20 p-4 rounded-3xl border border-orange-100 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-black text-slate-500 uppercase">หมายเลขโต๊ะ (หรือชื่อโต๊ะ)</label>
                        <input
                          type="text"
                          required
                          value={newTableId}
                          onChange={(e) => setNewTableId(e.target.value)}
                          placeholder="เช่น 11, 12, VIP1..."
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-black text-slate-500 uppercase">จำนวนที่นั่งของโต๊ะ</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="20"
                          value={newTableSeats}
                          onChange={(e) => setNewTableSeats(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl shadow-md font-display"
                    >
                      💾 ยืนยันเพิ่มโต๊ะใหม่
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tables list layout (High-fidelity Responsive Table matching Screenshot 2) */}
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4.5 font-display">Number</th>
                      <th className="px-6 py-4.5 font-display">Name/Zone</th>
                      <th className="px-6 py-4.5 font-display">Seats</th>
                      <th className="px-6 py-4.5 font-display">Status</th>
                      <th className="px-6 py-4.5 font-display">QR Code</th>
                      <th className="px-6 py-4.5 text-center font-display">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {sortedTables.map((tbl) => {
                      const isTableActive = tbl.status !== "inactive";

                      return (
                        <tr key={tbl.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-800 text-sm font-display">
                            {tbl.id}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700 font-display">
                            <span>โต๊ะ {tbl.id}</span>
                            {tbl.id === "5" && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg text-[9px] font-black uppercase">
                                VIP
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-500 font-display">
                            {tbl.seats} ที่นั่ง
                          </td>
                          <td className="px-6 py-4">
                            {/* Modern Status Toggle Switch - Screenshot 2 Match */}
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isTableActive}
                                onChange={() => handleToggleTableStatus(tbl.id)}
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                          </td>
                          <td className="px-6 py-4">
                            {/* QR Code Action Button */}
                            <button
                              onClick={() => setQrCodeTable(tbl.id)}
                              className="py-1.5 px-3 bg-white hover:bg-orange-50 text-orange-600 border border-orange-100/80 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              <span className="font-display">แสดง QR</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteTable(tbl.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="ลบโต๊ะ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MANAGER ORDERS (ประวัติออร์เดอร์ย้อนหลัง) */}
        {activeTab === "manager_orders" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-orange-100 pb-3 gap-2">
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">ประวัติออร์เดอร์และการทำรายการทั้งหมด</h2>
                <p className="text-[10px] text-slate-400 font-medium">บันทึกข้อมูลและตรวจสอบการชำระเงินออเดอร์ของลูกค้าทุกโต๊ะ</p>
              </div>

              {/* Status search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="ค้นหาโต๊ะ หรือหมายเลขออเดอร์..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-orange-100 rounded-xl focus:outline-none focus:border-orange-500 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Quick Status Pill filters */}
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {["All", "Pending", "Cooking", "Served", "Completed", "Cancelled"].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black font-display transition-all ${
                    orderStatusFilter === st
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white hover:bg-orange-50 text-slate-500 border border-orange-100/55"
                  }`}
                >
                  {st === "All" && "📋 ทั้งหมด"}
                  {st === "Pending" && "⏳ รอปรุง"}
                  {st === "Cooking" && "🔥 กำลังปรุง"}
                  {st === "Served" && "🔔 เสิร์ฟแล้ว"}
                  {st === "Completed" && "✅ เสร็จสมบูรณ์"}
                  {st === "Cancelled" && "❌ ยกเลิกแล้ว"}
                </button>
              ))}
            </div>

            {/* Orders list filtered */}
            {orders.filter((order) => {
              const matchSearch =
                order.table.includes(orderSearchQuery) ||
                order.id.toLowerCase().includes(orderSearchQuery.toLowerCase());
              
              const matchStatus = orderStatusFilter === "All" || order.status === orderStatusFilter;
              return matchSearch && matchStatus;
            }).length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-orange-100">
                <History className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-black font-display">ไม่พบประวัติออร์เดอร์ที่ตรงกับเงื่อนไข</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">ไม่มีรายการออร์เดอร์ที่สอดคล้องกับตัวกรองที่เลือกในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders
                  .filter((order) => {
                    const matchSearch =
                      order.table.includes(orderSearchQuery) ||
                      order.id.toLowerCase().includes(orderSearchQuery.toLowerCase());
                    
                    const matchStatus = orderStatusFilter === "All" || order.status === orderStatusFilter;
                    return matchSearch && matchStatus;
                  })
                  .map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-orange-100/50 rounded-[2rem] p-5 shadow-sm space-y-3"
                    >
                      {/* Header details */}
                      <div className="flex justify-between items-center pb-2.5 border-b border-orange-50/70">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm font-display">โต๊ะ {order.table}</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg ${
                              order.status === "Pending" ? "bg-amber-100 text-amber-700" :
                              order.status === "Cooking" ? "bg-orange-100 text-orange-700" :
                              order.status === "Served" ? "bg-blue-100 text-blue-700" :
                              order.status === "Completed" ? "bg-green-100 text-green-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {order.status === "Pending" && "รอปรุงอาหาร"}
                              {order.status === "Cooking" && "กำลังปรุงอาหาร"}
                              {order.status === "Served" && "เสิร์ฟแล้ว/รอปิดโต๊ะ"}
                              {order.status === "Completed" && "เสร็จสมบูรณ์"}
                              {order.status === "Cancelled" && "ยกเลิกแล้ว"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">ID: {order.id} | สั่งเมื่อ {order.orderTime} น.</p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-extrabold">รวมยอดสุทธิ</p>
                          <p className="font-black text-orange-600 text-sm font-display">฿{order.total}</p>
                        </div>
                      </div>

                      {/* Items details */}
                      <div className="space-y-2">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-bold">
                              {it.name} <span className="text-slate-400 text-[10px] font-bold">x {it.quantity}</span>
                            </span>
                            <span className="text-slate-700 font-black">฿{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Payment Method / Operational Action */}
                      <div className="pt-2 border-t border-orange-100/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          💳 การชำระเงิน: <span className="text-slate-700 font-extrabold">{order.paymentMethod}</span>
                        </span>

                        <div className="flex gap-1.5 self-end sm:self-auto">
                          {order.status !== "Completed" && order.status !== "Cancelled" && (
                            <button
                              onClick={() => {
                                const nextStatus =
                                  order.status === "Pending" ? "Cooking" :
                                  order.status === "Cooking" ? "Served" :
                                  "Completed";
                                updateOrderStatus(order.id, nextStatus);
                              }}
                              className="py-1 px-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-[10px] shadow-sm font-display transition-all"
                            >
                              {order.status === "Pending" && "🔥 เริ่มปรุงอาหาร"}
                              {order.status === "Cooking" && "🔔 ปรุงเสร็จ-เสิร์ฟ"}
                              {order.status === "Served" && "✅ ปิดออเดอร์"}
                            </button>
                          )}

                          {order.status !== "Cancelled" && order.status !== "Completed" && (
                            <button
                              onClick={() => updateOrderStatus(order.id, "Cancelled")}
                              className="py-1 px-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              ยกเลิก
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MENU ITEM INVENTORY POPUP MODAL (EDIT & ADD) */}
      {(editingItem || isAddingNew) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-7 max-w-md w-full shadow-2xl border border-orange-100/50 space-y-4 max-h-[90vh] overflow-y-auto text-xs sm:text-sm"
          >
            <div className="flex items-center justify-between border-b border-orange-100/40 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base font-display">
                {isAddingNew ? "➕ เพิ่มรายการสินค้าเข้าคลัง" : "📝 แก้ไขรายละเอียดสินค้า"}
              </h3>
              <button
                id="close-item-inventory"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 text-slate-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemInventory} className="space-y-3 font-medium">
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">ชื่อเมนูอาหาร</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-black text-slate-500 uppercase">ราคาขาย (บาท)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-black text-slate-500 uppercase">ราคาก่อนลด (ขีดฆ่า)</label>
                  <input
                    type="number"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500"
                    placeholder="ไม่มี ไม่ต้องใส่"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">หมวดหมู่</label>
                <input
                  type="text"
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 focus:outline-none focus:border-orange-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        editCategory === cat
                          ? "bg-orange-500 text-white"
                          : "bg-orange-50 hover:bg-orange-100 text-orange-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">คำอธิบายรายละเอียด</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 h-16 resize-none focus:outline-none focus:border-orange-500"
                  placeholder="เช่น รสชาติจัดจ้าน หอมเครื่องเทศ..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-500 uppercase flex justify-between items-center">
                  <span>รูปภาพอาหาร</span>
                  <span className="text-[10px] text-orange-600 font-bold">อัปโหลดไฟล์ หรือ ป้อน URL</span>
                </label>

                {/* File Uploader Container for Item */}
                <div className="border-2 border-dashed border-orange-200 hover:border-orange-500 rounded-2xl p-3 bg-orange-50/10 text-center cursor-pointer transition-colors relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setEditImg(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {editImg ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={editImg}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-orange-100"
                      />
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[11px] font-black text-green-600 truncate">เลือกรูปภาพแล้ว</p>
                        <p className="text-[9px] text-gray-400 font-medium">คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      <p className="text-[11px] font-black text-orange-600">📤 คลิกเพื่อเลือกรูปภาพ หรือ ลากไฟล์มาที่นี่</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">รองรับไฟล์รูปภาพ PNG, JPG, WEBP</p>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={editImg}
                  onChange={(e) => setEditImg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/10 border border-orange-100 text-slate-800 text-xs focus:outline-none focus:border-orange-500"
                  placeholder="หรือป้อน URL รูปภาพ..."
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditImg("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80")}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-[10px] font-bold"
                  >
                    ใช้ภาพตัวอย่าง (Unsplash)
                  </button>
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="space-y-1 pt-1">
                <label className="font-black text-slate-500 uppercase block">ป้ายสถานะ (Badges)</label>
                <div className="flex flex-wrap gap-2">
                  {["Recommended", "Only 3 left!", "Best seller", "Vegan"].map((tag) => {
                    const active = editTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setEditTags(editTags.filter((t) => t !== tag));
                          } else {
                            setEditTags([...editTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                          active ? "bg-orange-500 text-white border-orange-500 shadow-md" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nutrition */}
              <div className="space-y-1 pt-1">
                <label className="font-black text-slate-500 uppercase block">โภชนาการ (Nutrition)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (editNutrition.includes("V")) {
                        setEditNutrition(editNutrition.filter((n) => n !== "V"));
                      } else {
                        setEditNutrition([...editNutrition, "V"]);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                      editNutrition.includes("V") ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Vegetarian (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editNutrition.includes("VG")) {
                        setEditNutrition(editNutrition.filter((n) => n !== "VG"));
                      } else {
                        setEditNutrition([...editNutrition, "VG"]);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                      editNutrition.includes("VG") ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Vegan (VG)
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-orange-100/40 flex gap-2">
                {!isAddingNew && (
                  <button
                    id="delete-item-inventory-btn"
                    type="button"
                    onClick={() => handleDeleteItem(editingItem!.id)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNew(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl border border-slate-200 text-center transition-colors font-display"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-md shadow-orange-600/10 text-center transition-all font-display"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* TABLE QR CODE DISPLAY MODAL (PRINT FRAME) */}
      {qrCodeTable && (() => {
        const currentTableUrl = getTableOrderUrl(qrCodeTable, shopPublicUrl || storeConfig.publicUrl);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full shadow-2xl border border-orange-100/50 space-y-4 text-center text-xs sm:text-sm my-auto"
            >
              <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base font-display text-left">
                    🖨️ ป้ายคิวอาร์โค้ดประจำโต๊ะ
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium text-left">
                    รองรับเปิดในโทรศัพท์มือถือและเบราว์เซอร์ Chrome ทุกระบบ
                  </p>
                </div>
                <button
                  onClick={() => setQrCodeTable(null)}
                  className="p-1.5 text-slate-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* QR Card Template for Print */}
              <div id="print-qr-card" className="bg-[#FFF9F5] rounded-[2rem] p-5 sm:p-6 border-2 border-orange-200/60 space-y-3.5 shadow-inner">
                <div className="flex flex-col items-center">
                  <img
                    src={storeConfig.logo}
                    alt={storeConfig.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-orange-100 mb-1 shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "/src/assets/images/store_logo_1783867092729.jpg";
                    }}
                  />
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm font-display">{storeConfig.name}</h4>
                  <p className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider">Scan & Order System</p>
                </div>

                {/* Real working QR code (Generated locally or via API) */}
                <div className="bg-white p-3.5 rounded-2xl shadow-md inline-block border border-orange-100/80">
                  {qrModalDataUrl ? (
                    <img
                      src={qrModalDataUrl}
                      alt={`QR Code Table ${qrCodeTable}`}
                      className="w-40 h-40 sm:w-44 sm:h-44 mx-auto object-contain"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentTableUrl)}`}
                      alt={`QR Code Table ${qrCodeTable}`}
                      className="w-40 h-40 sm:w-44 sm:h-44 mx-auto object-contain"
                    />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-800 font-display">โต๊ะ {qrCodeTable}</div>
                  <p className="text-[10px] text-slate-400 font-bold">สแกนรหัส QR เพื่อดูเมนู สั่งอาหาร และชำระเงิน</p>
                </div>
              </div>

              {/* Link Info & Mobile Chrome Direct Action */}
              <div className="space-y-2 text-left bg-orange-50/40 p-3 rounded-2xl border border-orange-100">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>📱 ลิงก์ตรงสำหรับเปิดในโทรศัพท์ / Chrome:</span>
                  <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ออนไลน์พร้อมใช้งาน
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-orange-200/60 font-mono text-[10px] text-slate-600 break-all select-all">
                  {currentTableUrl}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await copyToClipboardSafe(currentTableUrl);
                      if (success) {
                        setCopiedQrLink(true);
                        setTimeout(() => setCopiedQrLink(false), 2000);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-white hover:bg-orange-50 text-slate-700 border border-orange-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedQrLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">คัดลอกลิงก์แล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>คัดลอกลิงก์</span>
                      </>
                    )}
                  </button>

                  <a
                    href={currentTableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>เปิดทดสอบใน Chrome</span>
                  </a>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 font-display"
                >
                  <Printer className="h-4 w-4" />
                  <span>พิมพ์ป้ายตั้งโต๊ะ</span>
                </button>
                <button
                  onClick={() => setQrCodeTable(null)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* MODAL: ASSIGN / IMPORT EXISTING MENU ITEMS TO CATEGORY */}
      {categoryToAssignItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-orange-100 flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base font-display flex items-center gap-2">
                  <span>📥 ดึงรายการอาหารมาไว้ที่หมวดหมู่:</span>
                  <span className="text-orange-600 font-black">"{categoryToAssignItems}"</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  เลือกรายการอาหารจากหมวดอื่นเพื่อย้ายมายังหมวดนี้ได้ตามต้องการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryToAssignItems(null);
                  setSelectedItemIdsToAssign([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Selection Helpers */}
            <div className="pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่ออาหาร หรือหมวดหมู่เดิม..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-orange-50/20 border border-orange-100 text-xs text-slate-700 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Selection summary & quick toggle */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-slate-500 text-[11px]">
                  เลือกแล้ว: <strong className="text-orange-600 font-black">{selectedItemIdsToAssign.length}</strong> รายการ
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const candidates = menu
                        .filter((item) => !isCategoryMatch(item.category, categoryToAssignItems!))
                        .filter((item) => {
                          if (!assignSearchQuery) return true;
                          const q = assignSearchQuery.toLowerCase();
                          return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
                        });
                      setSelectedItemIdsToAssign(candidates.map((c) => c.id));
                    }}
                    className="text-[11px] text-orange-600 hover:underline font-bold"
                  >
                    เลือกทั้งหมด
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedItemIdsToAssign([])}
                    className="text-[11px] text-slate-500 hover:underline font-bold"
                  >
                    ล้างการเลือก
                  </button>
                </div>
              </div>
            </div>

            {/* List of candidate menu items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
              {menu
                .filter((item) => !isCategoryMatch(item.category, categoryToAssignItems!))
                .filter((item) => {
                  if (!assignSearchQuery) return true;
                  const q = assignSearchQuery.toLowerCase();
                  return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
                })
                .map((item) => {
                  const isSelected = selectedItemIdsToAssign.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemIdsToAssign((prev) =>
                          isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-orange-50 border-orange-400 shadow-xs"
                          : "bg-white border-slate-100 hover:border-orange-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 text-orange-600 rounded-sm focus:ring-orange-500 border-slate-300 pointer-events-none"
                        />
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover border border-orange-100 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallbackUrl = getImageFallback(item.name);
                            if (target.src !== fallbackUrl) {
                              target.src = fallbackUrl;
                            }
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-xs truncate">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-md">
                              หมวดเดิม: {item.category}
                            </span>
                            <span className="text-[10px] font-black text-orange-600">฿{item.price}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-slate-200 shrink-0" />
                      )}
                    </div>
                  );
                })}

              {menu.filter((item) => !isCategoryMatch(item.category, categoryToAssignItems!)).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  ไม่มีรายการอาหารจากหมวดอื่นให้เลือก
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-orange-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryToAssignItems(null);
                  setSelectedItemIdsToAssign([]);
                }}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl font-display"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={selectedItemIdsToAssign.length === 0 || isAssigningItems}
                onClick={handleConfirmAssignItems}
                className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/15 font-display flex items-center gap-1.5 transition-all"
              >
                {isAssigningItems ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังย้ายข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4" />
                    <span>💾 ย้ายมาหมวดนี้ ({selectedItemIdsToAssign.length} รายการ)</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PIN AUTHENTICATION MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-orange-100/50 space-y-6 text-center"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center border border-orange-200/30">
                <Lock className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg font-display">
                ยืนยันสิทธิ์ผู้จัดการ
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                กรุณากรอกรหัสผ่าน 4 หลัก เพื่อเข้าใช้งานส่วนผู้จัดการ
              </p>
              <p className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                รหัสผ่านเริ่มต้นคือ 1234
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
                    pinValue.length > index
                      ? "bg-orange-500 border-orange-500 scale-110 shadow-sm shadow-orange-500/20"
                      : "border-slate-300 bg-white"
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {pinError && (
              <p className="text-xs text-red-500 font-bold animate-pulse">
                ⚠️ {pinError}
              </p>
            )}

            {/* Numerical Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeyPress(num)}
                  className="h-14 w-14 rounded-full bg-slate-50 hover:bg-orange-50 hover:text-orange-600 active:scale-95 text-slate-700 font-black text-lg font-display transition-all border border-slate-100/60 shadow-sm flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinValue("");
                  setPinError("");
                }}
                className="h-14 w-14 rounded-full text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors flex items-center justify-center font-display"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress("0")}
                className="h-14 w-14 rounded-full bg-slate-50 hover:bg-orange-50 hover:text-orange-600 active:scale-95 text-slate-700 font-black text-lg font-display transition-all border border-slate-100/60 shadow-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                className="h-14 w-14 rounded-full text-slate-400 hover:text-orange-600 active:scale-95 transition-all flex items-center justify-center"
                title="ลบ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
