# SinVello! Inventario

Sistema de gestión de inventario para franquicias **SinVello** (centros de depilación láser).

![SinVello Logo](https://pedidos.sinvelloporlaser.es/wp-content/uploads/2025/03/logo.avif)

## Descripción

Aplicación web que permite gestionar el inventario de productos consumibles, desechables y equipamiento de múltiples franquicias SinVello. Incluye control de stock, histórico de movimientos, reportes visuales y un sistema de roles para diferentes niveles de acceso.

## Características Principales

### Sistema de Autenticación por Roles

| Rol | Acceso |
|-----|--------|
| **CENTRAL** | Todas las franquicias, gestión de usuarios y franquicias |
| **FRANQUICIADO** | Solo su franquicia, dashboard y reportes |
| **TECNICO** | Solo inventario de su franquicia (registrar consumo/reposición) |

### Gestión de Inventario
- Catálogo de 41 productos organizados por categorías (Consumibles, Desechables, Equipamiento, Limpieza, Textil, Merch)
- Control de stock mínimo/máximo con alertas visuales
- Registro de movimientos: Reposición, Consumo, Ajuste
- Imágenes de productos desde el catálogo oficial

### Reportes y Análisis
- Dashboard con estadísticas en tiempo real
- Gráficos de consumo por producto y tendencias mensuales
- Histórico de movimientos con filtros avanzados
- Exportación a CSV

### Webhook API
- Endpoint para recibir consumos automáticos desde sistemas externos
- Autenticación por API Key
- Registro automático en histórico

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 + TypeScript + React 19 |
| Estilos | Tailwind CSS 4 + Colores corporativos SinVello |
| Backend | Next.js API Routes |
| Base de datos | PostgreSQL (Neon serverless) |
| ORM | Prisma 5 |
| Autenticación | NextAuth.js v5 |
| Gráficos | Recharts |

## Colores Corporativos

```css
--sinvello-primary: #E6336E;    /* Rosa/Magenta */
--sinvello-secondary: #1E1E1E;  /* Gris oscuro */
--sinvello-background: #F5F5F5; /* Fondo claro */
```

## Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/[usuario]/sinvello-inventario.git
cd sinvello-inventario

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL de Neon

# Crear tablas y cargar datos
npm run db:push
npm run db:seed

# Iniciar servidor
npm run dev
```

## Usuarios de Prueba

| Email | Contraseña | Rol | Franquicia |
|-------|------------|-----|------------|
| admin@sinvello.es | sinvello2024 | CENTRAL | Todas |
| madrid@sinvello.es | sinvello2024 | FRANQUICIADO | Madrid |
| barcelona@sinvello.es | sinvello2024 | FRANQUICIADO | Barcelona |
| tecnico.madrid@sinvello.es | sinvello2024 | TECNICO | Madrid |

## Variables de Entorno

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://..."
WEBHOOK_API_KEY="..."
```

## API Webhook

```bash
POST /api/webhook/consumo-semanal
Content-Type: application/json
X-API-Key: [WEBHOOK_API_KEY]

{
  "franquicia_codigo": "MAD001",
  "consumos": [
    { "producto_id": "xxx", "cantidad": 5 }
  ]
}
```

---

Desarrollado para **SinVello!** - Centros de depilación láser
