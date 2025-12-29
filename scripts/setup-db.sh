#!/bin/bash

# Script de configuración de base de datos SinVello Inventario
# =============================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🗄️  CONFIGURACIÓN BASE DE DATOS NEON                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Pasos para obtener tu URL de Neon:${NC}"
echo ""
echo "  1. Ve a ${YELLOW}https://console.neon.tech${NC}"
echo "  2. Regístrate gratis (con GitHub, Google o email)"
echo "  3. Crea un nuevo proyecto: 'sinvello-inventario'"
echo "  4. Copia la 'Connection String' (formato PostgreSQL)"
echo ""
echo -e "${YELLOW}La URL tiene este formato:${NC}"
echo "  postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
echo ""

# Solicitar URL
echo -e "${CYAN}Pega tu DATABASE_URL de Neon:${NC}"
read -p "> " DATABASE_URL

# Validar formato básico
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ Error: La URL debe comenzar con 'postgresql://'${NC}"
    exit 1
fi

# Actualizar .env
echo ""
echo -e "${YELLOW}Actualizando .env...${NC}"

# Generar NEXTAUTH_SECRET seguro
NEXTAUTH_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
# Base de datos Neon PostgreSQL
DATABASE_URL="$DATABASE_URL"

# NextAuth.js
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# Webhook API Key (para consumo externo)
WEBHOOK_API_KEY="sinvello-webhook-secret-2024"
EOF

echo -e "${GREEN}✅ .env actualizado${NC}"

# Push del esquema
echo ""
echo -e "${YELLOW}Creando tablas en la base de datos...${NC}"
npm run db:push

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al crear las tablas. Verifica tu DATABASE_URL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tablas creadas${NC}"

# Seed de datos
echo ""
echo -e "${YELLOW}Cargando datos iniciales (productos, franquicias, usuarios)...${NC}"
npm run db:seed

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al cargar datos. Revisa los logs arriba${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Datos cargados${NC}"

# Resumen
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ¡CONFIGURACIÓN COMPLETA!                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}La base de datos está lista. Usuarios de prueba:${NC}"
echo ""
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │ Email                          │ Rol          │ Contraseña │"
echo "  ├─────────────────────────────────────────────────────────────┤"
echo "  │ admin@sinvello.es              │ CENTRAL      │ sinvello2024│"
echo "  │ madrid@sinvello.es             │ FRANQUICIADO │ sinvello2024│"
echo "  │ barcelona@sinvello.es          │ FRANQUICIADO │ sinvello2024│"
echo "  │ tecnico@sinvello.es            │ TECNICO      │ sinvello2024│"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}Para iniciar el servidor:${NC}"
echo "  npm run dev"
echo ""
echo -e "${CYAN}Luego abre:${NC} ${YELLOW}http://localhost:3000${NC}"
echo ""
