# 📋 Metodología de Desarrollo - Cactario Casa Molle

## 📌 Resumen Ejecutivo

Este documento describe la metodología de desarrollo aplicada en el proyecto **Cactario Casa Molle**, un sistema de gestión de cactáceas desarrollado con tecnologías modernas (Next.js, FastAPI, Supabase) y desplegado en Railway.

---

## 🎯 Metodología Aplicada

### **Desarrollo Iterativo e Incremental con Enfoque Ágil**

El proyecto sigue una metodología **híbrida** que combina elementos de:

- **Desarrollo Iterativo e Incremental (IID)**
- **Prácticas Ágiles** (sin framework formal como Scrum)
- **DevOps/CI-CD** (Integración y Despliegue Continuo)
- **Arquitectura en Capas** (Layered Architecture)

---

## 🏗️ Fases del Desarrollo

### **1. Fase de Planificación y Diseño**

#### **1.1 Análisis de Requerimientos**
- **Identificación de usuarios**: Staff administrativo y visitantes
- **Requisitos funcionales**:
  - Gestión de especies y ejemplares
  - Control de inventario
  - Sistema de auditoría
  - Aplicación móvil para visitantes con escáner QR
- **Requisitos no funcionales**:
  - Seguridad (autenticación, RLS)
  - Escalabilidad
  - Documentación automática de API

#### **1.2 Diseño de Arquitectura**
```
┌─────────────────────────────────────────────────────────┐
│                    ARQUITECTURA                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Frontend    │  │  Frontend    │  │   Backend     │ │
│  │  Staff       │  │  Mobile      │  │   FastAPI     │ │
│  │  (Next.js)   │  │  (Next.js)   │  │   (Python)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                         │                               │
│                         ▼                               │
│              ┌──────────────────────┐                  │
│              │   Supabase (BaaS)    │                  │
│              │  - PostgreSQL DB     │                  │
│              │  - Authentication    │                  │
│              │  - Storage           │                  │
│              └──────────────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Decisiones arquitectónicas**:
- **Monolito modular**: Backend único con separación por módulos
- **Separación de frontends**: Dos aplicaciones independientes por audiencia
- **BaaS (Backend as a Service)**: Supabase para base de datos y autenticación
- **CI/CD**: Railway para despliegue automático

---

### **2. Fase de Desarrollo**

#### **2.1 Organización del Código (Arquitectura en Capas)**

**Backend (FastAPI)**:
```
fastapi/
├── app/
│   ├── api/              # Capa de Presentación (Routes)
│   │   ├── routes_species.py
│   │   ├── routes_sectors.py
│   │   ├── routes_ejemplar.py
│   │   ├── routes_auth.py
│   │   └── ...
│   ├── services/         # Capa de Lógica de Negocio
│   │   ├── species_service.py
│   │   ├── ejemplar_service.py
│   │   ├── audit_service.py
│   │   └── ...
│   ├── middleware/       # Capa de Middleware
│   │   ├── auth_middleware.py
│   │   └── rate_limiter.py
│   ├── core/             # Capa de Infraestructura
│   │   ├── supabase_auth.py
│   │   ├── security.py
│   │   └── rls_policies_secure.sql
│   └── models/           # Capa de Modelos
│       ├── species.py
│       └── sectors.py
```

**Principios aplicados**:
- **Separación de Responsabilidades (SRP)**: Cada módulo tiene una responsabilidad única
- **Inversión de Dependencias**: Services no dependen directamente de la base de datos
- **Capa de Abstracción**: Middleware para autenticación y validación

#### **2.2 Desarrollo Iterativo por Funcionalidades**

**Iteración 1: Autenticación y Usuarios**
- Sistema de autenticación con OTP
- Whitelist de usuarios
- Middleware de autenticación

**Iteración 2: Gestión de Especies**
- CRUD de especies
- Endpoints públicos y privados
- Validación con Pydantic

**Iteración 3: Gestión de Sectores**
- CRUD de sectores
- Sistema de códigos QR
- Relaciones sector-especie

**Iteración 4: Inventario (Ejemplares)**
- Gestión de ejemplares
- Filtros avanzados
- Relaciones con especies y sectores

**Iteración 5: Sistema de Auditoría**
- Logging de cambios
- Trazabilidad de acciones
- Registro de IP y user agent

**Iteración 6: Frontend Mobile**
- Interfaz para visitantes
- Escáner de códigos QR
- Navegación por sectores

**Iteración 7: Gestión de Fotos**
- Subida de imágenes
- Almacenamiento en Supabase Storage
- Galería de fotos

---

### **3. Fase de Integración y Despliegue**

#### **3.1 Integración Continua (CI)**

**Herramientas y Procesos**:
- **GitHub**: Control de versiones
- **Railway**: CI/CD automático
- **Deploy automático**: Push a `main` → Deploy automático

**Flujo de CI/CD**:
```
┌─────────────┐
│   Git Push   │
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│  GitHub Repo    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Railway Detect  │
│  (Node.js/Python)│
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  Build & Deploy  │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│   Production     │
└─────────────────┘
```

#### **3.2 Gestión de Entornos**

**Desarrollo Local**:
```bash
# Scripts centralizados en package.json
npm run start:all        # Inicia frontend + backend
npm run dev:nextjs       # Solo frontend staff
npm run dev:mobile       # Solo frontend mobile
npm run start:fastapi    # Solo backend
```

**Producción (Railway)**:
- Deploy automático desde GitHub
- Variables de entorno configuradas en Railway Dashboard
- Health checks automáticos (`/health` endpoint)

---

## 🔄 Proceso de Desarrollo Iterativo

### **Ciclo de Desarrollo por Feature**

```
┌─────────────────────────────────────────────────────────┐
│  1. PLANIFICACIÓN                                        │
│     - Definir feature                                    │
│     - Identificar endpoints necesarios                  │
│     - Diseñar estructura de datos                       │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  2. DESARROLLO                                           │
│     - Crear/actualizar routes (api/)                     │
│     - Implementar lógica (services/)                     │
│     - Agregar validación (Pydantic)                     │
│     - Implementar middleware si es necesario            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  3. PRUEBAS LOCALES                                      │
│     - Probar endpoints con /docs (Swagger)               │
│     - Verificar integración con frontend                │
│     - Validar seguridad y autenticación                 │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  4. COMMIT Y PUSH                                        │
│     - Commit con mensaje descriptivo                    │
│     - Push a GitHub                                      │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  5. DEPLOY AUTOMÁTICO                                    │
│     - Railway detecta cambios                            │
│     - Build automático                                   │
│     - Deploy a producción                                │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  6. VALIDACIÓN                                           │
│     - Probar en producción                               │
│     - Verificar logs                                     │
│     - Monitorear errores                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Herramientas y Tecnologías

