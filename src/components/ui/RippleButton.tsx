"use client"

import { ButtonHTMLAttributes, forwardRef, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ children, className, onClick, ...props }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = buttonRef.current
      }
    }, [ref])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const ripple = document.createElement("span")
      ripple.className = "ripple"
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`

      button.appendChild(ripple)

      setTimeout(() => {
        ripple.remove()
      }, 600)

      onClick?.(e)
    }

    return (
      <button
        ref={buttonRef}
        className={cn("ripple", className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)

RippleButton.displayName = "RippleButton"

export default RippleButton
