/**
 * Medical cities, the ways each is written, and its state (2026-11-11 — city pages and "md radiology fees in pune"
 * searches). Import-free.
 *
 * A college is in a city when one of the city's words is in its name or its city field **and** it is in the city's
 * state — "Madras Medical College" is in Chennai, a "Delhi Road" college in Meerut is not in Delhi. `not` keeps a
 * separate city out ("navi mumbai" is not Mumbai). Our PG list fills `institutes.city` for about half the colleges, so
 * the name is read as well. Add a city here when a search or a new college needs it; the pages follow the data.
 */
export interface City {
  slug: string;
  name: string;
  state: string;
  /** Lower-case words as written in names and searches, longest first is not needed (matched as whole words). */
  words: string[];
  not?: string[];
}

export const CITIES: City[] = [
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", words: ["bangalore", "bengaluru", "banglore"] },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal", words: ["kolkata", "calcutta"] },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", words: ["chennai", "madras"] },
  { slug: "delhi", name: "Delhi", state: "Delhi", words: ["delhi", "new delhi"] },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", words: ["mumbai", "bombay"], not: ["navi mumbai"] },
  { slug: "navi-mumbai", name: "Navi Mumbai", state: "Maharashtra", words: ["navi mumbai"] },
  { slug: "thane", name: "Thane", state: "Maharashtra", words: ["thane", "kalwa"] },
  { slug: "pune", name: "Pune", state: "Maharashtra", words: ["pune", "pimpri", "pimpri chinchwad"] },
  { slug: "nagpur", name: "Nagpur", state: "Maharashtra", words: ["nagpur"] },
  { slug: "aurangabad", name: "Aurangabad", state: "Maharashtra", words: ["aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"] },
  { slug: "nashik", name: "Nashik", state: "Maharashtra", words: ["nashik", "nasik"] },
  { slug: "kolhapur", name: "Kolhapur", state: "Maharashtra", words: ["kolhapur"] },
  { slug: "solapur", name: "Solapur", state: "Maharashtra", words: ["solapur", "sholapur"] },
  { slug: "sangli-miraj", name: "Sangli–Miraj", state: "Maharashtra", words: ["miraj", "sangli"] },
  { slug: "wardha", name: "Wardha", state: "Maharashtra", words: ["wardha", "sawangi", "sevagram"] },
  { slug: "karad", name: "Karad", state: "Maharashtra", words: ["karad"] },
  { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh", words: ["lucknow"] },
  { slug: "kanpur", name: "Kanpur", state: "Uttar Pradesh", words: ["kanpur"] },
  { slug: "varanasi", name: "Varanasi", state: "Uttar Pradesh", words: ["varanasi", "banaras", "benares"] },
  { slug: "prayagraj", name: "Prayagraj", state: "Uttar Pradesh", words: ["prayagraj", "allahabad"] },
  { slug: "agra", name: "Agra", state: "Uttar Pradesh", words: ["agra"] },
  { slug: "meerut", name: "Meerut", state: "Uttar Pradesh", words: ["meerut"] },
  { slug: "bareilly", name: "Bareilly", state: "Uttar Pradesh", words: ["bareilly"] },
  { slug: "noida", name: "Noida", state: "Uttar Pradesh", words: ["noida", "greater noida"] },
  { slug: "ghaziabad", name: "Ghaziabad", state: "Uttar Pradesh", words: ["ghaziabad"] },
  { slug: "hapur", name: "Hapur", state: "Uttar Pradesh", words: ["hapur", "pilkhuwa"] },
  { slug: "mathura", name: "Mathura", state: "Uttar Pradesh", words: ["mathura"] },
  { slug: "gorakhpur", name: "Gorakhpur", state: "Uttar Pradesh", words: ["gorakhpur"] },
  { slug: "jhansi", name: "Jhansi", state: "Uttar Pradesh", words: ["jhansi"] },
  { slug: "aligarh", name: "Aligarh", state: "Uttar Pradesh", words: ["aligarh"] },
  { slug: "moradabad", name: "Moradabad", state: "Uttar Pradesh", words: ["moradabad"] },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", words: ["hyderabad", "secunderabad"] },
  { slug: "warangal", name: "Warangal", state: "Telangana", words: ["warangal"] },
  { slug: "siddipet", name: "Siddipet", state: "Telangana", words: ["siddipet"] },
  { slug: "karimnagar", name: "Karimnagar", state: "Telangana", words: ["karimnagar"] },
  { slug: "bhopal", name: "Bhopal", state: "Madhya Pradesh", words: ["bhopal"] },
  { slug: "indore", name: "Indore", state: "Madhya Pradesh", words: ["indore"] },
  { slug: "gwalior", name: "Gwalior", state: "Madhya Pradesh", words: ["gwalior"] },
  { slug: "jabalpur", name: "Jabalpur", state: "Madhya Pradesh", words: ["jabalpur"] },
  { slug: "puducherry", name: "Puducherry", state: "Pondicherry", words: ["pondicherry", "puducherry", "pondy"] },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat", words: ["ahmedabad", "gandhinagar"] },
  { slug: "surat", name: "Surat", state: "Gujarat", words: ["surat"] },
  { slug: "vadodara", name: "Vadodara", state: "Gujarat", words: ["vadodara", "baroda"] },
  { slug: "rajkot", name: "Rajkot", state: "Gujarat", words: ["rajkot"] },
  { slug: "jamnagar", name: "Jamnagar", state: "Gujarat", words: ["jamnagar"] },
  { slug: "mangaluru", name: "Mangaluru", state: "Karnataka", words: ["mangalore", "mangaluru", "deralakatte"] },
  { slug: "mysuru", name: "Mysuru", state: "Karnataka", words: ["mysore", "mysuru"] },
  { slug: "manipal", name: "Manipal", state: "Karnataka", words: ["manipal"] },
  { slug: "belagavi", name: "Belagavi", state: "Karnataka", words: ["belgaum", "belagavi"] },
  { slug: "hubballi", name: "Hubballi–Dharwad", state: "Karnataka", words: ["hubli", "hubballi", "dharwad"] },
  { slug: "davanagere", name: "Davanagere", state: "Karnataka", words: ["davangere", "davanagere"] },
  { slug: "kalaburagi", name: "Kalaburagi", state: "Karnataka", words: ["gulbarga", "kalaburagi"] },
  { slug: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", words: ["visakhapatnam", "vishakhapatnam", "vizag"] },
  { slug: "guntur", name: "Guntur", state: "Andhra Pradesh", words: ["guntur"] },
  { slug: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh", words: ["vijayawada"] },
  { slug: "tirupati", name: "Tirupati", state: "Andhra Pradesh", words: ["tirupati"] },
  { slug: "kurnool", name: "Kurnool", state: "Andhra Pradesh", words: ["kurnool"] },
  { slug: "kakinada", name: "Kakinada", state: "Andhra Pradesh", words: ["kakinada"] },
  { slug: "nellore", name: "Nellore", state: "Andhra Pradesh", words: ["nellore"] },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan", words: ["jaipur"] },
  { slug: "udaipur", name: "Udaipur", state: "Rajasthan", words: ["udaipur"] },
  { slug: "jodhpur", name: "Jodhpur", state: "Rajasthan", words: ["jodhpur"] },
  { slug: "bikaner", name: "Bikaner", state: "Rajasthan", words: ["bikaner"] },
  { slug: "ajmer", name: "Ajmer", state: "Rajasthan", words: ["ajmer"] },
  { slug: "kota", name: "Kota", state: "Rajasthan", words: ["kota"] },
  { slug: "dehradun", name: "Dehradun", state: "Uttarakhand", words: ["dehradun", "doiwala", "jolly grant"] },
  { slug: "rishikesh", name: "Rishikesh", state: "Uttarakhand", words: ["rishikesh"] },
  { slug: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", words: ["bhubaneswar", "bhubaneshwar"] },
  { slug: "cuttack", name: "Cuttack", state: "Odisha", words: ["cuttack"] },
  { slug: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", words: ["coimbatore"] },
  { slug: "madurai", name: "Madurai", state: "Tamil Nadu", words: ["madurai"] },
  { slug: "salem", name: "Salem", state: "Tamil Nadu", words: ["salem"] },
  { slug: "kanchipuram", name: "Kanchipuram", state: "Tamil Nadu", words: ["kancheepuram", "kanchipuram", "kattankulathur"] },
  { slug: "tiruchirappalli", name: "Tiruchirappalli", state: "Tamil Nadu", words: ["trichy", "tiruchirappalli", "tiruchirapalli"] },
  { slug: "vellore", name: "Vellore", state: "Tamil Nadu", words: ["vellore"] },
  { slug: "tirunelveli", name: "Tirunelveli", state: "Tamil Nadu", words: ["tirunelveli"] },
  { slug: "thanjavur", name: "Thanjavur", state: "Tamil Nadu", words: ["thanjavur", "tanjore"] },
  { slug: "kozhikode", name: "Kozhikode", state: "Kerala", words: ["calicut", "kozhikode"] },
  { slug: "thrissur", name: "Thrissur", state: "Kerala", words: ["thrissur", "trichur"] },
  { slug: "kollam", name: "Kollam", state: "Kerala", words: ["kollam", "quilon"] },
  { slug: "thiruvananthapuram", name: "Thiruvananthapuram", state: "Kerala", words: ["thiruvananthapuram", "trivandrum"] },
  { slug: "kochi", name: "Kochi", state: "Kerala", words: ["kochi", "cochin", "ernakulam"] },
  { slug: "kottayam", name: "Kottayam", state: "Kerala", words: ["kottayam"] },
  { slug: "faridabad", name: "Faridabad", state: "Haryana", words: ["faridabad"] },
  { slug: "gurugram", name: "Gurugram", state: "Haryana", words: ["gurgaon", "gurugram"] },
  { slug: "rohtak", name: "Rohtak", state: "Haryana", words: ["rohtak"] },
  { slug: "raipur", name: "Raipur", state: "Chhattisgarh", words: ["raipur"] },
  { slug: "imphal", name: "Imphal", state: "Manipur", words: ["imphal"] },
  { slug: "patna", name: "Patna", state: "Bihar", words: ["patna"] },
  { slug: "ranchi", name: "Ranchi", state: "Jharkhand", words: ["ranchi"] },
  { slug: "guwahati", name: "Guwahati", state: "Assam", words: ["guwahati", "gauhati"] },
  { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh", words: ["chandigarh"] },
  { slug: "ludhiana", name: "Ludhiana", state: "Punjab", words: ["ludhiana"] },
  { slug: "amritsar", name: "Amritsar", state: "Punjab", words: ["amritsar"] },
  { slug: "patiala", name: "Patiala", state: "Punjab", words: ["patiala"] },
  { slug: "srinagar", name: "Srinagar", state: "Jammu and Kashmir", words: ["srinagar"] },
  { slug: "jammu", name: "Jammu", state: "Jammu and Kashmir", words: ["jammu"] },
];

const fold = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const hasWord = (text: string, w: string) => text.includes(` ${w} `);

/** The city a college is in, from its name and city field, when its state agrees. */
export function cityOf(name: string, city: string | null | undefined, state: string | null | undefined): City | null {
  const text = fold(`${name} ${city ?? ""}`);
  let best: City | null = null;
  let bestLen = 0;
  for (const c of CITIES) {
    if (state && c.state !== state) continue;
    if (c.not?.some((w) => hasWord(text, w))) continue;
    for (const w of c.words) if (hasWord(text, w) && w.length > bestLen) (best = c), (bestLen = w.length);
  }
  return best;
}

/** The city a search names — the longest spelling wins ("navi mumbai" over "mumbai", "greater noida" is Noida). */
export function cityIn(q: string): City | null {
  const text = fold(q);
  let best: City | null = null;
  let bestLen = 0;
  for (const c of CITIES) for (const w of c.words) if (hasWord(text, w) && w.length > bestLen) (best = c), (bestLen = w.length);
  return best;
}

/** Every word that names a city, so a search's leftover words can be told apart from a college's name. */
export const CITY_WORDS = new Set(CITIES.flatMap((c) => c.words.flatMap((w) => w.split(" "))));

export const citySlug = (slug: string) => CITIES.find((c) => c.slug === slug) ?? null;
