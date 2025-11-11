import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import { DollarSign, ShoppingBag, UserCheck, Users } from "lucide-react";
import LoadingSlider from "../../shared/components/LoadingSpinner";
import { formatCurrency } from "../../shared/utils/formatUtils";
// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_vendors: 0,
    completed_bookings: 0,
    total_revenue: 0,
  });

  const [bookingTrends, setBookingTrends] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [statsRes, trendsRes, catRes] = await Promise.all([
          api.get("/api/analytics/dashboard"),
          api.get("/api/analytics/booking-trends"),
          api.get("/api/analytics/service-categories"),
        ]);

        setStats(statsRes.data.stats);
        setBookingTrends(trendsRes.data.trends);
        setCategoryStats(catRes.data.stats);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const bookingChartData = {
    labels: bookingTrends.map((t) =>
      new Date(t.booking_date).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Total Bookings",
        data: bookingTrends.map((t) => t.booking_count),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const categoryChartData = {
    labels: categoryStats.map((s) => s.serviceCategory),
    datasets: [
      {
        data: categoryStats.map((s) => s.booking_count),
        backgroundColor: [
          "#3b82f6",
          "#60a5fa",
          "#1e40af",
          "#1e3a8a",
          "#dbeafe",
          "#93c5fd",
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) return <LoadingSlider />;

  if (error)
    return (
      <div className="bg-red-50  text-red-600  p-4 rounded-lg text-center border border-red-100 ">
        {error}
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
        <p className="text-sm text-gray-500 ">
          Overview of platform performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: stats.total_users,
            icon: <Users className="text-blue-500" />,
            gradient: "from-blue-50 to-blue-100",
            border: "border-blue-100",
            text: "text-blue-600",
          },
          {
            label: "Total Vendors",
            value: stats.total_vendors,
            icon: <UserCheck className="text-green-500" />,
            gradient: "from-green-50 to-green-100",
            border: "border-green-100",
            text: "text-green-600",
          },
          {
            label: "Completed Bookings",
            value: stats.completed_bookings,
            icon: <ShoppingBag className="text-purple-500" />,
            gradient: "from-purple-50 to-purple-100",
            border: "border-purple-100",
            text: "text-purple-600",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(stats.total_revenue || 0),
            icon: <DollarSign className="text-yellow-500" />,
            gradient: "from-yellow-50 to-yellow-100",
            border: "border-yellow-100",
            text: "text-yellow-600",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm"
          >
            <div
              className={`flex-none w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} grid place-items-center ${item.border}`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">
                {item.label}
              </p>
              <p className={`mt-1 text-lg font-semibold truncate ${item.text}`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trends Chart */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Booking Trends
          </h2>
          <div className="h-72">
            <Line
              data={bookingChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        {/* Service Categories Chart */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Service Categories
          </h2>
          <div className="h-72 flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
