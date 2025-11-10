// pages/vendor/components/PaymentDetails.jsx
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  CreditCard,
  Building2,
  Package,
  Calendar,
  DollarSign,
} from "lucide-react";
import api from "../../../lib/axiosConfig";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import Breadcrumb from "../../../shared/components/Breadcrumb";

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayment = async (id) => {
      try {
        setLoading(true);
        const res = await api.get(`/api/vendor/getpayment/${id}`);
        const data = res.data || null;
        setPayment(data);
      } catch (err) {
        setError("Payment details unavailable");
      } finally {
        setLoading(false);
      }
    };

    if (!payment && paymentId) fetchPayment(paymentId);
  }, [paymentId]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl max-w-md mx-auto">
        {error}
      </div>
    );

  if (!payment)
    return (
      <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl max-w-md mx-auto">
        Payment details not available.
      </div>
    );

  // Normalize values
  const bookingId = payment.booking_id ?? payment.payout_id ?? payment.id;
  const payoutAmount = Number(
    payment.payout_amount ?? payment.gross_amount ?? 0
  );
  const currency = (payment.currency ?? "CAD").toUpperCase();
  const formattedPayout = formatCurrency(payoutAmount, currency);
  const statusRaw = (
    payment.payout_status ??
    payment.payment_status ??
    ""
  ).toLowerCase();

  const statusMap = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    paid: { label: "Paid", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Completed", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  };
  const status = statusMap[statusRaw] || {
    label: "Unknown",
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb
            links={[
              { label: "Dashboard", to: "/vendor" },
              { label: "Payments", to: "/vendor/payments" },
              { label: "Payment Details" },
            ]}
          />
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Payment Details
          </h1>
          <p className="text-gray-500 text-sm">
            Detailed information about this transaction
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Booking ID</p>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <p className="mt-2 text-xl font-semibold text-gray-800">
            #{bookingId}
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Status</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <span
            className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Amount</p>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="mt-2 text-xl font-semibold text-gray-800">
            {formattedPayout}
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Created</p>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <p className="mt-2 text-base font-semibold text-gray-800">
            {payment.created_at ? formatDate(payment.created_at) : "-"}
          </p>
        </div>
      </div>

      {/* Package Info */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-indigo-600" /> Package Details
        </h2>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {payment.packageMedia && (
            <img
              src={payment.packageMedia}
              alt={payment.packageName ?? "Package"}
              className="w-48 h-32 object-cover rounded-xl shadow-sm"
            />
          )}
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {payment.packageName ?? "—"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Price: {formattedPayout}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-indigo-600" /> User Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">
              {payment.user_name ?? payment.user_fullname ?? "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      {(payment.vendor_name ||
        payment.vendor_email ||
        payment.vendor_phone) && (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-indigo-600" /> Vendor Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {payment.vendor_name && (
              <div>
                <p className="text-sm text-gray-500">Vendor Name</p>
                <p className="font-medium text-gray-900">
                  {payment.vendor_name}
                </p>
              </div>
            )}
            {payment.vendor_email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">
                  {payment.vendor_email}
                </p>
              </div>
            )}
            {payment.vendor_phone && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">
                  {payment.vendor_phone}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {payment.notes && (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Notes</h2>
          <p className="text-gray-700">{payment.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentDetails;
