import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  syncDatabase,
  getStoreConfig,
  saveStoreConfig,
  getCategories,
  addCategory,
  deleteCategory,
  getTables,
  saveTable,
  toggleTableStatus,
  deleteTable,
  sortTablesNumerically,
  getMenuItems,
  saveMenuItem,
  deleteMenuItem,
  resetMenuToDefault,
  getOrders,
  saveOrder,
  updateOrderStatus,
  getStaffCalls,
  createStaffCall,
  dismissStaffCall
} from "./src/lib/db-service";

interface MenuItem {
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

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
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

interface StaffCall {
  id: string;
  table: string;
  timestamp: string;
  status: "Active" | "Dismissed";
}

// Initial Menu Data
const menuItems: MenuItem[] = [
  // อาหารจานหลัก
  {
    id: "item-1",
    name: "ผัดกะเพราหมูสับ",
    price: 69,
    description: "ผัดกะเพราหมูสับสูตรโบราณ รสชาติจัดจ้าน หอมใบกะเพราแท้ เสิร์ฟร้อนๆ สไตล์ไทยแท้",
    category: "อาหารจานหลัก",
    tags: ["Recommended", "Best seller"],
    nutritionTags: [],
    image: "/src/assets/images/pad_kra_prow_1783958021532.jpg",
  },
  {
    id: "item-2",
    name: "ข้าวผัดหมู",
    price: 65,
    description: "ข้าวผัดหมูใส่ไข่ เม็ดร่วนสวย รสชาติกลมกล่อม หอมกลิ่นกระทะ เสิร์ฟพร้อมต้นหอมและมะนาว",
    category: "อาหารจานหลัก",
    tags: [],
    nutritionTags: [],
    image: "/src/assets/images/pork_fried_rice_1783958032826.jpg",
  },
  {
    id: "item-3",
    name: "ผัดไทยกุ้งสด",
    price: 89,
    description: "เส้นจันท์เหนียวนุ่ม ผัดกับน้ำซอสมะขามเปียกสูตรเข้มข้น ใส่กุ้งสดตัวโต เต้าหู้ และถั่วลิสงคั่วใหม่",
    category: "อาหารจานหลัก",
    tags: ["Recommended"],
    nutritionTags: [],
    image: "/src/assets/images/pad_thai_1783958044685.jpg",
  },
  {
    id: "item-4",
    name: "ผัดซีอิ๊วหมู",
    price: 65,
    description: "เส้นใหญ่เหนียวนุ่ม ผัดซีอิ๊วใส่คะน้าสดกรอบ และเนื้อหมูหมักนุ่มๆ รสชาติหอมซีอิ๊วกระทะร้อน",
    category: "อาหารจานหลัก",
    tags: [],
    nutritionTags: [],
    image: "/src/assets/images/pad_see_ew_1783958054865.jpg",
  },

  // ยำ/ส้มตำ
  {
    id: "item-5",
    name: "ส้มตำไทย",
    price: 55,
    description: "ส้มตำไทยรสชาติครบรส เปรี้ยว หวาน เค็ม เผ็ดกำลังดี มะละกอเส้นกรอบ ถั่วลิสงคั่วหอมมัน",
    category: "ยำ/ส้มตำ",
    tags: ["Recommended"],
    nutritionTags: ["V"],
    image: "/src/assets/images/som_tum_thai_1783958125608.jpg",
  },
  {
    id: "item-6",
    name: "ส้มตำปูปลาร้า",
    price: 60,
    description: "ส้มตำปูปลาร้ารสจัดจ้านถึงใจ น้ำปลาร้าต้มสุกกลิ่นหอมนัว มะละกอกรอบอร่อย แซ่บอีสานแท้",
    category: "ยำ/ส้มตำ",
    tags: ["Best seller"],
    nutritionTags: [],
    image: "/src/assets/images/som_tum_crab_1783958137311.jpg",
  },
  {
    id: "item-7",
    name: "ส้มตำกุ้งสด",
    price: 99,
    description: "ส้มตำรสเด็ดใส่กุ้งสดตัวโต เนื้อหวานกรอบ คลุกเคล้าน้ำส้มตำนัวๆ แซ่บจี๊ดโดนใจ",
    category: "ยำ/ส้มตำ",
    tags: ["Recommended"],
    nutritionTags: [],
    image: "/src/assets/images/som_tum_shrimp_1783958149380.jpg",
  },
  {
    id: "item-8",
    name: "ยำวุ้นเส้น",
    price: 85,
    description: "ยำวุ้นเส้นรวมมิตร ใส่หมูสับ กุ้งสด และหมึก บีบมะนาวสด รสชาติจัดจ้าน เปรี้ยวเค็มเผ็ดลงตัว",
    category: "ยำ/ส้มตำ",
    tags: [],
    nutritionTags: [],
    image: "/src/assets/images/yum_woon_sen_1783958162318.jpg",
  },
  {
    id: "item-9",
    name: "ยำกุ้งสด",
    price: 110,
    description: "กุ้งสดลวกสุกพอดี เนื้อเด้ง คลุกเคล้าน้ำยำสุดแซ่บ ใส่หอมใหญ่ มะเขือเทศ และขึ้นฉ่ายหอมสดชื่น",
    category: "ยำ/ส้มตำ",
    tags: ["Recommended"],
    nutritionTags: [],
    image: "/src/assets/images/yum_shrimp_1783958173090.jpg",
  },

  // ซุป/แกง
  {
    id: "item-10",
    name: "ต้มยำกุ้ง",
    price: 120,
    description: "ต้มยำกุ้งน้ำข้นรสจัดจ้านสะใจ ใส่กุ้งแม่น้ำตัวโต เห็ดฟาง สมุนไพรไทยข่า ตะไคร้ ใบมะกรูดครบเครื่อง",
    category: "ซุป/แกง",
    tags: ["Recommended", "Best seller"],
    nutritionTags: [],
    image: "/src/assets/images/tom_yum_goong_1783958091183.jpg",
  },
  {
    id: "item-11",
    name: "ต้มยำทะเล",
    price: 140,
    description: "ต้มยำน้ำข้นรวมมิตรทะเล ทั้งกุ้ง หอย หมึก และปลา เนื้อสดหวาน ในน้ำซุปสมุนไพรเผ็ดร้อนเปรี้ยวสะใจ",
    category: "ซุป/แกง",
    tags: [],
    nutritionTags: [],
    image: "/src/assets/images/tom_yum_talay_1783958103016.jpg",
  },
  {
    id: "item-12",
    name: "แกงเขียวหวานไก่",
    price: 95,
    description: "แกงเขียวหวานไก่เนื้อนุ่มละมุน น้ำพริกแกงเขียวหวานผัดกะทิสดจนแตกมัน หอมกลิ่นมะเขือเปราะและใบโหระพา",
    category: "ซุป/แกง",
    tags: ["Recommended"],
    nutritionTags: [],
    image: "/src/assets/images/green_curry_1783958067947.jpg",
  },
  {
    id: "item-13",
    name: "ต้มข่าไก่",
    price: 95,
    description: "แกงโบราณน้ำซุปกะทิสีขาวนวล รสเปรี้ยวเค็มมันละมุน ใส่เนื้อไก่ชิ้นโต ข่าอ่อน และเห็ดฟางหอมสมุนไพร",
    category: "ซุป/แกง",
    tags: [],
    nutritionTags: [],
    image: "/src/assets/images/tom_kha_gai_1783958080793.jpg",
  },

  // เครื่องดื่ม
  {
    id: "item-14",
    name: "น้ำเปล่า",
    price: 15,
    description: "น้ำดื่มบริสุทธิ์เย็นชื่นใจ เสิร์ฟพร้อมน้ำแข็งสะอาดแก้วเย็นๆ",
    category: "เครื่องดื่ม",
    tags: [],
    nutritionTags: ["V", "VG"],
    image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "item-15",
    name: "ชาไทย",
    price: 45,
    description: "ชาไทยใส่นมรสชาติเข้มข้น หอมใบชาหมักธรรมชาติ หวานมันกำลังดี สไตล์ชาไทยโบราณ",
    category: "เครื่องดื่ม",
    tags: ["Recommended", "Best seller"],
    nutritionTags: ["V"],
    image: "/src/assets/images/thai_tea_1783958184063.jpg",
  },
  {
    id: "item-16",
    name: "ชาเขียว",
    price: 45,
    description: "ชาเขียวนมเย็นรสชาติเข้มข้น หอมกลิ่นใบชาเขียวแท้ หวานมันกลมกล่อม สดชื่นดับกระหาย",
    category: "เครื่องดื่ม",
    tags: [],
    nutritionTags: ["V", "VG"],
    image: "/src/assets/images/green_tea_1783958196152.jpg",
  },
  {
    id: "item-17",
    name: "น้ำโค้ก",
    price: 25,
    description: "เครื่องดื่มน้ำอัดลมโคคาโคล่าเย็นซ่าสะใจ ดื่มคู่กับอาหารมื้ออร่อยเพิ่มความสดชื่นสุดๆ",
    category: "เครื่องดื่ม",
    tags: [],
    nutritionTags: ["V", "VG"],
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
  },

  // ของหวาน
  {
    id: "item-18",
    name: "ทับทิมกรอบ",
    price: 50,
    description: "แห้วเคลือบแป้งมันหนึบหนับสีแดงสวยในน้ำกะทิอบควันเทียนหอมหวาน ราดน้ำแข็งบดเย็นชื่นใจ",
    category: "ของหวาน",
    tags: ["Recommended"],
    nutritionTags: ["V", "VG"],
    image: "/src/assets/images/tub_tim_krob_1783958207351.jpg",
  },
  {
    id: "item-19",
    name: "ข้าวเหนียวมะม่วง",
    price: 85,
    description: "ข้าวเหนียวมูนกะทิรสหวานมันเค็ม ทานคู่กับมะม่วงน้ำดอกไม้สุกสีทองหวานฉ่ำ ราดด้วยน้ำกะทิสดโรยถั่วทอง",
    category: "ของหวาน",
    tags: ["Recommended", "Best seller"],
    nutritionTags: ["V", "VG"],
    image: "/src/assets/images/mango_sticky_rice_1783958219417.jpg",
  },
  {
    id: "item-20",
    name: "สลัดบูราต้าครีมมี่ (Burrata Salad)",
    price: 180,
    description: "ชีสบูราต้าสดเหนียวนุ่มด้านนอก ครีมมี่ละมุนด้านใน เสิร์ฟพร้อมมะเขือเทศเชอร์รี่ ผักสลัด และซอสบัลซามิกน้ำมันมะกอกสูตรพรีเมียม",
    category: "อาหารทานเล่น",
    tags: ["Recommended", "Premium"],
    nutritionTags: ["V"],
    image: "/src/assets/images/burrata_salad_1783867137705.jpg",
  },
  {
    id: "item-21",
    name: "คาลามารีฟริตตี้ (Calamari Fritti)",
    price: 150,
    description: "ปลาหมึกชุบแป้งทอดกรอบสไตล์อิตาเลียนสีเหลืองทอง คลุกเคล้าผงปรุงรสสมุนไพร เสิร์ฟร้อนๆ คู่กับซอสทาร์ทาร์สูตรเข้มข้น",
    category: "อาหารทานเล่น",
    tags: ["Best seller"],
    nutritionTags: [],
    image: "/src/assets/images/calamari_fritti_1783867109719.jpg",
  },
  {
    id: "item-22",
    name: "เฟรนช์ฟรายส์ซอสทรัฟเฟิล (Truffle Fries)",
    price: 120,
    description: "มันฝรั่งทอดชิ้นหนากรอบนอกนุ่มใน คลุกเคล้าเกลือทะเลและกลิ่นทรัฟเฟิลขาวหอมกรุ่น เสิร์ฟคู่กับซอสทรัฟเฟิลสูตรพิเศษของร้าน",
    category: "อาหารทานเล่น",
    tags: ["Recommended"],
    nutritionTags: ["V"],
    image: "/src/assets/images/truffle_fries_1783867123707.jpg",
  },
  {
    id: "item-23",
    name: "อิตาเลียนโซดาผลไม้ (Soda Drink)",
    price: 55,
    description: "เครื่องดื่มอิตาเลียนโซดาผลไม้รสเปรี้ยวอมหวาน ซ่าสดชื่น ดับกระหาย คลายร้อน เติมความสดใสระหว่างมื้อ",
    category: "เครื่องดื่ม",
    tags: ["Recommended"],
    nutritionTags: ["V", "VG"],
    image: "/src/assets/images/soda_drink_1783867149389.jpg",
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Sync and seed database with default/current menuItems
  await syncDatabase(menuItems);

  app.use(express.json());

  // API: Get Menu & Store Info
  app.get("/api/store-info", async (req, res) => {
    try {
      const config = await getStoreConfig();
      const menu = await getMenuItems();
      const cats = await getCategories();
      const tbls = await getTables();
      res.json({
        config,
        menu,
        categories: cats,
        tables: tbls,
      });
    } catch (e) {
      console.error("Error in /api/store-info:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Update Store Config (Name, Logo, etc.)
  app.post("/api/store-config", async (req, res) => {
    try {
      const { name, logo, serviceChargePercent, vatPercent, publicUrl } = req.body;
      const config = await getStoreConfig();
      if (name) config.name = name;
      if (logo) config.logo = logo;
      if (typeof serviceChargePercent === "number") config.serviceChargePercent = serviceChargePercent;
      if (typeof vatPercent === "number") config.vatPercent = vatPercent;
      if (publicUrl !== undefined) config.publicUrl = publicUrl;
      await saveStoreConfig(config);
      res.json({ success: true, config });
    } catch (e) {
      console.error("Error updating store config:", e);
      res.status(500).json({ error: "Failed to update store config" });
    }
  });

  // API: Add or Edit Menu Item
  app.post("/api/menu-items", async (req, res) => {
    try {
      const { id, name, price, originalPrice, description, category, tags, nutritionTags, image } = req.body;
      
      if (!name || price === undefined || !category) {
        return res.status(400).json({ error: "Missing required fields: name, price, category" });
      }

      if (id) {
        // Edit mode
        const items = await getMenuItems();
        const index = items.findIndex((item) => item.id === id);
        if (index !== -1) {
          const updatedItem: MenuItem = {
            id,
            name,
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : undefined,
            description: description || "",
            category,
            tags: Array.isArray(tags) ? tags : [],
            nutritionTags: Array.isArray(nutritionTags) ? nutritionTags : [],
            image: image || "https://picsum.photos/seed/fooditem/400/300",
          };
          await saveMenuItem(updatedItem);
          return res.json({ success: true, item: updatedItem });
        } else {
          return res.status(404).json({ error: "Menu item not found" });
        }
      } else {
        // Add mode
        const newItem: MenuItem = {
          id: `item-${Date.now()}`,
          name,
          price: Number(price),
          originalPrice: originalPrice ? Number(originalPrice) : undefined,
          description: description || "",
          category,
          tags: Array.isArray(tags) ? tags : [],
          nutritionTags: Array.isArray(nutritionTags) ? nutritionTags : [],
          image: image || "https://picsum.photos/seed/fooditem/400/300",
        };
        await saveMenuItem(newItem);
        res.json({ success: true, item: newItem });
      }
    } catch (e) {
      console.error("Error saving menu item:", e);
      res.status(500).json({ error: "Failed to save menu item" });
    }
  });

  // API: Delete Menu Item
  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteMenuItem(id);
      const items = await getMenuItems();
      res.json({ success: true, menu: items });
    } catch (e) {
      console.error("Error deleting menu item:", e);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // API: Update Menu Item Category (Assign to category or change category)
  app.patch("/api/menu-items/:id/category", async (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body;
      if (!category) return res.status(400).json({ error: "Missing category" });
      const items = await getMenuItems();
      const item = items.find((i) => i.id === id);
      if (!item) return res.status(404).json({ error: "Menu item not found" });
      item.category = category;
      await saveMenuItem(item);
      const updatedMenu = await getMenuItems();
      res.json({ success: true, item, menu: updatedMenu });
    } catch (e) {
      console.error("Error updating item category:", e);
      res.status(500).json({ error: "Failed to update item category" });
    }
  });

  // API: Batch Assign items to Category
  app.post("/api/categories/:name/assign-items", async (req, res) => {
    try {
      const { name } = req.params;
      const { itemIds } = req.body;
      if (!Array.isArray(itemIds)) return res.status(400).json({ error: "itemIds must be an array" });
      const items = await getMenuItems();
      for (const id of itemIds) {
        const item = items.find((i) => i.id === id);
        if (item) {
          item.category = name;
          await saveMenuItem(item);
        }
      }
      const updatedMenu = await getMenuItems();
      res.json({ success: true, menu: updatedMenu });
    } catch (e) {
      console.error("Error assigning items to category:", e);
      res.status(500).json({ error: "Failed to assign items to category" });
    }
  });

  // API: Reset Menu to Defaults
  app.post("/api/menu/reset", async (req, res) => {
    try {
      const defaultMenuItems: MenuItem[] = menuItems;

      const defaultConfig = {
        name: "ร้านอาหาร BTU",
        logo: "/src/assets/images/store_logo_1783867092729.jpg",
        serviceChargePercent: 10,
        vatPercent: 7,
      };

      await resetMenuToDefault(defaultMenuItems);
      await saveStoreConfig(defaultConfig);

      // Reset categories
      const defaultCats = ["อาหารจานหลัก", "ยำ/ส้มตำ", "ซุป/แกง", "อาหารทานเล่น", "เครื่องดื่ม", "ของหวาน"];
      const currentCats = await getCategories();
      for (const c of currentCats) {
        await deleteCategory(c);
      }
      for (const c of defaultCats) {
        await addCategory(c);
      }

      // Reset tables
      const defaultTables = [
        { id: "1", seats: 4, status: "active" as const },
        { id: "2", seats: 4, status: "active" as const },
        { id: "3", seats: 2, status: "active" as const },
        { id: "4", seats: 6, status: "active" as const },
        { id: "5", seats: 4, status: "active" as const },
        { id: "6", seats: 4, status: "active" as const },
        { id: "7", seats: 2, status: "active" as const },
        { id: "8", seats: 8, status: "active" as const },
        { id: "9", seats: 4, status: "active" as const },
        { id: "10", seats: 4, status: "active" as const }
      ];
      const currentTables = await getTables();
      for (const t of currentTables) {
        await deleteTable(t.id);
      }
      for (const t of defaultTables) {
        await saveTable(t);
      }

      res.json({ success: true, config: defaultConfig, menu: defaultMenuItems, categories: defaultCats, tables: defaultTables });
    } catch (e) {
      console.error("Error resetting store config/menu:", e);
      res.status(500).json({ error: "Failed to reset" });
    }
  });

  // API: Get Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const cats = await getCategories();
      res.json(cats);
    } catch (e) {
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  // API: Add Category
  app.post("/api/categories", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Missing category name" });
      await addCategory(name);
      const cats = await getCategories();
      res.json({ success: true, categories: cats });
    } catch (e) {
      res.status(500).json({ error: "Failed to add category" });
    }
  });

  // API: Delete Category
  app.delete("/api/categories/:name", async (req, res) => {
    try {
      const { name } = req.params;
      await deleteCategory(name);
      const cats = await getCategories();
      res.json({ success: true, categories: cats });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // API: Get Tables
  app.get("/api/tables", async (req, res) => {
    try {
      const tbls = await getTables();
      res.json(tbls);
    } catch (e) {
      res.status(500).json({ error: "Failed to get tables" });
    }
  });

  // API: Add or Edit Table
  app.post("/api/tables", async (req, res) => {
    try {
      const { id, seats, status } = req.body;
      if (!id || seats === undefined) return res.status(400).json({ error: "Missing id or seats" });
      
      const newTable = { id: String(id), seats: Number(seats), status: status || "active" as const };
      await saveTable(newTable);
      const tbls = await getTables();
      res.json({ success: true, tables: sortTablesNumerically(tbls) });
    } catch (e) {
      res.status(500).json({ error: "Failed to save table" });
    }
  });

  // API: Toggle Table Status
  app.post("/api/tables/:id/toggle", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await toggleTableStatus(id);
      if (updated) {
        const tbls = await getTables();
        res.json({ success: true, tables: tbls });
      } else {
        res.status(404).json({ error: "Table not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to toggle table" });
    }
  });

  // API: Delete Table
  app.delete("/api/tables/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteTable(id);
      const tbls = await getTables();
      res.json({ success: true, tables: tbls });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete table" });
    }
  });

  // API: Get All Orders (Staff View or Table Specific)
  app.get("/api/orders", async (req, res) => {
    try {
      let ords = await getOrders();
      const tableQuery = req.query.table;
      if (tableQuery) {
        ords = ords.filter((o) => String(o.table) === String(tableQuery));
      }
      // Sort newest at top
      ords.sort((a, b) => {
        const idA = a.id.split("-")[1] || "0";
        const idB = b.id.split("-")[1] || "0";
        return Number(idB) - Number(idA);
      });
      res.json(ords);
    } catch (e) {
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  // API: Place a New Order
  app.post("/api/orders", async (req, res) => {
    try {
      const { table, items, paymentMethod, withCredits, subtotal, serviceCharge, vat, total } = req.body;
      
      if (!table || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Missing order information: table, items" });
      }

      const pointsEarned = Math.round(total * 0.05); // 5% credits

      const newOrder: Order = {
        id: `order-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        table: String(table),
        items,
        status: "Pending",
        subtotal,
        serviceCharge,
        vat,
        total,
        paymentMethod: paymentMethod || "Cash",
        orderTime: new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }),
        withCredits: !!withCredits,
        pointsEarned,
      };

      await saveOrder(newOrder);
      res.json({ success: true, order: newOrder });
    } catch (e) {
      res.status(500).json({ error: "Failed to place order" });
    }
  });

  // API: Update Order Status
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await updateOrderStatus(id, status);
      if (updated) {
        res.json({ success: true, order: updated });
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // API: Call Staff
  app.post("/api/call-staff", async (req, res) => {
    try {
      const { table } = req.body;
      if (!table) return res.status(400).json({ error: "Missing table number" });

      const newCall: StaffCall = {
        id: `call-${Date.now()}`,
        table: String(table),
        timestamp: new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        status: "Active",
      };

      await createStaffCall(newCall);
      res.json({ success: true, call: newCall });
    } catch (e) {
      res.status(500).json({ error: "Failed to call staff" });
    }
  });

  // API: Get Active Staff Calls
  app.get("/api/staff-calls", async (req, res) => {
    try {
      const calls = await getStaffCalls();
      // Sort newest at top
      calls.sort((a, b) => {
        const idA = a.id.split("-")[1] || "0";
        const idB = b.id.split("-")[1] || "0";
        return Number(idB) - Number(idA);
      });
      res.json(calls);
    } catch (e) {
      res.status(500).json({ error: "Failed to get staff calls" });
    }
  });

  // API: Dismiss Staff Call
  app.post("/api/staff-calls/:id/dismiss", async (req, res) => {
    try {
      const { id } = req.params;
      const dismissed = await dismissStaffCall(id);
      if (dismissed) {
        const calls = await getStaffCalls();
        res.json({ success: true, calls });
      } else {
        res.status(404).json({ error: "Call not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to dismiss call" });
    }
  });

  // Serve Static assets generated or in src/assets
  app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] QR Code Food Ordering System started on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
