import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Scan, Sparkles, Copy, Check, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { getTableOrderUrl, copyToClipboardSafe } from "../lib/url-helper";
import { useCart } from "../context/CartContext";

interface QRCodeDisplayProps {
  tableNumber: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ tableNumber }) => {
  const { storeConfig } = useCart();
  const directURL = getTableOrderUrl(tableNumber, storeConfig?.publicUrl);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(directURL, {
      width: 300,
      margin: 2,
      color: {
        dark: "#ea580c",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {
        // Fallback to online service
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            directURL
          )}&color=ea580c&bgcolor=ffffff`
        );
      });
  }, [directURL]);

  const handleCopyLink = async () => {
    const success = await copyToClipboardSafe(directURL);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      id={`table-qr-card-${tableNumber}`}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-6 sm:p-8 rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-500/5 max-w-sm w-full mx-auto flex flex-col items-center text-center relative overflow-hidden"
    >
      {/* Decorative background lights */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-orange-100/40 rounded-full blur-xl" />
      <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-orange-200/30 rounded-full blur-xl" />

      {/* Brand logo label */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full text-orange-600 border border-orange-100 mb-5">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Smart Table QR</span>
      </div>

      {/* QR Code container */}
      <div className="relative p-4 bg-orange-50/50 rounded-2xl border-2 border-dashed border-orange-200 mb-5 group">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code for Table ${tableNumber}`}
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl select-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-xs text-orange-400">
            กำลังสร้าง QR Code...
          </div>
        )}

        {/* Scan targets corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-500 rounded-tl-md" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-500 rounded-tr-md" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-500 rounded-bl-md" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-500 rounded-br-md" />
      </div>

      {/* Table Badge */}
      <div className="bg-orange-600 text-white font-black text-lg px-6 py-2 rounded-2xl shadow-md shadow-orange-600/20 mb-3 tracking-wide">
        โต๊ะ: {tableNumber}
      </div>

      <p className="text-gray-500 text-xs flex items-center justify-center gap-1 mb-3">
        <Scan className="h-3.5 w-3.5 text-orange-500" />
        สแกนด้วยโทรศัพท์มือถือ หรือเปิดใน Google Chrome
      </p>

      {/* URL display & Actions */}
      <div className="w-full space-y-2">
        <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[10px] text-slate-500 font-mono break-all line-clamp-2 select-all">
          {directURL}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>คัดลอกลิงก์</span>
              </>
            )}
          </button>

          <a
            id={`qr-direct-link-${tableNumber}`}
            href={directURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>เปิดทดสอบ</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