### **Stack Tecnológico**

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend Staff** | Next.js | 15.5.5 | Panel de administración |
| **Frontend Mobile** | Next.js | 15.5.5 | Aplicación para visitantes |
| **Backend** | FastAPI | 0.119.0 | API REST |
| **Base de Datos** | PostgreSQL (Supabase) | - | Almacenamiento |
| **Autenticación** | Supabase Auth | - | Gestión de usuarios |
| **Storage** | Supabase Storage | - | Almacenamiento de fotos |
| **CI/CD** | Railway | - | Despliegue automático |
| **Control de Versiones** | GitHub | - | Repositorio |

### **Herramientas de Desarrollo**

- **Python 3.9+**: Backend
- **Node.js 18+**: Frontend
- **Uvicorn**: Servidor ASGI para FastAPI
- **Pydantic**: Validación de datos
- **Docker**: Containerización (opcional)

---

## 📐 Principios y Buenas Prácticas Aplicadas

### **1. Principios SOLID**

- **Single Responsibility Principle (SRP)**:
  - Cada servicio maneja una entidad específica (`species_service`, `ejemplar_service`)
  - Routes solo manejan HTTP, services manejan lógica de negocio

- **Dependency Inversion Principle (DIP)**:
  - Services dependen de abstracciones (Supabase client)
  - No dependen directamente de implementaciones concretas

### **2. Clean Architecture**

- **Separación de capas**: Routes → Services → Database
- **Independencia de frameworks**: Lógica de negocio en services, no en routes
- **Testabilidad**: Services pueden ser probados independientemente

### **3. Seguridad**

- **Autenticación**: JWT tokens con Supabase
- **Autorización**: Whitelist de usuarios
- **Row-Level Security (RLS)**: Políticas en Supabase
- **Rate Limiting**: Protección contra abuso

### **4. Documentación**

- **Documentación automática**: OpenAPI/Swagger (`/docs`)
- **READMEs**: Documentación de componentes
- **Comentarios en código**: Docstrings en funciones importantes
- **Guías de despliegue**: `DEPLOYMENT_GUIDE.md`

### **5. Auditoría y Trazabilidad**

