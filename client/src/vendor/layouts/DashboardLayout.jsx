import React, { useState, useEffect, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { HeaderMenu } from "../../shared/components/Header";
import NotificationIcon from "../components/NotificationIcon";
import api from "../../lib/axiosConfig"; // ✅ your axios instance
import {
  Calendar,
  CreditCard,
  HelpCircle,
  Home,
  Menu as MenuIcon,
  ShoppingBag,
  Star,
  User,
  X,
} from "lucide-react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { IconButton } from "../../shared/components/Button";

/* small clsx helper */
const clsx = (...parts) => parts.filter(Boolean).join(" ");

/* Sidebar item component (keeps markup concise) */
const SidebarItem = ({ item, collapsed, pathname, onNavigate }) => {
  const active = pathname === item.path;
  return (
    <li>
      <Link
        to={item.path}
        onClick={onNavigate}
        title={collapsed ? item.name : ""}
        className={clsx(
          "flex items-center py-3 text-sm font-medium rounded-md transition",
          collapsed ? "justify-center px-4" : "px-6",
          active
            ? "bg-primary-light/15 text-primary"
            : "text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
        )}
      >
        <span className={clsx(collapsed ? "" : "mr-3")}>{item.icon}</span>
        {!collapsed && item.name}
      </Link>
    </li>
  );
};

const DashboardLayout = () => {
  const { currentUser, logout } = useVendorAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vendorType, setVendorType] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  // ✅ Fetch vendor profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/vendor/getprofile");
      const profile = res?.data?.profile;
      setVendorType(profile?.vendorType ?? null);
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Sidebar menu items
  const menuItems = useMemo(
    () => [
      {
        path: "/vendor/dashboard",
        name: "Dashboard",
        icon: <Home className="w-5 h-5" />,
      },
      {
        path: "/vendor/calendar",
        name: "Calendar",
        icon: <Calendar className="w-5 h-5" />,
      },
      {
        path: "/vendor/profile",
        name: "Profile",
        icon: <User className="w-5 h-5" />,
      },
      {
        path: "/vendor/services",
        name: "Apply for Services",
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        path: "/vendor/bookings",
        name: "Bookings",
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      // { path: "/vendor/supply-kits", name: "Supply Kits", icon: <FiBox className="w-5 h-5" /> },

      ...(vendorType !== "individual"
        ? [
            {
              path: "/vendor/employees",
              name: "Employees",
              icon: <User className="w-5 h-5" />,
            },
          ]
        : []),

      {
        path: "/vendor/payments",
        name: "Payments",
        icon: <CreditCard className="w-5 h-5" />,
      },
      {
        path: "/vendor/ratings",
        name: "Ratings",
        icon: <Star className="w-5 h-5" />,
      },
      {
        path: "/vendor/support",
        name: "Support",
        icon: <HelpCircle className="w-5 h-5" />,
      },
      {
        path: "/vendor/accountdetails",
        name: "Bank account details",
        icon: <CreditCard className="w-5 h-5" />,
      },
    ],
    [vendorType]
  );

  const getPageTitle = () => {
    const currentPath = location.pathname;

    // Try to find menu item where currentPath starts with its path
    const menuItem = menuItems.find(
      (item) =>
        currentPath === item.path || currentPath.startsWith(item.path + "/")
    );

    return menuItem ? menuItem.name : "Dashboard";
  };

  // Toggle sidebar
  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  // Close mobile menu
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // responsive widths
  const sidebarWidth = useMemo(
    () => (sidebarCollapsed ? 70 : 256),
    [sidebarCollapsed]
  );
  // const mainMarginLeft = useMemo(
  //   () => (sidebarCollapsed ? "" : ""),
  //   [sidebarCollapsed]
  // );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-background text-text-primary fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out lg:static lg:inset-0",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={clsx(
              "px-6 py-8 border-b border-white/10",
              sidebarCollapsed && "px-4"
            )}
          >
            <div
              className={clsx(
                "flex items-center",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              {sidebarCollapsed ? null : (
                <h2 className="text-2xl font-bold">Homiqly</h2>
              )}
            </div>
            {!sidebarCollapsed && (
              <p className="mt-2 text-sm opacity-80">Vendor Panel</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  item={item}
                  collapsed={sidebarCollapsed}
                  pathname={location.pathname}
                  onNavigate={closeMobileMenu}
                />
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        // style={{ marginLeft: mainMarginLeft }}
      >
        {/* Header */}
        <header className="z-10 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              {/* Desktop sidebar toggle */}
              <IconButton
                icon={<MenuIcon />}
                onClick={toggleSidebar}
                className="hidden p-2 text-gray-500 rounded-md lg:block hover:text-gray-700 focus:outline-none hover:bg-gray-100"
                aria-label={
                  sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              ></IconButton>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen((s) => !s)}
                className="text-gray-500 lg:hidden hover:text-gray-700 focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <MenuIcon className="w-6 h-6" />
                )}
              </button>

              <h1 className="ml-4 text-xl font-semibold text-gray-800">
                {getPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <HeaderMenu
                userName={currentUser?.name || "Vendor User"}
                userRole={currentUser?.vendor_type || "vendor"}
                onLogout={handleLogout}
                profilePath="/vendor/profile"
                settingsPath="/vendor/settings"
              />
              <NotificationIcon />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
