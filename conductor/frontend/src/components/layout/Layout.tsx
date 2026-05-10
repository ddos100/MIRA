import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Shield, Database,
  Bot, Plug, FileBarChart, Settings,
} from 'lucide-react'

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/documents',    label: 'Documents',    Icon: FileText },
  { to: '/frameworks',   label: 'Frameworks',   Icon: Shield },
  { to: '/evidence',     label: 'Evidence',     Icon: Database },
  { to: '/agents',       label: 'Agents',       Icon: Bot },
  { to: '/integrations', label: 'Integrations', Icon: Plug },
  { to: '/reports',      label: 'Reports',      Icon: FileBarChart },
  { to: '/settings',     label: 'Settings',     Icon: Settings },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-brand text-white flex flex-col shadow-lg">
        <div className="px-6 py-5 border-b border-brand-light">
          <h1 className="text-lg font-bold tracking-tight">MIRA-Conductor</h1>
          <p className="text-xs text-blue-200 mt-0.5">AI Cybersecurity Automation</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-brand-light text-white' : 'text-blue-100 hover:bg-brand-light hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-brand-light text-xs text-blue-300">
          Local LLM via Ollama · No cloud uploads
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
