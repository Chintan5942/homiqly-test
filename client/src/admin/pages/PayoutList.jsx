// src/app/payouts/PayoutList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import PayoutsTable from "../components/Tables/PayoutsTable";
import FormInput from "../../shared/components/Form/FormInput";
import { toast } from "sonner";

const PayoutList = () => {
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/payment/getvendorsforpayouts");
      const data = res.data.vendorPayouts;
      setPayouts(data);
    } catch (err) {
      setError(err);
      console.error("Fetch payouts error:", err);
      toast.error?.("Failed to load payouts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleView = (maybeRow) => {
    if (!maybeRow) {
      console.warn("handleView called without row");
      return;
    }
    console.log("maybeRow", maybeRow);

    // DataTable / button passes the row object directly in our code, so use that.
    const row = maybeRow;

    const vendorId = row?.vendor_id;
    if (!vendorId) {
      console.warn("Couldn't find vendor id on row:", row);
      return;
    }

    // Navigate to details — keep your existing path style
    navigate(`/admin/payments/payoutlist/${vendorId}`, {
      state: { vendor: row },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payout List</h2>
      </div>
      <div className="w-1/3">
        <FormInput
          label="Search"
          name="search"
          placeholder="Search by vendor name"
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          type="text"
        />
      </div>

      <PayoutsTable
        payouts={payouts}
        isLoading={isLoading}
        onView={handleView}
      />

      {error && (
        <div className="text-sm text-red-600 mt-3">Failed to load payouts.</div>
      )}
    </div>
  );
};

export default PayoutList;
