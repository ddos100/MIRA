import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Documents from '@/pages/Documents'
import Frameworks from '@/pages/Frameworks'
import Evidence from '@/pages/Evidence'
import Agents from '@/pages/Agents'
import Integrations from '@/pages/Integrations'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="frameworks" element={<Frameworks />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="agents" element={<Agents />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
