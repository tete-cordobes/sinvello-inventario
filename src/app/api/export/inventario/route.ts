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
    const format = searchParams.get("format") || "xlsx"

    // Obtener franquicias del usuario desde la BD
    let franquiciaIds: string[] = []

    if (session.user.rol === "CENTRAL") {
      if (franquiciaId) {
        franquiciaIds = [franquiciaId]
      }
      // Si no hay filtro, obtener todo
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

      // Si hay filtro de franquicia, verificar acceso
      if (franquiciaId) {
        if (!franquiciaIds.includes(franquiciaId)) {
          return NextResponse.json({ error: "Sin acceso a esta franquicia" }, { status: 403 })
        }
        franquiciaIds = [franquiciaId]
      }
    }

    // Obtener inventario
    const inventario = await prisma.inventario.findMany({
      where: franquiciaIds.length > 0 ? {
        franquiciaId: { in: franquiciaIds },
      } : undefined,
      include: {
        producto: {
          select: {
            nombre: true,
            sku: true,
            categoria: true,
            precio: true,
          },
        },
        franquicia: {
          select: {
            nombre: true,
            codigo: true,
          },
        },
      },
      orderBy: [
        { franquicia: { nombre: "asc" } },
        { producto: { nombre: "asc" } },
      ],
    })

    // Preparar datos para Excel
    const data = inventario.map((item) => ({
      "Franquicia": item.franquicia.nombre,
      "Código Franquicia": item.franquicia.codigo,
      "Producto": item.producto.nombre,
      "SKU": item.producto.sku || "-",
      "Categoría": item.producto.categoria,
      "Stock Actual": item.cantidadActual,
      "Stock Mínimo": item.stockMinimo,
      "Stock Máximo": item.stockMaximo,
      "Estado": item.cantidadActual <= item.stockMinimo 
        ? "BAJO" 
        : item.cantidadActual >= item.stockMaximo 
          ? "EXCESO" 
          : "OK",
      "Ubicación": item.ubicacion || "-",
      "Precio Unitario": item.producto.precio 
        ? `${item.producto.precio.toFixed(2)} €` 
        : "-",
      "Valor en Stock": item.producto.precio 
        ? `${(item.producto.precio * item.cantidadActual).toFixed(2)} €` 
        : "-",
      "Última Actualización": item.updatedAt.toLocaleDateString("es-ES"),
    }))

    if (format === "json") {
      return NextResponse.json(data)
    }

    // Crear Excel
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario")

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 25 }, // Franquicia
      { wch: 15 }, // Código Franquicia
      { wch: 35 }, // Producto
      { wch: 15 }, // SKU
      { wch: 20 }, // Categoría
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Stock Mínimo
      { wch: 12 }, // Stock Máximo
      { wch: 10 }, // Estado
      { wch: 20 }, // Ubicación
      { wch: 15 }, // Precio Unitario
      { wch: 15 }, // Valor en Stock
      { wch: 18 }, // Última Actualización
    ]
    worksheet["!cols"] = colWidths

    // Generar buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

    // Nombre del archivo
    const fecha = new Date().toISOString().split("T")[0]
    const filename = franquiciaId 
      ? `inventario_${inventario[0]?.franquicia.codigo || "export"}_${fecha}.xlsx`
      : `inventario_completo_${fecha}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error al exportar inventario:", error)
    return NextResponse.json(
      { error: "Error al exportar inventario" },
      { status: 500 }
    )
  }
}
