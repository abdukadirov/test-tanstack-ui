import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between">
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/">Home</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/table">TanStack Table</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/tanstack-query">TanStack Query</Link>
        </div>
      </nav>
      
      <div className="flex items-center">
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user?.name}</span>
            <button 
              onClick={logout}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link 
            to="/" 
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
