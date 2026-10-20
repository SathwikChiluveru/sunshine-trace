"use client"

import { useEffect, useState } from "react"
import { Search, BarChart3, GitBranch, Shield, Code2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  selectedAnalysisTypes?: string[] | null
}

const sections = [
  { id: "summary", label: "Summary", icon: Search },
  { id: "logging-quality", label: "Logging Quality", icon: BarChart3 },
  { id: "error-flows", label: "Error Flows", icon: GitBranch },
  { id: "sensitive-data", label: "Sensitive Data", icon: Shield },
  { id: "recommendations", label: "Recommendations", icon: Code2 },
]

export function Sidebar({ activeSection, onSectionChange, selectedAnalysisTypes }: SidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection)
  const visibleSections = sections.filter(section => section.id === "summary" || !selectedAnalysisTypes || selectedAnalysisTypes.includes(section.id === "error-flows" ? "error-flow" : section.id))

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id
            setCurrentSection(id)
            onSectionChange(id)
          }
        })
      },
      { threshold: 0.3, rootMargin: "-100px 0px -50% 0px" },
    )

    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [onSectionChange])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = window.innerWidth < 1024 ? 140 : 96
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      setCurrentSection(id)
      window.scrollTo({
        top: offsetPosition,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      })
    }
  }

  return (
    <aside className="report-sidebar fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border overflow-y-auto">
      <nav className="p-4 space-y-1" aria-label="Report sections">
        {visibleSections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={currentSection === id ? "location" : undefined}
            onClick={() => scrollToSection(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              currentSection === id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="report-sidebar-footer"><Link href="/"><ArrowLeft className="size-4" /> Back to workspace</Link><p>Sunshine Trace</p></div>
    </aside>
  )
}
