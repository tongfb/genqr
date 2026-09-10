import QRCodeStyling from "qr-code-styling";

export class QrRenderer {
  constructor(container, options) {
    this.container = container;
    this.qr = new QRCodeStyling(this.toLibraryOptions(options));
    this.qr.append(container);
  }

  toLibraryOptions(options) {
    return {
      width: options.size,
      height: options.size,
      type: "svg",
      data: options.data,
      margin: Math.max(12, Math.round(options.size * 0.04)),
      qrOptions: { errorCorrectionLevel: options.errorLevel },
      dotsOptions: { color: options.qrColor, type: options.dotStyle },
      cornersSquareOptions: { color: options.qrColor, type: options.dotStyle === "dots" ? "dot" : "extra-rounded" },
      cornersDotOptions: { color: options.qrColor, type: options.dotStyle === "square" ? "square" : "dot" },
      backgroundOptions: { color: options.backgroundColor }
    };
  }

  update(options) {
    this.qr.update(this.toLibraryOptions(options));
  }

  download(extension, fileName) {
    return this.qr.download({ name: fileName, extension });
  }

  async getFile(extension, fileName) {
    const blob = await this.qr.getRawData(extension);
    if (!(blob instanceof Blob)) throw new Error("สร้างไฟล์ไม่สำเร็จ");
    return new File([blob], `${fileName}.${extension}`, { type: blob.type });
  }
}
