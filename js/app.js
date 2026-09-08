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
  logoInput: document.querySelector("#logo-input"),
  logoStatus: document.querySelector("#logo-status"),
  logoThumbnail: document.querySelector("#logo-thumbnail"),
  logoName: document.querySelector("#logo-name"),
  logoControls: document.querySelector("#logo-controls"),
  logoSize: document.querySelector("#logo-size"),
  logoSizeOutput: document.querySelector("#logo-size-output"),
  logoPadding: document.querySelector("#logo-padding"),
  logoPaddingOutput: document.querySelector("#logo-padding-output"),
  logoWarning: document.querySelector("#logo-warning"),
  removeLogo: document.querySelector("#remove-logo"),
  reset: document.querySelector("#reset-button"),
  downloadPng: document.querySelector("#download-png"),
  downloadSvg: document.querySelector("#download-svg"),
  toast: document.querySelector("#toast")
};

const state = {
  activeType: "url",
  logo: "",
  valid: true,
  frame: 0,
  toastTimer: 0
};

document.querySelectorAll("[data-config]").forEach((node) => {
  const key = node.dataset.config;
  if (key in APP_CONFIG) node.textContent = APP_CONFIG[key];
});
document.title = `${APP_CONFIG.appName} — ${APP_CONFIG.tagline}`;
elements.qrColor.value = APP_CONFIG.defaultQrColor;
elements.qrColorText.value = APP_CONFIG.defaultQrColor;
elements.backgroundColor.value = APP_CONFIG.defaultBackgroundColor;
elements.backgroundColorText.value = APP_CONFIG.defaultBackgroundColor;
elements.qrSize.value = APP_CONFIG.defaultSize;

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
    errorLevel: elements.errorLevel.value,
    logo: state.logo,
    logoSize: Number(elements.logoSize.value),
    logoPadding: Number(elements.logoPadding.value)
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

function setLogo(file) {
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    showToast("รองรับเฉพาะไฟล์ PNG, JPG และ SVG");
    elements.logoInput.value = "";
    return;
  }
  if (file.size > APP_CONFIG.maxLogoBytes) {
    showToast("ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2 MB");
    elements.logoInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.logo = String(reader.result);
    elements.logoThumbnail.src = state.logo;
    elements.logoName.textContent = file.name;
    elements.logoStatus.hidden = false;
    elements.logoControls.hidden = false;
    elements.errorLevel.value = "H";
    elements.errorLevel.disabled = true;
    validateAndRender();
    showToast("เพิ่มโลโก้แล้ว และปรับความทนเป็นระดับสูงสุด");
  });
  reader.readAsDataURL(file);
}

function clearLogo() {
  state.logo = "";
  elements.logoInput.value = "";
  elements.logoThumbnail.removeAttribute("src");
  elements.logoStatus.hidden = true;
  elements.logoControls.hidden = true;
  elements.errorLevel.disabled = false;
  elements.errorLevel.value = "M";
  validateAndRender();
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
elements.logoSize.addEventListener("input", () => {
  elements.logoSizeOutput.value = `${elements.logoSize.value}%`;
  elements.logoWarning.hidden = Number(elements.logoSize.value) <= 25;
  validateAndRender();
});
elements.logoPadding.addEventListener("input", () => {
  elements.logoPaddingOutput.value = `${elements.logoPadding.value} px`;
  validateAndRender();
});
elements.logoInput.addEventListener("change", () => {
  if (elements.logoInput.files?.[0]) setLogo(elements.logoInput.files[0]);
});
elements.removeLogo.addEventListener("click", clearLogo);

elements.reset.addEventListener("click", () => {
  state.activeType = "url";
  clearLogo();
  elements.qrColor.value = APP_CONFIG.defaultQrColor;
  elements.qrColorText.value = APP_CONFIG.defaultQrColor;
  elements.backgroundMode.value = "white";
  elements.backgroundRow.hidden = true;
  elements.backgroundColor.value = APP_CONFIG.defaultBackgroundColor;
  elements.backgroundColorText.value = APP_CONFIG.defaultBackgroundColor;
  elements.dotStyle.value = "square";
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
    await renderer.download(extension, APP_CONFIG.downloadFileName);
    showToast(`ดาวน์โหลด ${extension.toUpperCase()} แล้ว`);
  } catch {
    showToast("ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
  }
}

elements.downloadPng.addEventListener("click", () => download("png"));
elements.downloadSvg.addEventListener("click", () => download("svg"));
syncColor(elements.qrColor, elements.qrColorText);
syncColor(elements.backgroundColor, elements.backgroundColorText);

renderTabs();
renderFields();
validateAndRender();
