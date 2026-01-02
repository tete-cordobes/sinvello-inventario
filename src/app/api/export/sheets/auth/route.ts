import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Genera la URL de autorización de Google OAuth
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get("type") || "inventario"
    const franquiciaId = searchParams.get("franquiciaId") || ""

    const clientId = process.env.GOOGLE_CLIENT_ID

    if (!clientId) {
      return NextResponse.json(
        { error: "Google no está configurado. Contacta al administrador." },
        { status: 500 }
      )
    }

    // URI de redirección - página que recibe el token
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/export/sheets/callback`

    // Scopes necesarios para Google Sheets
    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ].join(" ")

    // State para pasar información al callback
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      exportType,
      franquiciaId,
    })).toString("base64")

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", scopes)
    authUrl.searchParams.set("access_type", "online") // No necesitamos refresh token
    authUrl.searchParams.set("prompt", "select_account") // Siempre mostrar selector de cuenta
    authUrl.searchParams.set("state", state)

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error("Error al generar URL de auth:", error)
    return NextResponse.json(
      { error: "Error al generar URL de autorización" },
      { status: 500 }
    )
  }
}
