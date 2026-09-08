import test from "node:test";
import assert from "node:assert/strict";
import { getQrType, QR_TYPES } from "../js/formats.js";

const build = (id, values) => getQrType(id).build(values);

test("all advertised QR types have unique ids and builders", () => {
  const ids = QR_TYPES.map((type) => type.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 11);
  assert.ok(QR_TYPES.every((type) => typeof type.build === "function"));
});

test("builds URL and blocks unsafe schemes", () => {
  assert.equal(build("url", { url: "https://example.com" }), "https://example.com/");
  assert.throws(() => build("url", { url: "javascript:alert(1)" }), /http/);
});

test("escapes special Wi-Fi characters", () => {
  assert.equal(
    build("wifi", { ssid: "Cafe;Guest", security: "WPA", password: "a:b", hidden: "false" }),
    "WIFI:T:WPA;S:Cafe\\;Guest;P:a\\:b;H:false;;"
  );
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
  assert.equal(build("whatsapp", { phone: "+66 81 234 5678", message: "สวัสดี" }), "https://wa.me/66812345678?text=%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5");
  assert.equal(build("email", { email: "hello@example.com", subject: "Hi", body: "Test" }), "mailto:hello@example.com?subject=Hi&body=Test");
});

test("builds Bitcoin and Lightning URIs", () => {
  assert.equal(build("bitcoin", { address: "bc1qtest", amount: "0.1", label: "Tip", message: "" }), "bitcoin:bc1qtest?amount=0.1&label=Tip");
  assert.equal(build("lightning", { kind: "address", value: "name@example.com" }), "lightning:name@example.com");
  assert.equal(build("lightning", { kind: "lnurl", value: "LNURL1TEST" }), "lightning:LNURL1TEST");
});