- **Sistema de auditoría**: Registro de todos los cambios
- **Logging estructurado**: Logs con contexto
- **Trazabilidad**: IP, user agent, usuario, timestamp

---

## 🔍 Control de Calidad

### **Validación Automática**

1. **Pydantic**: Validación de tipos y esquemas
2. **FastAPI**: Validación automática de requests
3. **Supabase RLS**: Validación a nivel de base de datos

### **Manejo de Errores**

- **HTTPException**: Errores HTTP estructurados
- **Exception handlers**: Manejo global de excepciones
- **Logging**: Registro de errores para debugging

### **Testing (Implícito)**

Aunque no hay tests unitarios explícitos, el proyecto implementa:
- **Validación en tiempo de ejecución**: Pydantic valida datos
- **Pruebas manuales**: Swagger UI para probar endpoints
- **Validación de integración**: Pruebas en desarrollo local

---

## 📊 Gestión de Cambios

### **Sistema de Auditoría**

Cada cambio importante se registra en la tabla `audit_logs`:
- **Tabla afectada**: `especies`, `sectores`, `ejemplar`, etc.
- **Acción**: CREATE, UPDATE, DELETE
- **Usuario**: ID, email, nombre
- **Contexto**: IP, user agent, timestamp
- **Valores**: Valores anteriores y nuevos (para UPDATE)

### **Versionado**

- **Control de versiones**: Git con GitHub
- **Mensajes de commit**: Descriptivos y claros
- **Ramas**: `main` para producción

---

## 🚀 Despliegue y Operaciones

### **Estrategia de Despliegue**

- **Deploy automático**: Push a `main` → Deploy en Railway
- **Sin downtime**: Railway maneja el despliegue sin interrupciones
- **Rollback**: Posible desde Railway Dashboard

### **Monitoreo**

- **Health checks**: Endpoint `/health` para verificar estado
- **Logs**: Railway proporciona logs en tiempo real
- **Debug endpoint**: `/debug/environment` para diagnóstico

### **Configuración**

- **Variables de entorno**: Configuración centralizada
- **Entornos separados**: Desarrollo local vs. Producción
- **Secrets**: Variables sensibles en Railway Dashboard

---

## 📈 Métricas y Mejora Continua

### **Indicadores de Calidad**

1. **Cobertura de funcionalidades**: Todas las features documentadas implementadas
2. **Tiempo de despliegue**: Automático (< 5 minutos)
3. **Disponibilidad**: Railway garantiza alta disponibilidad
4. **Seguridad**: RLS activado, autenticación implementada

### **Mejora Continua**

- **Iteraciones incrementales**: Features agregadas progresivamente
- **Refactorización**: Código organizado en módulos
- **Documentación**: Actualizada con cada feature

---

## 🎓 Lecciones Aprendidas

### **Decisiones Acertadas**

1. **Uso de Supabase**: Aceleró desarrollo (auth, DB, storage)
2. **Arquitectura modular**: Facilita mantenimiento
3. **CI/CD con Railway**: Despliegue sin fricción
4. **FastAPI**: Documentación automática y validación

### **Áreas de Mejora**

1. **Testing automatizado**: Agregar tests unitarios y de integración
2. **Documentación de API**: Expandir ejemplos en Swagger
3. **Monitoreo**: Implementar métricas más detalladas
4. **Performance**: Optimizar queries y agregar caché si es necesario

---

## 📚 Referencias y Documentación

### **Documentos del Proyecto**

- `README.md`: Documentación general
- `DEPLOYMENT_GUIDE.md`: Guía de despliegue
- `RLS_README.md`: Configuración de seguridad
- `base de datos.md`: Esquema de base de datos

### **Documentación Externa**

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app/)

---

## ✅ Conclusión

El proyecto **Cactario Casa Molle** sigue una metodología de **desarrollo iterativo e incremental** con prácticas ágiles, enfocada en:

- ✅ **Rapidez de desarrollo**: Uso de BaaS y frameworks modernos
- ✅ **Calidad de código**: Arquitectura en capas y principios SOLID
- ✅ **Seguridad**: Autenticación, autorización y auditoría
- ✅ **Mantenibilidad**: Código modular y documentado
- ✅ **Despliegue continuo**: CI/CD automatizado

Esta metodología ha permitido desarrollar un sistema completo y funcional de manera eficiente, con la flexibilidad para evolucionar y escalar según las necesidades del proyecto.

---

**Última actualización**: Diciembre 2024  
**Versión del documento**: 1.0






