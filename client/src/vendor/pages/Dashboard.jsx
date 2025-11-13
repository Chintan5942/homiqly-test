import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Link } from "react-router-dom";
import ToggleButton from "../components/ToggleButton";
import StatusBadge from "../../shared/components/StatusBadge";
import Calendar from "./Calendar";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { formatCurrency } from "../../shared/utils/formatUtils";
import {
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    startedBookings: 0,
    approvedBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let url = `/api/vendor/getstats?filterType=${filterType}`;
      if (filterType === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const statsResponse = await api.get(url);
      const statsData = statsResponse.data.stats || {};

      setStats({
        totalBookings: statsData.totalBookings || 0,
        startedBookings: parseInt(statsData.startedBookings) || 0,
        approvedBookings: parseInt(statsData.approvedBookings) || 0,
        completedBookings: parseInt(statsData.completedBookings) || 0,
        totalEarnings: statsData.totalEarnings || 0,
      });

      const bookingsResponse = await api.get(
        "/api/booking/vendorassignedservices"
      );
      const bookings = bookingsResponse.data.bookings || [];

      const sortedBookings = [...bookings]
        .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
        .slice(0, 5);

      setRecentBookings(sortedBookings);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, startDate, endDate]);

  if (loading) return <LoadingSpinner />;

  if (error)
    return (
      <div className="bg-red-50  text-red-600  p-4 rounded-lg text-center border border-red-100 ">
        {error}
      </div>
    );

  // === Chart Data (Fake placeholders for demo) ===
  const performanceData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Bookings",
        data: [12, 19, 15, 20, 25, 30],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.15)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const earningsData = {
    labels: ["Haircut", "Cleaning", "Plumbing", "Electric", "Painting"],
    datasets: [
      {
        label: "Revenue ($)",
        data: [1200, 900, 700, 1100, 1500],
        backgroundColor: [
          "#60a5fa",
          "#34d399",
          "#fbbf24",
          "#c084fc",
          "#f87171",
        ],
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const categoryData = {
    labels: ["Approved", "Started", "Completed", "Total"],
    datasets: [
      {
        label: "Booking Status",
        data: [
          stats.approvedBookings,
          stats.startedBookings,
          stats.completedBookings,
          stats.totalBookings,
        ],
        backgroundColor: ["#60a5fa", "#facc15", "#ef4444", "#22c55e"],
        borderWidth: 0,
      },
    ],
  };

  const ratingData = {
    labels: [
      "Quality",
      "Speed",
      "Communication",
      "Professionalism",
      "Reliability",
    ],
    datasets: [
      {
        label: "Average Rating",
        data: [4.5, 4.2, 3.8, 4.7, 4.0],
        backgroundColor: "rgba(59,130,246,0.2)",
        borderColor: "#3b82f6",
        pointBackgroundColor: "#3b82f6",
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Dashboard</h2>
        <div className="flex gap-4">
          <ToggleButton />
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-end sm:space-x-4 sm:space-y-0">
            <div className="w-full sm:w-40">
              <FormSelect
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: "", label: "All" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "custom", label: "Custom" },
                ]}
              />
            </div>
          </div>

          {filterType === "custom" && (
            <>
              <FormInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <FormInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            icon: <ShoppingBag className="text-blue-500" />,
            label: "Total Bookings",
            value: stats.totalBookings,
            gradient: "from-blue-50 to-blue-100",
          },
          {
            icon: <Clock className="text-yellow-500" />,
            label: "Started Bookings",
            value: stats.startedBookings,
            gradient: "from-yellow-50 to-yellow-100",
          },
          {
            icon: <CheckCircle className="text-green-500" />,
            label: "Completed Bookings",
            value: stats.completedBookings,
            gradient: "from-green-50 to-green-100",
          },
          {
            icon: <Check className="text-indigo-500" />,
            label: "Approved Bookings",
            value: stats.approvedBookings,
            gradient: "from-indigo-50 to-indigo-100",
          },
          {
            icon: <DollarSign className="text-purple-500" />,
            label: "Total Earnings",
            value: formatCurrency(stats.totalEarnings),
            gradient: "from-purple-50 to-purple-100",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm hover:shadow-md transition`}
          >
            <div
              className={`flex-none w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} grid place-items-center border`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-800  truncate">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Distribution */}
        <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Booking Status</h2>
          <div className="h-72 flex items-center justify-center">
            <Doughnut
              data={categoryData}
              options={{
                plugins: { legend: { position: "bottom" } },
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>

        <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
          {recentBookings.length > 0 ? (
            <div className="divide-y">
              {recentBookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">{booking.userName || "N/A"}</p>
                    <p className="text-sm text-gray-500">
                      {booking.serviceName} -{" "}
                      {new Date(booking.bookingDate).toLocaleDateString()}{" "}
                      {booking.bookingTime}
                    </p>
                  </div>
                  <StatusBadge status={booking.bookingStatus} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent bookings</p>
          )}
        </div>

        {/* Bookings Trend */}
        <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Booking Performance</h2>
          <div className="h-72">
            <Line
              data={performanceData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        {/* Revenue by Service */}
        <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Revenue by Service</h2>
          <div className="h-72">
            <Bar
              data={earningsData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        {/* Service Quality Radar */}
        {/* <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Service Quality Metrics
          </h2>
          <div className="h-72">
            <Radar
              data={ratingData}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  r: {
                    min: 0,
                    max: 5,
                    ticks: { stepSize: 1 },
                    grid: { color: "rgba(156,163,175,0.3)" },
                  },
                },
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div> */}
      </div>

      {/* Recent Bookings & Calendar */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white/80  rounded-2xl border border-gray-100  backdrop-blur-sm shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Today's Bookings</h2>
            <Link
              to="/vendor/calendar"
              className="text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              View Calendar
            </Link>
          </div> */}
      {/* <Calendar /> */}
      {/* </div>
      </div> */}
    </div>
  );
};

export default Dashboard;

// ===================================================

// import { useState, useEffect } from "react";
// import api from "../../lib/axiosConfig";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
// } from "chart.js";
// import { Link } from "react-router-dom";
// import ToggleButton from "../components/ToggleButton";
// import StatusBadge from "../../shared/components/StatusBadge";
// import Calendar from "./Calendar";
// import { FormInput, FormSelect } from "../../shared/components/Form";
// import { formatCurrency } from "../../shared/utils/formatUtils";
// import {
//   Check,
//   CheckCircle,
//   Clock,
//   DollarSign,
//   Loader,
//   ShoppingBag,
// } from "lucide-react";
// import LoadingSlider from "../../shared/components/LoadingSpinner";
// import LoadingSpinner from "../../shared/components/LoadingSpinner";

// // Register ChartJS components
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend
// );

// const Dashboard = () => {
//   const [stats, setStats] = useState({
//     totalBookings: 0,
//     startedBookings: 0,
//     approvedBookings: 0,
//     completedBookings: 0,
//     totalEarnings: 0,
//   });

//   const [recentBookings, setRecentBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [filterType, setFilterType] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true);

//       let url = `/api/vendor/getstats?filterType=${filterType}`;
//       if (filterType === "custom" && startDate && endDate) {
//         url += `&startDate=${startDate}&endDate=${endDate}`;
//       }

//       const statsResponse = await api.get(url);
//       const statsData = statsResponse.data.stats || {};

//       setStats({
//         totalBookings: statsData.totalBookings || 0,
//         startedBookings: parseInt(statsData.startedBookings) || 0,
//         approvedBookings: parseInt(statsData.approvedBookings) || 0,
//         completedBookings: parseInt(statsData.completedBookings) || 0,
//         totalEarnings: statsData.totalEarnings || 0,
//       });

//       // fetch vendor bookings
//       const bookingsResponse = await api.get(
//         "/api/booking/vendorassignedservices"
//       );
//       const bookings = bookingsResponse.data.bookings || [];

//       const sortedBookings = [...bookings]
//         .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
//         .slice(0, 5);

//       setRecentBookings(sortedBookings);
//       setLoading(false);
//     } catch (err) {
//       console.error("Error fetching dashboard data:", err);
//       setError("Failed to load dashboard data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchDashboardData();
//   }, [filterType, startDate, endDate]);

//   // Prepare chart data
//   const performanceData = {
//     labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
//     datasets: [
//       {
//         label: "Bookings",
//         data: [12, 19, 15, 20, 25, 30],
//         borderColor: "#3b82f6",
//         backgroundColor: "rgba(59, 130, 246, 0.1)",
//         tension: 0.4,
//         fill: true,
//       },
//     ],
//   };

//   if (loading) {
//     return (
//       <>
//         <LoadingSpinner />
//       </>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 rounded-md bg-red-50">
//         <p className="text-red-500">{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between">
//         <ToggleButton />

//         <div className="flex flex-col space-y-3 sm:flex-row sm:items-end sm:space-x-4 sm:space-y-0">
//           {/* Filter Type */}
//           <div className="w-full sm:w-48">
//             <FormSelect
//               // label="Filter Type"
//               value={filterType}
//               onChange={(e) => setFilterType(e.target.value)}
//               options={[
//                 { value: "", label: "All" },
//                 { value: "weekly", label: "Weekly" },
//                 { value: "monthly", label: "Monthly" },
//                 { value: "custom", label: "Custom" },
//               ]}
//             />
//           </div>

//           {/* Date Range (only visible for custom) */}
//           {filterType === "custom" && (
//             <>
//               <div className="flex-1 min-w-0">
//                 <FormInput
//                   type="date"
//                   label="Start Date"
//                   value={startDate}
//                   onChange={(e) => setStartDate(e.target.value)}
//                   className="w-full"
//                 />
//               </div>

//               <div className="flex-1 min-w-0">
//                 <FormInput
//                   type="date"
//                   label="End Date"
//                   value={endDate}
//                   onChange={(e) => setEndDate(e.target.value)}
//                   className="w-full"
//                 />
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
//         {/* Total Bookings */}
//         <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm">
//           <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 grid place-items-center border border-blue-100">
//             <ShoppingBag className="text-blue-500" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-gray-500 truncate">
//               Total Bookings
//             </p>
//             <p className="mt-1 text-lg font-semibold text-blue-600 truncate">
//               {stats.totalBookings}
//             </p>
//           </div>
//         </div>

//         {/* Started Bookings */}
//         <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm">
//           <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 grid place-items-center border border-yellow-100">
//             <Clock className="text-yellow-500" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-gray-500 truncate">
//               Started Bookings
//             </p>
//             <p className="mt-1 text-lg font-semibold text-yellow-600 truncate">
//               {stats.startedBookings}
//             </p>
//           </div>
//         </div>

//         {/* Completed Bookings */}
//         <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm">
//           <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 grid place-items-center border border-green-100">
//             <CheckCircle className="text-green-500" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-gray-500 truncate">
//               Completed Bookings
//             </p>
//             <p className="mt-1 text-lg font-semibold text-green-600 truncate">
//               {stats.completedBookings}
//             </p>
//           </div>
//         </div>

//         {/* Approved Bookings */}
//         <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm">
//           <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 grid place-items-center border border-indigo-100">
//             <Check className="text-indigo-500" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-gray-500 truncate">
//               Approved Bookings
//             </p>
//             <p className="mt-1 text-lg font-semibold text-indigo-600 truncate">
//               {stats.approvedBookings}
//             </p>
//           </div>
//         </div>

//         {/* Total Earnings */}
//         <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100  rounded-2xl shadow-sm">
//           <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 grid place-items-center border border-purple-100">
//             <DollarSign className="text-purple-500" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-gray-500 truncate">
//               Total Earnings
//             </p>
//             <p className="mt-1 text-lg font-semibold text-purple-600 truncate">
//               {formatCurrency(stats.totalEarnings)}
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Dashboard Grid */}
//       <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//         <div className="p-6 bg-white rounded-lg shadow">
//           <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
//           {recentBookings.length > 0 ? (
//             <div className="divide-y">
//               {recentBookings.map((booking) => {
//                 const statusClass =
//                   booking.bookingStatus === 1
//                     ? "bg-green-100 text-green-800"
//                     : booking.bookingStatus === 2
//                     ? "bg-red-100 text-red-800"
//                     : "bg-yellow-100 text-yellow-800";

//                 const statusText =
//                   booking.bookingStatus === 1
//                     ? "Completed"
//                     : booking.bookingStatus === 2
//                     ? "Cancelled"
//                     : "Pending";

//                 return (
//                   <div
//                     key={booking.bookingId || booking.booking_id}
//                     className="flex items-center justify-between py-3"
//                   >
//                     <div>
//                       <p className="font-medium">{booking.userName || "N/A"}</p>
//                       <p className="text-sm text-gray-500">
//                         {booking.serviceName} -{" "}
//                         {new Date(booking.bookingDate).toLocaleDateString()}{" "}
//                         {booking.bookingTime}
//                       </p>
//                     </div>
//                     {/* <span
//                       className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
//                     >
//                       {statusText}
//                     </span> */}
//                     <StatusBadge status={booking.bookingStatus} />
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="py-4 text-center text-gray-500">No recent bookings</p>
//           )}
//         </div>

//         <div className="p-6 bg-white rounded-lg shadow">
//           <h2 className="mb-4 text-lg font-semibold">Service Performance</h2>
//           <div className="h-64">
//             <Line
//               data={performanceData}
//               options={{
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                   legend: {
//                     display: false,
//                   },
//                 },
//                 scales: {
//                   y: {
//                     beginAtZero: true,
//                   },
//                 },
//               }}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Upcoming Bookings */}
//       <>
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-lg font-semibold">Today's Bookings</h2>
//           <Link
//             to="/vendor/calendar"
//             className="text-sm font-medium text-primary-light hover:text-primary-dark"
//           >
//             View Calendar
//           </Link>
//         </div>

//         <>
//           <Calendar />
//         </>
//       </>
//     </div>
//   );
// };

// export default Dashboard;
