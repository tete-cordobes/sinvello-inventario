import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/inventario?sheets=error&message=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/inventario?sheets=error&message=missing_params`
      )
    }

    // Decodificar state
    let stateData: { userId: string; exportType: string; franquiciaId: string }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/inventario?sheets=error&message=invalid_state`
      )
    }

    // Intercambiar código por token
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${baseUrl}/api/export/sheets/callback`

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Error al obtener token:", await tokenResponse.text())
      return NextResponse.redirect(
        `${baseUrl}/inventario?sheets=error&message=token_error`
      )
    }

    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token

    // Obtener datos según el tipo de exportación
    let sheetData: { title: string; headers: string[]; rows: string[][] }

    if (stateData.exportType === "inventario") {
      sheetData = await getInventarioData(stateData.userId, stateData.franquiciaId)
    } else {
      sheetData = await getMovimientosData(stateData.userId, stateData.franquiciaId)
    }

    // Crear hoja de cálculo en Google Sheets
    const spreadsheetId = await createSpreadsheet(accessToken, sheetData)

    if (!spreadsheetId) {
      return NextResponse.redirect(
        `${baseUrl}/inventario?sheets=error&message=create_error`
      )
    }

    // Redirigir al spreadsheet creado
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    
    return NextResponse.redirect(spreadsheetUrl)
  } catch (error) {
    console.error("Error en callback:", error)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    return NextResponse.redirect(
      `${baseUrl}/inventario?sheets=error&message=server_error`
    )
  }
}

async function getInventarioData(userId: string, franquiciaId?: string) {
  // Obtener franquicias del usuario
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      franquicias: { select: { franquiciaId: true } },
    },
  })

  const franquiciaIds = usuario?.rol === "CENTRAL" 
    ? (franquiciaId ? [franquiciaId] : undefined)
    : usuario?.franquicias.map(f => f.franquiciaId)

  const inventario = await prisma.inventario.findMany({
    where: franquiciaIds ? { franquiciaId: { in: franquiciaIds } } : undefined,
    include: {
      producto: { select: { nombre: true, sku: true, categoria: true, precio: true } },
      franquicia: { select: { nombre: true, codigo: true } },
    },
    orderBy: [{ franquicia: { nombre: "asc" } }, { producto: { nombre: "asc" } }],
  })

  const fecha = new Date().toLocaleDateString("es-ES")
  
  return {
    title: `Inventario SinVello - ${fecha}`,
    headers: [
      "Franquicia",
      "Código",
      "Producto",
      "SKU",
      "Categoría",
      "Stock Actual",
      "Stock Mínimo",
      "Stock Máximo",
      "Estado",
      "Precio",
      "Valor Stock",
    ],
    rows: inventario.map(item => [
      item.franquicia.nombre,
      item.franquicia.codigo,
      item.producto.nombre,
      item.producto.sku || "-",
      item.producto.categoria,
      item.cantidadActual.toString(),
      item.stockMinimo.toString(),
      item.stockMaximo.toString(),
      item.cantidadActual <= item.stockMinimo ? "BAJO" : item.cantidadActual >= item.stockMaximo ? "EXCESO" : "OK",
      item.producto.precio ? `${item.producto.precio.toFixed(2)} €` : "-",
      item.producto.precio ? `${(item.producto.precio * item.cantidadActual).toFixed(2)} €` : "-",
    ]),
  }
}

async function getMovimientosData(userId: string, franquiciaId?: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      franquicias: { select: { franquiciaId: true } },
    },
  })

  const franquiciaIds = usuario?.rol === "CENTRAL"
    ? (franquiciaId ? [franquiciaId] : undefined)
    : usuario?.franquicias.map(f => f.franquiciaId)

  const movimientos = await prisma.movimiento.findMany({
    where: franquiciaIds ? { inventario: { franquiciaId: { in: franquiciaIds } } } : undefined,
    include: {
      inventario: {
        include: {
          producto: { select: { nombre: true, sku: true } },
          franquicia: { select: { nombre: true, codigo: true } },
        },
      },
      usuario: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  })

  const fecha = new Date().toLocaleDateString("es-ES")

  return {
    title: `Movimientos SinVello - ${fecha}`,
    headers: [
      "Fecha",
      "Hora",
      "Franquicia",
      "Producto",
      "Tipo",
      "Cantidad",
      "Stock Anterior",
      "Stock Nuevo",
      "Usuario",
      "Notas",
    ],
    rows: movimientos.map(mov => [
      new Date(mov.createdAt).toLocaleDateString("es-ES"),
      new Date(mov.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      mov.inventario.franquicia.nombre,
      mov.inventario.producto.nombre,
      mov.tipo === "REPOSICION" ? "Reposición" : mov.tipo === "CONSUMO" ? "Consumo" : "Ajuste",
      mov.tipo === "CONSUMO" ? `-${mov.cantidad}` : `+${mov.cantidad}`,
      mov.cantidadAnterior.toString(),
      mov.cantidadNueva.toString(),
      mov.usuario ? `${mov.usuario.nombre} ${mov.usuario.apellidos || ""}`.trim() : "Sistema",
      mov.notas || "-",
    ]),
  }
}

async function createSpreadsheet(
  accessToken: string,
  data: { title: string; headers: string[]; rows: string[][] }
): Promise<string | null> {
  try {
    // 1. Crear spreadsheet
    const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: data.title },
        sheets: [{
          properties: { title: "Datos" },
        }],
      }),
    })

    if (!createResponse.ok) {
      console.error("Error creando spreadsheet:", await createResponse.text())
      return null
    }

    const spreadsheet = await createResponse.json()
    const spreadsheetId = spreadsheet.spreadsheetId

    // 2. Añadir datos
    const values = [data.headers, ...data.rows]
    
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Datos!A1:Z${values.length}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    )

    if (!updateResponse.ok) {
      console.error("Error añadiendo datos:", await updateResponse.text())
    }

    // 3. Formatear encabezados (negrita y color de fondo)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: "COLUMNS",
                  startIndex: 0,
                  endIndex: data.headers.length,
                },
              },
            },
          ],
        }),
      }
    )

    return spreadsheetId
  } catch (error) {
    console.error("Error en createSpreadsheet:", error)
    return null
  }
}
