import React, { useState, useMemo, useRef, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { SideDrawer } from "../components/SideDrawer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  User,
  Sparkles,
  Edit2,
  Trash2,
  Undo2,
  CheckCircle,
  Clock,
  HelpCircle,
  Flame,
  Utensils,
  X
} from "lucide-react";
import { MenuItem } from "../types";
import { getImageFallback } from "../lib/image-helper";

export const MenuPage: React.FC = () => {
  const {
    cart,
    table,
    menu,
    storeConfig,
    addToCart,
    updateQuantity,
    fetchStoreData,
    tables,
    tableOrders,
    setTableNum
  } = useCart();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Sync table parameter from URL query in mobile Chrome / external link
  useEffect(() => {
    const tableParam = searchParams.get("table");
    if (tableParam && tableParam !== table) {
      setTableNum(tableParam);
    }
  }, [searchParams, table, setTableNum]);

  // Navigation Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"status" | "history" | "terms" | "help">("status");
  const [isOwnerMode, setIsOwnerMode] = useState(false);

  // Active cooking & served counts for live order status badge
  const activeCookingCount = useMemo(
    () => tableOrders.filter((o) => o.status === "Cooking").length,
    [tableOrders]
  );
  const activeServedCount = useMemo(
    () => tableOrders.filter((o) => o.status === "Served").length,
    [tableOrders]
  );

  // Search, Categories, Filters, Views State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeFilter, setActiveFilter] = useState<"All" | "Recommended" | "Vegan" | "Vegetarian">("All");
  const [isGridView, setIsGridView] = useState(false); // Default is list view as shown in screenshots
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Food Item Modal Editor (Owner Mode)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemOriginalPrice, setEditItemOriginalPrice] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemCategory, setEditItemCategory] = useState("");
  const [editItemImg, setEditItemImg] = useState("");
  const [editItemTags, setEditItemTags] = useState<string[]>([]);
  const [editItemNutrition, setEditItemNutrition] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get categories dynamically
  const categories = useMemo(() => {
    const list = new Set(menu.map((item) => item.category));
    return ["All", ...Array.from(list)];
  }, [menu]);

  // Horizontal scroll and grab-to-drag handlers for category pills
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Check scroll positions to show/hide indicator buttons
  const checkScrollable = () => {
    const el = categoryContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }
  };

  useEffect(() => {
    const el = categoryContainerRef.current;
    if (el) {
      const timeoutId = setTimeout(checkScrollable, 300);
      el.addEventListener("scroll", checkScrollable);
      window.addEventListener("resize", checkScrollable);
      return () => {
        clearTimeout(timeoutId);
        el.removeEventListener("scroll", checkScrollable);
        window.removeEventListener("resize", checkScrollable);
      };
    }
  }, [categories]);

  // Smooth scroll helper
  const handleScroll = (direction: "left" | "right") => {
    const el = categoryContainerRef.current;
    if (el) {
      const scrollAmount = 240;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = categoryContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    el.style.scrollBehavior = "auto";
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    const el = categoryContainerRef.current;
    if (el) {
      el.style.scrollBehavior = "smooth";
      el.style.cursor = "grab";
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    const el = categoryContainerRef.current;
    if (el) {
      el.style.scrollBehavior = "smooth";
      el.style.cursor = "grab";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = categoryContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  // Filters logic
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      const matchFilter =
        activeFilter === "All" ||
        (activeFilter === "Recommended" && item.tags.includes("Recommended")) ||
        (activeFilter === "Vegan" && item.nutritionTags.includes("VG")) ||
        (activeFilter === "Vegetarian" && item.nutritionTags.includes("V"));

      return matchSearch && matchCategory && matchFilter;
    });
  }, [menu, searchQuery, selectedCategory, activeFilter]);

  // Calculate cart subtotal
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Open Edit Item modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemPrice(String(item.price));
    setEditItemOriginalPrice(item.originalPrice ? String(item.originalPrice) : "");
    setEditItemDesc(item.description);
    setEditItemCategory(item.category);
    setEditItemImg(item.image);
    setEditItemTags(item.tags);
    setEditItemNutrition(item.nutritionTags);
    setIsAddingNewItem(false);
  };

  // Open Add Item modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setEditItemName("");
    setEditItemPrice("");
    setEditItemOriginalPrice("");
    setEditItemDesc("");
    setEditItemCategory("อาหารจานหลัก");
    setEditItemImg("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80");
    setEditItemTags(["Recommended"]);
    setEditItemNutrition([]);
    setIsAddingNewItem(true);
  };

  // Save changes to item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isAddingNewItem ? undefined : editingItem?.id,
          name: editItemName,
          price: Number(editItemPrice),
          originalPrice: editItemOriginalPrice ? Number(editItemOriginalPrice) : undefined,
          description: editItemDesc,
          category: editItemCategory,
          tags: editItemTags,
          nutritionTags: editItemNutrition,
          image: editItemImg,
        }),
      });

      if (res.ok) {
        await fetchStoreData();
        setEditingItem(null);
        setIsAddingNewItem(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an item
  const handleDeleteItem = async (itemId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้ออกจากร้าน?")) {
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

  const toggleTag = (tagList: string[], tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (tagList.includes(tag)) {
      setter(tagList.filter((t) => t !== tag));
    } else {
      setter([...tagList, tag]);
    }
  };

  const currentTableData = tables.find((t) => String(t.id) === String(table));
  const isTableInactive = currentTableData && currentTableData.status === "inactive";

  if (isTableInactive && !isOwnerMode) {
    return (
      <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center border border-orange-200/20 mb-6 shadow-sm">
          <HelpCircle className="h-10 w-10 text-orange-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight font-display mb-2">
          โต๊ะนี้ปิดบริการชั่วคราว
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-sm leading-relaxed mb-8">
          โต๊ะหมายเลข {table} ยังไม่เปิดให้บริการในขณะนี้ หรือได้รับการปิดชั่วคราวโดยผู้จัดการร้าน กรุณาสแกนคิวอาร์โค้ดโต๊ะอื่น หรือติดต่อพนักงานเพื่อเปิดบริการโต๊ะนี้
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm"
          >
            กลับสู่หน้าหลัก
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/calls", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tableId: table, reason: "แจ้งเปิดใช้งานโต๊ะ" }),
                });
                if (res.ok) {
                  alert("ส่งคำเรียกพนักงานเพื่อตรวจสอบสถานะโต๊ะเรียบร้อยแล้ว!");
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-orange-600/10"
          >
            🔔 เรียกพนักงาน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-28 select-none font-sans flex flex-col">
      {/* HEADER SECTION */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-orange-100/40 px-4 py-3.5 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <button
            id="menu-back-btn"
            onClick={() => navigate("/")}
            className="p-1.5 hover:bg-orange-50 rounded-full text-orange-600 transition-colors"
          >
            <ChevronLeft className="h-5.5 w-5.5" />
          </button>
          <div>
            <h1 className="font-black text-slate-800 text-sm sm:text-base leading-tight font-display">
              {storeConfig.name}
            </h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                โต๊ะ: {table}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">สแกนและสั่งอาหาร</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Active Cooking / Served Live Status Button Indicator */}
          {activeCookingCount > 0 ? (
            <motion.button
              id="header-cooking-status-btn"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setDrawerTab("status");
                setIsDrawerOpen(true);
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl shadow-sm shadow-orange-500/25 cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 fill-current animate-bounce" />
              <span>ปรุงอยู่ ({activeCookingCount})</span>
            </motion.button>
          ) : activeServedCount > 0 ? (
            <motion.button
              id="header-served-status-btn"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setDrawerTab("status");
                setIsDrawerOpen(true);
              }}
              className="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl shadow-sm shadow-emerald-600/25 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>ปรุงเสร็จ ({activeServedCount})</span>
            </motion.button>
          ) : null}

          {isOwnerMode && (
            <motion.button
              id="owner-add-item-btn"
              onClick={handleOpenAddModal}
              whileTap={{ scale: 0.95 }}
              className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md hover:bg-orange-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มเมนู</span>
            </motion.button>
          )}

          {/* User Icon indicator */}
          <button
            id="user-history-btn"
            onClick={() => {
              setDrawerTab("status");
              setIsDrawerOpen(true);
            }}
            className="p-2 rounded-full hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors relative cursor-pointer"
            title="เรียกดูสถานะออเดอร์ & ประวัติ"
          >
            <User className="h-5 w-5" />
            {(activeCookingCount > 0 || activeServedCount > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </button>

          {/* Hamburger Drawer button */}
          <button
            id="hamburger-drawer-btn"
            onClick={() => {
              setDrawerTab("status");
              setIsDrawerOpen(true);
            }}
            className="p-2 rounded-full hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
            title="เมนูผู้ใช้งาน"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* QUICK INLINE STORE OWNER NOTIFICATION */}
      {isOwnerMode && (
        <div className="bg-slate-800 text-orange-400 text-xs px-4 py-2 font-semibold flex justify-between items-center shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
            <span>โหมดเจ้าของร้าน: คุณสามารถแก้ไขรายละเอียด เมนู และราคาได้ทันที</span>
          </div>
          <button
            id="turn-off-owner-mode"
            onClick={() => setIsOwnerMode(false)}
            className="underline font-black text-[11px] hover:text-orange-300 transition-colors"
          >
            ปิดโหมด
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 space-y-4">
        
        {/* HORIZONTAL CATEGORY PILLS BAR (Displays all available categories beautifully with left/right scroll & drag) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider font-display flex items-center gap-1 select-none">
              <Sparkles className="h-3 w-3 text-orange-500 animate-pulse" />
              หมวดหมู่ทั้งหมด ({categories.length - 1} หมวดหมู่)
            </span>
            <span className="text-[10px] text-slate-400 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100/30 select-none">
              {selectedCategory === "All" ? "ทั้งหมด" : selectedCategory}
            </span>
          </div>

          <div className="relative group/category">
            {/* Left Scroll Indicator Arrow */}
            <AnimatePresence>
              {canScrollLeft && (
                <motion.button
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  onClick={() => handleScroll("left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 border border-slate-100 shadow-md flex items-center justify-center text-slate-600 hover:text-orange-500 active:scale-95 transition-all cursor-pointer"
                  title="เลื่อนซ้าย"
                >
                  <ChevronLeft className="h-4.5 w-4.5 stroke-[2.5]" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Right Scroll Indicator Arrow */}
            <AnimatePresence>
              {canScrollRight && (
                <motion.button
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  onClick={() => handleScroll("right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 border border-slate-100 shadow-md flex items-center justify-center text-slate-600 hover:text-orange-500 active:scale-95 transition-all cursor-pointer"
                  title="เลื่อนขวา"
                >
                  <ChevronRight className="h-4.5 w-4.5 stroke-[2.5]" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Scrolling Div Container with Drag Actions */}
            <div
              ref={categoryContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth cursor-grab active:cursor-grabbing select-none"
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                // Determine elegant label/icon for categories
                let iconStr = "🍽️";
                if (cat === "All") iconStr = "✨ ทั้งหมด";
                else if (cat === "อาหารจานหลัก") iconStr = "🍛 จานหลัก";
                else if (cat === "ยำ/ส้มตำ") iconStr = "🌶️ ยำ/ส้มตำ";
                else if (cat === "ซุป/แกง") iconStr = "🥣 ซุป/แกง";
                else if (cat === "เครื่องดื่ม") iconStr = "🥤 เครื่องดื่ม";
                else if (cat === "ของหวาน") iconStr = "🍰 ของหวาน";
                else iconStr = `🍽️ ${cat}`;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4.5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border shrink-0 ${
                      isActive
                        ? "bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-orange-600/10 scale-[1.02]"
                        : "bg-white text-slate-600 border-slate-100 shadow-xs hover:bg-orange-50/20"
                    }`}
                  >
                    <span className="font-display">{iconStr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEARCH AND FILTER BUTTONS BAR */}
        <div className="flex flex-col space-y-2.5">
          {/* Search Input Box */}
          <div className="relative">
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่ออาหาร คำอธิบาย หรือประเภท..."
              className="w-full bg-white border border-orange-100/40 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-md focus:outline-none focus:border-orange-400 focus:bg-white"
            />
            <Search className="absolute left-4.5 top-4 h-4.5 w-4.5 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-4 text-xs text-orange-600 hover:text-orange-700 font-bold"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>

        {/* LIST / GRID DISPLAY CARD BLOCK */}
        <div className="space-y-4 pt-1">
          {/* Display title based on category */}
          <div className="flex justify-between items-end border-b border-orange-100 pb-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-display">
                {selectedCategory === "All" ? "รายการอาหารยอดฮิต" : selectedCategory}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                พบทั้งหมด {filteredMenu.length} รายการอาหาร
              </p>
            </div>
            {isOwnerMode && (
              <button
                id="add-item-list-header"
                onClick={handleOpenAddModal}
                className="text-xs text-orange-600 font-bold hover:underline"
              >
                + เพิ่มรายการใหม่
              </button>
            )}
          </div>

          {filteredMenu.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-orange-100 space-y-2">
              <p className="text-gray-500 text-sm font-medium">ไม่พบรายการอาหารที่ค้นหาหรือตรงกับฟิลเตอร์</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setActiveFilter("All");
                }}
                className="text-xs text-orange-600 font-bold hover:underline"
              >
                แสดงรายการอาหารทั้งหมด
              </button>
            </div>
          ) : (
            <div className={isGridView ? "grid grid-cols-2 gap-3.5" : "space-y-4"}>
              {filteredMenu.map((item) => {
                // Find quantity in cart
                const cartQty = cart.find((i) => i.menuItem.id === item.id)?.quantity || 0;

                return (
                  <motion.div
                    key={item.id}
                    id={`menu-item-card-${item.id}`}
                    layout
                    className={`bg-white rounded-[2rem] border border-orange-100/40 shadow-md p-3.5 relative flex hover:shadow-xl transition-all duration-300 ${
                      isGridView ? "flex-col space-y-3" : "flex-row space-x-4 items-start"
                    }`}
                  >
                    {/* Food image container */}
                    <div className={`relative shrink-0 rounded-2xl overflow-hidden bg-orange-50/20 ${isGridView ? "w-full aspect-[4/3]" : "w-28 h-28"}`}>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover select-none hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallbackUrl = getImageFallback(item.name);
                          if (target.src !== fallbackUrl) {
                            target.src = fallbackUrl;
                          }
                        }}
                      />

                      {/* Quick Add Button (+): ALWAYS UPPER LEFT CORNER OF IMAGE */}
                      <button
                        id={`quick-add-${item.id}`}
                        onClick={() => addToCart(item)}
                        className="absolute top-2 left-2 p-1.5 bg-white hover:bg-orange-50 text-orange-600 rounded-full shadow-lg active:scale-90 transition-transform z-10 border border-orange-100"
                        title="เพิ่มลงตะกร้าด่วน"
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </button>

                      {/* Owner Mode Pencil Icon */}
                      {isOwnerMode && (
                        <button
                          id={`owner-edit-${item.id}`}
                          onClick={() => handleOpenEditModal(item)}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/90 text-white hover:bg-orange-600 rounded-full shadow-lg transition-colors z-10"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}

                      {/* Active Quantity counter on image if > 0 */}
                      {cartQty > 0 && (
                        <div className="absolute top-2 right-2 bg-orange-500 text-white font-black text-xs h-6 w-6 rounded-full flex items-center justify-center shadow-lg">
                          {cartQty}
                        </div>
                      )}
                    </div>

                    {/* Food information container */}
                    <div className="flex-1 flex flex-col min-w-0 h-full justify-between">
                      <div className="space-y-1.5">
                        {/* Status Tags */}
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((t, idx) => {
                            let bg = "bg-orange-100/80 text-orange-700";
                            if (t === "Only 3 left!") bg = "bg-red-100 text-red-600";
                            if (t === "Best seller") bg = "bg-orange-500 text-white";
                            if (t === "Vegan") bg = "bg-green-100 text-green-700 font-bold";

                            return (
                              <span key={idx} className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${bg}`}>
                                {t}
                              </span>
                            );
                          })}
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm md:text-base leading-snug truncate font-display">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Pricing, Nutrition, and Quantity Controller */}
                      <div className={`pt-2.5 flex justify-between items-end ${isGridView ? "mt-auto" : ""}`}>
                        <div className="space-y-1">
                          {/* Nutritional Icons V, VG */}
                          {item.nutritionTags.length > 0 && (
                            <div className="flex gap-1">
                              {item.nutritionTags.map((nt, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-black border border-green-200 bg-green-50 text-green-700 px-1 rounded"
                                  title={nt === "VG" ? "Vegan" : "Vegetarian"}
                                >
                                  {nt}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price Tag */}
                          <div className="flex items-baseline space-x-1.5">
                            <span className="font-extrabold text-orange-600 text-sm sm:text-base font-display">
                              ฿{item.price}
                            </span>
                            {item.originalPrice && (
                              <span className="text-[11px] text-slate-400 line-through">
                                ฿{item.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cart Controller widget inline if in basket */}
                        {cartQty > 0 ? (
                          <div className="flex items-center space-x-1.5 bg-orange-50/70 p-1 rounded-xl border border-orange-100 scale-90 sm:scale-100 origin-bottom-right">
                            <button
                              id={`minus-qty-${item.id}`}
                              onClick={() => updateQuantity(item.id, cartQty - 1)}
                              className="w-6.5 h-6.5 rounded-lg bg-white border border-orange-200 flex items-center justify-center font-bold text-orange-600 text-xs shadow-sm hover:bg-orange-100 transition-colors"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-black text-orange-800">
                              {cartQty}
                            </span>
                            <button
                              id={`plus-qty-${item.id}`}
                              onClick={() => updateQuantity(item.id, cartQty + 1)}
                              className="w-6.5 h-6.5 rounded-lg bg-white border border-orange-200 flex items-center justify-center font-bold text-orange-600 text-xs shadow-sm hover:bg-orange-100 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`add-to-cart-btn-${item.id}`}
                            onClick={() => addToCart(item)}
                            className="py-1.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/60 rounded-xl text-xs font-black transition-all flex items-center gap-1 active:scale-95"
                          >
                            <span>สั่งอาหาร</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM BRAND FOOTER IN MENU */}
        <div className="text-center py-10 space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold">จัดทำโดย นายธนาคม หล้าสุด</span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto font-medium">
            วิธีที่เร็วที่สุดในการสั่งและชำระเงินในร้านอาหารและบาร์
          </p>
          <button
            id="menu-contact-help-btn"
            onClick={() => setIsDrawerOpen(true)}
            className="text-[10px] text-orange-500 font-bold hover:underline block pt-1.5 mx-auto"
          >
            เรียนรู้เพิ่มเติม ↗
          </button>
        </div>
      </main>

      {/* STICKY BOTTOM BASKET BAR */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            id="sticky-basket-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 p-4.5 bg-white/95 backdrop-blur-md border-t border-orange-100/50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-40 flex justify-center"
          >
            <button
              id="sticky-checkout-btn"
              onClick={() => navigate(`/checkout?table=${table}`)}
              className="w-full max-w-md bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-[1.5rem] font-black text-sm sm:text-base shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-between font-display"
            >
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 px-2.5 py-1 rounded-xl text-xs font-black">
                  {totalCartCount} ชิ้น
                </div>
                <span>สรุปยอดและชำระเงิน</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>฿{cartSubtotal}</span>
                <ShoppingCart className="h-5 w-5 ml-1.5" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDE DRAWER NAVIGATION PANEL */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onToggleOwnerMode={() => setIsOwnerMode(!isOwnerMode)}
        isOwnerMode={isOwnerMode}
        hideAdminControls={true}
        defaultTab={drawerTab}
      />

      {/* OWNER EDIT MENU ITEM MODAL */}
      {(editingItem || isAddingNewItem) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-orange-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <h3 className="font-extrabold text-gray-800 text-base">
                {isAddingNewItem ? "➕ เพิ่มเมนูอาหารใหม่" : "📝 แก้ไขรายละเอียดเมนู"}
              </h3>
              <button
                id="close-item-editor"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddingNewItem(false);
                }}
                className="p-1 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">ชื่อเมนูอาหาร</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800"
                  placeholder="เช่น Calamari Fritti"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">ราคา (บาท)</label>
                  <input
                    type="number"
                    required
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800"
                    placeholder="เช่น 150"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">ราคาก่อนลด (ขีดฆ่า)</label>
                  <input
                    type="number"
                    value={editItemOriginalPrice}
                    onChange={(e) => setEditItemOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800"
                    placeholder="เช่น 180 (ไม่ใส่ก็ได้)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">หมวดหมู่อาหาร</label>
                <input
                  type="text"
                  required
                  value={editItemCategory}
                  onChange={(e) => setEditItemCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800"
                  placeholder="ป้อนหมวดหมู่อาหาร..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditItemCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        editItemCategory === cat
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
                <label className="font-bold text-gray-500 uppercase">คำอธิบายสั้น (ภาษาไทย)</label>
                <textarea
                  value={editItemDesc}
                  onChange={(e) => setEditItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800 h-16 resize-none"
                  placeholder="รายละเอียดอาหารสั้นๆ..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-500 uppercase flex justify-between items-center">
                  <span>รูปภาพอาหาร</span>
                  <span className="text-[10px] text-orange-600 font-bold">อัปโหลดไฟล์ หรือ ป้อน URL</span>
                </label>
                
                {/* File Uploader Container */}
                <div className="border-2 border-dashed border-orange-200 hover:border-orange-500 rounded-2xl p-3 bg-orange-50/20 text-center cursor-pointer transition-colors relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setEditItemImg(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {editItemImg ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={editItemImg}
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

                <div className="space-y-1">
                  <input
                    type="text"
                    value={editItemImg}
                    onChange={(e) => setEditItemImg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-orange-50/40 border border-orange-100 text-gray-800 text-[11px]"
                    placeholder="หรือป้อน URL รูปภาพภายนอก..."
                  />
                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditItemImg("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80")}
                      className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded text-[10px]"
                    >
                      ใช้ภาพตัวอย่าง (Unsplash)
                    </button>
                  </div>
                </div>
              </div>

              {/* Badges/Tags checklists */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-gray-500 uppercase block">ป้ายสถานะ (Badges)</label>
                <div className="flex flex-wrap gap-2">
                  {["Recommended", "Only 3 left!", "Best seller", "Vegan"].map((tag) => {
                    const active = editItemTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(editItemTags, tag, setEditItemTags)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          active ? "bg-orange-500 text-white border-orange-500" : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {tag === "Recommended" ? "👍 Recommended" : tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nutrition tags */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-gray-500 uppercase block">เครื่องหมายโภชนาการ (Nutrition)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTag(editItemNutrition, "V", setEditItemNutrition)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      editItemNutrition.includes("V") ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    🥕 Vegetarian (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTag(editItemNutrition, "VG", setEditItemNutrition)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      editItemNutrition.includes("VG") ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    🌱 Vegan (VG)
                  </button>
                </div>
              </div>

              {/* Submit / Action buttons */}
              <div className="pt-3 border-t border-orange-100 flex gap-2">
                {!isAddingNewItem && (
                  <button
                    id="delete-item-btn"
                    type="button"
                    onClick={() => handleDeleteItem(editingItem!.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition-colors"
                    title="ลบเมนูนี้"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNewItem(false);
                  }}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl border border-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/10"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
