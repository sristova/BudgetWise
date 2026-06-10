# BudgetWise — Backend

REST API za aplikacijo BudgetWise, zgrajen z **Node.js + Express**, **TypeScript**, **Prisma ORM** in **PostgreSQL**.

Glavna dokumentacija projekta je v [korenskem README](../README.md).

---

## Kazalo vsebine

- [Namestitev](#namestitev)
  - [Z Dockerjem](#z-dockerjem-priporočeno)
  - [Brez Dockerja](#brez-dockerja-lokalno)
- [Okoljske spremenljivke](#okoljske-spremenljivke)
- [Zagon](#zagon)
- [API dokumentacija](#api-dokumentacija)
- [Podatkovna baza](#podatkovna-baza)
- [Struktura](#struktura)

---

## Namestitev

### Predpogoji

- Node.js >= 18
- npm >= 9
- PostgreSQL (lokalno ali Docker)
- Groq API ključ → [console.groq.com](https://console.groq.com)
- SendGrid API ključ → [sendgrid.com](https://sendgrid.com)
- Cloudinary račun → [cloudinary.com](https://cloudinary.com)

---

### Z Dockerjem (priporočeno)

```bash
# Kopiraj in nastavi okoljske spremenljivke
cp .env.example .env
# Uredi .env (glej razdelek Okoljske spremenljivke)

# Zaženi bazo in API
docker-compose up -d
```

### Brez Dockerja (lokalno)

```bash
# Namesti odvisnosti
npm install

# Ustvari .env iz predloge in ga uredi
cp .env.example .env

# Generiraj Prisma klienta
npm run db:generate

# Ustvari tabele v bazi
npx prisma db push

# (Neobvezno) Napolni bazo z demo podatki
npm run db:seed

# Zaženi razvojni strežnik
npm run dev
```

### Ključne odvisnosti (backend)

Vse odvisnosti so navedene v `package.json` in se namestijo z enim `npm install`. Spodaj so naštete glavne knjižnice po namenu:

```bash
# Strežnik in jedro
npm install express express-async-errors compression cors helmet morgan

# Podatkovna baza (Prisma + PostgreSQL)
npm install @prisma/client prisma

# Avtentikacija (JWT + Google)
npm install jsonwebtoken bcryptjs google-auth-library jwks-rsa

# Validacija
npm install zod express-validator

# E-pošta in obvestila
npm install @sendgrid/mail

# Nalaganje slik (avatari)
npm install cloudinary multer

# Pomožno
npm install dotenv uuid ioredis node-cron pdfkit

# Logiranje
npm install pino pino-http pino-pretty

# Razvojne odvisnosti (tipi + orodja)
npm install --save-dev typescript tsx @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/cors @types/compression @types/morgan @types/multer @types/node-cron @types/pdfkit @types/uuid
```

---

## Okoljske spremenljivke

Vse okoljske spremenljivke so opisane v datoteki [`.env.example`](./.env.example). Skopiraj jo v `.env` in nastavi svoje vrednosti:

```bash
cp .env.example .env
```

Potrebuješ veljavne ključe za:

- **PostgreSQL** bazo (`DATABASE_URL`)
- **JWT** skrivnosti (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- **Groq AI** (`GROQ_API_KEY`)
- **SendGrid** za e-poštna obvestila (`SENDGRID_API_KEY`)
- **Cloudinary** za profilne slike (`CLOUDINARY_*`)

> ⚠️ Datoteke `.env` nikoli ne nalagaj v Git — vsebuje skrivnosti. V repozitorij je vključena le predloga `.env.example`.

---

## Zagon

### Razvojno okolje

```bash
npm run dev
```

### Produkcija

```bash
npm run build
npm start

# Ali z Dockerjem
docker-compose -f docker-compose.yml up -d
```

---

## API dokumentacija

Osnovna pot: `http://localhost:3000/api/v1`

Vsi zaščiteni endpointi zahtevajo glavo:

```
Authorization: Bearer <access_token>
```

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

| Metoda | Pot                      | Opis                       |
| ------ | ------------------------ | -------------------------- |
| GET    | `/users/profile`         | Pridobi profil uporabnika  |
| PATCH  | `/users/profile`         | Posodobi ime in priimek    |
| POST   | `/users/upload-avatar`   | Naloži profilno sliko      |
| POST   | `/users/change-password` | Spremeni geslo             |
| DELETE | `/users/account`         | Izbriši račun              |

### Transakcije

| Metoda | Pot                       | Opis                                        |
| ------ | ------------------------- | ------------------------------------------- |
| GET    | `/transactions`           | Seznam transakcij (filtriranje, paginacija) |
| GET    | `/transactions/dashboard` | Dashboard podatki                           |
| POST   | `/transactions`           | Dodaj transakcijo                           |
| PATCH  | `/transactions/:id`       | Uredi transakcijo                           |
| DELETE | `/transactions/:id`       | Izbriši transakcijo                         |

### Cilji

| Metoda | Pot                     | Opis                      |
| ------ | ----------------------- | ------------------------- |
| GET    | `/goals`                | Seznam varčevalnih ciljev |
| POST   | `/goals`                | Dodaj cilj                |
| PATCH  | `/goals/:id`            | Posodobi cilj             |
| POST   | `/goals/:id/contribute` | Vplačaj v cilj            |
| DELETE | `/goals/:id`            | Izbriši cilj              |

> Ob vplačilu, ki doseže ali preseže ciljni znesek, se cilj samodejno označi kot dosežen, ustvari se obvestilo, uporabnik pa prejme e-pošto prek SendGrid.

### AI klepet

| Metoda | Pot                      | Opis                            |
| ------ | ------------------------ | ------------------------------- |
| GET    | `/ai-chat/history`       | Zgodovina klepeta               |
| POST   | `/ai-chat/message`       | Pošlji sporočilo asistentu      |
| POST   | `/ai-chat/parse-receipt` | Analiziraj račun (base64 slika) |
| DELETE | `/ai-chat`               | Izbriši zgodovino klepeta       |

### Poročila

| Metoda | Pot                   | Opis                        |
| ------ | --------------------- | --------------------------- |
| GET    | `/reports/monthly`    | Mesečno poročilo            |
| GET    | `/reports/yearly`     | Letno poročilo              |
| GET    | `/reports/categories` | Poraba po kategorijah       |
| GET    | `/reports/trends`     | Trendi za zadnjih N mesecev |
| GET    | `/reports/statistics` | Statistike za mesec         |

### Health check

```
GET /health  →  { status: "ok", timestamp: "...", version: "1.0.0" }
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
- **Notification** — obvestila (budget alert, goal reminder, achievement...)
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

## Struktura

```
budgetwise-backend/
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
│   │   ├── mail.ts             # Pošiljanje e-pošte (SendGrid)
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
├── .env.example                # Predloga za okoljske spremenljivke
├── Dockerfile
├── docker-compose.yml          # PostgreSQL + API
└── tsconfig.json
```
