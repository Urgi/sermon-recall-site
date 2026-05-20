import QRCode from 'qrcode';

const QR_OPTIONS = {
  width: 280,
  margin: 2,
  color: { dark: '#0f172a', light: '#ffffff' },
} as const;

export async function qrPngDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, QR_OPTIONS);
}

export async function qrPngBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, { ...QR_OPTIONS, type: 'png' });
}
