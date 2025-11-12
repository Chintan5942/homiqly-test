// src/app/payouts/components/Modals/PayoutModal.jsx
import React, { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig"; // keep same relative path you used
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import { toast } from "sonner";
import { FormSelect, FormTextarea } from "../../../shared/components/Form";

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
      // reset local state when closed
      setLocalIds([]);
      setAdminNotes("");
      setSubmitting(false);
    }
  }, [open, payoutIds]);

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
      <Modal
        isOpen={!!open}
        onClose={() => {
          if (!submitting) onClose?.();
        }}
        title="Confirm Payout"
      >
        <div className="p-2">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <FormSelect
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "approved", label: "approved" },
                  { value: "rejected", label: "rejected" },
                  { value: "paid", label: "paid" },
                ]}
              />
            </div>

            <div>
              <FormTextarea
                label="Admin Notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="Ghost"
                onClick={() => {
                  if (!submitting) onClose?.();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : `Confirm (${localIds.length})`}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {submitting && <LoadingSpinner />}
    </>
  );
};

export default PayoutModal;
