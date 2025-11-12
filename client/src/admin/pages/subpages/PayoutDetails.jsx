// src/app/payouts/PayoutDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../../lib/axiosConfig";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import { toast } from "sonner";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import BreadCrumb from "../../../shared/components/BreadCrumb";
import { Clock, DollarSign, Mail, UserCheck } from "lucide-react";
import PayoutModal from "../../components/Modals/PayoutModal";
import { Button } from "../../../shared/components/Button";

const currency = "CAD";

const PayoutDetails = () => {
  const params = useParams();
  const vendorIdFromParam = params?.vendorId;

  const location = useLocation();
  const navigate = useNavigate();

  const vendorFromState = location?.state?.vendor || null;

  const [vendorId] = useState(vendorFromState?.vendor_id ?? vendorIdFromParam);
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection state for rows in the table
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/api/payment/getvendorspayout?vendor_id=${vendorId}`
      );
      setDetails(res?.data ?? null);
      // reset selection when data refreshes
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Failed to fetch vendor payouts:", err);
      setError(err);
      toast.error?.("Failed to fetch vendor payouts.");
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const pending = details?.pendingPayouts ?? [];

  // toggle a single row selection
  const toggleRow = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  // toggle select all visible pending payout rows
  const toggleSelectAll = () => {
    if (!pending || pending.length === 0) return;
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      const ids = pending.map((p) => p.payout_id).filter(Boolean);
      setSelectedIds(ids);
      setSelectAll(true);
    }
  };

  // open modal only when at least one selected
  const openPayoutModal = () => {
    if (!selectedIds || selectedIds.length === 0) {
      toast.error?.("Please select at least one payout to proceed.");
      return;
    }
    setIsModalOpen(true);
  };

  // called when modal confirms and update succeeds
  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchDetails();
    toast.success?.("Payout updated successfully.");
  };

  return (
    <div className="">
      <BreadCrumb
        key={vendorId}
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Payout List", to: "/admin/payments/payoutlist" },
          { label: `Payout Details #${vendorId}` },
        ]}
      />
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Payout Details</h2>
          </div>

          {/* Payout button shown on top-right */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={openPayoutModal}
              variant="lightBlack"
              disabled={!selectedIds || selectedIds.length === 0}
            >
              Payout ({selectedIds.length})
            </Button>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="text-sm text-red-600">
            Failed to load payout details.
          </div>
        )}

        {!isLoading && details && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Pending */}
              <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 grid place-items-center border border-green-100">
                  <DollarSign className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    Total Pending
                  </p>
                  <p className="mt-1 text-lg font-semibold text-green-600 truncate">
                    {details.totalPending != null
                      ? formatCurrency(details.totalPending, currency)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Pending Count */}
              <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 grid place-items-center border border-blue-100">
                  <Clock className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    Pending Count
                  </p>
                  <p className="mt-1 text-lg font-semibold text-blue-600 truncate">
                    {details.count ?? pending.length ?? 0}
                  </p>
                </div>
              </div>

              {/* Vendor Name */}
              <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 grid place-items-center border border-amber-100">
                  <UserCheck className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    Vendor Name
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-600 truncate">
                    {vendorFromState?.vendor_name ??
                      pending[0]?.vendor_name ??
                      "N/A"}
                  </p>
                </div>
              </div>

              {/* Vendor Email */}
              <div className="flex items-center gap-4 p-5 bg-white/80  backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 grid place-items-center border border-purple-100">
                  <Mail className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    Vendor Email
                  </p>
                  <p className="mt-1 text-sm font-semibold text-purple-600 truncate">
                    {pending[0]?.vendor_email ??
                      vendorFromState?.vendor_email ??
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 w-12 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        aria-label="Select all visible"
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Payout ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Booking ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Booking Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Created At
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Packages
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pending.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No pending payouts found.
                      </td>
                    </tr>
                  ) : (
                    pending.map((p) => {
                      const id = p.payout_id;
                      const checked = selectedIds.includes(id);
                      return (
                        <tr key={id ?? `${p.booking_id}-${p.vendor_id}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!checked}
                              onChange={() => toggleRow(id)}
                              className="w-4 h-4"
                            />
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {p.payout_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {p.booking_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {p.payout_amount != null
                              ? formatCurrency(
                                  p.payout_amount,
                                  p.currency ?? currency
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {p.bookingDate ? formatDate(p.bookingDate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {p.created_at ? formatDate(p.created_at) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {Array.isArray(p.packages) && p.packages.length ? (
                              <div className="space-y-2">
                                {p.packages.map((pkg) => (
                                  <div key={pkg.package_id} className="text-xs">
                                    <div className="font-medium">
                                      {pkg.packageName}
                                    </div>
                                    {Array.isArray(pkg.sub_packages) &&
                                      pkg.sub_packages.length > 0 && (
                                        <div className="text-xs text-gray-500">
                                          {pkg.sub_packages
                                            .map((sp) => sp.sub_package_name)
                                            .join(", ")}
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payout modal */}
      <PayoutModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payoutIds={selectedIds}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PayoutDetails;
