import React from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import { FiEye } from "react-icons/fi";

const EmployeesTable = ({ employees, isLoading, onViewEmployee }) => {
  const columns = [
    {
      title: "ID",
      key: "employee_id",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.employee_id}</div>
      ),
    },
    {
      title: "Employee Name",
      render: (row) => (
        <div className="flex items-center">
          {row.profile_image ? (
            <img
              src={row.profile_image}
              alt={`${row.employee_name} `}
              className="h-8 w-8 rounded-full mr-3 object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-gray-500 text-sm">
                {row.employee_name?.charAt(0) || ""}
              </span>
            </div>
          )}
          <div className="text-sm font-medium text-gray-900">
            {row.employee_name}
          </div>
        </div>
      ),
    },
    {
      title: "Company",
      key: "companyName",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.companyName}</div>
      ),
    },
    {
      title: "Email",
      key: "email",
      render: (row) => <div className="text-sm text-gray-900">{row.email}</div>,
    },
    {
      title: "Phone",
      key: "phone",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.phone || "N/A"}</div>
      ),
    },
    {
      title: "Joined",
      key: "created_at",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {new Date(row.created_at).toLocaleDateString("en-IN", {
            dateStyle: "medium",
          })}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <IconButton
          icon={<FiEye />}
          variant="ghost"
          size="sm"
          onClick={() => onViewEmployee(row)}
          tooltip="View details"
        />
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={employees}
      isLoading={isLoading}
      rowKey="employee_id"
      emptyMessage="No employees found"
    />
  );
};

export default EmployeesTable;
