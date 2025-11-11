// src/app/payouts/components/Modals/PayoutModal.jsx
import React, { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig"; // adjust relative path if needed
import LoadingSpinner from "../../../shared/components/LoadingSpinner"; // adjust if shared path differs
import { toast } from "sonner";

/**
 * Props:
 *  - open (bool)
 *  - onClose (fn)
 *  - payoutIds (array of ids)
 *  - onSuccess (fn)  -> called after successful update
 *
 * This modal requires admin_notes before submission.
 */
const PayoutModal = ({ open, onClose, payoutIds = [], onSuccess }) => {
  const [localIds, setLocalIds] = useState([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState("approved");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalIds(Array.isArray(payoutIds) ? payoutIds : []);
      setAdminNotes("");
      setStatus("approved");
    } else {
      setLocalIds([]);
      setAdminNotes("");
      setSubmitting(false);
    }
  }, [open, payoutIds]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localIds || localIds.length === 0) {
      toast.error?.("No payouts selected.");
      return;
    }
    if (!adminNotes || adminNotes.trim().length === 0) {
      toast.error?.("Admin note is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        payout_ids: localIds,
        status,
        admin_notes: adminNotes.trim(),
      };

      const res = await api.post("/api/payment/updatepayout", payload);
      // success message shown from response if available
      toast.success?.(res?.data?.message ?? "Payout updated successfully");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to update payout:", err);
      toast.error?.("Failed to update payout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* backdrop */}
      {/* <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => {
          if (!submitting) onClose();
        }}
      /> */}

      {/* modal */}
      <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-white rounded-lg shadow-lg p-6 mx-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Confirm Payout
            </h3>
            <button
              onClick={() => {
                if (!submitting) onClose();
              }}
              className="text-gray-500 hover:text-gray-700 ml-3"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs text-gray-600">
                Selected Payout IDs
              </label>
              <div className="mt-2 text-sm text-gray-800">
                {localIds.length ? (
                  <div className="flex flex-wrap gap-2">
                    {localIds.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No payouts selected.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 block w-full border rounded px-3 py-2 text-sm"
              >
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="paid">paid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Admin Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2 block w-full border rounded px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter admin notes (required)"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (!submitting) onClose();
                }}
                className="px-3 py-2 rounded border text-sm"
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded text-sm"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : `Confirm (${localIds.length})`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* show spinner overlay while submitting */}
      {submitting && <LoadingSpinner />}
    </>
  );
};

export default PayoutModal;
