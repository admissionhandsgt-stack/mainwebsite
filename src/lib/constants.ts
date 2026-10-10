export const CONTACT_INFO = {
  address: "915, Bhutani City Center, Sector 32, Noida, UP 201301",
  phone: "+919310301949",
  whatsapp: "919310301949",
  email: "info@admissionhands.com",
};

/**
 * The walk-in office, in the parts structured data and a Google Business
 * Profile need. One copy: /contact, the Organization JSON-LD and the GBP
 * listing must say exactly the same thing (NAP consistency).
 */
export const OFFICE = {
  street: "915, Bhutani City Center, Sector 32",
  locality: "Noida",
  region: "Uttar Pradesh",
  postalCode: "201301",
  country: "IN",
  /** Open every day since 2026-10-10 (was Monday–Saturday, 10–7). */
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "10:00",
  closes: "22:00",
  hoursLabel: "Monday to Sunday, 10:00 AM – 10:00 PM",
  /** For running text: "open every day, 10 AM – 10 PM". */
  hoursShort: "every day, 10 AM – 10 PM",
};
