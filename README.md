# ZAPM GENQR

เครื่องมือสร้าง Static QR Code ฟรี ทำงานทั้งหมดในเบราว์เซอร์ของผู้ใช้ ไม่มีระบบสมาชิก ไม่มีฐานข้อมูล และไม่อัปโหลดข้อมูลหรือโลโก้ไปยังเซิร์ฟเวอร์

เว็บไซต์เป้าหมาย: `https://genqr.zapm.uk`

## ความสามารถ

- สร้าง QR สำหรับ URL, ข้อความ, Wi‑Fi, vCard, Email, Phone และ WhatsApp
- สร้าง PromptPay ตามโครง Thai QR Payment พร้อม CRC16 checksum และจำนวนเงินแบบไม่บังคับ
- สร้าง Bitcoin URI และ Lightning Address / LNURL
- เลือกสี ลาย พื้นขาว พื้นสี หรือพื้นโปร่งใส
- เลือกขนาด 256–1,200 px และระดับ Error Correction
- ใส่โลโก้ PNG, JPG หรือ SVG ไม่เกิน 2 MB พร้อมปรับขนาดและ padding
- ดาวน์โหลด PNG หรือ SVG
- รองรับมือถือ คีย์บอร์ด และ reduced motion

## หลักความเป็นส่วนตัว

โค้ดไม่มี API, Analytics, cookie, Worker, D1 หรือ R2 ข้อมูลที่กรอกและไฟล์โลโก้จึงอยู่ในแท็บเบราว์เซอร์เท่านั้น เมื่อปิดหรือรีเฟรชหน้า ข้อมูลจะหายไป นโยบาย Content Security Policy ยังปิดการเชื่อมต่อออกจากหน้าเว็บไว้ด้วย

## เปิดทดสอบในเครื่อง

ต้องมี Node.js 24 และ pnpm 11 แล้วรัน:

```bash
pnpm install
pnpm test
pnpm dev
```

สร้างไฟล์สำหรับใช้งานจริง:

```bash
pnpm build
```

ไฟล์เว็บที่พร้อม deploy จะอยู่ในโฟลเดอร์ `dist/`

## ตั้งค่าหลัง Fork

Fork คือการคัดลอก repository นี้ไปเป็นโปรเจกต์ของคุณเอง แก้ข้อมูลเจ้าของหลักได้จากไฟล์เดียวคือ [`config.js`](./config.js):

```js
export const APP_CONFIG = Object.freeze({
  appName: "YOUR APP",
  tagline: "Free Static QR Generator",
  brandName: "YOUR BRAND",
  domain: "qr.example.com",
  repositoryUrl: "https://github.com/your-name/your-repo",
  defaultQrColor: "#111827",
  defaultBackgroundColor: "#ffffff",
  defaultSize: 512,
  maxLogoBytes: 2 * 1024 * 1024,
  downloadFileName: "my-qr-code"
});
```

เปลี่ยนภาพแบรนด์ได้ที่ `assets/logo.svg` และ `public/favicon.svg` ข้อความอื่นในหน้าอยู่ใน `index.html`

## Deploy ฟรีบน Cloudflare Pages

Cloudflare Pages เชื่อมกับ GitHub และสร้างเว็บใหม่อัตโนมัติทุกครั้งที่ push ขึ้นสาขา `main` โดยสาขาอื่นและ Pull Request จะได้ URL ตัวอย่างแยกจากเว็บจริง

ค่าที่ใช้ในหน้า Cloudflare:

| ช่อง | ค่า |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Vite` |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | เว้นว่าง |
| Environment variables | ไม่ต้องมี |

จากนั้นเพิ่ม Custom domain เป็น `genqr.zapm.uk` ในแท็บ **Custom domains** ของโปรเจกต์ Pages หากโดเมน `zapm.uk` ใช้ DNS ของ Cloudflare อยู่ ระบบจะสร้าง DNS record ให้ได้โดยอัตโนมัติ

เอกสารทางการ: [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Deploy static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## ค่าใช้จ่าย

โครงนี้ใช้เฉพาะ static assets จึงไม่มีค่าใช้จ่ายตามจำนวนคำขอของ Pages Functions และไม่ต้องใช้ฐานข้อมูลหรือพื้นที่เก็บไฟล์ Cloudflare ระบุว่า static asset requests บน Pages ฟรีและไม่จำกัด อย่างไรก็ตามบัญชี Free มีเพดานจำนวน build ต่อเดือนและขนาด/จำนวนไฟล์ โปรดดู [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) ก่อนใช้งานขนาดใหญ่

ค่าใช้จ่ายที่อาจเกิดขึ้นมีเพียงบริการภายนอกที่เจ้าของเลือกเพิ่มเอง เช่น ค่าโดเมน หรือการเพิ่ม API/ฐานข้อมูลในอนาคต โปรเจกต์นี้ไม่ต้องใช้สิ่งเหล่านั้นเพื่อทำงานพื้นฐาน

## โครงสร้าง

```text
genqr/
├── .github/workflows/quality.yml  # ทดสอบทุกครั้งที่เปลี่ยนโค้ด
├── assets/logo.svg
├── css/style.css
├── js/
│   ├── app.js
│   ├── formats.js
│   ├── promptpay.js
│   └── qr.js
├── public/
│   ├── _headers
│   ├── favicon.svg
│   └── robots.txt
├── test/
├── config.js
├── index.html
├── package.json
└── vite.config.js
```

## ข้อควรระวัง

QR แบบ Static แก้ข้อมูลหลังดาวน์โหลดไม่ได้ โปรดตรวจสอบ PromptPay ID, จำนวนเงิน, address และ URL แล้วทดลองสแกนด้วยแอปจริงก่อนพิมพ์หรือเผยแพร่ โดยเฉพาะ QR สำหรับการชำระเงิน

## License

[MIT](./LICENSE) — ใช้ แก้ไข และนำไป fork ต่อได้
