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

  // LIMPIAR BASE DE DATOS
  console.log("🗑️  Limpiando datos existentes...")
  await prisma.movimiento.deleteMany()
  await prisma.inventario.deleteMany()
  await prisma.usuarioFranquicia.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.franquicia.deleteMany()
  console.log("✅ Datos anteriores eliminados")

  // Leer productos del archivo JSON
  const productosPath = path.join(__dirname, "../../productos.json")
  const productosData = JSON.parse(fs.readFileSync(productosPath, "utf-8"))
  const productos = productosData.productos

  console.log(`📦 Encontrados ${productos.length} productos para importar`)

  // Crear franquicias Naheri
  const franquicias = await Promise.all([
    prisma.franquicia.create({
      data: {
        codigo: "ALB001",
        nombre: "Naheri Albacete",
        direccion: "Albacete",
        email: "albacete@naheri.es",
      },
    }),
    prisma.franquicia.create({
      data: {
        codigo: "POZ001",
        nombre: "Naheri Pozoblanco",
        direccion: "Pozoblanco",
        email: "pozoblanco@naheri.es",
      },
    }),
    prisma.franquicia.create({
      data: {
        codigo: "BEN001",
        nombre: "Naheri Benimaclet",
        direccion: "Benimaclet, Valencia",
        email: "benimaclet@naheri.es",
      },
    }),
    prisma.franquicia.create({
      data: {
        codigo: "PAT001",
        nombre: "Naheri Patraix",
        direccion: "Patraix, Valencia",
        email: "patraix@naheri.es",
      },
    }),
  ])

  console.log(`🏢 Creadas ${franquicias.length} franquicias`)

  // Crear usuarios
  const passwords = {
    alba: await hash("lg5gEE0X7QpU", 12),
    albacete: await hash("UvpLkkj65cL7", 12),
    pozoblanco: await hash("fhweJLDmiQnm", 12),
    benimaclet: await hash("02qcM5Q7V9HL", 12),
    patraix: await hash("T7NqTO4sj1qe", 12),
  }

  // Usuario Central (Alba)
  await prisma.usuario.create({
    data: {
      email: "alba@naheri.es",
      passwordHash: passwords.alba,
      nombre: "Alba",
      rol: Rol.CENTRAL,
    },
  })

  // Técnicos por franquicia
  await prisma.usuario.create({
    data: {
      email: "albacete@naheri.es",
      passwordHash: passwords.albacete,
      nombre: "Técnico",
      apellidos: "Albacete",
      rol: Rol.TECNICO,
      franquicias: {
        create: {
          franquiciaId: franquicias[0].id,
        },
      },
    },
  })

  await prisma.usuario.create({
    data: {
      email: "pozoblanco@naheri.es",
      passwordHash: passwords.pozoblanco,
      nombre: "Técnico",
      apellidos: "Pozoblanco",
      rol: Rol.TECNICO,
      franquicias: {
        create: {
          franquiciaId: franquicias[1].id,
        },
      },
    },
  })

  await prisma.usuario.create({
    data: {
      email: "benimaclet@naheri.es",
      passwordHash: passwords.benimaclet,
      nombre: "Técnico",
      apellidos: "Benimaclet",
      rol: Rol.TECNICO,
      franquicias: {
        create: {
          franquiciaId: franquicias[2].id,
        },
      },
    },
  })

  await prisma.usuario.create({
    data: {
      email: "patraix@naheri.es",
      passwordHash: passwords.patraix,
      nombre: "Técnico",
      apellidos: "Patraix",
      rol: Rol.TECNICO,
      franquicias: {
        create: {
          franquiciaId: franquicias[3].id,
        },
      },
    },
  })

  console.log(`👤 Creados 5 usuarios`)

  // Crear productos
  const productosCreados = await Promise.all(
    productos.map(async (p: { nombre: string; precio_num: number; imagen: string; url: string }, index: number) => {
      const sku = `NH-${String(index + 1).padStart(4, "0")}`
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
          descripcion: `Producto Naheri: ${p.nombre}`,
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
    where: { apiKey: "naheri-webhook-2024-secret" },
    update: {},
    create: {
      nombre: "Webhook Consumo Semanal",
      apiKey: "naheri-webhook-2024-secret",
      activo: true,
    },
  })

  console.log("🔐 Configuración de webhook creada")

  console.log("\n✅ Seed completado exitosamente!")
  console.log("\n📋 Usuarios creados:")
  console.log("   - alba@naheri.es (CENTRAL)")
  console.log("   - albacete@naheri.es (TECNICO - Albacete)")
  console.log("   - pozoblanco@naheri.es (TECNICO - Pozoblanco)")
  console.log("   - benimaclet@naheri.es (TECNICO - Benimaclet)")
  console.log("   - patraix@naheri.es (TECNICO - Patraix)")
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
