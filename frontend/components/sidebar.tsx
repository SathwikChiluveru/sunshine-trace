"use client"

import { useEffect, useState } from "react"
import { Search, BarChart3, GitBranch, Shield, RefreshCw, Lightbulb, Code2, Brain, Bug } from "lucide-react"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const sections = [
  { id: "summary", label: "Summary", icon: Search },
  { id: "logging-quality", label: "Logging Quality", icon: BarChart3 },
  { id: "error-flows", label: "Error Flows", icon: GitBranch },
  { id: "sensitive-data", label: "Sensitive Data", icon: Shield },
  { id: "recommendations", label: "Recommendations", icon: Code2 },
]

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id
            console.log(`Section ${id} is in view`); 
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
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      console.log(`Scrolling to: ${id}, Offset position: ${offsetPosition}`);
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border overflow-y-auto">
      <nav className="p-4 space-y-1">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
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
    </aside>
  )
}
