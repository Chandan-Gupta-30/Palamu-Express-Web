export const roles = {
  SUPER_ADMIN: "super_admin",
  CHIEF_EDITOR: "chief_editor",
  REPORTER: "reporter",
  ADVERTISER: "advertiser",
};

export const articleStatuses = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PUBLISHED: "published",
};

export const approvalStatuses = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const adStatuses = {
  PENDING_PAYMENT: "pending_payment",
  PENDING_APPROVAL: "pending_approval",
  ACTIVE: "active",
  EXPIRED: "expired",
  REJECTED: "rejected",
};

export const adPlacements = {
  HOMEPAGE_HERO: "homepage-hero",
  HOMEPAGE_LATEST: "homepage-latest",
  HOMEPAGE_DISTRICT: "homepage-district",
};

export const adDurationPlans = [
  { days: 3, amount: 499, label: "3 Days Launch" },
  { days: 7, amount: 999, label: "7 Days Spotlight" },
  { days: 15, amount: 1799, label: "15 Days Prime Reach" },
  { days: 30, amount: 2999, label: "30 Days Home Page Presence" },
];

export const jharkhandDistricts = [
  "Bokaro",
  "Chatra",
  "Deoghar",
  "Dhanbad",
  "Dumka",
  "East Singhbhum",
  "Garhwa",
  "Giridih",
  "Godda",
  "Gumla",
  "Hazaribagh",
  "Jamtara",
  "Khunti",
  "Koderma",
  "Latehar",
  "Lohardaga",
  "Pakur",
  "Palamu",
  "Ramgarh",
  "Ranchi",
  "Sahibganj",
  "Seraikela Kharsawan",
  "Simdega",
  "West Singhbhum"
];

export const jharkhandBlocksByDistrict = {
  Bokaro: ["Chas", "Chandankiyari", "Bermo", "Chandrapura", "Gomia", "Jaridih", "Kasmar", "Nawadih", "Petarwar"],
  Chatra: ["Itkhori", "Chatra", "Hunterganj", "Pratappur", "Simaria", "Tandwa", "Kunda", "Lawalaung", "Gidhaur", "Mayurhand", "Pathalgora", "Kanha Chatti"],
  Deoghar: ["Deoghar", "Mohanpur", "Sarwan", "Madhupur", "Karon", "Sarath", "Palojori", "Devipur", "Margomunda", "Sona Rai Tharhi"],
  Dhanbad: ["Dhanbad", "Jharia", "Tundi", "Purbi Tundi", "Gobindpur", "Baghmara", "Chirkunda", "Baliapur", "Topchanchi"],
  Dumka: ["Saraiyahat", "Jarmundi", "Jama", "Ramgarh", "Gopikandar", "Kathikund", "Dumka", "Shikaripara", "Ranishwar", "Masalia"],
  "East Singhbhum": ["Golmuri", "Patamda", "Potka", "Dumaria", "Musabani", "Ghatshila", "Dhalbhumgarh", "Chakulia", "Baharagora", "Boram", "Gurabandha"],
  Garhwa: ["Bhawnathpur", "Majhiaon", "Nagar Untari", "Dhurki", "Meral", "Garhwa", "Ranka", "Bhandaria", "Kharaundhi", "Kandi", "Ramna", "Dandai", "Chinia", "Ramkanda", "Danda", "Ketar", "Bishunpura", "Sagma", "Bardiha"],
  Giridih: ["Gawan", "Tisri", "Deori", "Dhanwar", "Jamua", "Bengabad", "Gandey", "Giridih", "Birni", "Bagodar", "Dumri", "Pirtand", "Suriya"],
  Godda: ["Meherma", "Mahagama", "Boarijor", "Pathargama", "Godda", "Sundar Pahari", "Poreyahat", "Thakurgangti", "Basantrai"],
  Gumla: ["Chainpur", "Dumri", "Raidih", "Gumla", "Sisai", "Bharno", "Kamdara", "Basia", "Ghaghra", "Bishunpur", "Palkot", "Albert Ekka"],
  Hazaribagh: ["Keredari", "Barkagaon", "Katkamsandi", "Churchu", "Hazaribagh Sadar", "Barhi", "Ichak", "Bishnugarh", "Barkatha", "Chauparan", "Padma", "Tatijhariya", "Chalkusa", "Daru", "Katkamdag", "Dadi"],
  Jamtara: ["Kundhit", "Nala", "Jamtara", "Narayanpur", "Karmatanr", "Fatehpur"],
  Khunti: ["Karra", "Torpa", "Murhu", "Khunti", "Rania", "Arki"],
  Koderma: ["Satgawan", "Koderma", "Markacho", "Jainagar", "Domchanch", "Chandwara"],
  Latehar: ["Barwadih", "Manika", "Balumath", "Chandwa", "Latehar", "Garu", "Mahuadanr", "Bariyatu", "Herhanj", "Saryu"],
  Lohardaga: ["Lohardaga", "Kuru", "Bhandra", "Senha", "Kisko", "Kairo", "Peshrar"],
  Pakur: ["Pakur", "Maheshpur", "Pakuria", "Amrapara", "Littipara", "Hiranpur"],
  Palamu: ["Chainpur", "Bishrampur", "Hussainabad", "Hariharganj", "Chhatarpur", "Patan", "Manatu", "Panki", "Lesliganj", "Medininagar", "Satbarwa", "Pandu", "Nawabazar", "Untari Road", "Nawadih", "Padwa", "Mohammad Ganj", "Haidernagar", "Pipra", "Tarhasi"],
  Ramgarh: ["Ramgarh", "Patratu", "Mandu", "Gola", "Chitarpur", "Dulmi"],
  Ranchi: ["Kanke", "Namkum", "Bero", "Mandar", "Lapung", "Chanho", "Ratu", "Silli", "Ormanjhi", "Angara", "Burmu", "Bundu", "Tamar", "Sonahatu", "Nagri", "Itki", "Khelari", "Rahe"],
  Sahibganj: ["Sahibganj", "Borio", "Taljhari", "Rajmahal", "Barharwa", "Pathna", "Barhait", "Mandro", "Udhwa"],
  "Seraikela Kharsawan": ["Ichagarh", "Kukru", "Nimdih", "Chandil", "Govindpur", "Adityapur", "Kuchai", "Kharsawan", "Seraikela"],
  Simdega: ["Simdega", "Kolebira", "Jaldega", "Bano", "Thethaitangar", "Bolba", "Kurdeg", "Kersai", "Pakartanr", "Bansjore"],
  "West Singhbhum": ["Tonto", "Hat Gamharia", "Kumardungi", "Jagannathpur", "Manjhari", "Chakradharpur", "Khuntpani", "Tantnagar", "Jhinkpani", "Bandgaon", "Goilkera", "Anandpur", "Manoharpur", "Noamundi", "Gudri", "Sonua", "Majhgaon", "Chaibasa"]
};
