import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi';
import { 
  FiHome, FiUsers, FiUserCheck, FiShoppingBag, FiCalendar, 
  FiBox, FiTool, FiUserPlus, FiCreditCard, FiBarChart2, FiBell 
} from 'react-icons/fi';

const DashboardLayout = () => {
  const { currentUser, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', name: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { path: '/admin/vendors', name: 'Vendors', icon: <FiUserCheck className="w-5 h-5" /> },
    { path: '/admin/users', name: 'Users', icon: <FiUsers className="w-5 h-5" /> },
    { path: '/admin/services', name: 'Services', icon: <FiShoppingBag className="w-5 h-5" /> },
    { path: '/admin/bookings', name: 'Bookings', icon: <FiCalendar className="w-5 h-5" /> },
    { path: '/admin/supply-kits', name: 'Supply Kits', icon: <FiBox className="w-5 h-5" /> },
    { path: '/admin/contractors', name: 'Contractors', icon: <FiTool className="w-5 h-5" /> },
    { path: '/admin/employees', name: 'Employees', icon: <FiUserPlus className="w-5 h-5" /> },
    { path: '/admin/payments', name: 'Payments', icon: <FiCreditCard className="w-5 h-5" /> },
    { path: '/admin/analytics', name: 'Analytics', icon: <FiBarChart2 className="w-5 h-5" /> },
    { path: '/admin/notifications', name: 'Notifications', icon: <FiBell className="w-5 h-5" /> },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const menuItem = menuItems.find(item => item.path === currentPath);
    return menuItem ? menuItem.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <aside 
        className={`bg-gradient-to-b from-primary-dark to-secondary-dark text-white fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-8 border-b border-white/10">
            <h2 className="text-2xl font-bold">Homiqly</h2>
            <p className="text-sm opacity-80">Admin Panel</p>
          </div>
          
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-6 py-3 text-sm font-medium border-l-4 ${
                      location.pathname === item.path
                        ? 'border-secondary-light bg-white/10 text-white'
                        : 'border-transparent text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-md hover:bg-white/20"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block text-gray-500 focus:outline-none"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-500 focus:outline-none"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center text-gray-600">
                <span className="mr-2">{currentUser?.name || 'Admin User'}</span>
                <FiUser className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden bg-white border-t border-gray-200">
              <ul className="px-2 py-3 space-y-1">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        location.pathname === item.path
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;