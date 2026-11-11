/**
 * The short code each state's fee PDF carries in its prefilled WhatsApp message ("…PDF (ref MH-PDF)"), so the reply
 * finds the right state even when a student edits the words. Import-free. A state not listed gets the first letters
 * of its words (`refFor`).
 */
export const PDF_REFS: Record<string, string> = {
  "Andhra Pradesh": "AP",
  Assam: "AS",
  Bihar: "BR",
  Chandigarh: "CH",
  Chhattisgarh: "CG",
  Delhi: "DL",
  Goa: "GA",
  Gujarat: "GJ",
  Haryana: "HR",
  "Himachal Pradesh": "HP",
  "Jammu and Kashmir": "JK",
  Jharkhand: "JH",
  Karnataka: "KA",
  Kerala: "KL",
  "Madhya Pradesh": "MP",
  Maharashtra: "MH",
  Manipur: "MN",
  Odisha: "OD",
  Pondicherry: "PY",
  Punjab: "PB",
  Rajasthan: "RJ",
  Sikkim: "SK",
  "Tamil Nadu": "TN",
  Telangana: "TG",
  Tripura: "TR",
  "Uttar Pradesh": "UP",
  Uttarakhand: "UK",
  "West Bengal": "WB",
};

export const refFor = (state: string) =>
  PDF_REFS[state] ??
  state
    .split(/\s+/)
    .filter((w) => !/^(and|of)$/i.test(w))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
