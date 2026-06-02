# BudgetWise 💰

Mobilna aplikacija za upravljanje osebnih financ, zgrajena z **React Native (Expo)** in **Node.js backendom**. Omogoča sledenje transakcijam, varčevalnim ciljem, mesečnim poročilom in AI finančnemu asistentu — vse na enem mestu.

---

## Kazalo vsebine

- [Funkcionalnosti](#funkcionalnosti)
- [Arhitektura](#arhitektura)
- [Tehnologije](#tehnologije)
- [Namestitev](#namestitev)
  - [Frontend (Expo)](#frontend-expo)
  - [Backend (Node.js)](#backend-nodejs)
- [Okoljske spremenljivke](#okoljske-spremenljivke)
- [Zagon](#zagon)
- [API dokumentacija](#api-dokumentacija)
- [Podatkovna baza](#podatkovna-baza)
- [Struktura projekta](#struktura-projekta)
- [Znane omejitve](#znane-omejitve)

---

## Funkcionalnosti

- **Domov** — finančni pregled (preostanek, prihodki, stroški), tedenski graf porabe, nedavne transakcije in hiter dostop do pogostih dejanj
- **Transakcije** — seznam prihodkov in odhodkov s filtri po kategorijah; skeniranje računov s kamero ali galerije
- **Varčevalni cilji** — ustvarjanje in sledenje ciljem z napredovalno vrstico in možnostjo vplačila
- **AI asistent** — klepet z Groq LLM (Llama 3.3 70B), ki odgovarja na vprašanja o osebnih financah v slovenščini
- **Poročilo** — mesečni in letni povzetek prihodkov, stroškov, prihrankov in porabe po kategorijah z grafi
- **Profil** — urejanje imena in priimka, menjava profilne slike (Cloudinary), sprememba gesla, preklapljanje med temnim/svetlim načinom, nastavitve obvestil
- **Skeniranje računov** — zajem slike računa → Groq Vision (Llama 4 Scout) → samodejno zapolnjen obrazec
- **Avtentikacija** — JWT access token + refresh token, bcrypt hashiranje gesel, Google in Facebook prijava
- **Rate limiting** — zaščita API-ja pred zlorabo
- **Docker podpora** — enostavno nameščanje z docker-compose

---

## Arhitektura

```
BudgetWise/
├── budgetwise-frontend/            # React Native / Expo aplikacija
│   ├── app/                        # Expo Router zasloni
│   │   └── (tabs)/                 # Tab navigacija
│   │       ├── index.tsx           # Domov (finančni pregled + profil modal)
│   │       ├── transactions.tsx    # Transakcije + skeniranje računov
│   │       ├── goals.tsx           # Varčevalni cilji
│   │       ├── assistant.tsx       # AI finančni asistent
│   │       ├── report.tsx          # Mesečno / letno poročilo
│   │       └── profile.tsx         # Profil (nastavitve)
│   ├── components/
│   │   └── statistics/             # Komponente za grafe in statistike
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Upravljanje avtentikacije
│   │   └── ThemeContext.tsx        # Temni / svetli način
│   ├── lib/
│   │   ├── api.ts                  # Axios instanca + token interceptorji
│   │   └── reportsApi.ts           # API klici za poročila
│   └── types/
│       └── report.ts               # TypeScript tipi za poročila
└── budgetwise-backend/             # Node.js / Express API
    ├── src/
    │   ├── controllers/            # Logika za vsak endpoint
    │   ├── routes/                 # Express routerji
    │   ├── middleware/             # Auth, rate limit, error handling
    │   ├── lib/                    # Prisma, JWT, logger, response helpers
    │   ├── services/
    │   │   └── report.service.ts   # Poslovna logika za poročila
    │   └── validators/             # Zod validacijske sheme
    ├── prisma/
    │   └── schema.prisma           # Podatkovni model (PostgreSQL)
    ├── Dockerfile
    └── docker-compose.yml
```

**Komunikacija:** Expo mobilna aplikacija ↔ REST API (`/api/v1`) ↔ PostgreSQL + Groq AI

---

## Tehnologije

### Frontend

| Tehnologija             | Verzija | Namen                              |
| ----------------------- | ------- | ---------------------------------- |
| React Native            | 0.81.5  | Mobilni UI framework               |
| Expo                    | ~54.0   | Razvojno orodje, build sistem      |
| Expo Router             | ~6.0    | File-based navigacija              |
| TypeScript              | ~5.9    | Tipiziran JavaScript               |
| expo-image-picker       | ~17.0   | Kamera / galerija za skeniranje    |
| expo-linear-gradient    | ~15.0   | Gradient elementi v UI             |
| expo-secure-store       | ~15.0   | Varno shranjevanje tokenov         |
| react-native-reanimated | ~4.1    | Animacije                          |

### Backend

| Tehnologija             | Verzija | Namen                                |
| ----------------------- | ------- | ------------------------------------ |
| Node.js + Express       | ^4.18   | REST API strežnik                    |
| TypeScript              | ^5.3    | Tipiziran JavaScript                 |
| Prisma ORM              | ^5.10   | Dostop do podatkovne baze            |
| PostgreSQL              | —       | Relacijska baza podatkov             |
| JWT (jsonwebtoken)      | ^9.0    | Avtentikacija                        |
| bcryptjs                | ^2.4    | Hashiranje gesel                     |
| Zod                     | ^3.22   | Validacija vhodnih podatkov          |
| Groq API                | —       | LLM (Llama 3.3 70B + Llama 4 Scout)  |
| Cloudinary              | —       | Shranjevanje profilnih slik          |
| Helmet + CORS           | —       | Varnost                              |
| Pino                    | ^8.19   | Strukturirani logi                   |
| Docker + docker-compose | —       | Kontejnerizacija                     |

---

## Namestitev

### Predpogoji

- Node.js >= 18
- npm >= 9
- PostgreSQL (lokalno ali Docker)
- Groq API ključ → [console.groq.com](https://console.groq.com)
- Cloudinary račun → [cloudinary.com](https://cloudinary.com)
- Expo Go aplikacija na telefonu (za testiranje)

---

### Frontend (Expo)

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/sristova/BudgetWise.git
cd BudgetWise/budgetwise-frontend

# 2. Namesti odvisnosti
npm install

# 3. Ustvari .env datoteko
# Ustvari datoteko .env v mapi budgetwise-frontend/ z vsebino:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
# (zamenjaj 192.168.x.x z lokalnim IP naslovom svojega računalnika — preveri z ipconfig)

# 4. Zaženi razvojni strežnik
npm start
```

Odpri Expo Go na telefonu in skeniraj QR kodo.

> **Opomba za Windows:** Če pride do napake z dolgimi potmi (errno -4094), omogoči dolge poti v registru:
> ```powershell
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```
> Nato premakni projekt v krajšo pot (npr. `C:\Dev\BudgetWise\`) in ponovi namestitev.

---

### Backend (Node.js)

#### Z Dockerjem (priporočeno)

```bash
cd budgetwise-backend

# Kopiraj in nastavi okoljske spremenljivke
cp .env.example .env
# Uredi .env (glej razdelek Okoljske spremenljivke)

# Zaženi bazo in API
docker-compose up -d
```

#### Brez Dockerja (lokalno)

```bash
cd budgetwise-backend

# Namesti odvisnosti
npm install

# Generiraj Prisma klienta
npm run db:generate

# Ustvari tabele v bazi
npx prisma db push

# (Neobvezno) Napolni bazo z demo podatki
npm run db:seed

# Zaženi razvojni strežnik
npm run dev
```

---

## Okoljske spremenljivke

### Backend — ustvari datoteko `.env` v mapi `budgetwise-backend/`:

```env
# Podatkovna baza
DATABASE_URL="postgresql://user:password@localhost:5432/budgetwise_db"

# JWT
JWT_ACCESS_SECRET="tvoj-access-tajen-kljuc"
JWT_REFRESH_SECRET="tvoj-refresh-tajen-kljuc"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Groq AI
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"

# Cloudinary (za profilne slike)
CLOUDINARY_CLOUD_NAME="tvoj-cloud-name"
CLOUDINARY_API_KEY="tvoj-api-key"
CLOUDINARY_API_SECRET="tvoj-api-secret"

# Strežnik
PORT=3000
NODE_ENV=development

# CORS (naštej dovoljene izvore, ločene z vejico)
ALLOWED_ORIGINS="http://localhost:8081,exp://192.168.x.x:8081,http://192.168.x.x:8081"

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_MAX=20
```

### Frontend — ustvari datoteko `.env` v mapi `budgetwise-frontend/`:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

> **Opomba:** Zamenjaj `192.168.x.x` z lokalnim IP naslovom svojega računalnika (`ipconfig` na Windows, `ifconfig` na macOS/Linux).

---

## Zagon

### Razvojno okolje

```bash
# Terminal 1 — backend
cd budgetwise-backend
npm run dev

# Terminal 2 — frontend
cd budgetwise-frontend
npm start
```

### Produkcija

```bash
# Backend build
cd budgetwise-backend
npm run build
npm start

# Ali z Dockerjem
docker-compose -f docker-compose.yml up -d
```

---

## API dokumentacija

Osnovna pot: `http://localhost:3000/api/v1`

### Avtentikacija

| Metoda | Pot               | Opis                                     |
| ------ | ----------------- | ---------------------------------------- |
| POST   | `/auth/register`  | Registracija novega uporabnika           |
| POST   | `/auth/login`     | Prijava, vrne access + refresh token     |
| POST   | `/auth/refresh`   | Obnovi access token                      |
| POST   | `/auth/logout`    | Odjava (razveljavi refresh token)        |
| POST   | `/auth/google`    | Prijava z Google računom                 |
| POST   | `/auth/facebook`  | Prijava s Facebook računom               |

### Uporabnik

| Metoda | Pot                    | Opis                            |
| ------ | ---------------------- | ------------------------------- |
| GET    | `/users/profile`       | Pridobi profil uporabnika       |
| PATCH  | `/users/profile`       | Posodobi ime in priimek         |
| POST   | `/users/upload-avatar` | Naloži profilno sliko           |
| POST   | `/users/change-password` | Spremeni geslo                |
| DELETE | `/users/account`       | Izbriši račun                   |

### Transakcije

| Metoda | Pot                 | Opis                                        |
| ------ | ------------------- | ------------------------------------------- |
| GET    | `/transactions`     | Seznam transakcij (filtriranje, paginacija) |
| GET    | `/transactions/dashboard` | Dashboard podatki                     |
| POST   | `/transactions`     | Dodaj transakcijo                           |
| PATCH  | `/transactions/:id` | Uredi transakcijo                           |
| DELETE | `/transactions/:id` | Izbriši transakcijo                         |

### Cilji

| Metoda | Pot                       | Opis                      |
| ------ | ------------------------- | ------------------------- |
| GET    | `/goals`                  | Seznam varčevalnih ciljev |
| POST   | `/goals`                  | Dodaj cilj                |
| PATCH  | `/goals/:id`              | Posodobi cilj             |
| POST   | `/goals/:id/contribute`   | Vplačaj v cilj            |
| DELETE | `/goals/:id`              | Izbriši cilj              |

### AI klepet

| Metoda | Pot                      | Opis                            |
| ------ | ------------------------ | ------------------------------- |
| GET    | `/ai-chat/history`       | Zgodovina klepeta               |
| POST   | `/ai-chat/message`       | Pošlji sporočilo asistentu      |
| POST   | `/ai-chat/parse-receipt` | Analiziraj račun (base64 slika) |
| DELETE | `/ai-chat`               | Izbriši zgodovino klepeta       |

### Poročila

| Metoda | Pot                    | Opis                          |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/reports/monthly`     | Mesečno poročilo              |
| GET    | `/reports/yearly`      | Letno poročilo                |
| GET    | `/reports/categories`  | Poraba po kategorijah         |
| GET    | `/reports/trends`      | Trendi za zadnjih N mesecev   |
| GET    | `/reports/statistics`  | Statistike za mesec           |

### Health check

```
GET /health  →  { status: "ok", timestamp: "...", version: "1.0.0" }
```

Vsi zaščiteni endpointi zahtevajo:

```
Authorization: Bearer <access_token>
```

---

## Podatkovna baza

Aplikacija uporablja **PostgreSQL** s Prisma ORM.

### Modeli

- **User** — uporabniški račun (email, geslo, valuta, časovni pas, profilna slika)
- **RefreshToken** — JWT refresh tokeni z revokacijo
- **Category** — kategorije transakcij (Hrana, Prevoz, Zabava...)
- **Transaction** — prihodki in odhodki z metapodatki
- **Budget** — proračuni po kategorijah (dnevni / tedenski / mesečni)
- **Goal** — varčevalni cilji s ciljnim zneskom in rokom
- **Notification** — obvestila (budget alert, goal reminder...)
- **AiChat** — zgodovina AI klepeta
- **Report** — predpomnjene analitike

### Upravljanje baze

```bash
# Ustvari / posodobi tabele v bazi
npx prisma db push

# Odpri Prisma Studio (vizualni pregled baze)
npm run db:studio

# Napolni z demo podatki
npm run db:seed

# Produkcijska migracija (brez interaktivnih vprašanj)
npm run db:migrate:prod
```

---

## Struktura projekta

```
BudgetWise/
├── budgetwise-frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx         # Tab navigacija (ikone, barve)
│   │   │   ├── index.tsx           # Domov — finančni pregled + profil modal
│   │   │   ├── transactions.tsx    # Transakcije + skeniranje
│   │   │   ├── goals.tsx           # Varčevalni cilji
│   │   │   ├── assistant.tsx       # AI klepet (Groq)
│   │   │   ├── report.tsx          # Mesečno / letno poročilo
│   │   │   └── profile.tsx         # Profil in nastavitve
│   │   ├── _layout.tsx             # Root layout + auth gating
│   │   ├── welcome.tsx             # Uvodni zaslon
│   │   ├── login.tsx               # Prijava
│   │   ├── register.tsx            # Registracija
│   │   └── +not-found.tsx          # 404 stran
│   ├── assets/                     # Ikone, pisave
│   ├── components/
│   │   ├── SocialAuthButtons.tsx   # Google / Facebook prijava
│   │   └── statistics/             # Komponente za grafe
│   │       ├── CategoryBar.tsx
│   │       ├── CategoryPieChart.tsx
│   │       ├── StatCard.tsx
│   │       ├── StatisticsSkeleton.tsx
│   │       ├── TrendChart.tsx
│   │       └── index.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Upravljanje seje in uporabnika
│   │   └── ThemeContext.tsx        # Temni / svetli način
│   ├── lib/
│   │   ├── api.ts                  # Axios + interceptorji za token refresh
│   │   └── reportsApi.ts           # API klici za poročila
│   ├── types/
│   │   └── report.ts               # TypeScript tipi za poročila
│   ├── .env                        # EXPO_PUBLIC_API_URL
│   ├── app.json                    # Expo konfiguracija
│   ├── package.json
│   └── tsconfig.json
└── budgetwise-backend/
    ├── src/
    │   ├── controllers/            # aiChat, auth, budget, category,
    │   │                           #   goal, notification, report,
    │   │                           #   transaction, user
    │   ├── routes/                 # Express routerji za vsak modul
    │   ├── middleware/
    │   │   ├── authenticate.ts     # JWT preverjanje
    │   │   ├── errorHandler.ts     # Centralno lovljenje napak
    │   │   ├── notFound.ts         # 404 handler
    │   │   └── rateLimit.ts        # Globalni rate limiter
    │   ├── lib/
    │   │   ├── prisma.ts           # Singleton Prisma klient
    │   │   ├── jwt.ts              # Podpisovanje / preverjanje tokenov
    │   │   ├── logger.ts           # Pino logger
    │   │   ├── errors.ts           # Prilagojeni razredi napak
    │   │   ├── response.ts         # Standardizirani API odgovori
    │   │   ├── socialAuth.ts       # Google / Facebook OAuth
    │   │   └── tokenService.ts     # Upravljanje refresh tokenov
    │   ├── config/
    │   │   └── cloudinary.ts       # Cloudinary konfiguracija
    │   ├── services/
    │   │   └── report.service.ts   # Poslovna logika za poročila
    │   ├── validators/             # Zod sheme za vhodne podatke
    │   ├── types/
    │   │   └── report.types.ts     # TypeScript tipi za poročila
    │   ├── app.ts                  # Express konfiguracija
    │   └── server.ts               # Vstopna točka
    ├── prisma/schema.prisma        # Podatkovni model
    ├── .env                        # Okoljske spremenljivke
    ├── Dockerfile
    ├── docker-compose.yml          # PostgreSQL + API
    └── tsconfig.json
```

---

## Znane omejitve

- **Ni avtomatskih testov** — frontend nima testne pokritosti; backend ima osnovno `jest` konfiguracijo.
- **Socialna prijava** — Google in Facebook prijava zahteva dodatno konfiguracijo OAuth aplikacij v razvojnih konzolah.

---

## Avtorji

Projekt BudgetWise je bil razvit v okviru predmeta **Praktikum II** na Univerzi v Mariboru.

Avtorji:
- Blagica Videva
- Stojka Ristova
- Gjorgji Kamchev
