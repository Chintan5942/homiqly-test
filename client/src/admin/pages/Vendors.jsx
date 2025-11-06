import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import VendorsTable from "../components/Tables/VendorsTable";
import VendorDetailsModal from "../components/Modals/VendorDetailsModal";
import { Button } from "../../shared/components/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";
import Pagination from "../../shared/components/Pagination";
import { RefreshCcw, RotateCcw, Search } from "lucide-react";
import api from "../../lib/axiosConfig";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Server-driven controls
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search input (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // When search/filter changes, reset page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  // fetchVendors uses current page, limit, debouncedSearch and filter
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filter === "pending") params.status = 0;
      else if (filter === "approved") params.status = 1;
      else if (filter === "rejected") params.status = 2;

      const response = await api.get("/api/admin/getvendors", { params });
      const respData = response.data || {};
      setVendors(respData.data || []);
      setPage(respData.page || page);
      // setLimit(respData.limit || limit);
      setTotalPages(respData.totalPages || 1);
      setTotal(respData.total || (respData.totalCount ?? 0));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setError("Failed to load vendors");
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filter]);

  // Only run when truly needed
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors, page, limit, debouncedSearch, filter]);


  const handleApproveVendor = async (vendorId, status) => {
    try {
      const response = await api.put(
        `/api/approval/verification/${vendorId}`,
        {
          is_authenticated: status,
        }
      );

      if (response.status === 200) {
        // Update local state (optimistic local update)
        setVendors((prev) =>
          prev.map((vendor) =>
            vendor.vendor_id === vendorId
              ? { ...vendor, is_authenticated: status }
              : vendor
          )
        );

        if (selectedVendor && selectedVendor.vendor_id === vendorId) {
          setSelectedVendor({
            ...selectedVendor,
            is_authenticated: status,
          });
        }

        toast.success(
          `Vendor ${status === 1 ? "approved" : "rejected"} successfully`
        );

        setShowDetailsModal(false);

        // re-fetch current page to guarantee server/client consistency
        fetchVendors();
      }
    } catch (error) {
      console.error("Error updating vendor status:", error);
      toast.error("Failed to update vendor status");
    }
  };

  const viewVendorDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  // Reset all filters
  const resetAll = () => {
    setFilter("all");
    setSearchTerm("");
    setPage(1);
    setLimit(10);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <FormInput
            icon={<Search />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor by name, email or company"
            aria-label="Search vendors"
          />
        </div>

        <div>
          <FormSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "all", label: "All Vendors" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            aria-label="Filter vendors by status"
          />
        </div>

        <div>
          <Button
            onClick={fetchVendors}
            variant="lightInherit"
            icon={<RefreshCcw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="overflow-hidden">
        <VendorsTable
          refresh={fetchVendors}
          vendors={vendors}
          isLoading={loading}
          onViewVendor={viewVendorDetails}
          onApproveVendor={(vendorId) => handleApproveVendor(vendorId, 1)}
          onRejectVendor={(vendorId) => handleApproveVendor(vendorId, 2)}
        />

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 mt-4 sm:flex-row">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            disabled={loading}
            keepVisibleOnSinglePage={true}
            totalRecords={total}
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
                options={options.map((v) => ({
                  value: v,
                  label: `${v}`,
                }))}
              />
            )}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>

      {/* Vendor Details Modal */}
      <VendorDetailsModal
        refresh={fetchVendors}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        vendor={selectedVendor}
        onApprove={(vendorId) => handleApproveVendor(vendorId, 1)}
        onReject={(vendorId) => handleApproveVendor(vendorId, 2)}
      />
    </div>
  );
};

export default Vendors;
