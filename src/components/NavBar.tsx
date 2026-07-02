import { NavLink, useLocation } from 'react-router-dom'

const ITEMS: Array<{ to: string; label: string }> = [
  { to: '/', label: '首页' },
  { to: '/library', label: '词库' },
  { to: '/import', label: '导入' },
  { to: '/stats', label: '统计' },
  { to: '/settings', label: '设置' },
]

export default function NavBar() {
  const { pathname } = useLocation()

  if (pathname.startsWith('/study') || /^\/library\/[^/]+$/.test(pathname)) {
    return null
  }

  return (
    <nav className="app-bottom-nav">
      {ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `py-3 text-center text-sm ${isActive ? 'text-sky-600 font-medium' : 'text-slate-500'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
