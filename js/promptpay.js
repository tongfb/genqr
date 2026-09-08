const PROMPTPAY_AID = "A000000677010111";

export function tlv(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

export function crc16Ccitt(text) {
  let crc = 0xffff;
  for (let index = 0; index < text.length; index += 1) {
    crc ^= text.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayTarget(type, input) {
  const digits = String(input).replace(/\D/g, "");

  if (type === "phone") {
    if (digits.length !== 10 || !digits.startsWith("0")) {
      throw new Error("เบอร์มือถือพร้อมเพย์ต้องมี 10 หลักและขึ้นต้นด้วย 0");
    }
    return { tag: "01", value: `0066${digits.slice(1)}` };
  }

  if (type === "nationalId") {
    if (digits.length !== 13) {
      throw new Error("เลขบัตรประชาชนหรือเลขผู้เสียภาษีต้องมี 13 หลัก");
    }
    return { tag: "02", value: digits };
  }

  if (type === "ewallet") {
    if (digits.length !== 15) {
      throw new Error("หมายเลข e-Wallet พร้อมเพย์ต้องมี 15 หลัก");
    }
    return { tag: "03", value: digits };
  }

  throw new Error("กรุณาเลือกประเภทพร้อมเพย์");
}

export function generatePromptPayPayload({ type, target, amount }) {
  const normalized = normalizePromptPayTarget(type, target);
  const numericAmount = String(amount ?? "").trim();
  let amountTag = "";

  if (numericAmount !== "") {
    const value = Number(numericAmount);
    if (!Number.isFinite(value) || value <= 0 || value > 999999999.99) {
      throw new Error("จำนวนเงินต้องมากกว่า 0 และไม่เกิน 999,999,999.99 บาท");
    }
    amountTag = tlv("54", value.toFixed(2));
  }

  const merchantInfo = tlv("00", PROMPTPAY_AID) + tlv(normalized.tag, normalized.value);
  const data = [
    tlv("00", "01"),
    tlv("01", amountTag ? "12" : "11"),
    tlv("29", merchantInfo),
    tlv("58", "TH"),
    tlv("53", "764"),
    amountTag,
    "6304"
  ].join("");

  return `${data}${crc16Ccitt(data)}`;
}
