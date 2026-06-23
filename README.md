# NetPulse

**«Tarmog'ingiz pulsi» / "The pulse of your network"**

---

## 🇺🇿 O'zbekcha

### NetPulse nima?

NetPulse — bu tarmoq diagnostikasi va monitoringi uchun mo'ljallangan desktop dastur. U odatda bir nechta alohida dasturlarni talab qiladigan tarmoq vositalarini bitta zamonaviy interfeysda birlashtiradi. Advanced IP Scanner, PingPlotter, IP-kalkulyatorlar va onlayn xizmatlar o'rniga — barchasi bir joyda, qorong'i va yorug' mavzular hamda o'zbek/ingliz tillarini qo'llab-quvvatlagan holda.

### Dastur kimlar uchun?

Tizim administratorlari va dasturchilar uchun — lokal tarmoqlar bilan kundalik ishlash va ulanishlarni diagnostika qilish uchun tez, yagona va qulay vosita.

### Imkoniyatlari (modullar)

**Tarmoq skaneri** — quyi tarmoqdagi barcha qurilmalarni aniqlash: IP, MAC-manzil, qurilma nomi (reverse DNS), ishlab chiqaruvchi (OUI bo'yicha). Natijalarni CSV va JSON formatlarida eksport qilish. Tezkor skanerlash uchun raw-soketlar (`net-ping`), administrator huquqlari bo'lmasa — tizim `ping`'iga avtomatik o'tish.

**Trassirovka va monitoring** — manzilgacha bo'lgan marshrutni uzluksiz kuzatish. Har bir tugun (hop) bo'yicha kechikish (latency), paketlar yo'qolishi (packet loss) va jitter statistikasi, vaqt bo'yicha grafik bilan. PingPlotter'ga o'xshash.

**IP-kalkulyator** — quyi tarmoqlarni hisoblash: tarmoq manzili, broadcast, hostlar diapazoni, maska, wildcard, tarmoq sinfi, ikkilik ko'rinish. Subnetting (quyi tarmoqlarga bo'lish). Hammasi lokal, internetsiz ishlaydi.

**Ping + Port** — ICMP orqali host mavjudligini va TCP-portlar ochiqligini tekshirish. Uzluksiz rejim (`ping -t` kabi) jonli jurnal bilan. Port bo'yicha xizmatni aniqlash (22→SSH, 3389→RDP va h.k.).

**DNS Lookup** — A, AAAA, MX, NS, TXT, PTR yozuvlarini so'rash. Maxsus DNS-serverni tanlash imkoniyati (masalan, 8.8.8.8). Domen bo'yicha WHOIS so'rovi.

**Speedtest** — internet tezligini o'lchash: ping, download, upload, jitter. *(Ishlab chiqilmoqda.)*

**Avtomatik yangilanish** — yangi versiyalarni tekshirish, yuklab olish va o'rnatish. «Yangi versiya mavjud» va «Nima yangi» bildirishnomalari bilan.

### Texnologiyalar

Electron + React (TypeScript) + Vite + Tailwind CSS. Og'ir operatsiyalar interfeys javob berishini saqlash uchun alohida jarayonlarga chiqarilgan. Lokal vositalar internetsiz ishlaydi. Windows uchun portativ yig'ma (portable build).

### O'rnatish va ishga tushirish

```bash
# Bog'liqliklarni o'rnatish
npm install

# Ishlab chiqish rejimida ishga tushirish
npm run dev

# Yig'ish
npm run build

# Windows uchun portable .exe va o'rnatuvchi (NSIS)
npm run pack:win
```

> **Eslatma:** tezkor skanerlash va trassirovka (raw-soketlar) administrator huquqlarini talab qiladi. Ularsiz dastur tizim `ping`/`tracert`'iga avtomatik o'tadi — sekinroq, lekin ishlaydi.

---

## 🇬🇧 English

### What is NetPulse?

NetPulse is a desktop application for network diagnostics and monitoring. It brings together, in one modern interface, the network tools you would normally need several separate programs for. Instead of switching between Advanced IP Scanner, PingPlotter, IP calculators and online services — everything is in one place, with dark and light themes and Uzbek/English language support.

### Who is it for?

System administrators and developers who need a fast, unified and convenient tool for day-to-day work with local networks and connection diagnostics.

### Features (modules)

**Network Scanner** — discovers all devices on a subnet: IP, MAC address, device name (reverse DNS), vendor (by OUI). Export results to CSV and JSON. Uses raw sockets (`net-ping`) for fast scanning, with automatic fallback to the system `ping` when administrator rights are unavailable.

**Route Tracer & Monitoring** — continuous tracing of the route to a target host. Per-hop statistics for latency, packet loss and jitter, with a latency-over-time chart. Similar to PingPlotter.

**IP Calculator** — subnet calculations: network address, broadcast, host range, netmask, wildcard, network class, binary representation. Subnetting. Works entirely locally, no internet required.

**Ping + Port** — checks host reachability via ICMP and TCP port availability. Continuous mode (like `ping -t`) with a live log. Service detection by port (22→SSH, 3389→RDP, etc.).

**DNS Lookup** — queries A, AAAA, MX, NS, TXT, PTR records. Option to specify a custom DNS server (e.g. 8.8.8.8). WHOIS lookup by domain.

**Speedtest** — measures internet speed: ping, download, upload, jitter. *(Under development.)*

**Auto-update** — checks for, downloads and installs new versions, with "A new version is available" and "What's new" notifications.

### Technologies

Electron + React (TypeScript) + Vite + Tailwind CSS. Heavy operations are offloaded to separate processes to keep the interface responsive. Local tools work without internet. Portable build for Windows.

### Installation & running

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Portable .exe and installer (NSIS) for Windows
npm run pack:win
```

> **Note:** fast scanning and tracing (raw sockets) require administrator rights. Without them, the app automatically falls back to the system `ping`/`tracert` — slower, but fully functional.

---

## Litsenziya / License

MIT
# netpulse.uz
