# Cactario Casa Molle 🌵

Sistema digital desarrollado como proyecto de titulación (Capstone UAI) para **Casa Molle**.
Permite la gestión del cactario mediante inventario en tiempo real, fichas públicas de especies accesibles por **QR** y un módulo privado para el staff.

##  Funcionalidades principales

- Fichas públicas de especies y sectores (QR).
- Inventario de ejemplares con traslados y estados sanitarios.
- Módulo staff para control de stock.
- Compras y recepciones básicas (P2P mínimo).
- Métricas e indicadores (KPIs).

##  Stack Tecnológico

- **Frontend**: Next.js (Vercel)
- **Backend**: FastAPI (Python)
- **Base de datos & Auth**: Supabase (Postgres + JWT)
- **Infraestructura**: Vercel + Railway/Render
- **CI/CD**: GitHub Actions + Vercel

##  Estructura del repositorio

/apps/frontend -> Front público (Next.js)
/apps/api -> Backend FastAPI
/infra -> Scripts y despliegues

##  Cómo levantar localmente

1. Clonar repositorio:

   ```bash
   git clone https://github.com/felicanales/CactarioCasaMolle.git
   cd CactarioCasaMolle
   ```
2. Backend:
   cd apps/api
   pip install -r requirements.txt
   uvicorn main:app --reload
3. Frontend
   cd apps/frontend
   npm install
   npm run dev

Pruebas
  Backend: pytest
  Frontend: npm test

 Licencia
Este proyecto es parte de un Capstone académico (UAI 2025).
Uso interno en Casa Molle; no autorizado para distribución comercial sin permiso.
