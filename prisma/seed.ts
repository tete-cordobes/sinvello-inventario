import { PrismaClient, Rol } from "@prisma/client"
import { hash } from "bcryptjs"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

// Categorías basadas en el catálogo de SinVello
const categoriasProductos: Record<string, string> = {
  "AGUA MICELAR": "CONSUMIBLES",
  "ALCOHOL": "CONSUMIBLES",
  "BIBERON GEL": "CONSUMIBLES",
  "BLUSA UNIFORME": "TEXTIL",
  "BOLSA DE CUCHILLAS": "DESECHABLES",
  "BOLSA PAPEL": "DESECHABLES",
  "BRUMA": "PRODUCTO",
  "BRUMIZADOR": "EQUIPAMIENTO",
  "CERA": "CONSUMIBLES",
  "CORREA": "EQUIPAMIENTO",
  "CREMA CORPORAL": "PRODUCTO",
  "CREMA FACIAL": "PRODUCTO",
  "DEPRESORES": "DESECHABLES",
  "ESPARADRAPO": "DESECHABLES",
  "ETIQUETA": "DESECHABLES",
  "FLYERS": "MERCH",
  "GAFAS CLIENTES": "DESECHABLES",
  "GAFAS LASER": "EQUIPAMIENTO",
  "GARRAFA GEL": "CONSUMIBLES",
  "GEL ALOE": "PRODUCTO",
  "GUANTES": "DESECHABLES",
  "LAMINAS": "MERCH",
  "LAPIZ": "DESECHABLES",
  "LECHE REGENERADORA": "PRODUCTO",
  "OXVIRIN": "LIMPIEZA",
  "PACK 25 STICKERS": "MERCH",
  "PANTALÓN": "TEXTIL",
  "PEGATINA": "MERCH",
  "POSTERS": "MERCH",
  "RASURADORA": "DESECHABLES",
  "ROLLO CAMILLA": "DESECHABLES",
  "SOBRE TARJETA": "MERCH",
  "TANGA": "DESECHABLES",
  "TARJETA": "MERCH",
  "TAZA": "MERCH",
  "TOALLITAS": "LIMPIEZA",
  "VINILO": "EQUIPAMIENTO",
}

