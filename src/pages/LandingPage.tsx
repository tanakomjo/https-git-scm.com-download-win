import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/CartContext";
import {
  ChefHat,
  Settings,
  QrCode,
  Edit3,
  Check,
  RefreshCw,
  Utensils,
  Plus,
  Trash2,
  X
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { table, setTableNum, storeConfig, fetchStoreData, tables } = useCart();
  const [selectedTable, setSelectedTable] = useState<string>(table || "1");
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [editStoreName, setEditStoreName] = useState(storeConfig.name);
  const [editStoreLogo, setEditStoreLogo] = useState(storeConfig.logo);
  const [isSaving, setIsSaving] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Auto-redirect to ordering menu page if table param is present in QR scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      setTableNum(tableParam);
      navigate(`/menu?table=${tableParam}`, { replace: true });
    }
  }, [navigate, setTableNum]);

  const handleTableSelect = (numStr: string) => {
    setSelectedTable(numStr);
    setTableNum(numStr);
    setShowTableSelector(false);
    navigate(`/menu?table=${numStr}`);
  };

  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/store-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStoreName,
          logo: editStoreLogo,
        }),
      });
      if (res.ok) {
        await fetchStoreData();
        setIsEditingStore(false);
      }
    } catch (err) {
      console.error("Failed to save store configuration", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm("คุณต้องการรีเซ็ตข้อมูลร้านค้า คิว โต๊ะ และออเดอร์กลับเป็นค่าเริ่มต้นหรือไม่?")) {
      try {
        const res = await fetch("/api/menu/reset", { method: "POST" });
        if (res.ok) {
          await fetchStoreData();
          setEditStoreName(storeConfig.name);
          setEditStoreLogo(storeConfig.logo);
          alert("รีเซ็ตระบบกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว!");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] flex flex-col items-center px-4 py-6 sm:px-6 select-none font-sans relative">
      
      {/* 2. APP MAIN BRANDING - FORK/KNIFE ICON WITH SOFT PEACH BACKGROUND */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md flex flex-col items-center text-center mt-4 mb-4"
      >
        {/* Soft squircle peach container with orange fork/knife icon */}
        <div className="relative group">
          <div className="w-24 h-24 bg-[#FFEFE5] rounded-[2rem] shadow-md flex items-center justify-center border border-orange-100/40 hover:scale-105 transition-transform duration-300">
            <div className="p-4 bg-transparent rounded-full flex items-center justify-center">
              <Utensils className="h-10 w-10 text-orange-500 stroke-[2.5]" />
            </div>
          </div>
          
          {/* Subtle edit button to config restaurant name/logo */}
          <button
            onClick={() => {
              setEditStoreName(storeConfig.name);
              setEditStoreLogo(storeConfig.logo);
              setIsEditingStore(true);
            }}
            className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-md border border-orange-100 hover:bg-orange-50 text-orange-600 transition-all"
            title="แก้ไขรูปภาพหรือชื่อร้าน"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-6 space-y-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight font-display flex items-center justify-center gap-2">
            {storeConfig.name || "ร้านอาหาร QR"}
          </h1>
          <p className="text-sm font-semibold text-slate-500/90 font-display">
            สแกน QR Code ที่โต๊ะของคุณเพื่อสั่งอาหาร
          </p>
        </div>
      </motion.div>

      {/* 3. CENTRAL DOCK CARDS (Matches first screenshot style) */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-white p-6.5 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5 text-center relative mt-4 mb-8"
      >
        {/* Dashed outer card wrapper for QR demonstration */}
        <div className="border-2 border-dashed border-slate-200/80 rounded-[2rem] p-6 bg-slate-50/20 space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <QrCode className="h-7 w-7 text-slate-400 stroke-[2]" />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 font-display">
              Customers arrive via QR code scan
            </p>
          </div>

          <button
            id="btn-demo-order"
            onClick={() => setShowTableSelector(true)}
            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm rounded-2xl transition-all duration-300 shadow-inner border border-slate-200/30 font-display flex items-center justify-center gap-2"
          >
            <span>Demo Order Page</span>
          </button>
        </div>
      </motion.div>

      {/* 4. BOTTOM GRID NAVIGATION PANELS (Matches first screenshot) */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md grid grid-cols-2 gap-3.5 mt-auto mb-10"
      >
        {/* สำหรับพนักงานในครัว (Kitchen staff) - Soft peach-beige background */}
        <button
          id="btn-go-kitchen"
          onClick={() => navigate("/staff?role=staff")}
          className="bg-[#FFF6F0] hover:bg-[#FFEFE5] text-[#D35400] font-bold py-4.5 px-4 rounded-3xl border border-orange-100/80 hover:border-orange-200 shadow-sm transition-all text-xs flex flex-col items-center justify-center gap-2 min-h-[92px]"
        >
          <div className="p-1.5 bg-white/80 rounded-xl shadow-sm">
            <ChefHat className="h-5.5 w-5.5 text-orange-500" />
          </div>
          <span className="font-extrabold font-display text-[11.5px] tracking-wide">สำหรับพนักงานในครัว</span>
        </button>

        {/* สำหรับผู้จัดการ (Manager / Owner) - Soft gray-blue background */}
        <button
          id="btn-go-owner"
          onClick={() => navigate("/staff?role=owner")}
          className="bg-[#F6F8FA] hover:bg-[#EEF1F5] text-[#475569] font-bold py-4.5 px-4 rounded-3xl border border-slate-200/60 hover:border-slate-300 shadow-sm transition-all text-xs flex flex-col items-center justify-center gap-2 min-h-[92px]"
        >
          <div className="p-1.5 bg-white/80 rounded-xl shadow-sm">
            <Settings className="h-5.5 w-5.5 text-slate-500" />
          </div>
          <span className="font-extrabold font-display text-[11.5px] tracking-wide">สำหรับผู้จัดการ</span>
        </button>
      </motion.div>

      {/* Helper Reset button at footer */}
      <div className="flex flex-col items-center gap-3 mt-auto py-4">
        <button
          id="reset-store-defaults"
          onClick={handleResetDefaults}
          className="text-[10px] text-slate-400 hover:text-orange-600 font-extrabold flex items-center gap-1 transition-colors bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-full"
        >
          <RefreshCw className="h-3 w-3" />
          <span>รีเซ็ตระบบทั้งหมดกลับเป็นค่าเริ่มต้น</span>
        </button>
        <footer className="text-center text-[10px] text-slate-300 font-medium">
          จัดทำโดย นายธนาคม หล้าสุด
        </footer>
      </div>

      {/* TABLE SELECTOR MODAL (When clicking Demo Order Page) */}
      <AnimatePresence>
        {showTableSelector && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl border border-orange-100/50 space-y-4 text-center"
            >
              <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">
                  🎯 จำลองสแกน QR Code ประจำโต๊ะ
                </h3>
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="p-1 text-slate-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                เลือกหมายเลขโต๊ะที่ต้องการเข้าใช้ระบบเพื่อดูเมนู สั่งอาหาร และชำระเงินของโต๊ะนั้นๆ
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
                {((tables && tables.length > 0) ? tables : Array.from({ length: 10 }, (_, i) => ({ id: String(i+1), seats: 4 }))).map((tbl) => (
                  <button
                    key={tbl.id}
                    id={`table-btn-select-${tbl.id}`}
                    onClick={() => handleTableSelect(tbl.id)}
                    className="p-3 bg-orange-50/20 hover:bg-orange-500 text-slate-700 hover:text-white border border-orange-100 hover:border-orange-500 rounded-2xl text-xs font-black transition-all duration-200 flex flex-col items-center justify-center shadow-sm"
                  >
                    <span>โต๊ะ {tbl.id}</span>
                    <span className="text-[9px] opacity-75 font-bold">{tbl.seats} ที่นั่ง</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs rounded-xl"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHOP SETTINGS MODAL */}
      <AnimatePresence>
        {isEditingStore && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl border border-orange-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-base font-display flex items-center gap-1.5">
                  <Edit3 className="h-5 w-5 text-orange-500" />
                  แก้ไขข้อมูลหน้าร้าน
                </h3>
                <button
                  onClick={() => setIsEditingStore(false)}
                  className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStoreConfig} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">ชื่อร้านอาหาร</label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/30 border border-orange-100 text-slate-800 text-xs focus:outline-none focus:border-orange-500 focus:bg-white font-bold"
                    placeholder="เช่น Papaya Gastro Bar"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                    <span>URL รูปภาพโลโก้ร้าน</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editStoreLogo}
                    onChange={(e) => setEditStoreLogo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-orange-50/30 border border-orange-100 text-slate-800 text-xs focus:outline-none focus:border-orange-500 focus:bg-white font-bold"
                    placeholder="ป้อนรูปภาพ URL"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingStore(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-600/10"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
