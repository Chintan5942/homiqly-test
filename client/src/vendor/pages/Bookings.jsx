import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import BookingsTable from "../components/Tables/BookingsTable";
import { Button } from "../../shared/components/Button";
import { FormSelect, FormInput } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCcw } from "lucide-react";
import Pagination from "../../shared/components/Pagination";

const VendorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter / assignment state
  const [filter, setFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeMap, setSelectedEmployeeMap] = useState({});

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Date range
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  // Pagination
  const [page, setPage] = useState(1); // requested page
  const [limit, setLimit] = useState(10); // requested limit
  const [total, setTotal] = useState(0); // total records from backend
  const [totalPages, setTotalPages] = useState(1); // total pages from backend

  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page to 1 on search, filter, or dateRange change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, dateRange]);

  // Fetch employees - runs once on mount
  const fetchEmployees = useCallback(async () => {
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await axios.get("/api/employee/getemployee", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setEmployees(res.data.employees || res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch bookings - called whenever page, limit, filter, debouncedSearch, or dateRange changes
  const fetchBookings = useCallback(
    async (page, limit, filter, search, dateRange) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page,
          limit,
          status: filter !== "all" ? filter : undefined,
          search: search || undefined,
          start_date: dateRange.startDate || undefined,
          end_date: dateRange.endDate || undefined,
        };

        const res = await axios.get("/api/booking/vendorassignedservices", {
          params,
        });

        const {
          bookings,
          currentPage,
          totalPages,
          totalRecords,
        } = res.data;

        setBookings(bookings);
        setPage(currentPage);
        setTotalPages(totalPages);
        setTotal(totalRecords);
      } catch (err) {
        setError("Failed to load bookings");
        setBookings([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBookings(page, limit, filter, debouncedSearch, dateRange);
  }, [page, limit, filter, debouncedSearch, dateRange, fetchBookings]);

  // Assignment helpers and handlers remain unchanged
  const handleSelectEmployee = (bookingId, employeeId) => {
    setSelectedEmployeeMap((prev) => ({ ...prev, [bookingId]: employeeId }));
  };

  const handleAssignEmployee = async (bookingId) => {
    const employeeId = selectedEmployeeMap[bookingId];
    if (!employeeId) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      const token = localStorage.getItem("vendorToken");
      const res = await axios.post(
        "/api/employee/assign-booking",
        { booking_id: bookingId, employee_id: employeeId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const assignedEmployee = employees.find(
        (e) => e.employee_id === employeeId
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId
            ? {
                ...b,
                employeeName:
                  assignedEmployee?.employee_name || assignedEmployee?.name,
              }
            : b
        )
      );

      setSelectedEmployeeMap((prev) => {
        const copy = { ...prev };
        delete copy[bookingId];
        return copy;
      });

      toast.success(res?.data?.message || "Employee assigned successfully");
      fetchBookings(page, limit, filter, debouncedSearch, dateRange);
    } catch (err) {
      console.error("Failed to assign employee:", err);
      toast.error(err?.response?.data?.message || "Failed to assign employee");
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const res = await axios.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });
      if (res.status === 200) {
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId || b.bookingId === bookingId
              ? { ...b, bookingStatus: status }
              : b
          )
        );
        toast.success(
          `Booking ${status === 1 ? "approved" : "rejected"} successfully`
        );
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
      toast.error(
        err?.response?.data?.message || "Failed to update booking status"
      );
    }
  };

  const viewBookingDetails = (booking) => {
    navigate(`/vendor/bookings/${booking.booking_id}`, { state: { booking } });
  };

  // Filters handlers
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const resetAll = () => {
    setSearchTerm("");
    setFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setLimit(10);
    setPage(1); 
  };

  // Render states for loading and error remain unchanged

  return (
    <div className="space-y-6 p-3">
      {/* Header and controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Booking Management</h2>
        <div className="flex space-x-2 items-center">
          <Button
            onClick={() => {
              fetchBookings(page, limit, filter, debouncedSearch, dateRange);
              fetchEmployees();
            }}
            variant="lightInherit"
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by ID, customer or service"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            <FormSelect
              label="Status"
              name="filter"
              value={filter}
              onChange={handleFilterChange}
              options={[
                { value: "all", label: "All Bookings" },
                { value: "0", label: "Pending" },
                { value: "1", label: "Approved" },
                { value: "2", label: "Cancelled" },
                { value: "3", label: "Completed" },
              ]}
            />
          </div>

          {/* Start Date */}
          <div className="md:col-span-1">
            <FormInput
              label="Start Date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              type="date"
              aria-label="Start date"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-1">
            <FormInput
              label="End Date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              type="date"
              aria-label="End date"
            />
          </div>

          <div className="md:col-span-1 flex justify-start md:justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
                setPage(1);
              }}
            >
              Clear
            </Button>
            <Button variant="outline" onClick={() => resetAll()}>
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <BookingsTable
          bookings={bookings.map((b) => ({
            ...b,
            selectedEmployeeId: selectedEmployeeMap[b.booking_id] || "",
          }))}
          employees={employees}
          isLoading={loading}
          onViewBooking={viewBookingDetails}
          filteredStatus={filter !== "all" ? parseInt(filter) : undefined}
          onSelectEmployee={handleSelectEmployee}
          onAssignEmployee={handleAssignEmployee}
          onApproveBooking={(id) => handleUpdateStatus(id, 1)}
          onRejectBooking={(id) => handleUpdateStatus(id, 2)}
        />

        {/* Pagination bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            disabled={loading}
            keepVisibleOnSinglePage={true}
            totalRecords={total} // for "Showing A–B of N"
            limit={limit}
            onLimitChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
            renderLimitSelect={({ value, onChange, options }) => (
              <FormSelect
                id="limit"
                name="limit"
                dropdownDirection="auto"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                options={options.map((v) => ({ value: v, label: String(v) }))}
              />
            )}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorBookings;
