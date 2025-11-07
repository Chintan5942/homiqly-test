import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import UniversalDeleteModal from "../../../shared/components/Modal/UniversalDeleteModal";
import { Button, IconButton } from "../../../shared/components/Button";
import StatusBadge from "../../../shared/components/StatusBadge";
import api from "../../../lib/axiosConfig";
import { Trash } from "lucide-react";
import { toast } from "sonner";

// Optimized Vendor Details modal
// - Removed all complex fallback chains for item fields (we use the exact keys you provide)
// - Added missing individual fields (expertise, aboutMe, otherInfo)
// - Kept all company-related functionality untouched

export default function VendorDetailsModal({
  refresh,
  isOpen,
  onClose,
  vendor,
  onApprove,
  onReject,
}) {
  if (!vendor) return null;

  const getVendorName = () =>
    vendor.vendorType === "individual"
      ? vendor.individual_name
      : vendor.company_companyName;

  const getVendorEmail = () =>
    vendor.vendorType === "individual"
      ? vendor.individual_email
      : vendor.company_companyEmail;

  const getVendorPhone = () =>
    vendor.vendorType === "individual"
      ? vendor.individual_phone
      : vendor.company_companyPhone;

  const initialStatus =
    typeof vendor.status !== "undefined" ? vendor.status : null;

  const [localStatus, setLocalStatus] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pendingValue, setPendingValue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localServices, setLocalServices] = useState(vendor.services ?? []);

  // New states for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteDesc, setDeleteDesc] = useState("");

  useEffect(() => {
    setLocalServices(vendor.services ?? []);
  }, [vendor?.services]);

  useEffect(() => {
    const newStatus =
      typeof vendor.status !== "undefined" ? vendor.status : null;
    setLocalStatus(newStatus);
  }, [vendor]);

  const updateVendorStatus = async (status, note = "") => {
    if (!vendor || !vendor.vendor_id) return;
    setIsUpdating(true);
    try {
      const url = `/api/admin/editvendorstatus/${vendor.vendor_id}`;
      const payload = { status, note };
      const { data } = await api.put(url, payload);

      setLocalStatus(status);
      setShowNoteModal(false);
      setNoteText("");
      setPendingValue(null);
      // optionally refresh parent list
      refresh && refresh();
      toast.success(data?.message || "Vendor status updated");
    } catch (err) {
      console.error("Failed to update vendor status", err);
      toast.error("Failed to update vendor status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleClick = () => {
    if (localStatus === 1) {
      // turning OFF — ask for optional note
      setPendingValue(0);
      setShowNoteModal(true);
    } else {
      // turn ON immediately
      updateVendorStatus(1);
    }
  };

  const handleApprove = async () => {
    try {
      setSaving(true);
      await onApprove(vendor.vendor_id);
      refresh && refresh();
      toast.success("Vendor approved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    try {
      setSaving(true);
      await onReject(vendor.vendor_id);
      refresh && refresh();
      toast.success("Vendor rejected");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject vendor");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Core delete routine (unchanged behavior)
   * Accepts vendor_packages_id (or package item id your backend expects)
   */
  const handleDeleteService = async (vendor_packages_id) => {
    if (!vendor_packages_id) return;

    // keep snapshot for rollback
    const prevServices = JSON.parse(JSON.stringify(localServices));

    // produce updated services: remove the package item from whichever service contains it
    const updatedServices = localServices.map((svc) => {
      // if packages is not array, return as is
      if (!Array.isArray(svc.packages)) return svc;
      const newPackages = svc.packages
        .map((pkg) => {
          if (!Array.isArray(pkg.items)) return pkg;
          const filteredItems = pkg.items.filter(
            (it) => it.vendor_packages_id !== vendor_packages_id
          );
          return { ...pkg, items: filteredItems };
        })
        // remove packages with zero items (optional behaviour but safe)
        .filter((pkg) =>
          Array.isArray(pkg.items) ? pkg.items.length > 0 : true
        );

      return { ...svc, packages: newPackages };
    });

    // apply optimistic update
    setLocalServices(updatedServices);

    try {
      const response = await api.delete(
        `/api/admin/removepackage/${vendor_packages_id}`
      );
      toast.success(
        response.data?.message || "Vendor package removed successfully by admin"
      );
      // optionally call refresh for parent lists
      refresh && refresh();
      return { success: true };
    } catch (err) {
      // rollback on error
      console.error("Failed to delete service", err);
      setLocalServices(prevServices);
      toast.error("Failed to delete service");
      return { success: false, error: err };
    }
  };

  /**
   * Called when user clicks the trash icon: show the Unified Delete Modal
   */
  const openDeleteModal = (vendor_packages_id, itemName) => {
    setDeletingItem(vendor_packages_id);
    setDeleteDesc(
      itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : "Are you sure you want to delete this package item? This action cannot be undone."
    );
    setShowDeleteModal(true);
  };

  /**
   * Confirmed delete from modal
   */
  const confirmDelete = async () => {
    if (!deletingItem) {
      setShowDeleteModal(false);
      return;
    }
    try {
      setDeleting(true);
      // call the same delete routine
      await handleDeleteService(deletingItem);
      setShowDeleteModal(false);
      setDeletingItem(null);
    } catch (err) {
      console.error("Confirm delete error:", err);
      // showDeleteModal remains open (modal prop onError can also be used)
      toast.error("Error deleting item");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitNote = () => {
    updateVendorStatus(pendingValue === null ? 0 : pendingValue, noteText);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Vendor Details" size="lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 p-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">
                Vendor ID
              </h4>
              <p className="text-sm text-gray-900">#{vendor.vendor_id}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">
                Vendor Type
              </h4>
              <p className="text-sm text-gray-900 capitalize">
                {vendor.vendorType}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Name</h4>
              <p className="text-sm text-gray-900">
                {getVendorName() || "N/A"}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">
                Contact
              </h4>
              <p className="text-sm text-gray-900">
                {getVendorEmail() || "N/A"}
              </p>
              <p className="text-sm text-gray-900">
                {getVendorPhone() || "N/A"}
              </p>
            </div>
          </div>

          <div className="min-w-[220px] flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="text-xs font-semibold text-gray-500">Auth</div>
              <StatusBadge status={vendor.is_authenticated} />
            </div>

            {/* Toggle switch */}
            <div className="flex flex-col items-end">
              <label
                className="inline-flex items-center cursor-pointer select-none"
                aria-label="Toggle vendor status"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localStatus === 1}
                  onChange={handleToggleClick}
                  disabled={isUpdating}
                />
                <div
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    localStatus === 1 ? "bg-green-500" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={localStatus === 1}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      localStatus === 1 ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>

              {isUpdating && (
                <div className="text-xs text-gray-500 mt-1">Updating…</div>
              )}
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {vendor.vendorType === "individual"
              ? "Individual Details"
              : "Company Details"}
          </h4>

          {vendor.vendorType === "individual" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Full Name
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.individual_name || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Email
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.individual_email || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Phone
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.individual_phone || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Expertise
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.individual_expertise || "N/A"}
                </p>
              </div>

              <div className="md:col-span-2">
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  About
                </h5>
                <p className="text-sm text-gray-900 whitespace-pre-line">
                  {vendor.individual_aboutMe || "N/A"}
                </p>
              </div>

              {vendor.individual_otherInfo && (
                <div className="md:col-span-2">
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Other Info
                  </h5>
                  <p className="text-sm text-gray-900">
                    {vendor.individual_otherInfo}
                  </p>
                </div>
              )}

              {vendor.individual_resume && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Resume
                  </h5>
                  <a
                    href={vendor.individual_resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Resume
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Company Name
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.company_companyName || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Contact Person
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.company_contactPerson || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Company Email
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.company_companyEmail || "N/A"}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Company Phone
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.company_companyPhone || "N/A"}
                </p>
              </div>

              <div className="md:col-span-2">
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Company Address
                </h5>
                <p className="text-sm text-gray-900">
                  {vendor.company_companyAddress || "N/A"}
                </p>
              </div>

              {vendor.company_googleBusinessProfileLink && (
                <div className="md:col-span-2">
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Google Business Profile
                  </h5>
                  <a
                    href={vendor.company_googleBusinessProfileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {vendor.company_googleBusinessProfileLink}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Services + Packages Section */}
        <div>
          {localServices?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Services Offered
              </h4>

              <div className="space-y-6">
                {localServices.map((service, sIndex) => (
                  <div
                    key={service.service_id ?? sIndex}
                    className="rounded-lg border p-4 bg-white"
                  >
                    {/* Service header */}
                    <div className="flex items-center gap-3 mb-4">
                      {service.serviceImage ? (
                        <img
                          src={service.serviceImage}
                          alt={service.serviceName || "service"}
                          className="w-12 h-12 rounded object-cover border"
                        />
                      ) : null}

                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {service.serviceName}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Category: {service.categoryName}
                        </div>
                      </div>
                    </div>

                    {/* Packages under service */}
                    {service.packages?.length > 0 ? (
                      <div className="space-y-4">
                        {service.packages.map((pkg, pkgIndex) => (
                          <div
                            key={pkg.package_id ?? pkgIndex}
                            className="rounded-lg border p-3 bg-gray-50"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {pkg.packageName ||
                                    `Package ${pkg.package_id ?? pkgIndex}`}
                                </div>
                                {pkg.serviceLocation && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Location: {pkg.serviceLocation}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Package items (NOTE: using exact keys from your payload: itemName, description, itemMedia) */}
                            <div className="grid grid-cols-1 gap-3">
                              {Array.isArray(pkg.items) &&
                                pkg.items.length === 0 && (
                                  <div className="text-xs text-gray-500 italic">
                                    No items in this package.
                                  </div>
                                )}

                              {pkg.items &&
                                pkg.items.map((item, itemIndex) => (
                                  <div
                                    key={
                                      item.vendor_packages_id ??
                                      item.package_item_id ??
                                      itemIndex
                                    }
                                    className="flex items-start gap-3 p-3 rounded bg-white"
                                  >
                                    {item.itemMedia ? (
                                      <div className="w-20 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                        <img
                                          src={item.itemMedia}
                                          alt={item.itemName}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-20 h-16 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">
                                        No image
                                      </div>
                                    )}

                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {item.itemName}
                                      </div>

                                      {item.description && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          {item.description}
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                        {/* if admin can delete package we show trash - this keeps existing functionality intact */}
                                        {item.vendor_packages_id && (
                                          <IconButton
                                            onClick={() =>
                                              openDeleteModal(
                                                item.vendor_packages_id,
                                                item.itemName
                                              )
                                            }
                                            variant="lightDanger"
                                            ariaLabel="Delete package"
                                            icon={<Trash />}
                                          />
                                        )}
                                      </div>

                                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                                        {item.price != null && (
                                          <div>Price: {String(item.price)}</div>
                                        )}
                                        {item.time_required && (
                                          <div>Time: {item.time_required}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        No packages for this service.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approve / Reject buttons */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
          <Button
            variant="lightPrimary"
            onClick={handleApprove}
            icon={<span>✓</span>}
            disabled={saving || vendor.is_authenticated == 1}
          >
            {saving ? "Approving..." : "Approve"}
          </Button>
          <Button
            variant="lightError"
            onClick={handleReject}
            icon={<span>✕</span>}
            disabled={
              saving ||
              vendor.is_authenticated == 0 ||
              vendor.is_authenticated == 2
            }
          >
            {saving ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setNoteText("");
          setPendingValue(null);
        }}
        title={"Add note for status change"}
        size="sm"
      >
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Please add a note explaining why this vendor is being turned OFF
            (optional).
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            className="w-full p-2 border rounded-md text-sm"
            placeholder="Enter note here..."
          />
          <div className="flex justify-end space-x-2 mt-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNoteModal(false);
                setNoteText("");
                setPendingValue(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitNote} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save & Turn OFF"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Universal Delete Modal */}
      <UniversalDeleteModal
        open={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeletingItem(null);
            setDeleteDesc("");
          }
        }}
        onDelete={confirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onError={(err) => {
          console.error("Delete error:", err);
          toast.error("Delete error");
        }}
        title="Delete Package"
        desc={deleteDesc}
      />
    </>
  );
}
