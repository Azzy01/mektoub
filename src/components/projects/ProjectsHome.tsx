'use client'

import ProjectsSection from '../home/ProjectsSection'

export default function ProjectsHome() {
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Projects</div>

      {/* Reuse the exact same collapsible section you already have */}
      <ProjectsSection />
    </div>
  )
}
