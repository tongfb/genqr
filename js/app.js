import { APP_CONFIG } from "../config.js";
import { QR_TYPES, getQrType } from "./formats.js";
import { QrRenderer } from "./qr.js";

const elements = {
  tabs: document.querySelector("#type-tabs"),
  form: document.querySelector("#qr-form"),
  fields: document.querySelector("#dynamic-fields"),
  error: document.querySelector("#form-error"),
  preview: document.querySelector("#qr-preview"),
  payload: document.querySelector("#payload-preview"),
  qrColor: document.querySelector("#qr-color"),
  qrColorText: document.querySelector("#qr-color-text"),
  backgroundMode: document.querySelector("#background-mode"),
  backgroundRow: document.querySelector("#background-color-row"),
  backgroundColor: document.querySelector("#background-color"),
  backgroundColorText: document.querySelector("#background-color-text"),
  dotStyle: document.querySelector("#dot-style"),
  errorLevel: document.querySelector("#error-level"),
  qrSize: document.querySelector("#qr-size"),
  qrSizeOutput: document.querySelector("#qr-size-output"),
  reset: document.querySelector("#reset-button"),
  downloadPng: document.querySelector("#download-png"),
  downloadSvg: document.querySelector("#download-svg"),
  mobileSaveHint: document.querySelector("#mobile-save-hint"),
  openLightningWallet: document.querySelector("#open-lightning-wallet"),
  copyLightningAddress: document.querySelector("#copy-lightning-address"),
  toast: document.querySelector("#toast")
};

const state = {
  activeType: "url",
  valid: true,
  frame: 0,
  toastTimer: 0
};

document.querySelectorAll("[data-config]").forEach((node) => {
  const key = node.dataset.config;
  if (key in APP_CONFIG) node.textContent = APP_CONFIG[key];
});
document.title = `${APP_CONFIG.appName} — ${APP_CONFIG.tagline}`;
elements.openLightningWallet.href = `lightning:${APP_CONFIG.lightningDonationAddress}`;
elements.qrColor.value = APP_CONFIG.defaultQrColor;
elements.qrColorText.value = APP_CONFIG.defaultQrColor;
elements.backgroundColor.value = APP_CONFIG.defaultBackgroundColor;
elements.backgroundColorText.value = APP_CONFIG.defaultBackgroundColor;
elements.qrSize.value = APP_CONFIG.defaultSize;

const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const canUseAppleShareSheet = isAppleMobile
  && typeof navigator.share === "function"
  && typeof navigator.canShare === "function";

if (canUseAppleShareSheet) {
  elements.downloadPng.textContent = "บันทึก PNG ลงรูปภาพ";
  elements.downloadSvg.textContent = "บันทึก SVG ลง Files";
  elements.mobileSaveHint.hidden = false;
}

function renderTabs() {
  elements.tabs.replaceChildren(...QR_TYPES.map((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "type-tab";
    button.role = "tab";
    button.id = `tab-${type.id}`;
    button.dataset.type = type.id;
    button.setAttribute("aria-selected", String(type.id === state.activeType));
    button.setAttribute("aria-controls", "dynamic-fields");
    const icon = document.createElement("span");
    icon.className = "type-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = type.icon;
    const label = document.createElement("span");
    label.textContent = type.label;
    button.append(icon, label);
    return button;
  }));
}

function createField(field) {
  const label = document.createElement("label");
  if (field.full) label.classList.add("field-full");
  label.append(document.createTextNode(field.label));

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else if (field.type === "select") {
    input = document.createElement("select");
    field.options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      input.append(option);
    });
  } else {
    input = document.createElement("input");
    input.type = field.type;
  }

  input.name = field.name;
  input.id = `field-${state.activeType}-${field.name}`;
  if (field.placeholder) input.placeholder = field.placeholder;
  if (field.value !== undefined) input.value = field.value;
  if (field.maxLength) input.maxLength = field.maxLength;
  if (field.min) input.min = field.min;
  if (field.step) input.step = field.step;
  input.autocomplete = "off";
  label.htmlFor = input.id;
  label.append(input);

  if (field.help) {
    const help = document.createElement("span");
    help.className = "field-help";
    help.textContent = field.help;
    label.append(help);
  }
  return label;
}

function renderFields() {
  const type = getQrType(state.activeType);
  elements.fields.replaceChildren(...type.fields.map(createField));
  elements.error.textContent = "";
}

function getFormValues() {
  return Object.fromEntries(new FormData(elements.form).entries());
}

function getBackgroundColor() {
  if (elements.backgroundMode.value === "transparent") return "transparent";
  if (elements.backgroundMode.value === "color") return elements.backgroundColor.value;
  return "#ffffff";
}

