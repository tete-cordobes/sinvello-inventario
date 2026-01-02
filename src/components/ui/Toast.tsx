"use client"

import { toast } from "sonner"
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react"

interface ToastProps {
  title: string
  description?: string
  type?: "success" | "error" | "warning" | "info" | "loading"
}

const toastConfig = {
  success: {
    icon: <CheckCircle size={20} className="text-green-500" />,
    color: "from-green-500 to-green-600",
    border: "border-green-400",
  },
  error: {
    icon: <XCircle size={20} className="text-red-500" />,
    color: "from-red-500 to-red-600",
    border: "border-red-400",
  },
  warning: {
    icon: <AlertCircle size={20} className="text-yellow-500" />,
    color: "from-yellow-500 to-yellow-600",
    border: "border-yellow-400",
  },
  info: {
    icon: <Info size={20} className="text-blue-500" />,
    color: "from-blue-500 to-blue-600",
    border: "border-blue-400",
  },
  loading: {
    icon: <Loader2 size={20} className="text-[var(--sinvello-primary)] animate-spin" />,
    color: "from-[var(--sinvello-primary)] to-[var(--sinvello-primary-hover)]",
    border: "border-[var(--sinvello-primary)]",
  },
}

export function showToast({
  title,
  description,
  type = "success",
}: ToastProps) {
  const config = toastConfig[type]

  toast(title, {
    description,
    icon: config.icon,
    classNames: {
      toast: `border shadow-xl rounded-xl p-4 flex gap-3 items-start min-w-[300px]
                 bg-gradient-to-br ${config.color} text-white ${config.border}`,
      title: "font-semibold",
      description: "text-white/90",
    },
    duration: type === "loading" ? Infinity : 3000,
  })
}
