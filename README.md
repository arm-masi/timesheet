# Timesheet Management System

Applicazione web completa per la gestione dei timesheet aziendali con timbratura presenze, giustificativi (ferie/permessi), e export paghe.

## Tecnologie

- **Backend**: Python 3.11, FastAPI, SQLAlchemy (async), PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, React Router
- **Auth**: OAuth2/OpenID Connect con Microsoft 365 (Azure Entra ID) + admin locale
- **Deploy**: Docker Compose

## Quick Start

```bash
# 1. Clona il repository
git clone <repo-url>
cd timesheet

# 2. Copia e configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con i tuoi valori (opzionale per test locale)

# 3. Avvia tutto con Docker Compose
docker compose up -d

# 4. Accedi all'applicazione
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Login iniziale

- **Admin locale**: username `admin`, password `admin`
- **SSO Microsoft**: richiede configurazione Azure AD (vedi sotto)

## Struttura Progetto

```
timesheet/
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── middleware/      # Auth middleware
│   │   ├── config.py       # Settings
│   │   └── database.py     # DB connection
│   ├── alembic/            # Database migrations
│   ├── main.py             # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, ProtectedRoute
│   │   ├── pages/          # Dashboard, Admin, etc.
│   │   ├── services/       # API client (axios)
│   │   ├── context/        # AuthContext
│   │   └── types/          # TypeScript types
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Configurazione Azure AD (SSO Microsoft 365)

### 1. Registra l'applicazione su Azure Portal

1. Accedi a [Azure Portal](https://portal.azure.com)
2. Vai a **Azure Active Directory** > **App registrations** > **New registration**
3. Configura:
   - **Name**: Timesheet Management
   - **Supported account types**: Single tenant (solo la tua organizzazione)
   - **Redirect URI**: `http://localhost:3000/auth/callback` (Web)
4. Dopo la creazione, annota:
   - **Application (client) ID** → `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_TENANT_ID`

### 2. Crea il Client Secret

1. Vai a **Certificates & secrets** > **New client secret**
2. Copia il valore → `AZURE_CLIENT_SECRET`

### 3. Configura i permessi API

1. Vai a **API permissions** > **Add a permission**
2. Seleziona **Microsoft Graph** > **Delegated permissions**
3. Aggiungi: `openid`, `profile`, `email`
4. Clicca **Grant admin consent**

### 4. Aggiorna il file .env

```env
AZURE_CLIENT_ID=<il-tuo-client-id>
AZURE_CLIENT_SECRET=<il-tuo-client-secret>
AZURE_TENANT_ID=<il-tuo-tenant-id>
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Funzionalità

### Dipendente

- Timbratura entrata/uscita giornaliera
- Visualizzazione riepilogo mensile personale
- Inserimento giustificativi (ferie/permessi)
- Cambio password (solo utenti locali)

### Admin (Gestione Paghe)

- Visualizzazione presenze di tutti i dipendenti
- Modifica timbrature
- Approvazione/rifiuto giustificativi
- Export paghe mensile (CSV/Excel)
- Gestione utenti

## Regole di Business

### Orario di lavoro

| Fascia      | Orario      |
|-------------|-------------|
| Mattina     | 09:00-13:00 |
| Pausa       | 13:00-14:00 |
| Pomeriggio  | 14:00-18:00 |
| **Totale**  | **8 ore**   |

### Flessibilità

- Flessibilità massima: ±30 minuti
- Entrata in ritardo (max 30 min) → uscita posticipata di pari misura
- Entrata anticipata → nessun accumulo surplus
- **Surplus mai conteggiato**: tutto è arrotondato a max 8 ore/giorno

### Deficit orario

- Se le ore lavorate sono < 8: obbligo di giustificativo (ferie o permesso)
- Se nessuna timbratura in un giorno lavorativo: obbligo di giustificativo

## API Endpoints

### Auth
- `POST /api/auth/login` - Login admin locale
- `GET /api/auth/azure/login` - URL autorizzazione Azure
- `POST /api/auth/azure/callback` - Callback SSO
- `GET /api/auth/me` - Utente corrente
- `POST /api/auth/change-password` - Cambio password

### Presenze
- `POST /api/attendance/clock-in` - Timbratura entrata
- `POST /api/attendance/clock-out` - Timbratura uscita
- `GET /api/attendance/today` - Presenza odierna
- `GET /api/attendance/my-history` - Storico personale
- `GET /api/attendance/my-summary` - Riepilogo mensile

### Giustificativi
- `POST /api/justifications/` - Nuovo giustificativo
- `GET /api/justifications/my` - I miei giustificativi
- `DELETE /api/justifications/{id}` - Elimina giustificativo

### Admin
- `GET /api/users/` - Lista utenti
- `PUT /api/users/{id}` - Modifica utente
- `GET /api/attendance/admin/user/{id}/summary` - Riepilogo dipendente
- `PUT /api/attendance/admin/{id}` - Modifica timbratura
- `GET /api/justifications/admin/all` - Tutti i giustificativi
- `PUT /api/justifications/admin/{id}/review` - Approva/rifiuta
- `GET /api/export/payroll` - Export paghe (CSV/Excel)
- `GET /api/audit/logs` - Log audit

## Database

Il sistema crea automaticamente le tabelle all'avvio. Per le migrazioni manuali:

```bash
# Dentro il container backend
docker compose exec backend alembic upgrade head
```

## Sicurezza

- JWT per autenticazione frontend
- RBAC con middleware di controllo permessi
- Tutti gli endpoint protetti (eccetto login e health)
- Validazione input con Pydantic
- Audit log per ogni modifica
- CORS configurato

## Produzione

Per il deploy in produzione:

1. Cambia `JWT_SECRET_KEY` con un valore sicuro
2. Configura `AZURE_REDIRECT_URI` con il dominio di produzione
3. Usa HTTPS (tramite reverse proxy come Traefik o Caddy)
4. Configura backup automatici per PostgreSQL
5. Cambia la password dell'admin locale
