import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import Select from "react-select";
import { toast } from "sonner";
import { Loader } from "lucide-react";

const ApplyServiceModal = ({ isOpen, onClose, initialPackage }) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // user-selected sub-packages (react-select option objects)
  const [selectedSubPackages, setSelectedSubPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // vendor existing info
  const [vendorPackageIds, setVendorPackageIds] = useState(new Set());
  const [vendorSubPackageIds, setVendorSubPackageIds] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // fetch admin packages and vendor packages in parallel
        const [adminResp, vendorResp] = await Promise.all([
          api.get("/api/admin/getpackages"),
          api.get("/api/vendor/getvendorservice"),
        ]);

        const rawData = Array.isArray(adminResp.data)
          ? adminResp.data
          : adminResp.data?.result || [];

        const grouped = rawData.reduce((acc, item) => {
          const categoryId = item.service_category_id;
          const serviceId = item.service_id;

          if (!acc[categoryId]) {
            acc[categoryId] = {
              categoryName: item.service_category_name,
              services: {},
            };
          }

          if (!acc[categoryId].services[serviceId]) {
            acc[categoryId].services[serviceId] = {
              serviceId,
              serviceName: item.service_name,
              packages: [],
            };
          }

          const existingService = acc[categoryId].services[serviceId];
          (item.packages || []).forEach((pkg) => {
            if (
              !existingService.packages.some(
                (p) => p.package_id === pkg.package_id
              )
            ) {
              existingService.packages.push(pkg);
            }
          });

          return acc;
        }, {});

        setGroupedPackages(grouped);

        // vendor data
        const vendorRaw = Array.isArray(vendorResp.data)
          ? vendorResp.data
          : vendorResp.data?.result || [];

        const pkgIds = new Set();
        const subIds = new Set();

        vendorRaw.forEach((p) => {
          if (p.package_id) pkgIds.add(p.package_id);

          const spList = p.sub_packages || [];
          spList.forEach((sp) => {
            const id =
              sp.sub_package_id || sp.package_item_id || sp.sub_package_item_id;
            if (id) subIds.add(id);
          });
        });

        setVendorPackageIds(pkgIds);
        setVendorSubPackageIds(subIds);

        // Prefill initialPackage: set category, service, and sub-packages from that package
        if (initialPackage) {
          const { service_category_id, service_id, package_id } = initialPackage;
          const cat = grouped[service_category_id];
          if (cat) {
            setSelectedCategory({
              value: service_category_id,
              label: cat.categoryName,
            });
            const srv = cat.services[service_id];
            if (srv) {
              setSelectedService({ value: service_id, label: srv.serviceName });
              const pkg = srv.packages.find((p) => p.package_id === package_id);
              if (pkg && pkg.sub_packages?.length) {
                const preselected = pkg.sub_packages.map((sp) => {
                  const id =
                    sp.sub_package_id || sp.package_item_id || sp.sub_package_item_id;
                  return {
                    value: id,
                    label: sp.item_name || sp.sub_package_name || sp.title,
                    package_id: pkg.package_id,
                    isDisabled: subIds.has(id),
                  };
                });

                const allowed = preselected.filter((p) => !p.isDisabled);
                const disabledOnes = preselected.filter((p) => p.isDisabled);

                if (disabledOnes.length > 0) {
                  toast.info(
                    "Some preselected items are already added to your vendor packages and were removed."
                  );
                }

                setSelectedSubPackages(allowed);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching packages or vendor services:", error);
        toast.error("Failed to load packages");
      } finally {
        // keep loading true until all validation/prefill is complete
        setLoading(false);
      }
    };

    if (isOpen) {
      // reset previous state when opening
      setSelectedCategory(null);
      setSelectedService(null);
      setSelectedSubPackages([]);
      setVendorPackageIds(new Set());
      setVendorSubPackageIds(new Set());

      fetchData();
    } else {
      // if modal closed, reset local loading state
      setLoading(false);
    }
  }, [isOpen, initialPackage]);

  const resetSelections = () => {
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedSubPackages([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  // Service object and its packages for selected category/service
  const selectedServiceObj =
    groupedPackages[selectedCategory?.value]?.services?.[
      selectedService?.value
    ] || {};
  const allPackages = selectedServiceObj?.packages || [];

  // Build sub-package options across all packages of the selected service.
  // Each option includes package_id and isDisabled if vendor already has that sub-package.
  const subPackageOptions = allPackages.flatMap((pkg) =>
    (pkg.sub_packages || []).map((sub) => {
      const subId = sub.sub_package_id || sub.package_item_id || sub.sub_package_item_id;
      const alreadyHas = vendorSubPackageIds.has(subId); // only disable sub-packages already owned
      return {
        value: subId,
        label: sub.item_name || sub.sub_package_name || sub.title,
        package_id: pkg.package_id,
        isDisabled: alreadyHas,
      };
    })
  );

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      padding: "2px 6px",
      minHeight: 42,
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    multiValue: (base) => ({ ...base, backgroundColor: "#e0f2fe" }),
    multiValueLabel: (base) => ({ ...base, color: "#0369a1" }),
    placeholder: (base) => ({ ...base, fontSize: "0.95rem", color: "#9ca3af" }),
  };

  const handleSubmit = async () => {
    // Prevent submitting any disabled option
    if (selectedSubPackages.some((opt) => opt.isDisabled)) {
      toast.error("These packages already exist or you already have them.");
      return;
    }

    // Group selected sub-packages by package_id and assemble payload
    const groupedByPackage = selectedSubPackages.reduce((acc, sub) => {
      const pkgId = sub.package_id;
      if (!acc[pkgId]) acc[pkgId] = { package_id: pkgId, sub_packages: [] };
      acc[pkgId].sub_packages.push({ sub_package_id: sub.value });
      return acc;
    }, {});

    const builtPackages = Object.values(groupedByPackage);

    if (builtPackages.length === 0) {
      toast.error("Please select at least one sub-package.");
      return;
    }

    try {
      setSubmitting(true);
      // send payload - adjust key names if your API expects different shapes
      const response = await api.post("/api/vendor/applyservice", {
        selectedPackages: builtPackages,
      });

      toast.success(response.data.message || "Service requested successfully!");

      // update local vendor sets to reflect newly added sub-packages so UI is consistent
      const newVendorSubIds = new Set(vendorSubPackageIds);
      builtPackages.forEach((bp) => {
        if (bp.package_id) {
          (bp.sub_packages || []).forEach((sp) => {
            newVendorSubIds.add(sp.sub_package_id);
          });
        }
      });
      setVendorSubPackageIds(newVendorSubIds);

      handleModalClose();
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.response?.data?.error ||
        "Failed to request service. Please try again.";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = Object.entries(groupedPackages).map(([id, cat]) => ({
    value: id,
    label: cat.categoryName,
  }));
  const serviceOptions = selectedCategory
    ? Object.values(
        groupedPackages[selectedCategory.value]?.services || {}
      ).map((srv) => ({ value: srv.serviceId, label: srv.serviceName }))
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Request New Services"
    >
      {loading ? (
        // Loader displayed while both GET calls + validation/prefill run
        <div className="flex flex-col items-center justify-center py-12">
          {/* Simple spinner */}
          <Loader className="animate-spin h-6 w-6 mb-4 text-green-600" />
          <div className="text-sm text-gray-600">Loading services...</div>
        </div>
      ) : (
        <>
          <div className="space-y-5 mb-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                options={categoryOptions}
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedService(null);
                  setSelectedSubPackages([]);
                }}
                styles={customSelectStyles}
                placeholder="Select category"
                isClearable
                menuPortalTarget={
                  typeof window !== "undefined" ? document.body : null
                }
                menuPosition="fixed"
              />
            </div>

            {/* Service */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium mb-1">Service</label>
                <Select
                  options={serviceOptions}
                  value={selectedService}
                  onChange={(value) => {
                    setSelectedService(value);
                    setSelectedSubPackages([]);
                  }}
                  styles={customSelectStyles}
                  placeholder="Select service"
                  isClearable
                  menuPortalTarget={
                    typeof window !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                />
              </div>
            )}

            {/* Sub-Packages (select directly across all packages for the chosen service) */}
            {selectedService && subPackageOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sub-Packages
                </label>
                <Select
                  options={subPackageOptions}
                  value={selectedSubPackages}
                  onChange={(value) => {
                    const filtered = (value || []).filter((v) => !v.isDisabled);
                    setSelectedSubPackages(filtered);
                  }}
                  styles={customSelectStyles}
                  placeholder="Select sub-packages"
                  isMulti
                  isClearable
                  menuPortalTarget={
                    typeof window !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose sub-packages. Already-added sub-packages are disabled.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selectedCategory ||
                !selectedService ||
                selectedSubPackages.length === 0
              }
            >
              {submitting ? "Submitting..." : "Request Service"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ApplyServiceModal;
