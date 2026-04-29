import QRCode from "qrcode";

export async function generateQRCode(
  token: string,
  appUrl: string
): Promise<string> {
  const reviewUrl = `${appUrl}/review/${token}`;

  const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    quality: 0.95,
    margin: 2,
    color: {
      dark: "#0f0f1a",
      light: "#ffffff",
    },
    width: 400,
  });

  return qrDataUrl;
}

export function getReviewUrl(token: string, appUrl: string): string {
  return `${appUrl}/review/${token}`;
}

export async function generateQRCodeSVG(
  token: string,
  appUrl: string
): Promise<string> {
  const reviewUrl = `${appUrl}/review/${token}`;

  const svg = await QRCode.toString(reviewUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: "#0f0f1a",
      light: "#ffffff",
    },
  });

  return svg;
}
