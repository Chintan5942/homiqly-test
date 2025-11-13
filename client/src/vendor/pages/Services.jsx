import React, { useEffect, useState, useRef } from "react";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Button } from "../../shared/components/Button";
import { toast } from "sonner";
import ApplyServiceModal from "../components/Modals/ApplyServiceModal";
import { FormSelect } from "../../shared/components/Form";
import { Loader } from "lucide-react";

const Services = () => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [requestingPackages, setRequestingPackages] = useState({});
  const [modalOpeningPackages, setModalOpeningPackages] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // vendor lookups
  const [vendorPackageIds, setVendorPackageIds] = useState(new Set());
  const [vendorSubPackageIds, setVendorSubPackageIds] = useState(new Set());

  // keep refs to timeouts so we can clear on unmount
  const openTimersRef = useRef([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // fetch admin packages and vendor packages in parallel
        const [adminResp, vendorResp] = await Promise.all([
          api.get("/api/admin/getpackages"),
          api.get("/api/vendor/getvendorservice"),
        ]);

        const rawAdmin = Array.isArray(adminResp.data)
          ? adminResp.data
          : adminResp.data?.result || [];

        const grouped = rawAdmin.reduce((acc, item) => {
          const category = item.service_category_name || "Uncategorized";
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});
        setGroupedPackages(grouped);

        const vendorRaw = Array.isArray(vendorResp.data)
          ? vendorResp.data
          : vendorResp.data?.result || [];

        const pkgIds = new Set();
        const subIds = new Set();

        vendorRaw.forEach((p) => {
          if (p.package_id) pkgIds.add(p.package_id);

          // vendor sub-packages - try multiple field names
          (p.sub_packages || []).forEach((sp) => {
            const id =
              sp.sub_package_id ||
              sp.package_item_id ||
              sp.package_item_id ||
              sp.id;
            if (id) subIds.add(id);
          });
        });

        setVendorPackageIds(pkgIds);
        setVendorSubPackageIds(subIds);
      } catch (error) {
        console.error("Error fetching packages or vendor services:", error);
        toast.error("Failed to load packages");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      // clear any running timers on unmount
      openTimersRef.current.forEach((t) => clearTimeout(t));
      openTimersRef.current = [];
    };
  }, []);

  const categoryList = ["All Categories", ...Object.keys(groupedPackages)];

  const handleRequestService = async (packageId) => {
    const token = localStorage.getItem("vendorToken");
    if (!token) {
      toast.error("User not authenticated.");
      return;
    }

    setRequestingPackages((prev) => ({ ...prev, [packageId]: true }));

    try {
      const response = await api.post(
        "/api/vendor/applyservice",
        { packageIds: [packageId] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Service request submitted successfully!");
    } catch (error) {
      console.error("Request failed:", error);
      toast.error("Failed to request service.");
    } finally {
      setRequestingPackages((prev) => ({ ...prev, [packageId]: false }));
    }
  };

  // new: open modal after showing loader for 2 seconds
  const openModalWithDelay = (pkg, delay = 2000) => {
    const pkgId = pkg.package_id;
    // set modal-opening flag
    setModalOpeningPackages((prev) => ({ ...prev, [pkgId]: true }));

    const timer = setTimeout(() => {
      // clear the loading flag and open modal
      setModalOpeningPackages((prev) => {
        const next = { ...prev };
        delete next[pkgId];
        return next;
      });
      setSelectedPackage({
        ...pkg,
        service_id: pkg.service_id,
        service_category_id: pkg.service_category_id,
      });
      setShowModal(true);
    }, delay);

    // store timer for cleanup
    openTimersRef.current.push(timer);
  };

  // helper: check whether a sub-package id is owned by vendor
  const isSubOwned = (sub) => {
    const subId = sub.sub_package_id || sub.package_item_id || sub.id;
    if (!subId) return false;
    return vendorSubPackageIds.has(subId);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Apply for Services</h2>

        {/* Dropdown */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setSelectedPackage(null);
              setShowModal(true);
            }}
          >
            Request New Services
          </Button>
          <FormSelect
            className="w-full md:w-52 "
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={categoryList}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        Object.entries(groupedPackages)
          .filter(
            ([category]) =>
              selectedCategory === "All Categories" ||
              category === selectedCategory
          )
          .map(([categoryName, services]) => (
            <div key={categoryName} className="mb-10">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">
                {categoryName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div
                    key={service.service_type_id}
                    className="rounded-2xl shadow-md bg-white overflow-hidden transition-all hover:shadow-lg border border-gray-100"
                  >
                    {service.service_type_media && (
                      <img
                        src={service.service_type_media}
                        alt={service.service_type_name}
                        loading="lazy"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {service.service_type_name}
                      </h3>
                      <h4>
                        Service:
                        <span className="font-semibold text-gray-800">
                          {" "}
                          {service.service_name}
                        </span>
                      </h4>
                      <p>
                        service filter :{" "}
                        <span className="font-semibold text-gray-800">
                          {service.service_filter}
                        </span>
                      </p>

                      {service.packages.map((pkg) => {
                        // determine if all sub-packages are already added
                        const totalSubs = pkg.sub_packages?.length || 0;
                        const ownedCount = (pkg.sub_packages || []).reduce(
                          (acc, s) => acc + (isSubOwned(s) ? 1 : 0),
                          0
                        );
                        const allSubsAdded =
                          totalSubs > 0 && ownedCount === totalSubs;

                        return (
                          <div
                            key={pkg.package_id}
                            className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl"
                          >
                            {/* Sub-Packages */}
                            {pkg.sub_packages?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-semibold mb-1 text-gray-700">
                                  Sub-packages:
                                </p>
                                <ul className="space-y-2">
                                  {pkg.sub_packages.map((sub) => {
                                    const owned = isSubOwned(sub);
                                    const subId =
                                      sub.sub_package_id ||
                                      sub.package_item_id ||
                                      sub.id;
                                    return (
                                      <li
                                        key={subId || Math.random()}
                                        className={`flex gap-3 items-center ${
                                          owned ? "opacity-50" : ""
                                        }`}
                                      >
                                        {(sub.item_media ||
                                          sub.sub_package_media) && (
                                          <img
                                            src={
                                              sub.item_media ||
                                              sub.sub_package_media
                                            }
                                            alt={
                                              sub.title ||
                                              sub.sub_package_name ||
                                              sub.item_name
                                            }
                                            className="w-12 h-12 object-cover rounded-lg border"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-800">
                                            {sub.item_name ||
                                              sub.sub_package_name ||
                                              sub.title}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {sub.price ? `$${sub.price}` : ""}{" "}
                                            {sub.time_required
                                              ? `| ${sub.time_required} min`
                                              : ""}
                                          </p>
                                        </div>

                                        {owned ? (
                                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg border">
                                            Already added
                                          </span>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant={
                                  allSubsAdded
                                    ? "lightSecondary"
                                    : "lightPrimary"
                                }
                                disabled={
                                  requestingPackages[pkg.package_id] ||
                                  modalOpeningPackages[pkg.package_id] ||
                                  allSubsAdded
                                }
                                onClick={() => {
                                  if (allSubsAdded) {
                                    toast(
                                      "All sub-packages are already added."
                                    );
                                    return;
                                  }
                                  // show loader for 2s then open modal
                                  openModalWithDelay({
                                    ...pkg,
                                    service_id: service.service_id,
                                    service_category_id:
                                      service.service_category_id,
                                  });
                                }}
                              >
                                {modalOpeningPackages[pkg.package_id] ? (
                                  <span className="flex items-center gap-2">
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Opening...
                                  </span>
                                ) : requestingPackages[pkg.package_id] ? (
                                  "Requesting..."
                                ) : allSubsAdded ? (
                                  "All Added"
                                ) : (
                                  "Request for Service"
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      <ApplyServiceModal
        isOpen={showModal}
        onClose={() => {
          // optionally re-fetch vendor services so UI updates after modal submit (if modal added items)
          setShowModal(false);
          // refetch vendor data to refresh owned subpackages:
          (async () => {
            try {
              const vendorResp = await api.get("/api/vendor/getvendorservice");
              const vendorRaw = Array.isArray(vendorResp.data)
                ? vendorResp.data
                : vendorResp.data?.result || [];
              const subIds = new Set();
              vendorRaw.forEach((p) => {
                (p.sub_packages || []).forEach((sp) => {
                  const id = sp.sub_package_id || sp.package_item_id || sp.id;
                  if (id) subIds.add(id);
                });
              });
              setVendorSubPackageIds(subIds);
            } catch (err) {
              console.error("Failed to refresh vendor data:", err);
            }
          })();
        }}
        initialPackage={selectedPackage}
      />
    </div>
  );
};

export default Services;
