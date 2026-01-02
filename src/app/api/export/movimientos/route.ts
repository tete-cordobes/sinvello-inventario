import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franquiciaId = searchParams.get("franquiciaId")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const tipo = searchParams.get("tipo")
    const format = searchParams.get("format") || "xlsx"

    // Obtener franquicias del usuario desde la BD
    let franquiciaIds: string[] = []

    if (session.user.rol === "CENTRAL") {
      if (franquiciaId) {
        franquiciaIds = [franquiciaId]
      }
    } else {
      const usuarioConFranquicias = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: {
          franquicias: {
            select: { franquiciaId: true },
          },
        },
      })

      if (!usuarioConFranquicias) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      franquiciaIds = usuarioConFranquicias.franquicias.map((f) => f.franquiciaId)

      if (franquiciaId) {
        if (!franquiciaIds.includes(franquiciaId)) {
          return NextResponse.json({ error: "Sin acceso a esta franquicia" }, { status: 403 })
        }
        franquiciaIds = [franquiciaId]
      }
    }

    // Construir filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (franquiciaIds.length > 0) {
      where.inventario = {
        franquiciaId: { in: franquiciaIds },
      }
    }

    if (tipo && tipo !== "all") {
      where.tipo = tipo
    }

    if (desde || hasta) {
      where.createdAt = {}
      if (desde) {
        where.createdAt.gte = new Date(desde)
      }
      if (hasta) {
        const hastaDate = new Date(hasta)
        hastaDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = hastaDate
      }
    }

    // Obtener movimientos
    const movimientos = await prisma.movimiento.findMany({
      where,
      include: {
        inventario: {
          include: {
            producto: {
              select: {
                nombre: true,
                sku: true,
                categoria: true,
              },
            },
            franquicia: {
              select: {
                nombre: true,
                codigo: true,
              },
            },
          },
        },
        usuario: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // Limitar a 10,000 registros
    })

    // Preparar datos para Excel
    const data = movimientos.map((mov) => ({
      "Fecha": mov.createdAt.toLocaleDateString("es-ES"),
      "Hora": mov.createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      "Franquicia": mov.inventario.franquicia.nombre,
      "Código Franquicia": mov.inventario.franquicia.codigo,
      "Producto": mov.inventario.producto.nombre,
      "SKU": mov.inventario.producto.sku || "-",
      "Categoría": mov.inventario.producto.categoria,
      "Tipo": mov.tipo === "REPOSICION" ? "Reposición" : mov.tipo === "CONSUMO" ? "Consumo" : "Ajuste",
      "Cantidad": mov.tipo === "CONSUMO" ? -mov.cantidad : mov.cantidad,
      "Stock Anterior": mov.cantidadAnterior,
      "Stock Nuevo": mov.cantidadNueva,
      "Origen": mov.origen === "MANUAL" ? "Manual" : mov.origen === "WEBHOOK" ? "Webhook" : "Sistema",
      "Usuario": mov.usuario 
        ? `${mov.usuario.nombre} ${mov.usuario.apellidos || ""}`.trim()
        : "Sistema",
      "Email Usuario": mov.usuario?.email || "-",
      "Notas": mov.notas || "-",
    }))

    if (format === "json") {
      return NextResponse.json(data)
    }

    // Crear Excel
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos")

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 25 }, // Franquicia
      { wch: 15 }, // Código Franquicia
      { wch: 35 }, // Producto
      { wch: 15 }, // SKU
      { wch: 20 }, // Categoría
      { wch: 12 }, // Tipo
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Stock Anterior
      { wch: 12 }, // Stock Nuevo
      { wch: 10 }, // Origen
      { wch: 25 }, // Usuario
      { wch: 30 }, // Email Usuario
      { wch: 40 }, // Notas
    ]
    worksheet["!cols"] = colWidths

    // Generar buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

    // Nombre del archivo
    const fecha = new Date().toISOString().split("T")[0]
    let filename = `movimientos_${fecha}.xlsx`
    
    if (franquiciaId && movimientos.length > 0) {
      filename = `movimientos_${movimientos[0].inventario.franquicia.codigo}_${fecha}.xlsx`
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error al exportar movimientos:", error)
    return NextResponse.json(
      { error: "Error al exportar movimientos" },
      { status: 500 }
    )
  }
}
