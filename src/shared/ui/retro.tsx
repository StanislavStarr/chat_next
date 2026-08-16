import { cx } from "@/shared/lib/cx"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

export const retroScreenClassName = cx(
  "border bg-[repeating-linear-gradient(0deg,rgba(114,247,126,0.02)_0,rgba(114,247,126,0.02)_1px,transparent_1px,transparent_3px),var(--color-screen)]",
  "shadow-[inset_0_0_2.5rem_#000,0_0_0.6rem_rgba(114,247,126,0.05)]",
)

type RetroButtonProps = ComponentPropsWithoutRef<"button">

export function RetroButton({ className, ...props }: RetroButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "min-h-8 border border-[#6e7763] bg-gradient-to-b from-[#252b21] to-[#0b0e0a] px-[0.7rem] py-[0.35rem] text-[0.75rem] uppercase tracking-[0.05em] text-green shadow-[inset_1px_1px_#48503f,inset_-1px_-1px_#030403] [text-shadow:0_0_6px_rgba(114,247,126,0.45)]",
        "enabled:hover:border-green enabled:hover:bg-[#142016] enabled:hover:shadow-[inset_0_0_0_1px_var(--color-green-muted),0_0_0.7rem_rgba(114,247,126,0.2)]",
        "enabled:active:bg-[#070a07] enabled:active:shadow-[inset_1px_1px_0.4rem_#000]",
        "disabled:cursor-not-allowed disabled:text-[#526154] disabled:[text-shadow:none]",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-green focus-visible:outline-offset-2",
        className,
      )}
    />
  )
}

type RetroPanelProps = {
  children: ReactNode
  ariaLabelledBy: string
  className?: string
}

export function RetroPanel({
  children,
  ariaLabelledBy,
  className,
}: RetroPanelProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cx(
        "min-h-0 min-w-0 border border-metal bg-gradient-to-br from-[#171b14] to-[#0c0f0b] outline outline-2 outline-[#090b08]",
        "shadow-[inset_0_0_0_1px_var(--color-metal-dark),inset_0_0_2rem_rgba(0,0,0,0.65),0_0_1.5rem_rgba(0,0,0,0.75)]",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function RetroPanelHeader({ children }: { children: ReactNode }) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-3 border-b border-metal bg-gradient-to-b from-[#24291f] to-[#11150f] px-3 py-[0.6rem] max-sm:flex-col max-sm:items-stretch">
      {children}
    </header>
  )
}

export function RetroPanelHeading({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <h2
      id={id}
      className="m-0 text-[0.9rem] font-medium uppercase tracking-[0.1em] text-amber [text-shadow:0_0_7px_rgba(213,189,108,0.3)]"
    >
      {children}
    </h2>
  )
}