function getCategoria(nombreProducto: string): string {
  const nombreUpper = nombreProducto.toUpperCase()
  for (const [key, categoria] of Object.entries(categoriasProductos)) {
    if (nombreUpper.includes(key)) {
      return categoria
    }
  }
  return "Uncategorized"
}

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...")

  // Leer productos del archivo JSON
  const productosPath = path.join(__dirname, "../../productos.json")
  const productosData = JSON.parse(fs.readFileSync(productosPath, "utf-8"))
  const productos = productosData.productos

  console.log(`📦 Encontrados ${productos.length} productos para importar`)

  // Crear franquicias de ejemplo
  const franquicias = await Promise.all([
    prisma.franquicia.upsert({
      where: { codigo: "MAD001" },
      update: {},
      create: {
        codigo: "MAD001",
        nombre: "SinVello Madrid Centro",
        direccion: "Calle Gran Vía 45, Madrid",
        telefono: "+34 911 234 567",
        email: "madrid@sinvello.es",
      },
    }),
    prisma.franquicia.upsert({
      where: { codigo: "BCN001" },
      update: {},
      create: {
        codigo: "BCN001",
        nombre: "SinVello Barcelona",
        direccion: "Passeig de Gràcia 78, Barcelona",
        telefono: "+34 932 345 678",
        email: "barcelona@sinvello.es",
      },
    }),
    prisma.franquicia.upsert({
      where: { codigo: "VAL001" },
      update: {},
      create: {
        codigo: "VAL001",
        nombre: "SinVello Valencia",
        direccion: "Calle Colón 32, Valencia",
        telefono: "+34 963 456 789",
        email: "valencia@sinvello.es",
      },
    }),
  ])

  console.log(`🏢 Creadas ${franquicias.length} franquicias`)

  // Crear usuarios de ejemplo
  const passwordHash = await hash("sinvello2024", 12)

  const usuarios = await Promise.all([
    // Usuario Central
    prisma.usuario.upsert({
      where: { email: "admin@sinvello.es" },
      update: {},
      create: {
        email: "admin@sinvello.es",
        passwordHash,
        nombre: "Administrador",
        apellidos: "Central",
        rol: Rol.CENTRAL,
        // Central no necesita franquicias
      },
    }),
    // Franquiciado Madrid
    prisma.usuario.upsert({
      where: { email: "madrid@sinvello.es" },
      update: {},
      create: {
        email: "madrid@sinvello.es",
        passwordHash,
        nombre: "Carlos",
        apellidos: "García López",
        rol: Rol.FRANQUICIADO,
        franquicias: {
          create: {
            franquiciaId: franquicias[0].id,
          },
        },
      },
    }),
    // Técnico Madrid
    prisma.usuario.upsert({
      where: { email: "tecnico.madrid@sinvello.es" },
      update: {},
      create: {
        email: "tecnico.madrid@sinvello.es",
        passwordHash,
        nombre: "Ana",
        apellidos: "Martínez Ruiz",
        rol: Rol.TECNICO,
        franquicias: {
          create: {
            franquiciaId: franquicias[0].id,
          },
        },
      },
    }),
    // Franquiciado Barcelona
    prisma.usuario.upsert({
      where: { email: "barcelona@sinvello.es" },
      update: {},
      create: {
        email: "barcelona@sinvello.es",
        passwordHash,
        nombre: "María",
        apellidos: "Fernández Vidal",
        rol: Rol.FRANQUICIADO,
        franquicias: {
          create: {
            franquiciaId: franquicias[1].id,
          },
        },
      },
    }),
  ])

  console.log(`👤 Creados ${usuarios.length} usuarios`)

  // Crear productos
  const productosCreados = await Promise.all(
    productos.map(async (p: { nombre: string; precio_num: number; imagen: string; url: string }, index: number) => {
      const sku = `SV-${String(index + 1).padStart(4, "0")}`
      return prisma.producto.upsert({
        where: { sku },
        update: {
          nombre: p.nombre,
          precio: p.precio_num,
          imagenUrl: p.imagen,
          categoria: getCategoria(p.nombre),
        },
        create: {
          nombre: p.nombre,
          precio: p.precio_num,
          imagenUrl: p.imagen,
          categoria: getCategoria(p.nombre),
          sku,
          descripcion: `Producto SinVello: ${p.nombre}`,
        },
      })
    })
  )

  console.log(`📦 Creados ${productosCreados.length} productos`)

  // Crear inventario inicial para cada franquicia
  let inventarioCount = 0
  for (const franquicia of franquicias) {
    for (const producto of productosCreados) {
      // Stock aleatorio entre 5 y 50
      const cantidadInicial = Math.floor(Math.random() * 46) + 5

      await prisma.inventario.upsert({
        where: {
          franquiciaId_productoId: {
            franquiciaId: franquicia.id,
            productoId: producto.id,
          },
        },
        update: {},
        create: {
          franquiciaId: franquicia.id,
          productoId: producto.id,
          cantidadActual: cantidadInicial,
          stockMinimo: 5,
          stockMaximo: 100,
        },
      })
      inventarioCount++
    }
  }

  console.log(`📊 Creados ${inventarioCount} registros de inventario`)

  // Crear webhook config
  await prisma.webhookConfig.upsert({
    where: { apiKey: "sinvello-webhook-2024-secret" },
    update: {},
    create: {
      nombre: "Webhook Consumo Semanal",
      apiKey: "sinvello-webhook-2024-secret",
      activo: true,
    },
  })

  console.log("🔐 Configuración de webhook creada")

  console.log("\n✅ Seed completado exitosamente!")
  console.log("\n📋 Usuarios de prueba:")
  console.log("   - admin@sinvello.es (Central) - Pass: sinvello2024")
  console.log("   - madrid@sinvello.es (Franquiciado Madrid) - Pass: sinvello2024")
  console.log("   - tecnico.madrid@sinvello.es (Técnico Madrid) - Pass: sinvello2024")
  console.log("   - barcelona@sinvello.es (Franquiciado Barcelona) - Pass: sinvello2024")
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
