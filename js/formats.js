import { isValidBitcoinMainnetAddress, normalizeBitcoinAmount } from "./bitcoin.js";
import { generatePromptPayPayload } from "./promptpay.js";

const required = (value, label) => {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`กรุณากรอก${label}`);
  return text;
};

const escapeVCard = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export const QR_TYPES = [
  {
    id: "url", label: "เว็บไซต์", icon: "↗", description: "ลิงก์เว็บไซต์",
    fields: [{ name: "url", label: "URL เว็บไซต์", type: "url", placeholder: "https://example.com", value: "https://genqr.zapm.uk", full: true }],
    build: ({ url }) => {
      const value = required(url, " URL");
      let parsed;
      try { parsed = new URL(value); } catch { throw new Error("URL ไม่ถูกต้อง ตัวอย่างที่ถูกต้อง: https://example.com"); }
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("รองรับเฉพาะลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://");
      return parsed.toString();
    }
  },
  {
    id: "text", label: "ข้อความ", icon: "T", description: "ข้อความทั่วไป",
    fields: [{ name: "text", label: "ข้อความ", type: "textarea", placeholder: "พิมพ์ข้อความที่ต้องการ...", full: true, maxLength: 2000 }],
    build: ({ text }) => required(text, "ข้อความ")
  },
  {
    id: "vcard", label: "รายชื่อ", icon: "◉", description: "Contact / vCard",
    fields: [
      { name: "firstName", label: "ชื่อ", type: "text", placeholder: "สมชาย" },
      { name: "lastName", label: "นามสกุล", type: "text", placeholder: "ใจดี" },
      { name: "phone", label: "เบอร์โทร", type: "tel", placeholder: "+66 81 234 5678" },
      { name: "email", label: "อีเมล", type: "email", placeholder: "hello@example.com" },
      { name: "organization", label: "องค์กร", type: "text", placeholder: "ชื่อบริษัท" },
      { name: "website", label: "เว็บไซต์", type: "url", placeholder: "https://example.com" },
      { name: "address", label: "ที่อยู่", type: "textarea", placeholder: "ที่อยู่สำหรับบันทึกในรายชื่อ", full: true }
    ],
    build: (v) => {
      const first = required(v.firstName, "ชื่อ");
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${escapeVCard(v.lastName)};${escapeVCard(first)};;;`, `FN:${escapeVCard(`${first} ${v.lastName}`.trim())}`];
      if (v.organization) lines.push(`ORG:${escapeVCard(v.organization)}`);
      if (v.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(v.phone)}`);
      if (v.email) lines.push(`EMAIL:${escapeVCard(v.email)}`);
      if (v.website) lines.push(`URL:${escapeVCard(v.website)}`);
      if (v.address) lines.push(`ADR;TYPE=HOME:;;${escapeVCard(v.address)};;;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
  },
  {
    id: "email", label: "อีเมล", icon: "@", description: "เปิดอีเมลพร้อมข้อมูล",
    fields: [
      { name: "email", label: "อีเมลผู้รับ", type: "email", placeholder: "hello@example.com", full: true },
      { name: "subject", label: "หัวข้อ", type: "text", placeholder: "หัวข้ออีเมล", full: true },
      { name: "body", label: "ข้อความ", type: "textarea", placeholder: "ข้อความในอีเมล", full: true }
    ],
    build: (v) => {
      const email = required(v.email, "อีเมลผู้รับ");
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
      const query = new URLSearchParams();
      if (v.subject) query.set("subject", v.subject);
      if (v.body) query.set("body", v.body);
      return `mailto:${email}${query.size ? `?${query.toString()}` : ""}`;
    }
  },
  {
    id: "phone", label: "โทรศัพท์", icon: "☎", description: "โทรออก",
    fields: [{ name: "phone", label: "หมายเลขโทรศัพท์", type: "tel", placeholder: "+66 81 234 5678", full: true }],
    build: ({ phone }) => `tel:${required(phone, "หมายเลขโทรศัพท์").replace(/\s/g, "")}`
  },
  {
    id: "promptpay", label: "PromptPay", icon: "฿", description: "Thai QR Payment",
    fields: [
      { name: "type", label: "ประเภทพร้อมเพย์", type: "select", value: "phone", options: [["phone", "เบอร์มือถือ"], ["nationalId", "เลขบัตรประชาชน / เลขผู้เสียภาษี"], ["ewallet", "e-Wallet ID"]], full: true },
      { name: "target", label: "หมายเลขพร้อมเพย์", type: "text", placeholder: "0812345678", full: true },
      { name: "amount", label: "จำนวนเงิน (ไม่บังคับ)", type: "number", placeholder: "0.00", min: "0.01", step: "0.01", help: "เว้นว่างไว้เพื่อให้ผู้จ่ายกรอกยอดเอง", full: true }
    ],
    build: (v) => generatePromptPayPayload(v)
  },
  {
    id: "bitcoin", label: "Bitcoin", icon: "₿", description: "Bitcoin URI",
    fields: [
      { name: "address", label: "Bitcoin mainnet address", type: "text", placeholder: "bc1q... / bc1p... / 1... / 3...", help: "ตรวจ checksum ก่อนสร้าง QR และรองรับ mainnet เท่านั้น", full: true },
      { name: "amount", label: "จำนวน BTC (ไม่บังคับ)", type: "number", placeholder: "0.001", min: "0.00000001", step: "0.00000001", help: "กรอกเป็น BTC ทศนิยมได้สูงสุด 8 ตำแหน่ง" },
      { name: "label", label: "ป้ายกำกับ", type: "text", placeholder: "Coffee shop" },
      { name: "message", label: "ข้อความ", type: "text", placeholder: "Order #123", full: true }
    ],
    build: (v) => {
      const address = required(v.address, " Bitcoin address");
      if (!isValidBitcoinMainnetAddress(address)) {
        throw new Error("Bitcoin address ไม่ถูกต้อง หรือไม่ใช่ mainnet");
      }

      const params = [];
      const amount = normalizeBitcoinAmount(v.amount);
      if (amount) params.push(`amount=${amount}`);
      if (v.label) params.push(`label=${encodeURIComponent(String(v.label))}`);
      if (v.message) params.push(`message=${encodeURIComponent(String(v.message))}`);
      return `bitcoin:${address}${params.length ? `?${params.join("&")}` : ""}`;
    }
  },
  {
    id: "lightning", label: "Lightning", icon: "ϟ", description: "Lightning Address / LNURL",
    fields: [
      { name: "kind", label: "รูปแบบ", type: "select", value: "address", options: [["address", "Lightning Address"], ["lnurl", "LNURL"]], full: true },
      { name: "value", label: "Lightning Address หรือ LNURL", type: "text", placeholder: "name@example.com หรือ LNURL1...", full: true }
    ],
    build: (v) => {
      const value = required(v.value, " Lightning Address หรือ LNURL");
      if (v.kind === "address" && !/^\S+@\S+\.\S+$/.test(value)) throw new Error("Lightning Address ควรอยู่ในรูป name@example.com");
      if (v.kind === "lnurl" && !/^lnurl/i.test(value)) throw new Error("LNURL ควรขึ้นต้นด้วย LNURL");
      return `lightning:${value}`;
    }
  },
  {
    id: "generic", label: "ทั่วไป", icon: "#", description: "Payload อื่น ๆ",
    fields: [{ name: "payload", label: "ข้อมูลที่ต้องการเข้ารหัส", type: "textarea", placeholder: "ใส่ข้อความหรือ payload รูปแบบใดก็ได้", full: true, maxLength: 3000 }],
    build: ({ payload }) => required(payload, "ข้อมูล")
  }
];

export function getQrType(id) {
  return QR_TYPES.find((type) => type.id === id) ?? QR_TYPES[0];
}
