// src/app/components/Tables/PayoutsTable.jsx
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import { Eye } from "lucide-react";

const currency = "CAD";

const PayoutsTable = ({ payouts = [], isLoading, onView }) => {
  const columns = [
    {
      title: "Vendor ID",
      key: "vendor_id",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.vendor_id}</div>
      ),
    },
    {
      title: "Vendor Name",
      key: "vendor_name",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">
          {row.vendor_name || row.vendorName || "N/A"}
        </div>
      ),
    },
    {
      title: "Total Payout",
      key: "totalPayout",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.totalPayout != null
            ? formatCurrency(row.totalPayout, currency)
            : "N/A"}
        </div>
      ),
    },
    {
      title: "Pending",
      key: "pendingPayout",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.pendingPayout != null
            ? formatCurrency(row.pendingPayout, currency)
            : "N/A"}
        </div>
      ),
    },
    {
      title: "Paid",
      key: "paidPayout",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.paidPayout != null
            ? formatCurrency(row.paidPayout, currency)
            : "N/A"}
        </div>
      ),
    },
    {
      title: "Transactions",
      key: "totalTransactions",
      render: (row) => (
        <div className="text-sm ml-2 text-gray-900">
          {row.totalTransactions ?? "N/A"}
        </div>
      ),
    },
    {
      title: "Pending Count",
      key: "pendingCount",
      render: (row) => (
        <div className="text-sm ml-2 text-gray-900">
          {row.pendingCount ?? 0}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<Eye />}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(row);
            }}
            tooltip="View"
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payouts}
      isLoading={isLoading}
      emptyMessage="No payout requests found."
      onRowClick={(row) => onView?.(row)}
    />
  );
};

export default PayoutsTable;
