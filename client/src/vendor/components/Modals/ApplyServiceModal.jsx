import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import Select from "react-select";
import { toast } from "sonner";

/**
 * Props:
 * - isOpen, onClose, initialPackage
 * - vendorPackageIds: Set of package_id (from parent)
 * - vendorSubPackageMap: { [packageId]: Set(sub_package_id) }
 * - onApplied: function({ addedPackageIds: [], addedSubPackages: { [pkgId]: [subIds] } })
 */
const ApplyServiceModal = ({
  isOpen,
  onClose,
  initialPackage,
  vendorPackageIds = new Set(),
  vendorSubPackageMap = {},
  onApplied = () => {},
}) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSubPackages, setSelectedSubPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

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
            if (!existingService.packages.some((p) => p.package_id === pkg.package_id)) {
              existingService.packages.push(pkg);
            }
          });

          return acc;
        }, {});

        setGroupedPackages(grouped);

        // Prefill initialPackage
        if (initialPackage) {
          const { service_category_id, service_id, package_id } = initialPackage;
          const cat = grouped[service_category_id];
          if (cat) {
            setSelectedCategory({ value: service_category_id, label: cat.categoryName });
            const srv = cat.services[service_id];
            if (srv) {
              setSelectedService({ value: service_id, label: srv.serviceName });
              const pkg = srv.packages.find((p) => p.package_id === package_id);
              if (pkg && pkg.sub_packages?.length) {
                // Preselect only those sub-packages that are NOT already owned by vendor.
                const preselected = pkg.sub_packages
                  .filter((sp) => {
                    const ownedSet = vendorSubPackageMap[pkg.package_id];
                    // If ownedSet exists and contains this id, don't preselect it.
                    return !(ownedSet && ownedSet.has(sp.sub_package_id));
                  })
                  .map((sp) => ({
                    value: sp.sub_package_id,
                    label: sp.item_name || sp.sub_package_name,
                    package_id: pkg.package_id,
                  }));
                setSelectedSubPackages(preselected);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchPackages();
  }, [isOpen, initialPackage, vendorSubPackageMap]);

  const resetSelections = () => {
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedSubPackages([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  const selectedServiceObj =
    groupedPackages[selectedCategory?.value]?.services?.[selectedService?.value] || {};
  const allPackages = selectedServiceObj?.packages || [];

  // Build sub-package options with isDisabled when vendor already has that sub-package
  const subPackageOptions = allPackages.flatMap((pkg) =>
    (pkg.sub_packages || []).map((sub) => {
      const adminSubId = sub.sub_package_id || sub.package_item_id;
      const ownedSet = vendorSubPackageMap[pkg.package_id];
      const isDisabled = !!(ownedSet && adminSubId && ownedSet.has(adminSubId));
      return {
        value: adminSubId,
        label: sub.item_name || sub.sub_package_name,
        package_id: pkg.package_id,
        isDisabled,
      };
    })
  );

  // Custom styles...
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
    // Filter selectedSubPackages to remove any disabled (defensive)
    const filtered = selectedSubPackages.filter((s) => {
      // find option by value to check isDisabled
      const opt = subPackageOptions.find((o) => o.value === s.value && o.package_id === s.package_id);
      return opt && !opt.isDisabled;
    });

    // Group by package_id
    const groupedByPackage = filtered.reduce((acc, sub) => {
      const pkgId = sub.package_id;
      if (!acc[pkgId]) acc[pkgId] = { package_id: pkgId, sub_packages: [] };
      acc[pkgId].sub_packages.push({ sub_package_id: sub.value });
      return acc;
    }, {});

    const builtPackages = Object.values(groupedByPackage);

    if (builtPackages.length === 0) {
      toast.error("Please select at least one (non-owned) sub-package.");
      return;
    }

    try {
      setSubmitting(true);
      // adapt payload to your backend - here I keep structure similar to your previous modal
      const response = await api.post("/api/vendor/applyservice", {
        selectedPackages: builtPackages,
      });

      toast.success(response.data.message || "Service requested successfully!");

      // call parent callback to update vendor state immediately:
      // Build data to pass up: addedSubPackages: { [pkgId]: [subIds] }, addedPackageIds []
      const addedSubPackages = {};
      builtPackages.forEach((bp) => {
        addedSubPackages[bp.package_id] = (bp.sub_packages || []).map((s) => s.sub_package_id);
      });

      // If the vendor applied for all sub-packages of some package, you may want to mark that package as added.
      // Here we detect that:
      const addedPackageIds = [];
      builtPackages.forEach((bp) => {
        const adminPkg = allPackages.find((p) => p.package_id === bp.package_id);
        if (adminPkg) {
          const totalSubs = (adminPkg.sub_packages || []).length;
          if (totalSubs > 0 && bp.sub_packages.length >= totalSubs) {
            addedPackageIds.push(bp.package_id);
          }
        }
      });

      onApplied({ addedPackageIds, addedSubPackages });

      handleModalClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to request service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = Object.entries(groupedPackages).map(([id, cat]) => ({
    value: id,
    label: cat.categoryName,
  }));
  const serviceOptions = selectedCategory
    ? Object.values(groupedPackages[selectedCategory.value]?.services || {}).map((srv) => ({
        value: srv.serviceId,
        label: srv.serviceName,
      }))
    : [];

  // Prevent selecting disabled options in the control (react-select prevents picking isDisabled)
  // But ensure we don't accidentally prefill disabled values in selectedSubPackages.

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-sm text-gray-600">Loading services...</div>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Request New Services">
      <div className="space-y-5 mb-6">
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
            menuPortalTarget={typeof window !== "undefined" ? document.body : null}
            menuPosition="fixed"
          />
        </div>

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
              menuPortalTarget={typeof window !== "undefined" ? document.body : null}
              menuPosition="fixed"
            />
          </div>
        )}

        {selectedService && subPackageOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Sub-Packages</label>
            <Select
              options={subPackageOptions}
              value={selectedSubPackages}
              onChange={(value) => {
                // filter out disabled options (react-select typically won't select disabled but defensive)
                setSelectedSubPackages((value || []).filter((v) => !v.isDisabled));
              }}
              styles={customSelectStyles}
              placeholder="Select sub-packages"
              isMulti
              isClearable
              menuPortalTarget={typeof window !== "undefined" ? document.body : null}
              menuPosition="fixed"
              getOptionLabel={(o) => (o.isDisabled ? `${o.label} (Already added)` : o.label)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Already-added sub-packages are disabled. Choose remaining sub-packages to request.
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
          disabled={submitting || !selectedCategory || !selectedService || selectedSubPackages.length === 0}
        >
          {submitting ? "Submitting..." : "Request Service"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
