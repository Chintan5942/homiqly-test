import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import Card from "../../shared/components/Card/Card";
import Button from "../../shared/components/Button/Button";
import {
  Loader2,
  Building2,
  User,
  Mail,
  Shield,
  BanknoteIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FormFileInput, FormSelect } from "../../shared/components/Form";
import FormInput from "../../shared/components/Form/FormInput";

const AccountDetails = () => {
  const vendorData = localStorage.getItem("vendorData")
    ? JSON.parse(localStorage.getItem("vendorData"))
    : null;
  const vendorType = vendorData?.vendor_type;

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [governmentIdFile, setGovernmentIdFile] = useState(null);

  const [formData, setFormData] = useState({
    account_holder_name: "",
    bank_name: "",
    institution_number: "",
    transit_number: "",
    account_number: "",
    bank_address: "",
    email: "",
    legal_name: "",
    dob: "",
    business_name: "",
    government_id: "",
    preferred_transfer_type: "",
    interac_email: "",
    interac_phone: "",
  });

  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{7,15}$/;

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/payment/get-bank-details");
      if (res.data) {
        setAccount(res.data);
        setFormData({
          ...res.data,
          dob: res.data.dob ? res.data.dob.split("T")[0] : "",
        });
        setEditing(false);
      } else {
        setAccount(null);
        setEditing(true);
      }
    } catch (err) {
      console.error("Error fetching account:", err);
      setAccount(null);
      setEditing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setGovernmentIdFile(e.target.files[0]);
  };

  const validateForm = () => {
    const requiredFields = [
      "account_holder_name",
      "bank_name",
      "institution_number",
      "transit_number",
      "account_number",
      "email",
    ];

    for (let field of requiredFields) {
      if (!formData[field]?.toString().trim()) {
        toast.error(
          `Please fill the required field: ${field.replace(/_/g, " ")}`
        );
        return false;
      }
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }

    if (formData.preferred_transfer_type === "e_transfer") {
      if (!formData.interac_email && !formData.interac_phone) {
        toast.error("Please provide either Interac Email or Interac Phone");
        return false;
      }
    }

    if (!emailRegex.test(formData.interac_email)) {
      toast.error("Invalid Interac Email format");
      return false;
    }

    if (
      formData.preferred_transfer_type === "e_transfer" &&
      formData.interac_phone &&
      !phoneRegex.test(formData.interac_phone)
    ) {
      toast.error(
        "Interac Phone must be digits only and 7 to 15 characters long"
      );
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }
      if (governmentIdFile) {
        formDataToSend.append("government_id", governmentIdFile);
      }
      await api.post("/api/payment/register-bank", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Bank account created successfully!");
      await fetchAccount();
    } catch (err) {
      console.error("Error creating account:", err);
      toast.error("Failed to create bank account.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }
      if (governmentIdFile) {
        formDataToSend.append("government_id", governmentIdFile);
      }
      await api.patch("/api/payment/edit-bank-details", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Bank account updated successfully!");
      await fetchAccount();
    } catch (err) {
      console.error("Error updating account:", err);
      toast.error("Failed to update bank account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl p-6 mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
          <p className="mt-1 text-gray-600">
            Manage your payout details and KYC verification.
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <div className="p-6 space-y-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BanknoteIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Bank Account Details
                  </h2>
                  <p className="text-sm text-gray-600">
                    {account
                      ? "Your bank account is verified and ready for payouts."
                      : "Add your bank details to start receiving payments."}
                  </p>
                </div>
              </div>
              {account && !editing && (
                <Button variant="lightBlack" onClick={() => setEditing(true)}>Edit Details</Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-blue-600 animate-spin" size={32} />
                <span className="ml-3 text-gray-600">
                  Loading account details...
                </span>
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Bank Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput
                      label="Account Holder Name"
                      type="text"
                      name="account_holder_name"
                      value={formData.account_holder_name || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="Legal name on bank account"
                      className="w-full"
                    />
                    <FormInput
                      label="Bank Name"
                      type="text"
                      name="bank_name"
                      value={formData.bank_name || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. Royal Bank of Canada"
                      className="w-full"
                    />
                    <FormInput
                      label="Institution Number (3 digits)"
                      type="text"
                      name="institution_number"
                      value={formData.institution_number || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. 004"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full"
                    />
                    <FormInput
                      label="Transit Number (5 digits)"
                      type="text"
                      name="transit_number"
                      value={formData.transit_number || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. 12345"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full"
                    />
                    <FormInput
                      label="Account Number (7–12 digits)"
                      type="text"
                      name="account_number"
                      value={formData.account_number || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. 1234567"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full"
                    />
                    <FormInput
                      label="Bank Address (optional)"
                      type="text"
                      name="bank_address"
                      value={formData.bank_address || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="Branch address"
                      className="w-full"
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Contact Information
                    </h3>
                  </div>
                  <FormInput
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="vendor@example.com"
                    className="w-full max-w-md"
                    autoComplete="email"
                  />
                </section>

                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendorType === "individual"
                        ? "Individual Details"
                        : "Business Details"}
                    </h3>
                  </div>
                  {vendorType === "individual" ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormInput
                        label="Full Legal Name"
                        type="text"
                        name="legal_name"
                        value={formData.legal_name || ""}
                        onChange={handleChange}
                        disabled={!editing}
                        placeholder="Name as on ID"
                      />
                      <FormInput
                        label="Date of Birth"
                        type="date"
                        name="dob"
                        value={formData.dob || ""}
                        onChange={handleChange}
                        disabled={!editing}
                      />
                    </div>
                  ) : (
                    <FormInput
                      label="Business Name"
                      type="text"
                      name="business_name"
                      value={formData.business_name || ""}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="Registered business name"
                      className="max-w-md"
                    />
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Identity Verification
                    </h3>
                  </div>
                  <FormFileInput
                    label="Government ID (Upload)"
                    name="government_id"
                    onChange={handleFileChange}
                    disabled={!editing}
                    accept=".jpg,.jpeg,.png,.pdf"
                  />
                  {formData.government_id && !governmentIdFile && (
                    <p className="text-gray-600 text-xs">
                      Current file: {formData.government_id.split("/").pop()}
                    </p>
                  )}
                  {formData.government_id && (
                    <a
                      href={formData.government_id}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 underline text-xs"
                    >
                      View Government ID
                    </a>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <BanknoteIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Transfer Preferences
                    </h3>
                  </div>
                  <FormSelect
                    label="Preferred Transfer Type"
                    name="preferred_transfer_type"
                    value={formData.preferred_transfer_type}
                    onChange={handleChange}
                    disabled={!editing}
                    options={[
                      { value: "e_transfer", label: "e-Transfer" },
                      // { value: "bank_transfer", label: "Bank Transfer" },
                    ]}
                  />
                  {formData.preferred_transfer_type === "e_transfer" && (
                    <div className="grid grid-cols-1 gap-4 p-4 rounded-lg bg-blue-50 md:grid-cols-2">
                      <FormInput
                        label="Interac Email"
                        type="email"
                        name="interac_email"
                        value={formData.interac_email || ""}
                        onChange={handleChange}
                        disabled={!editing}
                        placeholder="email@example.com"
                      />
                      <FormInput
                        label="Interac Phone (Numbers Only)"
                        type="tel"
                        name="interac_phone"
                        value={formData.interac_phone || ""}
                        onChange={handleChange}
                        disabled={!editing}
                        placeholder="e.g. 4165551234"
                        inputMode="numeric"
                      />
                    </div>
                  )}
                </section>

                {editing && (
                  <div className="flex justify-end pt-6 space-x-3 border-t">
                    <Button
                      variant="lightInherit"
                      onClick={() => {
                        fetchAccount();
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={account ? handleUpdate : handleCreate}
                      disabled={loading}
                    >
                      {loading
                        ? account
                          ? "Saving..."
                          : "Registering..."
                        : account
                        ? "Save Changes"
                        : "Register Bank Account"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountDetails;
