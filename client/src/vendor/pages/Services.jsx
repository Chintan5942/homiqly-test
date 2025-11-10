import React, { useEffect, useState, useMemo } from "react";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Button } from "../../shared/components/Button";
import { toast } from "sonner";
import ApplyServiceModal from "../components/Modals/ApplyServiceModal";
import { FormSelect } from "../../shared/components/Form";

const Services = () => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [requestingPackages, setRequestingPackages] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // vendor-level info:
  const [vendorPackageIds, setVendorPackageIds] = useState(new Set());
  // vendorSubPackageMap: { [adminPackageId]: Set(adminSubPackageId) }
  const [vendorSubPackageMap, setVendorSubPackageMap] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [adminResp, vendorResp] = await Promise.all([
          api.get("/api/admin/getpackages"),
          api.get("/api/vendor/getvendorservice"),
        ]);

        const rawAdmin = Array.isArray(adminResp.data)
          ? adminResp.data
          : adminResp.data?.result || [];

        // group admin packages by category (same as you had)
        const grouped = rawAdmin.reduce((acc, item) => {
          const category = item.service_category_name || "Uncategorized";
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});
        setGroupedPackages(grouped);

        // vendor data
        const vendorRaw = Array.isArray(vendorResp.data)
          ? vendorResp.data
          : vendorResp.data?.result || [];

        // Build vendorPackageIds (top-level package presence)
        const vPackageIds = new Set(vendorRaw.map((p) => p.package_id));
        setVendorPackageIds(vPackageIds);

        // Build vendorSubPackageMap: attempt to map vendor subpackages -> admin sub_package_id
        // 1) create a lookup of vendor entries by package_id (top-level)
        const vendorByPackage = {};
        vendorRaw.forEach((vp) => {
          vendorByPackage[vp.package_id] = vp; // vendor package object (may contain vendor sub_packages)
        });

        // 2) For each admin package, attempt to find which admin sub_package_ids are present in vendor entry.
        // Matching strategy:
        //  - prefer direct id match if vendor sub-entry contains sub_package_id
        //  - else match by lowercase name (sub_package_name vs admin sub item_name/sub_package_name)
        const vSubMap = {};
        rawAdmin.forEach((adminPkg) => {
          const adminPkgId = adminPkg.package_id;
          const adminSubList = adminPkg.sub_packages || [];
          const vendorEntry = vendorByPackage[adminPkgId];

          vSubMap[adminPkgId] = new Set();

          if (!vendorEntry) {
            // vendor doesn't have the package at all -> empty set
            return;
          }

          const vendorSubs = vendorEntry.sub_packages || [];
          // Build vendorSubs lookups for id and name:
          const vendorIds = new Set(vendorSubs.map((vs) => vs.sub_package_id || vs.package_item_id || vs.id));
          const vendorNames = new Map();
          vendorSubs.forEach((vs) => {
            const name =
              (vs.sub_package_name || vs.sub_package_name || vs.item_name || "").toString().trim().toLowerCase();
            if (name) vendorNames.set(name, vs);
          });

          adminSubList.forEach((adminSub) => {
            const adminSubId = adminSub.sub_package_id || adminSub.package_item_id;
            const adminNames = [
              (adminSub.item_name || adminSub.sub_package_name || "").toString().trim().toLowerCase(),
            ];

            // 1) id match
            if (adminSubId && vendorIds.has(adminSubId)) {
              vSubMap[adminPkgId].add(adminSubId);
              return;
            }

            // 2) name match fallback
            const matchedByName = adminNames.find((n) => n && vendorNames.has(n));
            if (matchedByName) {
              // we store the adminSub's id (so we can disable admin option)
              if (adminSubId) vSubMap[adminPkgId].add(adminSubId);
            }
          });
        });

        setVendorSubPackageMap(vSubMap);
      } catch (error) {
        console.error("Error fetching packages or vendor services:", error);
        toast.error("Failed to load packages");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const categoryList = useMemo(
    () => ["All Categories", ...Object.keys(groupedPackages)],
    [groupedPackages]
  );

  // handle applied callback to update vendor sets locally (so UI updates immediately)
  const handleApplied = ({ addedPackageIds = [], addedSubPackages = {} }) => {
    // addedPackageIds: array of package_id that were fully added
    // addedSubPackages: { [pkgId]: [sub_package_id, ...] }
    setVendorPackageIds((prev) => {
      const next = new Set(prev);
      addedPackageIds.forEach((id) => next.add(id));
      return next;
    });

    setVendorSubPackageMap((prev) => {
      const next = { ...prev };
      Object.entries(addedSubPackages).forEach(([pkgId, subIds]) => {
        if (!next[pkgId]) next[pkgId] = new Set();
        subIds.forEach((sid) => next[pkgId].add(sid));
      });
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Apply for Services</h2>

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
            className="w-full md:w-52"
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
              selectedCategory === "All Categories" || category === selectedCategory
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
                        const isPackageAlready = vendorPackageIds.has(pkg.package_id);
                        const isRequesting = !!requestingPackages[pkg.package_id];

                        return (
                          <div
                            key={pkg.package_id}
                            className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl"
                          >
                            {pkg.sub_packages?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-semibold mb-1 text-gray-700">
                                  Sub-packages:
                                </p>
                                <ul className="space-y-2">
                                  {pkg.sub_packages.map((sub) => {
                                    const hasSub =
                                      vendorSubPackageMap[pkg.package_id] &&
                                      vendorSubPackageMap[pkg.package_id].has(
                                        sub.sub_package_id
                                      );
                                    return (
                                      <li
                                        key={sub.sub_package_id || sub.package_item_id}
                                        className="flex gap-3 items-center"
                                      >
                                        {sub.item_media && (
                                          <img
                                            src={sub.item_media}
                                            alt={sub.item_name}
                                            className="w-12 h-12 object-cover rounded-lg border"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-800">
                                            {sub.item_name || sub.sub_package_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {sub.price ? `$${sub.price}` : ""}{" "}
                                            {sub.time_required ? `| ${sub.time_required} min` : ""}
                                          </p>
                                        </div>
                                        {hasSub ? (
                                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            Added
                                          </span>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            <div className="flex justify-end items-center gap-3">
                              {isPackageAlready ? (
                                <Button size="sm" variant="secondary" disabled>
                                  Already Added
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={isRequesting}
                                  onClick={() => {
                                    setSelectedPackage({
                                      ...pkg,
                                      service_id: service.service_id,
                                      service_category_id: service.service_category_id,
                                    });
                                    setShowModal(true);
                                  }}
                                >
                                  {isRequesting ? "Requesting..." : "Request for Service"}
                                </Button>
                              )}
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
        onClose={() => setShowModal(false)}
        initialPackage={selectedPackage}
        vendorPackageIds={vendorPackageIds}
        vendorSubPackageMap={vendorSubPackageMap}
        onApplied={handleApplied}
      />
    </div>
  );
};

export default Services;
