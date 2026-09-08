import test from "node:test";
import assert from "node:assert/strict";
import { crc16Ccitt, generatePromptPayPayload, normalizePromptPayTarget, tlv } from "../js/promptpay.js";

test("TLV uses a two-digit length", () => {
  assert.equal(tlv("58", "TH"), "5802TH");
  assert.equal(tlv("53", "764"), "5303764");
});

test("normalizes a Thai mobile number to PromptPay format", () => {
  assert.deepEqual(normalizePromptPayTarget("phone", "081-234-5678"), {
    tag: "01",
    value: "0066812345678"
  });
});

test("generates a valid static PromptPay payload without amount", () => {
  const payload = generatePromptPayPayload({ type: "phone", target: "0812345678", amount: "" });
  assert.match(payload, /^00020101021129370016A000000677010111011300668123456785802TH5303764/);
  assert.equal(payload.slice(-8, -4), "6304");
  assert.equal(payload.slice(-4), crc16Ccitt(payload.slice(0, -4)));
});

test("uses dynamic initiation and two decimal places when amount exists", () => {
  const payload = generatePromptPayPayload({ type: "nationalId", target: "1234567890123", amount: "25" });
  assert.match(payload, /010212/);
  assert.match(payload, /540525\.00/);
  assert.match(payload, /02131234567890123/);
  assert.equal(payload.slice(-4), crc16Ccitt(payload.slice(0, -4)));
});

test("rejects invalid identifiers and amounts", () => {
  assert.throws(() => normalizePromptPayTarget("phone", "123"), /10 หลัก/);
  assert.throws(() => generatePromptPayPayload({ type: "ewallet", target: "123", amount: "" }), /15 หลัก/);
  assert.throws(() => generatePromptPayPayload({ type: "phone", target: "0812345678", amount: "-1" }), /มากกว่า 0/);
});
