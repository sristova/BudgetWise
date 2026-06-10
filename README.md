# BudgetWise 💰

[![Download APK](https://img.shields.io/badge/Download-APK-brightgreen?logo=android)](https://github.com/sristova/BudgetWise/releases/latest/download/BudgetWise.apk)
[![Prijavi problem](https://img.shields.io/badge/Prijavi_problem-EA4335?style=flat&logo=gmail&logoColor=white)](mailto:budgetwiseofficial@gmail.com)

Mobilna aplikacija za upravljanje osebnih financ, zgrajena z **React Native (Expo)** in **Node.js backendom**. Omogoča sledenje transakcijam, varčevalnim ciljem, mesečnim poročilom in AI finančnemu asistentu — vse na enem mestu.

## 📲 Prenos aplikacije

Najnovejšo različico Android aplikacije lahko preneseš neposredno:

**➡️ [Prenesi BudgetWise.apk](https://github.com/sristova/BudgetWise/releases/latest/download/BudgetWise.apk)**

> Po prenosu boš morda moral v nastavitvah telefona dovoliti namestitev iz neznanih virov.

---

## Kazalo vsebine

- [Funkcionalnosti](#funkcionalnosti)
- [Arhitektura](#arhitektura)
- [Tehnologije](#tehnologije)
- [Namestitev](#namestitev)
  - [Frontend (Expo)](#frontend-expo)
  - [Backend (Node.js)](#backend-nodejs)
- [Zagon](#zagon)
- [Struktura projekta](#struktura-projekta)
- [Dokumentacija backenda](#dokumentacija-backenda)
- [Znane omejitve](#znane-omejitve)
- [Avtorji](#avtorji)

---

## Funkcionalnosti

- **Domov** — finančni pregled (preostanek, prihodki, stroški), tedenski graf porabe, nedavne transakcije in hiter dostop do pogostih dejanj
- **Transakcije** — seznam prihodkov in odhodkov s filtri po kategorijah; skeniranje računov s kamero ali galerije
- **Varčevalni cilji** — ustvarjanje in sledenje ciljem z napredovalno vrstico in možnostjo vplačila; ob dosegu cilja uporabnik prejme obvestilo po e-pošti
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
Expo mobilna aplikacija  ↔  REST API (/api/v1)  ↔  PostgreSQL + Groq AI
```

Aplikacija je razdeljena na dva dela:

- **`budgetwise-frontend/`** — React Native (Expo) mobilna aplikacija
- **`budgetwise-backend/`** — Node.js + Express REST API s PostgreSQL bazo

Podrobnosti o API-ju, podatkovni bazi in strukturi backenda so v [dokumentaciji backenda](./budgetwise-backend/README.md).

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
| SendGrid                | —       | Pošiljanje e-poštnih obvestil        |
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
- SendGrid API ključ → [sendgrid.com](https://sendgrid.com)
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

# 3. Ustvari .env datoteko iz predloge
cp .env.example .env
# Uredi .env in nastavi EXPO_PUBLIC_API_URL na lokalni IP naslov
# svojega računalnika (preveri z `ipconfig` na Windows)

# 4. Zaženi razvojni strežnik
npm start
```

Odpri Expo Go na telefonu in skeniraj QR kodo.

> **Opomba za Windows:** Če pride do napake z dolgimi potmi (errno -4094), omogoči dolge poti v registru:
> ```powershell
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```
> Nato premakni projekt v krajšo pot (npr. `C:\Dev\BudgetWise\`) in ponovi namestitev.
>
> **Opomba glede OneDrive:** Projekta ne hrani v mapi, ki jo sinhronizira OneDrive — to lahko poškoduje `node_modules`. Uporabi lokalno pot, npr. `C:\Dev\BudgetWise\`.

---

### Backend (Node.js)

Celotna navodila za backend (Docker, baza, okoljske spremenljivke) so v [budgetwise-backend/README.md](./budgetwise-backend/README.md). Na kratko:

```bash
cd budgetwise-backend

# Ustvari .env iz predloge in ga uredi
cp .env.example .env

# Namesti odvisnosti
npm install

# Generiraj Prisma klienta in ustvari tabele
npm run db:generate
npx prisma db push

# Zaženi razvojni strežnik
npm run dev
```

---

## Zagon

```bash
# Terminal 1 — backend
cd budgetwise-backend
npm run dev

# Terminal 2 — frontend
cd budgetwise-frontend
npm start
```

---

## Struktura projekta

```
BudgetWise/
├── budgetwise-frontend/        # React Native (Expo) aplikacija
│   ├── app/                    # Zasloni in navigacija (Expo Router)
│   ├── assets/                 # Ikone, pisave
│   ├── components/             # UI komponente in grafi
│   ├── contexts/               # Auth in Theme konteksti
│   ├── lib/                    # API klient (Axios)
│   ├── types/                  # TypeScript tipi
│   └── .env.example            # Predloga za okoljske spremenljivke
│
└── budgetwise-backend/         # Node.js + Express REST API
    ├── src/                    # Izvorna koda (controllers, routes, lib...)
    ├── prisma/                 # Podatkovni model (schema.prisma)
    ├── Dockerfile
    ├── docker-compose.yml
    └── .env.example            # Predloga za okoljske spremenljivke
```

Podrobna struktura backenda je v [dokumentaciji backenda](./budgetwise-backend/README.md#struktura).

---

## Dokumentacija backenda

API endpointi, podatkovni model in podrobna navodila za zagon backenda so dokumentirani ločeno:

**➡️ [budgetwise-backend/README.md](./budgetwise-backend/README.md)**

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