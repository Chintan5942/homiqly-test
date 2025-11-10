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

  // keep refs to timeouts so we can clear on unmount
  const openTimersRef = useRef([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

        const grouped = rawData.reduce((acc, item) => {
          const category = item.service_category_name;
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});

        setGroupedPackages(grouped);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();

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

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Apply for Services</h2>

        {/* Dropdown */}
        <div className="flex items-center justify-between gap-3">
          <Button
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
                          {service.service_name}
                        </span>
                      </h4>
                      <p>
                        service filter :{" "}
                        <span className="font-semibold text-gray-800">
                          {service.service_filter}
                        </span>
                      </p>

                      {service.packages.map((pkg) => (
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
                                {pkg.sub_packages.map((sub) => (
                                  <li
                                    key={sub.sub_package_id}
                                    className="flex gap-3"
                                  >
                                    <img
                                      src={sub.item_media}
                                      alt={sub.title}
                                      className="w-12 h-12 object-cover rounded-lg border"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">
                                        {sub.item_name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        ${sub.price} | {sub.time_required} min
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={
                                requestingPackages[pkg.package_id] ||
                                modalOpeningPackages[pkg.package_id]
                              }
                              onClick={() => {
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
                              ) : (
                                "Request for Service"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      <ApplyServiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialPackage={selectedPackage}
      />
    </div>
  );
};

export default Services;