function getOptions(data) {
  return {
    data,
    size: Number(elements.qrSize.value),
    qrColor: elements.qrColor.value,
    backgroundColor: getBackgroundColor(),
    dotStyle: elements.dotStyle.value,
    errorLevel: elements.errorLevel.value
  };
}

let renderer;

function validateAndRender() {
  window.cancelAnimationFrame(state.frame);
  state.frame = window.requestAnimationFrame(() => {
    try {
      const type = getQrType(state.activeType);
      const payload = type.build(getFormValues());
      elements.error.textContent = "";
      elements.payload.textContent = payload;
      state.valid = true;
      if (!renderer) renderer = new QrRenderer(elements.preview, getOptions(payload));
      else renderer.update(getOptions(payload));
    } catch (error) {
      elements.error.textContent = error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง";
      elements.payload.textContent = "กรอกข้อมูลให้ครบเพื่อสร้าง QR Code";
      state.valid = false;
    }
  });
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function syncColor(colorInput, textInput) {
  colorInput.addEventListener("input", () => {
    textInput.value = colorInput.value;
    validateAndRender();
  });
  textInput.addEventListener("change", () => {
    if (/^#[0-9a-f]{6}$/i.test(textInput.value)) {
      colorInput.value = textInput.value;
      validateAndRender();
    } else {
      textInput.value = colorInput.value;
      showToast("รหัสสีต้องอยู่ในรูป #RRGGBB");
    }
  });
}

elements.tabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-type]");
  if (!button) return;
  state.activeType = button.dataset.type;
  renderTabs();
  renderFields();
  validateAndRender();
});

elements.tabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const index = QR_TYPES.findIndex((type) => type.id === state.activeType);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const next = QR_TYPES[(index + direction + QR_TYPES.length) % QR_TYPES.length];
  elements.tabs.querySelector(`[data-type="${next.id}"]`).click();
  elements.tabs.querySelector(`[data-type="${next.id}"]`).focus();
});

elements.form.addEventListener("input", validateAndRender);
elements.form.addEventListener("submit", (event) => event.preventDefault());
elements.backgroundMode.addEventListener("change", () => {
  elements.backgroundRow.hidden = elements.backgroundMode.value !== "color";
  validateAndRender();
});

[elements.dotStyle, elements.errorLevel].forEach((control) => control.addEventListener("change", validateAndRender));
elements.qrSize.addEventListener("input", () => {
  elements.qrSizeOutput.value = `${elements.qrSize.value} px`;
  validateAndRender();
});

elements.reset.addEventListener("click", () => {
  state.activeType = "url";
  elements.qrColor.value = APP_CONFIG.defaultQrColor;
  elements.qrColorText.value = APP_CONFIG.defaultQrColor;
  elements.backgroundMode.value = "white";
  elements.backgroundRow.hidden = true;
  elements.backgroundColor.value = APP_CONFIG.defaultBackgroundColor;
  elements.backgroundColorText.value = APP_CONFIG.defaultBackgroundColor;
  elements.dotStyle.value = "square";
  elements.errorLevel.disabled = false;
  elements.errorLevel.value = "M";
  elements.qrSize.value = APP_CONFIG.defaultSize;
  elements.qrSizeOutput.value = `${APP_CONFIG.defaultSize} px`;
  renderTabs();
  renderFields();
  validateAndRender();
  showToast("เริ่มใหม่แล้ว");
});

async function download(extension) {
  validateAndRender();
  if (!state.valid || !renderer) {
    showToast("กรุณากรอกข้อมูลให้ถูกต้องก่อนดาวน์โหลด");
    return;
  }
  try {
    if (canUseAppleShareSheet && (extension === "png" || extension === "svg")) {
      const file = await renderer.getFile(extension, APP_CONFIG.downloadFileName);
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${APP_CONFIG.appName} QR Code` });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
    }
    await renderer.download(extension, APP_CONFIG.downloadFileName);
    showToast(`ดาวน์โหลด ${extension.toUpperCase()} แล้ว`);
  } catch {
    showToast("ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
  }
}

elements.downloadPng.addEventListener("click", () => download("png"));
elements.downloadSvg.addEventListener("click", () => download("svg"));
elements.copyLightningAddress.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(APP_CONFIG.lightningDonationAddress);
    showToast(`คัดลอก ${APP_CONFIG.lightningDonationAddress} แล้ว`);
  } catch {
    showToast("คัดลอกไม่สำเร็จ กรุณาคัดลอก address ด้วยตนเอง");
  }
});
syncColor(elements.qrColor, elements.qrColorText);
syncColor(elements.backgroundColor, elements.backgroundColorText);

renderTabs();
renderFields();
validateAndRender();
