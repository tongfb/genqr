import test from "node:test";
import assert from "node:assert/strict";
import { getQrType, QR_TYPES } from "../js/formats.js";

const build = (id, values) => getQrType(id).build(values);

test("all advertised QR types have unique ids and builders", () => {
  const ids = QR_TYPES.map((type) => type.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 9);
  assert.ok(QR_TYPES.every((type) => typeof type.build === "function"));
});

test("builds URL and blocks unsafe schemes", () => {
  assert.equal(build("url", { url: "https://example.com" }), "https://example.com/");
  assert.throws(() => build("url", { url: "javascript:alert(1)" }), /http/);
});

test("builds a vCard with optional fields", () => {
  const payload = build("vcard", { firstName: "Somchai", lastName: "Dee", phone: "0812345678", email: "", organization: "", website: "", address: "" });
  assert.match(payload, /^BEGIN:VCARD\nVERSION:3\.0/);
  assert.match(payload, /FN:Somchai Dee/);
  assert.match(payload, /TEL;TYPE=CELL:0812345678/);
  assert.match(payload, /END:VCARD$/);
});

test("builds standard communication links", () => {
  assert.equal(build("phone", { phone: "+66 81 234 5678" }), "tel:+66812345678");
  assert.equal(build("email", { email: "hello@example.com", subject: "Hi", body: "Test" }), "mailto:hello@example.com?subject=Hi&body=Test");
});

test("builds validated Bitcoin and Lightning URIs", () => {
  const bitcoinAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
  assert.equal(
    build("bitcoin", { address: bitcoinAddress, amount: "0.00000001", label: "Coffee shop", message: "Order #123" }),
    `bitcoin:${bitcoinAddress}?amount=0.00000001&label=Coffee%20shop&message=Order%20%23123`
  );
  assert.throws(() => build("bitcoin", { address: "bc1qtest", amount: "0.1", label: "", message: "" }), /ไม่ถูกต้อง/);
  assert.equal(build("lightning", { kind: "address", value: "name@example.com" }), "lightning:name@example.com");
  assert.equal(build("lightning", { kind: "lnurl", value: "LNURL1TEST" }), "lightning:LNURL1TEST");
});
