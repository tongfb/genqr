import test from "node:test";
import assert from "node:assert/strict";
import { isValidBitcoinMainnetAddress, normalizeBitcoinAmount } from "../js/bitcoin.js";

test("accepts valid Bitcoin mainnet address formats", () => {
  assert.equal(isValidBitcoinMainnetAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"), true);
  assert.equal(isValidBitcoinMainnetAddress("3FkhZo7sGNue153xhgqPBcUaBsYvJW6tTx"), true);
  assert.equal(isValidBitcoinMainnetAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"), true);
  assert.equal(isValidBitcoinMainnetAddress("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0"), true);
});

test("rejects bad checksums and non-mainnet addresses", () => {
  assert.equal(isValidBitcoinMainnetAddress("bc1qtest"), false);
  assert.equal(isValidBitcoinMainnetAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb"), false);
  assert.equal(isValidBitcoinMainnetAddress("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7"), false);
});

test("keeps Bitcoin amounts as fixed decimal BTC", () => {
  assert.equal(normalizeBitcoinAmount("0.1"), "0.1");
  assert.equal(normalizeBitcoinAmount("0.00000001"), "0.00000001");
  assert.equal(normalizeBitcoinAmount(""), "");
  assert.throws(() => normalizeBitcoinAmount("1e-8"), /ทศนิยม/);
  assert.throws(() => normalizeBitcoinAmount("0"), /มากกว่า 0/);
  assert.throws(() => normalizeBitcoinAmount("1.123456789"), /8 ตำแหน่ง/);
});
