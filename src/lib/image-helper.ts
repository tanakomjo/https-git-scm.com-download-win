export const getImageFallback = (name: string): string => {
  const fallbacks: Record<string, string> = {
    "ผัดกะเพราหมูสับ": "/src/assets/images/pad_kra_prow_1783958021532.jpg",
    "ข้าวผัดหมู": "/src/assets/images/pork_fried_rice_1783958032826.jpg",
    "ผัดไทยกุ้งสด": "/src/assets/images/pad_thai_1783958044685.jpg",
    "ผัดซีอิ๊วหมู": "/src/assets/images/pad_see_ew_1783958054865.jpg",
    "ส้มตำไทย": "/src/assets/images/som_tum_thai_1783958125608.jpg",
    "ส้มตำปูปลาร้า": "/src/assets/images/som_tum_crab_1783958137311.jpg",
    "ส้มตำกุ้งสด": "/src/assets/images/som_tum_shrimp_1783958149380.jpg",
    "ยำวุ้นเส้น": "/src/assets/images/yum_woon_sen_1783958162318.jpg",
    "ยำกุ้งสด": "/src/assets/images/yum_shrimp_1783958173090.jpg",
    "ต้มยำกุ้ง": "/src/assets/images/tom_yum_goong_1783958091183.jpg",
    "ต้มยำทะเล": "/src/assets/images/tom_yum_talay_1783958103016.jpg",
    "แกงเขียวหวานไก่": "/src/assets/images/green_curry_1783958067947.jpg",
    "ต้มข่าไก่": "/src/assets/images/tom_kha_gai_1783958080793.jpg",
    "น้ำเปล่า": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80",
    "ชาไทย": "/src/assets/images/thai_tea_1783958184063.jpg",
    "ชาเขียว": "/src/assets/images/green_tea_1783958196152.jpg",
    "น้ำโค้ก": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "ทับทิมกรอบ": "/src/assets/images/tub_tim_krob_1783958207351.jpg",
    "ข้าวเหนียวมะม่วง": "/src/assets/images/mango_sticky_rice_1783958219417.jpg"
  };
  return fallbacks[name] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
};
