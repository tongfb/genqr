const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_MAP = Object.fromEntries([...BECH32_CHARSET].map((char, index) => [char, index]));
const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];

const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

function sha256(bytes) {
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const output = new DataView(result.buffer);
  [h0,h1,h2,h3,h4,h5,h6,h7].forEach((value, index) => output.setUint32(index * 4, value, false));
  return result;
}

function decodeBase58(value) {
  let number = 0n;
  for (const char of value) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index < 0) return null;
    number = number * 58n + BigInt(index);
  }

  const bytes = [];
  while (number > 0n) {
    bytes.push(Number(number & 0xffn));
    number >>= 8n;
  }
  bytes.reverse();

  let leadingZeroes = 0;
  while (leadingZeroes < value.length && value[leadingZeroes] === "1") leadingZeroes += 1;
  return Uint8Array.from([...new Array(leadingZeroes).fill(0), ...bytes]);
}

function isValidBase58Mainnet(address) {
  const decoded = decodeBase58(address);
  if (!decoded || decoded.length !== 25) return false;
  if (![0x00, 0x05].includes(decoded[0])) return false;

  const payload = decoded.slice(0, 21);
  const checksum = decoded.slice(21);
  const expected = sha256(sha256(payload)).slice(0, 4);
  return checksum.every((byte, index) => byte === expected[index]);
}

function bech32Polymod(values) {
  const generators = [0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= generators[i];
  }
  return chk >>> 0;
}

function expandHrp(hrp) {
  return [...hrp].map((char) => char.charCodeAt(0) >>> 5)
    .concat([0], [...hrp].map((char) => char.charCodeAt(0) & 31));
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const result = [];
  const maxValue = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || (value >>> fromBits) !== 0) return null;
    acc = ((acc << fromBits) | value) & 0x7fffffff;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >>> bits) & maxValue);
    }
  }
  if (pad) {
    if (bits) result.push((acc << (toBits - bits)) & maxValue);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxValue)) {
    return null;
  }
  return result;
}

function isValidBech32Mainnet(address) {
  if (address.length < 14 || address.length > 90) return false;
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) return false;

  const normalized = address.toLowerCase();
  const separator = normalized.lastIndexOf("1");
  if (separator < 1 || separator + 7 > normalized.length) return false;
  const hrp = normalized.slice(0, separator);
  if (hrp !== "bc") return false;

  const data = [...normalized.slice(separator + 1)].map((char) => BECH32_MAP[char]);
  if (data.some((value) => value === undefined)) return false;

  const polymod = bech32Polymod([...expandHrp(hrp), ...data]);
  const payload = data.slice(0, -6);
  if (payload.length < 1) return false;

  const version = payload[0];
  if (version > 16) return false;
  if (version === 0 && polymod !== 1) return false;
  if (version > 0 && polymod !== 0x2bc830a3) return false;

  const program = convertBits(payload.slice(1), 5, 8, false);
  if (!program || program.length < 2 || program.length > 40) return false;
  if (version === 0 && ![20, 32].includes(program.length)) return false;
  return true;
}

export function isValidBitcoinMainnetAddress(address) {
  const value = String(address ?? "").trim();
  if (!value) return false;
  if (/^bc1/i.test(value)) return isValidBech32Mainnet(value);
  return isValidBase58Mainnet(value);
}

export function normalizeBitcoinAmount(value) {
  const amount = String(value ?? "").trim();
  if (!amount) return "";
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(amount)) {
    throw new Error("จำนวน Bitcoin ต้องเป็นเลข BTC ปกติและมีทศนิยมไม่เกิน 8 ตำแหน่ง");
  }

  const [whole, fraction = ""] = amount.split(".");
  const satoshis = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, "0") || "0");
  if (satoshis <= 0n) throw new Error("จำนวน Bitcoin ต้องมากกว่า 0");
  return amount;
}
