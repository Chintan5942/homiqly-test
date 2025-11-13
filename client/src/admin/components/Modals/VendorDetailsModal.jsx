import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import UniversalDeleteModal from "../../../shared/components/Modal/UniversalDeleteModal";
import { Button, IconButton } from "../../../shared/components/Button";
import StatusBadge from "../../../shared/components/StatusBadge";
import api from "../../../lib/axiosConfig";
import { Trash } from "lucide-react";
import { toast } from "sonner";

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

  const initialStatus = typeof vendor.status !== "undefined" ? vendor.status : null;

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
    const newStatus = typeof vendor.status !== "undefined" ? vendor.status : null;
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
      setPendingValue(0);
      setShowNoteModal(true);
    } else {
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

  const handleDeleteService = async (vendor_packages_id) => {
    if (!vendor_packages_id) return;

    const prevServices = JSON.parse(JSON.stringify(localServices));

    const updatedServices = localServices.map((svc) => {
      if (!Array.isArray(svc.packages)) return svc;
      const newPackages = svc.packages
        .map((pkg) => {
          if (!Array.isArray(pkg.items)) return pkg;
          const filteredItems = pkg.items.filter(
            (it) => it.vendor_packages_id !== vendor_packages_id
          );
          return { ...pkg, items: filteredItems };
        })
        .filter((pkg) => (Array.isArray(pkg.items) ? pkg.items.length > 0 : true));

      return { ...svc, packages: newPackages };
    });

    setLocalServices(updatedServices);

    try {
      const response = await api.delete(`/api/admin/removepackage/${vendor_packages_id}`);
      toast.success(response.data?.message || "Vendor package removed successfully by admin");
      refresh && refresh();
      return { success: true };
    } catch (err) {
      console.error("Failed to delete service", err);
      setLocalServices(prevServices);
      toast.error("Failed to delete service");
      return { success: false, error: err };
    }
  };

  const openDeleteModal = (vendor_packages_id, itemName) => {
    setDeletingItem(vendor_packages_id);
    setDeleteDesc(
      itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : "Are you sure you want to delete this package item? This action cannot be undone."
    );
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) {
      setShowDeleteModal(false);
      return;
    }
    try {
      setDeleting(true);
      await handleDeleteService(deletingItem);
      setShowDeleteModal(false);
      setDeletingItem(null);
    } catch (err) {
      console.error("Confirm delete error:", err);
      toast.error("Error deleting item");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitNote = () => {
    updateVendorStatus(pendingValue === null ? 0 : pendingValue, noteText);
  };

  // --- UI ---
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Vendor Details" size="xxl">
        <div className="space-y-6">
          {/* Top header: avatar, name, quick meta and actions */}
          <div className="flex items-start justify-between gap-4 p-4 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow">
                {String((getVendorName() || "?").trim().charAt(0)).toUpperCase()}
              </div>

              <div>
                <div className="text-sm text-gray-500">Vendor</div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{getVendorName() || "N/A"}</h3>
                  <StatusBadge status={vendor.is_authenticated} />
                </div>
                <div className="text-sm text-gray-500 mt-1">{getVendorEmail() || "—"} • {getVendorPhone() || "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="inline-flex items-center gap-3">
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={localStatus === 1}
                        onChange={handleToggleClick}
                        disabled={isUpdating}
                      />
                      <div className={`w-14 h-7 rounded-full relative transition-colors ${localStatus === 1 ? "bg-emerald-500" : "bg-gray-200"}`} role="switch" aria-checked={localStatus === 1}>
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transform transition-transform ${localStatus === 1 ? "translate-x-7" : "translate-x-0"}`} />
                      </div>
                    </label>

                    {isUpdating && <div className="text-xs text-gray-500">Updating…</div>}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="lightPrimary" onClick={handleApprove} disabled={saving || vendor.is_authenticated == 1}>
                    {saving ? "Processing..." : "Approve"}
                  </Button>
                  <Button variant="lightError" onClick={handleReject} disabled={saving || vendor.is_authenticated == 0 || vendor.is_authenticated == 2}>
                    {saving ? "Processing..." : "Reject"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details Card */}
            <div className="col-span-3 bg-white rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Details</h4>

              {vendor.vendorType === "individual" ? (
                <div className="grid grid-cols-3 gap-6 space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="text-xs text-gray-500">Full Name</div>
                    <div className="font-medium text-gray-900">{vendor.individual_name || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{vendor.individual_email || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="font-medium text-gray-900">{vendor.individual_phone || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Expertise</div>
                    <div className="font-medium text-gray-900">{vendor.individual_expertise || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">About</div>
                    <div className="whitespace-pre-line text-sm text-gray-800">{vendor.individual_aboutMe || "N/A"}</div>
                  </div>

                  {vendor.individual_resume && (
                    <div>
                      <a href={vendor.individual_resume} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">View Resume</a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="text-xs text-gray-500">Company</div>
                    <div className="font-medium text-gray-900">{vendor.company_companyName || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Contact Person</div>
                    <div className="font-medium text-gray-900">{vendor.company_contactPerson || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{vendor.company_companyEmail || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="font-medium text-gray-900">{vendor.company_companyPhone || "N/A"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="font-medium text-gray-900">{vendor.company_companyAddress || "N/A"}</div>
                  </div>

                  {vendor.company_googleBusinessProfileLink && (
                    <div>
                      <a href={vendor.company_googleBusinessProfileLink} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">Open Google Business Profile</a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Services (span 2 columns on lg) */}
            <div className="lg:col-span-3 overflow-y-auto">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Services & Packages</h4>
                  <div className="text-xs text-gray-500">{localServices?.length ?? 0} services</div>
                </div>

                {localServices?.length > 0 ? (
                  <div className="space-y-4">
                    {localServices.map((service, sIndex) => (
                      <div key={service.service_id ?? sIndex} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            {service.serviceImage ? (
                              <img src={service.serviceImage} alt={service.serviceName || "service"} className="w-12 h-12 rounded object-cover border" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">No image</div>
                            )}

                            <div>
                              <div className="text-sm font-semibold text-gray-800">{service.serviceName}</div>
                              <div className="text-xs text-gray-500">Category: {service.categoryName}</div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">{service.packages?.length ?? 0} packages</div>
                        </div>

                        {service.packages?.length > 0 ? (
                          <div className="space-y-3">
                            {service.packages.map((pkg, pkgIndex) => (
                              <div key={pkg.package_id ?? pkgIndex} className="rounded border bg-gray-50 p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-800">{pkg.packageName || `Package ${pkg.package_id ?? pkgIndex}`}</div>
                                    {pkg.serviceLocation && <div className="text-xs text-gray-500 mt-1">Location: {pkg.serviceLocation}</div>}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {Array.isArray(pkg.items) && pkg.items.length === 0 && (
                                    <div className="text-xs text-gray-500 italic">No items in this package.</div>
                                  )}

                                  {pkg.items && pkg.items.map((item, itemIndex) => (
                                    <div key={item.vendor_packages_id ?? item.package_item_id ?? itemIndex} className="flex items-start gap-3 p-3 rounded bg-white">
                                      {item.itemMedia ? (
                                        <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                          <img src={item.itemMedia} alt={item.itemName} className="object-cover w-full h-full" />
                                        </div>
                                      ) : (
                                        <div className="w-24 h-16 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">No image</div>
                                      )}

                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 text-sm">{item.itemName}</div>
                                        {item.description && <div className="text-xs text-gray-600 mt-1">{item.description}</div>}

                                        <div className="mt-3 flex items-center gap-3">
                                          {item.price != null && <div className="text-xs text-gray-500">Price: <span className="font-medium text-gray-900">{String(item.price)}</span></div>}
                                          {item.time_required && <div className="text-xs text-gray-500">Time: <span className="font-medium text-gray-900">{item.time_required}</span></div>}
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end gap-2">
                                        {item.vendor_packages_id && (
                                          <IconButton
                                            onClick={() => openDeleteModal(item.vendor_packages_id, item.itemName)}
                                            variant="lightDanger"
                                            ariaLabel="Delete package"
                                            icon={<Trash />}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">No packages for this service.</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No services listed for this vendor.</div>
                )}
              </div>
            </div>
          </div>
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
          <p className="text-sm text-gray-600 mb-2">Please add a note explaining why this vendor is being turned OFF (optional).</p>
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
