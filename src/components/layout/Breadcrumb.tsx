import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbProps {
  items: Array<{
    label: string
    href: string
  }>
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm mb-4" aria-label="Navegación de migas pan">
      <ol className="flex items-center space-x-1 text-[var(--sinvello-text)]">
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-[var(--sinvello-text-dark)] hover:text-[var(--sinvello-primary)] transition-colors"
            aria-current={items.length === 0 ? "page" : undefined}
          >
            <Home size={16} />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            <ChevronRight size={14} className="text-[var(--sinvello-text)]" aria-hidden="true" />
            <Link
              href={item.href}
              className={`flex items-center gap-1 hover:text-[var(--sinvello-primary)] transition-colors ${
                index === items.length - 1 ? "font-medium" : ""
              }`}
              aria-current={index === items.length - 1 ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
