import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { toast } from "react-toastify";
import { Button } from "../../../shared/components/Button";
import PaymentBadge from "../../../shared/components/PaymentBadge";
import { Calendar, Clock, MapPin } from "lucide-react";

/** Keep a tiny getField ONLY for the two similarity checks you asked to keep */
const getField = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

const toMoney = (v) => {
  const n = parseFloat(v ?? 0);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

export default function AdminBookingDetailsPage() {
  const { bookingId } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  // Fetch (kept simple, no cross-shape normalization)
  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/getbookings");
      const list = res?.data?.bookings || [];
      const found = list.find((b) => Number(b.booking_id) === Number(bookingId));
      if (found) setBooking(found);
      else toast.error("Booking not found");
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // if we arrived with state, still refetch by id for fresh data
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Load eligible vendors only if none is assigned
  useEffect(() => {
    const loadEligible = async () => {
      if (!booking) return;
      if (booking.vendorName) return; // already assigned
      try {
        setLoading(true);
        const res = await api.get(`/api/booking/get-eligible-vendors/${booking.booking_id}`);
        setEligibleVendors(res.data.eligibleVendors || []);
      } catch {
        toast.error("Failed to load eligible vendors");
      } finally {
        setLoading(false);
      }
    };
    loadEligible();
  }, [booking]);

  const handleAssignVendor = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/api/booking/assignbooking", {
        booking_id: booking.booking_id,
        vendor_id: selectedVendorId,
      });
      toast.success(res.data.message || "Vendor assigned successfully");
      await fetchBooking();
      setSelectedVendorId("");
      setEligibleVendors([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign vendor");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSlider />
      </div>
    );
  }

  // ===== Direct fields from your backend payload (no heavy normalization) =====
  const {
    booking_id,
    bookingDate,
    bookingTime,
    bookingStatus,
    notes,
    bookingMedia,
    user_id,
    userName,
    user_email,
    user_phone,
    serviceName,
    serviceCategory,
    vendor_id,
    vendorType,
    vendorName,
    vendorPhone,
    vendorEmail,
    vendorContactPerson,
    payment_status,
    payment_amount,
    payment_currency,
    payment_intent_id,
  } = booking;

  // Your backend uses sub_packages → items[]
  const packages = Array.isArray(booking.sub_packages) ? booking.sub_packages : [];

  // Totals per package (sum items + item addons)
  const computePackageTotals = (pkg) => {
    const items = Array.isArray(pkg.items) ? pkg.items : [];
    const total = items.reduce((sum, it) => {
      const base = parseFloat(it.price ?? 0);
      const qty = Number(it.quantity ?? 1) || 1;
      const addons = Array.isArray(it.addons)
        ? it.addons.reduce((aSum, ad) => aSum + (parseFloat(ad.price ?? 0) * (Number(ad.quantity ?? 1) || 1)), 0)
        : 0;
      return sum + base * qty + addons;
    }, 0);

    // join any timeRequired (minutes)
    const timeParts = items
      .map((it) => it.timeRequired)
      .filter(Boolean)
      .map(String);
    const totalTime = timeParts.length ? timeParts.join(" • ") : undefined;

    return { totalPrice: toMoney(total), totalTime };
  };

  const renderAnswer = (ans) => (ans == null || ans === "" ? "—" : String(ans));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: `Booking #${booking_id}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{`Booking #${booking_id}`}</h2>
          <p className="text-sm text-gray-500 mt-1">{serviceName || "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={bookingStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT */}
        <div className="col-span-3 space-y-4">
          {/* Summary */}
          <section className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border">
                {booking.serviceTypeMedia ? (
                  <img
                    src={booking.serviceTypeMedia}
                    alt={serviceName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {serviceName || "—"}
                </h3>
                <div className="mt-2 text-sm text-gray-600">
                  {serviceCategory || "Service details unavailable"}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
                  <Clock className="ml-4 w-4 h-4" />
                  <span>{bookingTime ? formatTime(bookingTime) : "—"}</span>
                </div>

                <p className="mt-3 text-sm text-gray-700">
                  Quick view: customer details and full package breakdown below.
                </p>
              </div>
            </div>
          </section>

          {/* Packages */}
          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <p className="text-sm text-gray-500">No packages for this booking.</p>
            </div>
          ) : (
            packages.map((pkg, pi) => {
              const packageName = pkg.packageName || "Package";
              const totals = computePackageTotals(pkg);

              return (
                <article key={`pkg-${pi}`} className="bg-white rounded-2xl border p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-md overflow-hidden border flex-shrink-0">
                      {pkg.packageMedia ? (
                        <img
                          src={pkg.packageMedia}
                          alt={packageName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">{packageName}</h4>
                        <div className="text-sm text-gray-600">
                          ${totals.totalPrice}
                          {totals.totalTime && (
                            <span className="ml-2 text-xs text-gray-500">• {totals.totalTime}</span>
                          )}
                        </div>
                      </div>

                      {/* Items (multiple supported) */}
                      <div className="mt-4 space-y-3">
                        {Array.isArray(pkg.items) && pkg.items.length > 0 ? (
                          pkg.items.map((it, idx) => {
                            // Keep exactly these two similarity checks (as requested)
                            const itemName =
                              getField(it, "itemName", "item_name", "name") || "Item";
                            const itemMedia = getField(it, "itemMedia", "item_media", "media");

                            const qty = Number(it.quantity ?? 1) || 1;
                            const time = it.timeRequired ? String(it.timeRequired) : "";
                            const priceNum = parseFloat(it.price ?? 0);
                            const priceText = toMoney(priceNum);

                            return (
                              <div key={`it-${pi}-${idx}`} className="bg-gray-50 border rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-14 h-14 overflow-hidden rounded bg-white border flex-shrink-0">
                                    {itemMedia ? (
                                      <img
                                        src={itemMedia}
                                        alt={itemName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                                        No Image
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                          {itemName}{" "}
                                          <span className="text-xs text-gray-500">×{qty}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {time ? `${time} • ` : ""}${priceText}
                                        </div>
                                      </div>

                                      <div className="text-right text-sm text-gray-700">
                                        <div className="font-semibold">${priceText}</div>
                                        <div className="text-xs text-gray-400">{time} / Min</div>
                                      </div>
                                    </div>

                                    {/* Addons / Preferences / Consents */}
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                                      {/* ADDONS (per item) */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                          Addons
                                        </div>
                                        {Array.isArray(it.addons) && it.addons.length > 0 ? (
                                          <ul className="space-y-1">
                                            {it.addons.map((ad, aIdx) => (
                                              <li key={`ad-${aIdx}`} className="flex items-start justify-between">
                                                <div className="min-w-0">
                                                  <div className="truncate font-medium">
                                                    {ad.addonName || ad.name || "Addon"}
                                                  </div>
                                                  {ad.addonTime && (
                                                    <div className="text-xs text-gray-400">{ad.addonTime} / Min</div>
                                                  )}
                                                </div>
                                                <div className="ml-2 text-xs text-gray-500">
                                                  {ad.quantity ? `×${ad.quantity}` : ""}{" "}
                                                  {ad.price ? `$${toMoney(ad.price)}` : ""}
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <div className="text-xs text-gray-400">No addons</div>
                                        )}
                                      </div>

                                      {/* PREFERENCES (per item) */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                          Preferences
                                        </div>
                                        {Array.isArray(it.preferences) && it.preferences.length > 0 ? (
                                          <ul className="space-y-1">
                                            {it.preferences.map((pf, pfIdx) => (
                                              <li key={`pf-${pfIdx}`} className="flex items-start justify-between">
                                                <div className="min-w-0">
                                                  <div className="truncate">
                                                    {pf.preferenceValue || pf.value || "—"}
                                                  </div>
                                                </div>
                                                <div className="ml-2 text-xs text-gray-500">
                                                  {pf.preferencePrice ? `$${toMoney(pf.preferencePrice)}` : "Free"}
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <div className="text-xs text-gray-400">No preferences</div>
                                        )}
                                      </div>

                                      {/* CONSENTS (per item) */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Consents</div>
                                        {Array.isArray(it.consents) && it.consents.length > 0 ? (
                                          <ul className="space-y-2">
                                            {it.consents.map((c, cIdx) => (
                                              <li key={`c-${cIdx}`}>
                                                <div className="text-sm font-medium truncate">
                                                  {c.question || c.consentText || c.q || "Consent"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  Answer: {renderAnswer(c.answer ?? c.a)}
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <div className="text-xs text-gray-400">No consents</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-500">No items in this package.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          {/* Notes */}
          {notes && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700">Notes</h4>
              <p className="mt-2 text-sm text-gray-800">{notes}</p>
            </section>
          )}

          {/* Booking media */}
          {bookingMedia && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700">Attached Media</h4>
              <div className="mt-3">
                <img
                  src={bookingMedia}
                  alt="Attached media"
                  className="w-full h-auto max-h-[360px] object-cover rounded"
                />
                <div className="mt-2">
                  <a
                    href={bookingMedia}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View attachment
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <aside className="col-span-2 space-y-4">
          {/* Customer */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border">
                {booking.userProfileImage ? (
                  <img
                    src={booking.userProfileImage}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    N/A
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{userName || "—"}</div>
                {user_email && (
                  <a href={`mailto:${user_email}`} className="text-xs text-gray-500 block truncate">
                    {user_email}
                  </a>
                )}
                {user_phone && (
                  <a href={`tel:${user_phone}`} className="text-xs text-gray-500 block truncate">
                    {user_phone}
                  </a>
                )}
                {booking.userAddress && (
                  <p className="mt-2 text-xs text-gray-500 flex items-start gap-2">
                    <MapPin className="text-gray-400 mt-0.5" />
                    <span className="truncate">
                      {booking.userAddress}
                      {booking.userState ? `, ${booking.userState}` : ""}
                      {booking.userPostalCode ? ` • ${booking.userPostalCode}` : ""}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-700">Schedule</h4>
            <div className="mt-3 text-sm text-gray-900">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" />
                <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="text-gray-400" />
                <span>{bookingTime ? formatTime(bookingTime) : "—"}</span>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">Payment</h4>
                <div className="mt-2 flex items-center gap-3">
                  <PaymentBadge status={payment_status} />
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">${toMoney(payment_amount)}</div>
                <div className="text-xs text-gray-400">{String(payment_currency || "usd").toUpperCase()}</div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100" />
            <div className="mt-3 text-sm text-gray-600">
              {booking.platform_fee != null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-medium">${toMoney(booking.platform_fee)}</span>
                </div>
              )}
              {booking.net_amount != null && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">Net amount</span>
                  <span className="font-medium">${toMoney(booking.net_amount)}</span>
                </div>
              )}
              {payment_intent_id && (
                <div className="mt-3 text-xs text-gray-400 break-all">
                  <span className="font-medium text-gray-700">Payment ID:</span>{" "}
                  <span className="ml-1">{payment_intent_id}</span>
                </div>
              )}
            </div>
          </section>

          {/* Vendor */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Vendor</h4>
            {vendorName ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-900 font-medium">
                  {vendorName} {vendorType ? `(${vendorType})` : ""}
                </p>
                {vendorContactPerson && <p className="text-sm text-gray-500">Contact: {vendorContactPerson}</p>}
                {vendorEmail && <p className="text-sm text-gray-500">{vendorEmail}</p>}
                {vendorPhone && <p className="text-sm text-gray-500">{vendorPhone}</p>}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <select
                  className="border px-3 py-2 rounded w-full"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                >
                  <option value="">Select vendor</option>
                  {eligibleVendors.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendorName} ({v.vendorType})
                    </option>
                  ))}
                </select>
                <Button onClick={handleAssignVendor} isLoading={loading} className="w-full">
                  Assign vendor
                </Button>
              </div>
            )}
          </section>

          {/* Raw IDs & Meta (trimmed) */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Raw IDs & Metadata</h4>
            <div className="mt-3 text-sm text-gray-800 space-y-2">
              <div><span className="font-medium">Booking ID:</span> {booking_id}</div>
              <div><span className="font-medium">User ID:</span> {user_id ?? "—"}</div>
              <div><span className="font-medium">Vendor ID:</span> {vendor_id ?? "—"}</div>
              <div><span className="font-medium">Payment Intent ID:</span> {payment_intent_id ?? "—"}</div>
              <div>
                <span className="font-medium">Payment Status:</span> {payment_status || "—"} •{" "}
                <span className="font-medium">Amount:</span> ${toMoney(payment_amount)}{" "}
                {String(payment_currency || "").toUpperCase()}
              </div>

              <div className="mt-2">
                <div className="text-xs text-gray-500 font-medium">Packages & item IDs</div>
                <div className="mt-1 space-y-1 text-xs text-gray-700">
                  {packages.length === 0 && <div>No packages</div>}
                  {packages.map((p, pi) => (
                    <div key={`meta-p-${pi}`} className="bg-gray-50 border rounded p-2">
                      <div>
                        <strong>Package:</strong> {p.packageName || "—"}{" "}
                        <span className="text-gray-500">
                          (ID: {p.package_id ?? "—"})
                        </span>
                      </div>
                      {Array.isArray(p.items) &&
                        p.items.map((it, ii) => (
                          <div key={`meta-it-${ii}`} className="ml-3 mt-1">
                            <div>
                              Item: {(it.itemName || it.name) ?? "—"}{" "}
                              <span className="text-gray-500">
                                (sub_package_id: {it.sub_package_id ?? "—"})
                              </span>
                            </div>
                            {Array.isArray(it.addons) && it.addons.length > 0 && (
                              <div className="ml-4 text-xs text-gray-600">
                                Addons:{" "}
                                {it.addons
                                  .map(
                                    (a) => `${a.addonName || a.name || "—"}(ID:${a.addon_id ?? a.id ?? "—"})`
                                  )
                                  .join(", ")}
                              </div>
                            )}
                            {Array.isArray(it.preferences) && it.preferences.length > 0 && (
                              <div className="ml-4 text-xs text-gray-600">
                                Preferences:{" "}
                                {it.preferences
                                  .map(
                                    (pp) =>
                                      `${pp.preferenceValue || pp.value || "—"}(ID:${pp.preference_id || pp.id || "—"})`
                                  )
                                  .join(", ")}
                              </div>
                            )}
                            {Array.isArray(it.consents) && it.consents.length > 0 && (
                              <div className="ml-4 text-xs text-gray-600">
                                Consents:{" "}
                                {it.consents
                                  .map(
                                    (cc) =>
                                      `${cc.question || cc.consentText || "Consent"}(ID:${cc.consent_id || cc.id || "—"})`
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="space-y-3">
              <Button variant="outline" onClick={() => window.history.back()} className="w-full py-3">
                Back
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
