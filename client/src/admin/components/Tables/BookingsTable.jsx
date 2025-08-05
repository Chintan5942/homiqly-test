import React from "react";
import { FiEye } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import { IconButton } from "../../../shared/components/Button";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";

const BookingsTable = ({
  bookings,
  isLoading,
  onViewBooking,
  filteredStatus,
}) => {
  const columns = [
    {
      title: "ID",
      key: "booking_id",
      render: (row) => (
        <div className="text-sm text-gray-900">#{row.booking_id}</div>
      ),
    },
    {
      title: "Customer",
      key: "userName",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">{row.userName}</div>
      ),
    },
    {
      title: "Vendor",
      key: "vendorName",
      render: (row) =>
        row.vendorName ? (
          <div className="text-sm text-gray-900">{row.vendorName}</div>
        ) : (
          <div className="text-sm text-yellow-600 italic">Not Assigned</div>
        ),
    },
    {
      title: "Service",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.serviceName}</div>
          <div className="text-xs text-gray-500">{row.serviceCategory}</div>
        </div>
      ),
    },
    {
      title: "Date & Time",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">
            {formatDate(row.bookingDate)}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(row.bookingTime)}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "bookingStatus",
      render: (row) => <StatusBadge status={row.bookingStatus} />,
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <IconButton
          icon={<FiEye className="h-4 w-4" />}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewBooking(row);
          }}
          tooltip="View details"
        />
      ),
    },
  ];

  // Filter bookings by status if needed
  const filteredBookings =
    filteredStatus !== undefined && filteredStatus !== "all"
      ? bookings.filter(
          (booking) => booking.bookingStatus === parseInt(filteredStatus)
        )
      : bookings;

  return (
    <DataTable
      columns={columns}
      data={filteredBookings}
      isLoading={isLoading}
      emptyMessage="No bookings found."
      onRowClick={onViewBooking}
    />
  );
};

export default BookingsTable;
