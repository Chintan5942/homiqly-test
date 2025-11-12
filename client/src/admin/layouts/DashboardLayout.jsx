import React, { useState, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { HeaderMenu } from "../../shared/components/Header";
import NotificationIcon from "../components/NotificationIcon";
import { IconButton } from "../../shared/components/Button";
import {
  ChevronDown,
  ChevronRight,
  Home,
  User,
  UserCheck,
  ShoppingBag,
  Calendar,
  UserPlus,
  BarChart2,
  Users,
  Star,
  CheckSquare,
  Bell,
  HelpCircleIcon,
  ToolCase,
} from "lucide-react";

/* Menu configuration */
const menuItems = [
  {
    path: "/admin/dashboard",
    name: "Dashboard",
    icon: <Home className="w-5 h-5" />,
  },
  {
    path: "/admin/vendors",
    name: "Vendors",
    icon: <UserCheck className="w-5 h-5" />,
  },
  {
    path: "/admin/tempvendor",
    name: "Temp Vendor",
    icon: <UserCheck className="w-5 h-5" />,
  },
  {
    path: "/admin/users",
    name: "Users",
    icon: <User className="w-5 h-5" />,
  },
  {
    path: "/admin/services",
    name: "Services",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    path: "/admin/packages",
    name: "Packages",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    path: "/admin/bookings",
    name: "Bookings",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    path: "/admin/employees",
    name: "Employees",
    icon: <UserPlus className="w-5 h-5" />,
  },
  {
    path: "/admin/analytics",
    name: "Analytics",
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    path: "/admin/vendor-applications",
    name: "Vendor Applications",
    icon: <Users className="w-5 h-5" />,
  },
  {
    path: "/admin/rating",
    name: "Rating",
    icon: <Star className="w-5 h-5" />,
    children: [
      { path: "/admin/rating/user", name: "User Ratings" },
      { path: "/admin/rating/vendor", name: "Vendor Ratings" },
      { path: "/admin/rating/package", name: "Package Ratings" },
    ],
  },
  {
    path: "/admin/payments",
    name: "Payments",
    icon: <CheckSquare className="w-5 h-5" />,
    children: [
      { path: "/admin/payments/payoutlist", name: "Payouts" },
      { path: "/admin/payments/history", name: "History" },
    ],
  },
  {
    path: "/admin/notifications",
    name: "Notifications",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    path: "/admin/tickets",
    name: "Support Tickets",
    icon: <HelpCircleIcon className="w-5 h-5" />,
  },
  {
    path: "/admin/settings",
    name: "Settings",
    icon: <ToolCase className="w-5 h-5" />,
    children: [
      { path: "/admin/promocodes", name: "Promo Codes" },
      { path: "/admin/settings/platform-tax", name: "Platform Tax" },
      // { path: "/admin/settings/general", name: "General Settings" },
      { path: "/admin/settings/platform-fees", name: "Platform Fees" },
      { path: "/admin/settings/city", name: "Add City" },
    ],
  },
];

const clsx = (...parts) => parts.filter(Boolean).join(" ");

const SidebarItem = ({
  item,
  sidebarCollapsed,
  locationPath,
  openSubmenu,
  setOpenSubmenu,
}) => {
  const isActive = locationPath.startsWith(item.path);

  // item with children
  if (item.children) {
    const open = openSubmenu === item.name;
    return (
      <>
        <button
          type="button"
          onClick={() => setOpenSubmenu(open ? null : item.name)}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition",
            isActive
              ? "bg-primary-light/15 text-primary"
              : "text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
          )}
        >
          <span className="flex items-center">
            <span className="mr-3">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.name}</span>}
          </span>

          {!sidebarCollapsed &&
            (open ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            ))}
        </button>

        {/* Children only expand if open and sidebar is not collapsed */}
        {!sidebarCollapsed && open && (
          <ul className="ml-8 border-l border-gray-300">
            {item.children.map((child) => {
              const childActive = locationPath.startsWith(child.path);
              return (
                <li key={child.path} className="relative pl-6 py-1">
                  <Link
                    to={child.path}
                    className={clsx(
                      "block py-2 pl-5 text-sm rounded-md transition",
                      childActive
                        ? "text-primary bg-primary-light/10"
                        : "text-text-muted hover:text-text-primary hover:bg-backgroundTertiary/30"
                    )}
                  >
                    {child.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  // simple item
  return (
    <Link
      to={item.path}
      className={clsx(
        "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-primary-light/15 text-primary"
          : "text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
      )}
    >
      <span className="mr-3">{item.icon}</span>
      {!sidebarCollapsed && <span>{item.name}</span>}
    </Link>
  );
};

const DashboardLayout = () => {
  const { currentUser, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  // Sidebar width logic
  const sidebarWidth = useMemo(() => (sidebarCollapsed ? 70 : 256), [
    sidebarCollapsed,
  ]);
  const mainMarginLeft = useMemo(
    () => (sidebarCollapsed ? "5rem" : "16rem"),
    [sidebarCollapsed]
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className="bg-background text-text-primary fixed inset-y-0 left-0 transition-all duration-300"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-4 border-b border-white/10 flex items-center justify-center">
            {/* Branding shown only when not collapsed */}
            {!sidebarCollapsed && (
              <div className="">
                <h2 className="text-2xl font-bold text-text-primary">
                  Homiqly Admin
                </h2>
                {/* <img src="/Homiqly-Admin.png" alt="Homiqly-Admin" /> */}
              </div>
            )}
          </div>

          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <SidebarItem
                    item={item}
                    sidebarCollapsed={sidebarCollapsed}
                    locationPath={location.pathname}
                    openSubmenu={openSubmenu}
                    setOpenSubmenu={setOpenSubmenu}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: mainMarginLeft }}
      >
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <IconButton
                variant="ghost"
                className="rounded"
                onClick={() => setSidebarCollapsed((s) => !s)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                icon={<MenuIcon />}
              />
            </div>

            <div className="flex items-center space-x-4">
              <HeaderMenu
                userName={currentUser?.name || "Admin User"}
                userRole={currentUser?.role || "admin"}
                onLogout={handleLogout}
                profilePath="/admin/profile"
                // settingsPath="/admin/settings"
              />
              <NotificationIcon />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// small lightweight Menu icon to avoid importing unused lucide icons everywhere
const MenuIcon = (props) => <svg {...props} className={clsx("w-5 h-5", props.className)} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>;

export default DashboardLayout;
