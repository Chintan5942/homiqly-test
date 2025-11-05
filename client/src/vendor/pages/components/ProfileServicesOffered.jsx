import { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import { Card } from "../../../shared/components/Card";
import { IconButton } from "../../../shared/components/Button";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import { Trash } from "lucide-react";
import UniversalDeleteModal from "../../../shared/components/Modal/UniversalDeleteModal";

const ProfileServicesOffered = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⬇️ modal-related state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteAction, setDeleteAction] = useState(null);
  const [deleteDesc, setDeleteDesc] = useState("");

  useEffect(() => {
    fetchVendorService();
  }, []);

  const fetchVendorService = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/vendor/getvendorservice");
      setServices(response?.data?.result || []);
    } catch (error) {
      console.error("Error fetching vendor services:", error);
      toast.error("Failed to load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 API call to delete a specific sub-package
  const deleteSubPackageApi = async ({
    vendor_packages_id,
    package_id,
    package_item_id,
  }) => {
    const res = await api.delete(
      `/api/vendor/removepackage/${vendor_packages_id}`,
      {
        data: { package_id, package_item_id },
      }
    );
    return res;
  };

  // 🧠 open the modal from the sub-package delete button
  const handleAskDeleteSub = ({
    vendor_packages_id,
    package_id,
    package_item_id,
    sub_package_name,
  }) => {
    const item = {
      vendor_packages_id,
      package_id,
      package_item_id,
      sub_package_name,
    };
    setDeletingItem(item);

    setDeleteDesc(
      `Delete sub-package "${
        sub_package_name || package_item_id
      }"? This action cannot be undone.`
    );

    // provide an action for the modal to call
    setDeleteAction(() => async () => {
      try {
        setDeleting(true);
        const res = await deleteSubPackageApi(item);

        const message =
          res?.data?.message ||
          (res?.status === 200
            ? "Sub-package removed successfully"
            : "Removed sub-package");

        await fetchVendorService();
        toast.success(message);
      } catch (err) {
        console.error("Error deleting sub-package:", err);
        const serverMsg = err?.response?.data?.message;
        toast.error(serverMsg || "Failed to delete sub-package");
        // optional: make sure UI is in sync
        await fetchVendorService();
        throw err; // let UniversalDeleteModal's onError run
      } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        setDeletingItem(null);
        setDeleteAction(null);
      }
    });

    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <div className="flex items-center justify-center p-10">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <div className="p-6">
        {/* header omitted for brevity */}

        {services.length === 0 ? (
          /* empty state ... */
          <div className="py-12 text-center">...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {services.map((service, idx) => (
              <div
                key={service?.vendor_packages_id ?? idx}
                className="overflow-hidden bg-white border border-gray-200 group rounded-2xl"
              >
                {/* image + header omitted for brevity */}

                <div className="p-6">
                  <h4 className="mb-1 text-xl font-semibold text-gray-900">
                    {service?.package_name}
                  </h4>

                  {Array.isArray(service?.sub_packages) &&
                    service.sub_packages.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {service.sub_packages.map((sub, sIdx) => (
                          <div
                            key={
                              sub?.package_item_id ??
                              `${service.vendor_packages_id}-${sIdx}`
                            }
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                          >
                            {/* media + text omitted for brevity */}

                            <div className="flex-1 min-w-0">
                              <h6 className="text-sm font-medium text-gray-900">
                                {sub?.sub_package_name}
                              </h6>
                              {sub?.sub_package_description && (
                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                  {sub.sub_package_description}
                                </p>
                              )}
                            </div>

                            {/* ⬇️ Use modal instead of window.confirm */}
                            <IconButton
                              disabled={
                                deleting &&
                                deletingItem?.package_item_id ===
                                  sub?.package_item_id
                              }
                              onClick={() =>
                                handleAskDeleteSub({
                                  vendor_packages_id:
                                    service.vendor_packages_id,
                                  package_id: service.package_id, // ensure your service object has this
                                  package_item_id: sub.package_item_id,
                                  sub_package_name: sub.sub_package_name,
                                })
                              }
                              variant="lightDanger"
                              size="sm"
                              icon={<Trash className="w-4 h-4" />}
                              title="Delete this sub-package"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ⬇️ Attach your custom modal */}
      <UniversalDeleteModal
        open={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteAction(null);
            setDeletingItem(null);
          }
        }}
        onDelete={deleteAction}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onError={(err) => toast.error(err?.message || "Delete failed")}
        title="Confirm delete"
        desc={deleteDesc}
        autoClose={true}
      />
    </Card>
  );
};

export default ProfileServicesOffered;
