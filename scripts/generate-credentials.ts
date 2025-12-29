import * as XLSX from 'xlsx';
import * as path from 'path';

// Datos de usuarios de prueba
const usuarios = [
  {
    Email: 'admin@sinvello.es',
    Contraseña: 'sinvello2024',
    Nombre: 'Admin',
    Apellidos: 'Central',
    Rol: 'CENTRAL',
    Franquicia: 'Todas (acceso total)',
    Permisos: 'Dashboard, Inventario, Movimientos, Reportes, Franquicias, Usuarios',
  },
  {
    Email: 'madrid@sinvello.es',
    Contraseña: 'sinvello2024',
    Nombre: 'María',
    Apellidos: 'García López',
    Rol: 'FRANQUICIADO',
    Franquicia: 'SinVello Madrid (MAD001)',
    Permisos: 'Dashboard, Inventario, Movimientos, Reportes (solo su franquicia)',
  },
  {
    Email: 'tecnico.madrid@sinvello.es',
    Contraseña: 'sinvello2024',
    Nombre: 'Carlos',
    Apellidos: 'Martínez',
    Rol: 'TECNICO',
    Franquicia: 'SinVello Madrid (MAD001)',
    Permisos: 'Inventario (solo registrar consumo/reposición)',
  },
  {
    Email: 'barcelona@sinvello.es',
    Contraseña: 'sinvello2024',
    Nombre: 'Ana',
    Apellidos: 'Rodríguez Pérez',
    Rol: 'FRANQUICIADO',
    Franquicia: 'SinVello Barcelona (BCN001)',
    Permisos: 'Dashboard, Inventario, Movimientos, Reportes (solo su franquicia)',
  },
];

// Información del sistema
const infoSistema = [
  { Campo: 'URL de acceso', Valor: 'http://localhost:3000' },
  { Campo: 'URL de producción', Valor: 'Pendiente de configurar' },
  { Campo: '', Valor: '' },
  { Campo: 'Base de datos', Valor: 'PostgreSQL (local)' },
  { Campo: 'Webhook API Key', Valor: 'sinvello-webhook-secret-2024' },
  { Campo: 'Endpoint Webhook', Valor: 'POST /api/webhook/consumo-semanal' },
];

// Descripción de roles
const roles = [
  {
    Rol: 'CENTRAL',
    Descripción: 'Acceso total al sistema',
    'Dashboard': '✅ Todas las franquicias',
    'Inventario': '✅ Todas las franquicias',
    'Movimientos': '✅ Todos',
    'Reportes': '✅ Todos',
    'Franquicias': '✅ CRUD completo',
    'Usuarios': '✅ CRUD completo',
  },
  {
    Rol: 'FRANQUICIADO',
    Descripción: 'Gestión de su franquicia',
    'Dashboard': '✅ Solo su franquicia',
    'Inventario': '✅ Solo su franquicia',
    'Movimientos': '✅ Solo su franquicia',
    'Reportes': '✅ Solo su franquicia',
    'Franquicias': '❌ Sin acceso',
    'Usuarios': '❌ Sin acceso',
  },
  {
    Rol: 'TECNICO',
    Descripción: 'Operaciones de inventario',
    'Dashboard': '❌ Sin acceso',
    'Inventario': '✅ Solo su franquicia',
    'Movimientos': '⚠️ Solo registrar',
    'Reportes': '❌ Sin acceso',
    'Franquicias': '❌ Sin acceso',
    'Usuarios': '❌ Sin acceso',
  },
];

// Crear workbook
const wb = XLSX.utils.book_new();

// Hoja 1: Usuarios
const wsUsuarios = XLSX.utils.json_to_sheet(usuarios);
wsUsuarios['!cols'] = [
  { wch: 28 }, // Email
  { wch: 15 }, // Contraseña
  { wch: 12 }, // Nombre
  { wch: 18 }, // Apellidos
  { wch: 14 }, // Rol
  { wch: 30 }, // Franquicia
  { wch: 60 }, // Permisos
];
XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios');

// Hoja 2: Roles y Permisos
const wsRoles = XLSX.utils.json_to_sheet(roles);
wsRoles['!cols'] = [
  { wch: 14 }, // Rol
  { wch: 28 }, // Descripción
  { wch: 22 }, // Dashboard
  { wch: 22 }, // Inventario
  { wch: 22 }, // Movimientos
  { wch: 22 }, // Reportes
  { wch: 18 }, // Franquicias
  { wch: 18 }, // Usuarios
];
XLSX.utils.book_append_sheet(wb, wsRoles, 'Roles y Permisos');

// Hoja 3: Info Sistema
const wsInfo = XLSX.utils.json_to_sheet(infoSistema);
wsInfo['!cols'] = [
  { wch: 20 }, // Campo
  { wch: 50 }, // Valor
];
XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Sistema');

// Guardar archivo
const outputPath = path.join(process.cwd(), 'SinVello_Credenciales.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`\n✅ Archivo generado: ${outputPath}\n`);
console.log('📋 Contenido:');
console.log('   - Hoja "Usuarios": Credenciales de acceso');
console.log('   - Hoja "Roles y Permisos": Matriz de permisos por rol');
console.log('   - Hoja "Info Sistema": URLs y configuración\n');
