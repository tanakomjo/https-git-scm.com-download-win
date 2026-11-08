import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  History,
  BellRing,
  FileText,
  ChefHat,
  HelpCircle,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Utensils,
  ChevronRight,
  Receipt
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { Order } from "../types";
import { getThailandTimeString } from "../lib/thai-time";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleOwnerMode?: () => void;
  isOwnerMode?: boolean;
  hideAdminControls?: boolean;
  defaultTab?: "status" | "history" | "terms" | "help";
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  onToggleOwnerMode,
  isOwnerMode = false,
  hideAdminControls = false,
  defaultTab = "status",
}) => {
  const { callStaff, tableOrders, orderHistory, table, fetchTableOrders } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"status" | "history" | "terms" | "help">(defaultTab);
  const [statusFilter, setStatusFilter] = useState<"All" | "Cooking" | "Served" | "Pending">("All");
  const [isCalling, setIsCalling] = useState(false);
  const [callMessage, setCallMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>("");

  // Merge table orders and order history to ensure no duplicates
  const displayOrders = useMemo(() => {
    const combined = [...tableOrders];
    for (const histOrder of orderHistory) {
      if (!combined.some((o) => o.id === histOrder.id)) {
        // If order matches this table, include it
        if (String(histOrder.table) === String(table)) {
          combined.push(histOrder);
        }
      }
    }
    // Sort newest first
    return combined.sort((a, b) => {
      const idA = a.id.split("-")[1] || "0";
      const idB = b.id.split("-")[1] || "0";
      return Number(idB) - Number(idA);
    });
  }, [tableOrders, orderHistory, table]);

  // Counts for badge indicators
  const cookingCount = useMemo(
    () => displayOrders.filter((o) => o.status === "Cooking").length,
    [displayOrders]
  );
  const servedCount = useMemo(
    () => displayOrders.filter((o) => o.status === "Served").length,
    [displayOrders]
  );
  const pendingCount = useMemo(
    () => displayOrders.filter((o) => o.status === "Pending").length,
    [displayOrders]
  );

  // Filtered orders for the Status view
  const filteredOrders = useMemo(() => {
    if (statusFilter === "All") return displayOrders;
    return displayOrders.filter((o) => o.status === statusFilter);
  }, [displayOrders, statusFilter]);

  // Polling when drawer is open
  useEffect(() => {
    if (isOpen) {
      handleManualRefresh();
      const interval = setInterval(() => {
        fetchTableOrders(table);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, table]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTableOrders(table);
    setLastRefreshedTime(getThailandTimeString(true));
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleCallStaff = async () => {
    setIsCalling(true);
    setCallMessage("");
    const success = await callStaff();
    if (success) {
      setCallMessage("🔔 เรียกพนักงานสำเร็จ! พนักงานกำลังเดินทางมาที่โต๊ะ " + table);
    } else {
      setCallMessage("❌ เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    }
    setTimeout(() => {
      setCallMessage("");
      setIsCalling(false);
    }, 4000);
  };

  // Helper for status visual information
  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "Cooking":
        return {
          label: "กำลังปรุงอาหาร (Cooking)",
          sub: "เชฟกำลังปรุงอาหารของคุณอย่างพิถีพิถัน",
          bg: "bg-orange-50 border-orange-200 text-orange-700",
          pillBg: "bg-orange-500 text-white animate-pulse shadow-sm shadow-orange-500/30",
          icon: <Flame className="h-4 w-4 fill-orange-100 text-orange-50 animate-bounce" />,
          step: 2,
        };
      case "Served":
        return {
          label: "ปรุงอาหารเสร็จแล้ว (Cooked & Ready)",
          sub: "ปรุงเสร็จเรียบร้อย พร้อมเสิร์ฟถึงโต๊ะคุณ",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          pillBg: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30",
          icon: <Sparkles className="h-4 w-4 text-emerald-100 animate-spin" />,
          step: 3,
        };
      case "Completed":
        return {
          label: "เสร็จสิ้น (Completed)",
          sub: "เสิร์ฟและชำระเงินเรียบร้อยแล้ว",
          bg: "bg-blue-50 border-blue-200 text-blue-700",
          pillBg: "bg-blue-600 text-white",
          icon: <CheckCircle2 className="h-4 w-4 text-blue-100" />,
          step: 4,
        };
      case "Cancelled":
        return {
          label: "ยกเลิก (Cancelled)",
          sub: "ออเดอร์นี้ถูกยกเลิกแล้ว",
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          pillBg: "bg-rose-600 text-white",
          icon: <AlertCircle className="h-4 w-4 text-rose-100" />,
          step: 0,
        };
      case "Pending":
      default:
        return {
          label: "รอดำเนินการ (Pending)",
          sub: "ได้รับออเดอร์แล้ว รอคิวส่งเข้าครัว",
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          pillBg: "bg-amber-500 text-white",
          icon: <Clock className="h-4 w-4 text-amber-100" />,
          step: 1,
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 cursor-pointer"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            id="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col font-sans"
          >
            {/* Header */}
            <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-orange-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-orange-500 text-white rounded-xl shadow-sm">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                    เมนูผู้ใช้งาน <span className="text-orange-600 font-extrabold">(โต๊ะ {table})</span>
                  </h2>
                  <p className="text-[11px] text-gray-500">ติดตามสถานะออเดอร์และบริการ</p>
                </div>
              </div>
              <button
                id="close-drawer-btn"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-orange-100 text-gray-400 hover:text-gray-700 transition-colors"
                title="ปิดเมนู"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Call Staff Action Box */}
              <div className="p-3.5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-orange-900 flex items-center gap-1.5 text-sm">
                    <BellRing className="h-4 w-4 animate-bounce text-orange-600" />
                    ต้องการความช่วยเหลือ?
                  </h3>
                  <span className="text-[11px] font-semibold text-orange-700 bg-orange-200/50 px-2 py-0.5 rounded-full">
                    โต๊ะ {table}
                  </span>
                </div>
                <p className="text-xs text-orange-700/90 leading-tight">
                  กดปุ่มนี้เพื่อส่งสัญญาณเรียกพนักงานที่โต๊ะ {table} ทันที
                </p>
                <button
                  id="call-staff-drawer-btn"
                  onClick={handleCallStaff}
                  disabled={isCalling}
                  className={`w-full mt-1.5 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    isCalling
                      ? "bg-orange-300 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 active:scale-98 cursor-pointer"
                  }`}
                >
                  {isCalling ? "🔔 กำลังส่งสัญญาณเรียก..." : "🛎️ เรียกพนักงาน (Call Staff)"}
                </button>
                {callMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-center mt-1.5 p-2 bg-white rounded-xl border border-orange-200 text-orange-800 shadow-sm"
                  >
                    {callMessage}
                  </motion.p>
                )}
              </div>

              {/* Navigation Tabs Menu */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Live Order Status (FEATURED) */}
                <button
                  id="drawer-nav-status"
                  onClick={() => setActiveTab("status")}
                  className={`p-3 rounded-2xl flex flex-col justify-between text-left transition-all border ${
                    activeTab === "status"
                      ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                      : "bg-white text-gray-700 border-gray-100 hover:bg-orange-50/50 hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className={`p-1.5 rounded-xl ${activeTab === "status" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"}`}>
                      <Utensils className="h-4 w-4" />
                    </div>
                    {cookingCount > 0 ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        activeTab === "status" ? "bg-white text-orange-600 animate-pulse" : "bg-orange-500 text-white animate-pulse"
                      }`}>
                        <Flame className="h-3 w-3 fill-current" /> ปรุงอยู่ ({cookingCount})
                      </span>
                    ) : servedCount > 0 ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "status" ? "bg-emerald-200 text-emerald-900" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        เสร็จแล้ว ({servedCount})
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "status" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {displayOrders.length} ออเดอร์
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs block">สถานะออเดอร์</span>
                    <span className={`text-[10px] ${activeTab === "status" ? "text-orange-100" : "text-gray-400"}`}>
                      ดูว่าปรุงอยู่/เสร็จแล้ว
                    </span>
                  </div>
                </button>

                {/* 2. Order History */}
                <button
                  id="drawer-nav-history"
                  onClick={() => setActiveTab("history")}
                  className={`p-3 rounded-2xl flex flex-col justify-between text-left transition-all border ${
                    activeTab === "history"
                      ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                      : "bg-white text-gray-700 border-gray-100 hover:bg-orange-50/50 hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className={`p-1.5 rounded-xl ${activeTab === "history" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"}`}>
                      <History className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === "history" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {displayOrders.length} รายการ
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-xs block">ประวัติการสั่งซื้อ</span>
                    <span className={`text-[10px] ${activeTab === "history" ? "text-orange-100" : "text-gray-400"}`}>
                      ยอดรวม & รายการอาหาร
                    </span>
                  </div>
                </button>
              </div>

              {/* Secondary Navigation Links */}
              <div className="flex gap-2">
                <button
                  id="drawer-nav-terms"
                  onClick={() => setActiveTab("terms")}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border ${
                    activeTab === "terms"
                      ? "bg-orange-100 border-orange-200 text-orange-800"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-orange-500" />
                  <span>เงื่อนไขการใช้</span>
                </button>

                <button
                  id="drawer-nav-help"
                  onClick={() => setActiveTab("help")}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border ${
                    activeTab === "help"
                      ? "bg-orange-100 border-orange-200 text-orange-800"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5 text-orange-500" />
                  <span>ช่วยเหลือ/ติดต่อ</span>
                </button>
              </div>

              {/* Tab Content Display Area */}
              <div className="border-t border-orange-100 pt-3">
                
                {/* 1. ORDER STATUS TAB (MAIN FOCUS) */}
                {activeTab === "status" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                          <span>🍳 เรียกดูสถานะออเดอร์</span>
                        </h4>
                        {lastRefreshedTime && (
                          <p className="text-[10px] text-gray-400">อัปเดตล่าสุด: {lastRefreshedTime} น.</p>
                        )}
                      </div>
                      <button
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 active:scale-95 px-2.5 py-1.5 rounded-lg border border-orange-200 transition-all cursor-pointer"
                        title="รีเฟรชสถานะออเดอร์"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-orange-500" : ""}`} />
                        <span>รีเฟรช</span>
                      </button>
                    </div>

                    {/* Filter Pills */}
                    {displayOrders.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                        <button
                          onClick={() => setStatusFilter("All")}
                          className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors ${
                            statusFilter === "All"
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          ทั้งหมด ({displayOrders.length})
                        </button>
                        {cookingCount > 0 && (
                          <button
                            onClick={() => setStatusFilter("Cooking")}
                            className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                              statusFilter === "Cooking"
                                ? "bg-orange-600 text-white shadow-sm"
                                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            }`}
                          >
                            <Flame className="h-3 w-3 fill-current" />
                            กำลังปรุง ({cookingCount})
                          </button>
                        )}
                        {servedCount > 0 && (
                          <button
                            onClick={() => setStatusFilter("Served")}
                            className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                              statusFilter === "Served"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            ปรุงเสร็จแล้ว ({servedCount})
                          </button>
                        )}
                        {pendingCount > 0 && (
                          <button
                            onClick={() => setStatusFilter("Pending")}
                            className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors ${
                              statusFilter === "Pending"
                                ? "bg-amber-500 text-white"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            }`}
                          >
                            รอดำเนินการ ({pendingCount})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Order Cards List */}
                    {displayOrders.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-bold text-gray-800 text-sm">ยังไม่มีคำสั่งซื้อที่โต๊ะ {table}</h5>
                          <p className="text-xs text-gray-500 max-w-xs mx-auto">
                            เลือกเมนูอาหารจานโปรดและกดยืนยันออเดอร์เพื่อติดตามสถานะการปรุงอาหารได้ที่นี่
                          </p>
                        </div>
                        <button
                          onClick={onClose}
                          className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-orange-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Utensils className="h-3.5 w-3.5" />
                          <span>ไปเลือกอาหารในเมนู</span>
                        </button>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl text-xs text-gray-500">
                        ไม่มีออเดอร์ในสถานะที่เลือก
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {filteredOrders.map((order, idx) => {
                          const badge = getStatusBadge(order.status);
                          return (
                            <div
                              key={order.id || idx}
                              className={`p-3.5 rounded-2xl border transition-all space-y-2.5 shadow-sm ${
                                order.status === "Cooking"
                                  ? "bg-gradient-to-br from-orange-50/90 to-amber-50/40 border-orange-200 ring-2 ring-orange-400/20"
                                  : order.status === "Served"
                                  ? "bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200"
                                  : "bg-white border-gray-100"
                              }`}
                            >
                              {/* Order Card Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-xs text-gray-800">
                                    คิว #{order.id.slice(-6).toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    ({order.orderTime} น.)
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${badge.pillBg}`}
                                >
                                  {badge.icon}
                                  <span>{badge.label}</span>
                                </span>
                              </div>

                              {/* Interactive Step Timeline */}
                              <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className={badge.step >= 1 ? "text-orange-600" : "text-gray-400"}>
                                    1. รับออเดอร์
                                  </span>
                                  <span className={badge.step >= 2 ? "text-orange-600 font-extrabold flex items-center gap-0.5" : "text-gray-400"}>
                                    {badge.step === 2 && <Flame className="h-2.5 w-2.5 fill-current animate-bounce" />}
                                    2. กำลังปรุง
                                  </span>
                                  <span className={badge.step >= 3 ? "text-emerald-600 font-extrabold" : "text-gray-400"}>
                                    3. ปรุงเสร็จ/เสิร์ฟ
                                  </span>
                                  <span className={badge.step >= 4 ? "text-blue-600" : "text-gray-400"}>
                                    4. เสร็จสิ้น
                                  </span>
                                </div>

                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      badge.step === 1
                                        ? "w-1/4 bg-amber-500"
                                        : badge.step === 2
                                        ? "w-1/2 bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse"
                                        : badge.step === 3
                                        ? "w-3/4 bg-emerald-500"
                                        : "w-full bg-blue-500"
                                    }`}
                                  />
                                </div>
                                <p className="text-[10px] font-medium text-gray-500 text-center pt-0.5">
                                  {badge.sub}
                                </p>
                              </div>

                              {/* Order Items List */}
                              <div className="space-y-1 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl">
                                {order.items.map((it, iIdx) => (
                                  <div key={iIdx} className="flex justify-between items-center py-0.5">
                                    <span className="font-medium">
                                      <span className="font-bold text-orange-600 mr-1.5">{it.quantity}x</span>
                                      {it.name}
                                    </span>
                                    <span className="font-bold text-gray-700">฿{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Total Price & Payment Method */}
                              <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-xs">
                                <span className="text-[11px] text-gray-400">
                                  ชำระ: <span className="font-medium text-gray-600">{order.paymentMethod}</span>
                                </span>
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-400 mr-1">ยอดรวม</span>
                                  <span className="font-black text-sm text-orange-600">฿{order.total}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ORDER HISTORY TAB */}
                {activeTab === "history" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <History className="h-4 w-4 text-orange-500" />
                        <span>ประวัติการสั่งอาหารโต๊ะ {table}</span>
                      </h4>
                      <span className="text-xs font-bold text-gray-500">
                        รวม {displayOrders.length} ออเดอร์
                      </span>
                    </div>

                    {displayOrders.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-8 bg-gray-50 rounded-xl">
                        ยังไม่มีประวัติการสั่งซื้อที่บันทึกไว้ในเบราว์เซอร์นี้
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                        {displayOrders.map((order, idx) => {
                          const badge = getStatusBadge(order.status);
                          return (
                            <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between items-center font-medium text-gray-700">
                                <div>
                                  <span className="font-bold text-gray-800">คิว #{order.id.slice(-6).toUpperCase()}</span>
                                  <span className="text-gray-400 text-[11px] ml-1.5">{order.orderTime} น.</span>
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${badge.pillBg}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <div className="text-gray-500 space-y-0.5 bg-white p-2 rounded-lg border border-gray-100">
                                {order.items.map((it, iIdx) => (
                                  <div key={iIdx} className="flex justify-between">
                                    <span>{it.quantity}x {it.name}</span>
                                    <span className="font-semibold text-gray-700">฿{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-1 border-t border-gray-200/60 flex justify-between font-bold text-gray-800">
                                <span className="text-gray-500 font-normal">ยอดรวมสุทธิ</span>
                                <span className="text-orange-600 font-black">฿{order.total}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TERMS OF USE TAB */}
                {activeTab === "terms" && (
                  <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm">ข้อตกลงและเงื่อนไขการใช้บริการ</h4>
                    <p>1. ระบบสั่งอาหารนี้จัดทำขึ้นเพื่อสาธิตระบบสั่งอาหารผ่าน QR Code (Papaya Demo Layout)</p>
                    <p>2. การชำระเงินในระบบนี้เป็นระบบทดสอบ (Sandbox Mockup) เท่านั้น จะไม่มีการตัดบัตรเครดิตหรือบัญชีธนาคารจริง</p>
                    <p>3. ข้อมูลคำสั่งซื้อและรายการอาหารจะถูกส่งไปแสดงที่จอครัวของพนักงานร้านค้าแบบเรียลไทม์</p>
                    <p className="text-orange-600 font-semibold pt-1 border-t border-gray-200">จัดทำโดย: นายธนาคม หล้าสุด</p>
                  </div>
                )}

                {/* 4. HELP & CONTACT TAB */}
                {activeTab === "help" && (
                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm">ช่วยเหลือ & ติดต่อเรา</h4>
                    <p className="font-bold text-orange-700">ขั้นตอนการสั่งอาหารง่ายๆ ใน 3 ขั้นตอน:</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1 text-gray-600">
                      <li>เลือกหมวดหมู่ ค้นหาอาหาร และกดปุ่ม <span className="font-bold text-orange-600">+</span> เพื่อหยิบใส่ตะกร้า</li>
                      <li>ตรวจสอบรายการอาหารในตะกร้า แล้วกดปุ่มชำระเงิน</li>
                      <li>เลือกรูปแบบการชำระเงิน และกดยืนยันออเดอร์ ข้อมูลจะถูกส่งเข้าครัวทันที!</li>
                    </ol>
                    <p className="pt-2 border-t border-gray-200 mt-2 font-medium">
                      📞 เบอร์โทรศัพท์ติดต่อร้าน: <span className="text-gray-800 font-bold">02-123-4567</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Mode Switches */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2 text-center">
              {!hideAdminControls && onToggleOwnerMode && (
                <button
                  id="drawer-toggle-owner-mode"
                  onClick={() => {
                    onToggleOwnerMode();
                    onClose();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    isOwnerMode
                      ? "bg-gray-800 text-orange-400 hover:bg-gray-900 shadow-md cursor-pointer"
                      : "bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 cursor-pointer"
                  }`}
                >
                  ⚙️ {isOwnerMode ? "ปิดโหมดเจ้าของร้าน" : "เปิดโหมดเจ้าของร้าน (Owner)"}
                </button>
              )}

              {!hideAdminControls && (
                <button
                  id="drawer-go-to-kitchen"
                  onClick={() => {
                    navigate("/staff");
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-orange-600/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ChefHat className="h-4 w-4" />
                  จอแสดงผลในครัว & คลังสินค้า
                </button>
              )}
              <p className="text-[10px] text-gray-400 pt-1">
                ระบบสั่งอาหารจัดทำโดย นายธนาคม หล้าสุด
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
