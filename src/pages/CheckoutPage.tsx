import React, { useState, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  User,
  CreditCard,
  QrCode,
  Wallet,
  Coins,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Info,
  Clock,
  PhoneCall,
  BellRing
} from "lucide-react";

interface PaymentOption {
  id: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  steps: string;
}

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    table,
    storeConfig,
    placeOrder,
    callStaff,
    clearCart
  } = useCart();

  const navigate = useNavigate();

  // Selected Payment Method state
  const [selectedPayment, setSelectedPayment] = useState<string>("Alipay");
  const [useCredits, setUseCredits] = useState(true);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");

  // Staff Call State
  const [isCalling, setIsCalling] = useState(false);
  const [callMsg, setCallMsg] = useState("");

  // Prevent accessing checkout if cart is empty (unless orderSuccess is true)
  React.useEffect(() => {
    if (cart.length === 0 && !orderSuccess) {
      navigate(`/menu?table=${table}`);
    }
  }, [cart, orderSuccess]);

  // Payment Options Configuration (matching exact horizontal scroll in mockup)
  const paymentOptions: PaymentOption[] = [
    {
      id: "Card",
      name: "Card",
      sub: "Visa / Mastercard",
      icon: <CreditCard className="h-6 w-6" />,
      color: "border-blue-200 text-blue-600 bg-blue-50/40",
      steps: "กรุณากรอกหมายเลขบัตรเครดิตหรือเดบิตในขั้นตอนถัดไปเพื่อชำระเงินแบบเข้ารหัสปลอดภัย"
    },
    {
      id: "PromptPay",
      name: "PromptPay",
      sub: "พร้อมเพย์ QR",
      icon: <QrCode className="h-6 w-6" />,
      color: "border-teal-200 text-teal-600 bg-teal-50/40",
      steps: "ระบบจะสร้าง QR Code พร้อมเพย์ตามยอดเงินนี้ สแกนจ่ายด้วยแอปพลิเคชันธนาคารใดก็ได้"
    },
    {
      id: "TrueMoney",
      name: "TrueMoney",
      sub: "ทรูมันนี่ วอลเล็ท",
      icon: <Wallet className="h-6 w-6 text-orange-500" />,
      color: "border-orange-200 text-orange-600 bg-orange-50/40",
      steps: "เปิดแอปพลิเคชัน TrueMoney เพื่อกรอกเบอร์โทรศัพท์และรับ OTP ในการชำระเงินออนไลน์"
    },
    {
      id: "WeChat Pay",
      name: "WeChat Pay",
      sub: "วีแชทเพย์",
      icon: <Coins className="h-6 w-6 text-green-500" />,
      color: "border-green-200 text-green-600 bg-green-50/40",
      steps: "สแกนรหัส QR ผ่านแอปพลิเคชัน WeChat Pay เพื่อตัดชำระเงินหยวนด้วยอัตราแลกเปลี่ยนปัจจุบัน"
    },
    {
      id: "Alipay",
      name: "Alipay",
      sub: "อาลีเพย์",
      icon: <QrCode className="h-6 w-6 text-sky-500" />,
      color: "border-sky-200 text-sky-600 bg-sky-50/40",
      steps: "หลังจากกดชำระเงิน คุณจะถูกนำไปยังหน้าที่ปลอดภัยเพื่อทำการชำระเงินผ่านแอป Alipay ให้เสร็จสิ้น"
    },
    {
      id: "Gift Card",
      name: "Gift Card",
      sub: "บัตรของขวัญ",
      icon: <CreditCard className="h-6 w-6 text-purple-500" />,
      color: "border-purple-200 text-purple-600 bg-purple-50/40",
      steps: "กรอกรหัสบัตรของขวัญ Papaya Gift Card หรือบัตรกำนัลพาร์ทเนอร์เพื่อใช้แทนเงินสด"
    }
  ];

  // Calculations based on actual store configuration percentages
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  const serviceCharge = useMemo(() => {
    return Math.round((subtotal * storeConfig.serviceChargePercent) / 100);
  }, [subtotal, storeConfig.serviceChargePercent]);

  const vat = useMemo(() => {
    return Math.round(((subtotal + serviceCharge) * storeConfig.vatPercent) / 100);
  }, [subtotal, serviceCharge, storeConfig.vatPercent]);

  const total = useMemo(() => {
    return subtotal + serviceCharge + vat;
  }, [subtotal, serviceCharge, vat]);

  // Papaya credits cashback percentage representation (5%)
  const cashbackCredits = useMemo(() => {
    return (total * 0.05).toFixed(2);
  }, [total]);

  // Handle Pay & Order Placement
  const handlePaymentSubmit = async () => {
    setIsPlacingOrder(true);
    const success = await placeOrder(selectedPayment, useCredits);
    if (success) {
      setPlacedOrderId(`PAY-${Date.now().toString().slice(-6)}`);
      setOrderSuccess(true);
    } else {
      alert("ขออภัย! ไม่สามารถวางคำสั่งซื้อได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    }
    setIsPlacingOrder(false);
  };

  const handleCallStaff = async () => {
    setIsCalling(true);
    const ok = await callStaff();
    if (ok) {
      setCallMsg("🔔 ส่งสัญญาณเรียกพนักงานที่โต๊ะ " + table + " สำเร็จ!");
    } else {
      setCallMsg("❌ เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    }
    setTimeout(() => setCallMsg(""), 4000);
    setIsCalling(false);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailSubmitted(true);
    setTimeout(() => {
      setEmailSubmitted(false);
      setEmail("");
    }, 3000);
  };

  const activeOption = useMemo(() => {
    return paymentOptions.find((opt) => opt.id === selectedPayment) || paymentOptions[4];
  }, [selectedPayment]);

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-4 font-sans select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[2.5rem] border border-orange-100/60 p-8 shadow-2xl max-w-md w-full text-center space-y-6"
        >
          {/* Animated Success Checkmark */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 100 }}
              className="bg-green-100 p-4 rounded-full text-green-600"
            >
              <CheckCircle className="h-16 w-16 stroke-[1.5]" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight font-display">สั่งอาหารสำเร็จแล้ว!</h2>
            <p className="text-sm text-slate-500 font-bold">รายการอาหารของคุณได้ส่งตรงไปห้องครัวเรียบร้อย</p>
            <div className="bg-orange-50 text-orange-600 rounded-2xl p-3 border border-orange-100 inline-block text-xs font-black tracking-wide px-5 shadow-sm">
              เลขอ้างอิงออเดอร์: {placedOrderId} (โต๊ะ {table})
            </div>
          </div>

          {/* Cooking progress timeline indicator */}
          <div className="bg-[#FFF9F5] rounded-[1.75rem] p-5 border border-orange-100/50 text-left space-y-3.5 shadow-inner">
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
              สถานะการเตรียมอาหาร
            </h4>
            <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
              <span className="text-orange-600">1. ได้รับออเดอร์</span>
              <span>2. กำลังทำ</span>
              <span>3. เสิร์ฟแล้ว</span>
            </div>
            <div className="w-full bg-orange-100/50 h-2.5 rounded-full overflow-hidden">
              <div className="w-1/3 bg-orange-500 h-full rounded-full transition-all duration-1000" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">คุณสามารถตรวจสอบความคืบหน้าอาหารหรือเรียกพนักงานได้ตลอดเวลา</p>
          </div>

          {/* Quick interactive links */}
          <div className="space-y-3 pt-2">
            <button
              id="success-back-to-menu"
              onClick={() => {
                navigate(`/menu?table=${table}`);
              }}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm sm:text-base transition-colors shadow-lg shadow-orange-600/20 font-display"
            >
              สั่งอาหารเพิ่มเติม (Order More)
            </button>

            <button
              id="success-call-staff"
              onClick={handleCallStaff}
              disabled={isCalling}
              className="w-full py-3.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-2xl font-extrabold text-xs sm:text-sm transition-colors border border-orange-200 shadow-sm"
            >
              🛎️ เรียกพนักงานที่โต๊ะ {table}
            </button>
            {callMsg && (
              <p className="text-xs text-orange-600 font-bold bg-orange-100/40 p-2.5 rounded-xl border border-orange-100 animate-bounce">
                {callMsg}
              </p>
            )}
          </div>
        </motion.div>
        <p className="text-[10px] text-slate-400 mt-6 font-medium">จัดทำโดย นายธนาคม หล้าสุด</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-28 font-sans select-none flex flex-col">
      {/* HEADER BAR */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-orange-100/40 px-4 py-3.5 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <button
            id="checkout-back-btn"
            onClick={() => navigate(`/menu?table=${table}`)}
            className="p-1.5 hover:bg-orange-50 rounded-full text-orange-600 transition-colors"
          >
            <ChevronLeft className="h-5.5 w-5.5" />
          </button>
          <h1 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">สรุปคำสั่งซื้อ</h1>
        </div>
        <button
          id="checkout-user-btn"
          onClick={() => navigate(`/menu?table=${table}`)}
          className="p-2 rounded-full hover:bg-orange-50 text-slate-500 transition-colors"
        >
          <User className="h-5 w-5" />
        </button>
      </header>

      {/* CORE CONTENT */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 space-y-4">
        
        {/* TABLE BADGE */}
        <div className="bg-white rounded-[1.5rem] p-4 border border-orange-100/40 shadow-md flex justify-between items-center">
          <span className="text-xs sm:text-sm font-bold text-slate-500">หมายเลขโต๊ะของคุณ</span>
          <span className="bg-orange-500 text-white font-black text-sm px-4 py-1.5 rounded-xl shadow-md font-display">
            โต๊ะ: {table}
          </span>
        </div>

        {/* CART ORDER ITEMS */}
        <div className="bg-white rounded-[2rem] p-5.5 border border-orange-100/40 shadow-md space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider border-b border-orange-100/50 pb-2.5 font-display">
            รายการอาหารในตะกร้า
          </h3>
          <div className="divide-y divide-orange-100/30 max-h-48 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.menuItem.id} className="py-3 flex justify-between items-center text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100/60">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-slate-700">{item.menuItem.name}</span>
                </div>
                <span className="font-extrabold text-slate-800 font-display">
                  ฿{item.menuItem.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT METHODS CARDS SLIDER (horizontal scrolling) */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider pl-1 font-display">
            การชำระเงิน
          </h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-2.5 no-scrollbar px-1 snap-x">
            {paymentOptions.map((opt) => {
              const isSelected = opt.id === selectedPayment;
              return (
                <button
                  key={opt.id}
                  id={`pay-method-${opt.id}`}
                  onClick={() => setSelectedPayment(opt.id)}
                  className={`snap-center shrink-0 w-32 p-3.5 rounded-[1.5rem] border text-center transition-all duration-300 flex flex-col items-center justify-between h-30 relative ${
                    isSelected
                      ? "bg-white border-orange-500 ring-4 ring-orange-500/10 shadow-lg scale-105"
                      : "bg-white border-orange-100/40 hover:border-orange-200"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? "bg-orange-50 text-orange-600 font-bold" : "bg-[#FFF9F5] text-slate-400"}`}>
                    {opt.icon}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-800 text-[11px] leading-none font-display">{opt.name}</p>
                    <p className="text-[9px] text-slate-400 font-black leading-none">{opt.sub}</p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTEXT PAYMENT DESCRIPTION BOX (as shown in screenshots) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPayment}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 bg-white border border-orange-100/30 rounded-2xl shadow-md space-y-2 text-xs"
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-800 font-display">
              <span className="text-orange-500">💳</span>
              <span>{activeOption.name} ถูกเลือกสำหรับการชำระเงิน</span>
            </div>
            <p className="text-slate-400 leading-relaxed font-semibold">
              {activeOption.steps}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* LOYALTY POINTS / CREDITS (toggle switch & email, matching mockup) */}
        <div className="bg-white rounded-[2rem] p-5.5 border border-orange-100/40 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 bg-orange-100/75 rounded-2xl flex items-center justify-center text-orange-600 font-black text-sm font-display">
                P
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm font-display">เครดิตปาปาย่า</h4>
                <p className="text-[10px] text-slate-400 font-bold">รับคะแนนสะสม 5% ทุกคำสั่งซื้อ</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              id="credits-toggle-btn"
              onClick={() => setUseCredits(!useCredits)}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center ${
                useCredits ? "bg-orange-500 justify-end" : "bg-orange-100/50 justify-start border border-orange-100"
              }`}
            >
              <motion.div layout className="bg-white w-4.5 h-4.5 rounded-full shadow-md" />
            </button>
          </div>

          {useCredits && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="space-y-3.5 border-t border-orange-100/40 pt-3.5 overflow-hidden"
            >
              <p className="text-xs text-orange-800 bg-orange-50/70 p-3 rounded-xl border border-orange-100 font-bold leading-relaxed">
                รับเครดิตปาปาย่า <span className="font-extrabold text-orange-600">฿{cashbackCredits} (5%)</span> และรับส่วนลดที่ร้านอาหารพาร์ทเนอร์ของเรา
              </p>

              {/* Email Form as seen in screenshots */}
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ป้อนอีเมลของคุณสะสมแต้ม"
                    className="flex-1 px-4 py-3 rounded-xl bg-orange-50/10 border border-orange-100/60 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 rounded-xl text-xs font-black transition-colors"
                  >
                    ส่ง
                  </button>
                </div>
                {emailSubmitted && (
                  <p className="text-[10px] text-green-600 font-black flex items-center gap-1 mt-1">
                    ✓ เชื่อมต่ออีเมลสะสมคะแนนสำเร็จแล้ว!
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </div>

        {/* BILL SUMMARY BREAKDOWN */}
        <div className="bg-white rounded-[2rem] p-5.5 border border-orange-100/40 shadow-md space-y-3.5 text-xs sm:text-sm">
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>รวมบิล (Subtotal)</span>
            <span className="font-display">฿{subtotal}.00</span>
          </div>
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>ค่าบริการ (Service Charge {storeConfig.serviceChargePercent}%)</span>
            <span className="font-display">฿{serviceCharge}.00</span>
          </div>
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>ภาษี (VAT {storeConfig.vatPercent}%)</span>
            <span className="font-display">฿{vat}.00</span>
          </div>
          <div className="pt-3.5 border-t border-orange-100/50 flex justify-between font-black text-slate-800 text-sm sm:text-base font-display">
            <span>รวมสุทธิ</span>
            <span className="text-orange-600 text-base sm:text-lg">฿{total}.00</span>
          </div>
        </div>

        {/* BOTTOM METADATA NOTIFICATION */}
        <p className="text-[10px] text-slate-400 text-center leading-relaxed max-w-xs mx-auto font-medium py-2">
          โดยการส่ง คุณยอมรับข้อกำหนดของเรา Terms & Conditions และนโยบายความเป็นส่วนตัว
        </p>
      </main>

      {/* STICKY FOOTER PAY BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-4.5 bg-white/95 backdrop-blur-md border-t border-orange-100/50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-40 flex justify-center">
        <button
          id="checkout-pay-now-btn"
          onClick={handlePaymentSubmit}
          disabled={isPlacingOrder}
          className="w-full max-w-md bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white p-4 rounded-[1.5rem] font-black text-sm sm:text-base shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-display"
        >
          <span>ชำระเงิน ฿{total}.00</span>
          <ArrowRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
