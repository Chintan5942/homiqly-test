import { useState } from "react";
import api from "../../../lib/axiosConfig";
import { toast } from "sonner";
// import { Card } from "../../shared/components/Card";
import { Button } from "../../../shared/components/Button";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
  FormOption,
  FormSelect,
} from "../../../shared/components/Form";
import {
  X,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  Calendar,
  Award,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  CheckCheck,
  BadgeCheck,
} from "lucide-react";
import Modal from "../../../shared/components/Modal/Modal";
import { useVendorAuth } from "../../contexts/VendorAuthContext";

const ProfileEditModal = ({ isOpen, onClose, profile, onProfileUpdate }) => {
  const [activeSection, setActiveSection] = useState("profile");
  const [updating, setUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const { currentUser, setCurrentUser } = useVendorAuth();

  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    companyAddress: profile?.companyAddress || "",
    contactPerson: profile?.contactPerson || "",
    googleBusinessProfileLink: profile?.googleBusinessProfileLink || "",
    expertise: profile?.expertise || "",
    aboutMe: profile?.aboutMe || "",
    birthDate: profile?.birthDate?.slice(0, 10) || "",
    policeClearance: null,
    certificateOfExpertise: null,
    businessLicense: null,
    certificateOfExpertiseExpireDate: profile?.certificateOfExpertiseExpireDate
      ? profile.certificateOfExpertiseExpireDate.slice(0, 10)
      : "",
    businessLicenseExpireDate: profile?.businessLicenseExpireDate
      ? profile.businessLicenseExpireDate.slice(0, 10)
      : "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const UploadedInfo = ({ url, label, extra }) => {
    if (!url) return null;
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-1">
        <CheckCheck className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-800">{label} uploaded</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline hover:no-underline"
        >
          View
        </a>
        {extra ? (
          <span className="text-sm text-green-800">• {extra}</span>
        ) : null}
      </div>
    );
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files?.length > 0) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const data = new FormData();

      if (formData.businessLicense && !formData.businessLicenseExpireDate) {
        toast.error("Business license expire date is required");
        return;
      }

      if (
        formData.certificateOfExpertise &&
        !formData.certificateOfExpertiseExpireDate
      ) {
        toast.error("Certificate of expertise expire date is required");
        return;
      }

      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      if (profileImage) {
        data.append("profileImageVendor", profileImage);
      }

      const response = await api.put("/api/vendor/updateprofile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        toast.success("Profile updated successfully");
        onProfileUpdate();
      }

      const updatedUser = {
        ...(currentUser || {}),
        name: formData.name,
        email: formData.email,
      };

      if (typeof setCurrentUser === "function") {
        setCurrentUser(updatedUser);
      }

      try {
        localStorage.setItem("vendorData", JSON.stringify(formData)) ||
          sessionStorage.setItem("vendorData", JSON.stringify(formData));
      } catch (err) {
        console.warn("Failed to write vendorData to localStorage", err);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setUpdating(true);

    try {
      const response = await api.put("/api/vendor/changepassword", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const expertiseOptions = [
    "Hairstylist",
    "Nail technician",
    "Makeup artist",
    "Aesthetician/Esthetician",
  ];

  return (
    /* Replace the entire previous fixed modal markup with this: */
    <Modal
      size="xl"
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile & Settings"
      showCloseButton={true}
      closeOnOverlayClick={true}
    >
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-gray-200 bg-gray-50">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveSection("profile")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === "profile"
                  ? "bg-white text-green-700 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              <User className="w-4 h-4 mr-3" />
              Profile Information
            </button>

            <button
              onClick={() => setActiveSection("password")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === "password"
                  ? "bg-white text-green-700 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              <Lock className="w-4 h-4 mr-3" />
              Change Password
            </button>

            <button
              onClick={() => setActiveSection("certificates")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === "certificates"
                  ? "bg-white text-green-700 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              <BadgeCheck className="w-4 h-4 mr-3" />
              Certificates
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 max-h-[70vh] overflow-y-auto">
          {/* ===== Profile Section ===== */}
          {activeSection === "profile" && (
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-6">
                {/* Profile Image */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-20 h-20 overflow-hidden border-2 border-white rounded-full shadow-lg">
                      <img
                        src={
                          profileImage
                            ? URL.createObjectURL(profileImage)
                            : profile?.profileImage || "/profile-img.webp"
                        }
                        alt="Profile"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <label className="absolute bottom-0 right-0 p-1 text-white transition-colors bg-green-600 rounded-full shadow-lg cursor-pointer hover:bg-green-700">
                      <Pencil className="w-3 h-3" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Profile Photo</h4>
                    <p className="text-sm text-gray-500">
                      JPG, PNG or Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormInput
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    icon={<User className="w-5 h-5" />}
                    placeholder="Enter your full name"
                    required
                  />
                  <FormInput
                    disabled
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    icon={<Mail className="w-5 h-5" />}
                    placeholder="Enter your email"
                    required
                  />
                  <FormInput
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    icon={<Phone className="w-5 h-5" />}
                    placeholder="Enter your phone number"
                  />
                  <FormInput
                    label="Date of Birth"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    icon={<Calendar className="w-5 h-5" />}
                  />

                  {profile?.vendorType === "company" && (
                    <>
                      <FormInput
                        label="Contact Person"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        icon={<User className="w-5 h-5" />}
                        placeholder="Main contact person"
                      />
                      <FormInput
                        label="Google Business Profile"
                        name="googleBusinessProfileLink"
                        value={formData.googleBusinessProfileLink}
                        onChange={handleInputChange}
                        icon={<Globe className="w-5 h-5" />}
                        placeholder="Business profile link"
                      />
                      <div className="md:col-span-2">
                        <FormTextarea
                          label="Company Address"
                          name="companyAddress"
                          value={formData.companyAddress}
                          onChange={handleInputChange}
                          rows={3}
                          icon={<Building className="w-5 h-5" />}
                          placeholder="Enter company address"
                        />
                      </div>
                    </>
                  )}

                  {profile?.vendorType === "individual" && (
                    <>
                      <div className="md:col-span-2">
                        <FormTextarea
                          label="Address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows={3}
                          icon={<MapPin className="w-5 h-5" />}
                          placeholder="Enter your address"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormInput
                          maxLength={100}
                          label="About me"
                          name="aboutMe"
                          value={formData.aboutMe}
                          onChange={handleInputChange}
                          placeholder="Any additional information about your services"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormSelect
                          label="Expertise"
                          name="expertise"
                          value={formData.expertise}
                          onChange={handleInputChange}
                          options={expertiseOptions}
                        />
                        {/* {expertiseOptions.map((opt) => (
                          <FormOption
                            key={opt}
                            type="checkbox"
                            name="expertise"
                            value={opt}
                            checked={formData.expertise.includes(opt)}
                            onChange={(e) => {
                              const { checked } = e.target;
                              setFormData((prev) => ({
                                ...prev,
                                expertise: checked
                                  ? [...prev.expertise, opt]
                                  : prev.expertise.filter((x) => x !== opt),
                              }));
                            }}
                            label={opt}
                          />
                        ))} */}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 space-x-4 ">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updating}
                  icon={<Save className="w-5 h-5" />}
                  className="text-white bg-green-600 border-green-600 hover:bg-green-700"
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          )}

          {/* ===== Change Password Section ===== */}
          {activeSection === "password" && (
            <form onSubmit={changePassword}>
              <div className="space-y-6">
                <div className="p-4 border border-green-100 rounded-lg bg-green-50">
                  <div className="flex">
                    <Lock className="w-5 h-5 mr-3 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        Change Password
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <FormInput
                      label="Current Password"
                      name="currentPassword"
                      type={showPassword.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="absolute text-gray-400 right-3 top-9 hover:text-gray-600"
                      onClick={() => togglePasswordVisibility("current")}
                    >
                      {showPassword.current ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <FormInput
                      label="New Password"
                      name="newPassword"
                      type={showPassword.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="absolute text-gray-400 right-3 top-9 hover:text-gray-600"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPassword.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <FormInput
                      label="Confirm New Password"
                      name="confirmPassword"
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="absolute text-gray-400 right-3 top-9 hover:text-gray-600"
                      onClick={() => togglePasswordVisibility("confirm")}
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updating}
                  icon={<Lock className="w-5 h-5" />}
                  className="text-white bg-green-600 border-green-600 hover:bg-green-700"
                >
                  Change Password
                </Button>
              </div>
            </form>
          )}

          {activeSection === "certificates" && (
            <form onSubmit={handleProfileSubmit}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-1 mt-4">
                {/* Police Clearance */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Police Clearance
                  </label>
                  <FormFileInput
                    name="policeClearance"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        policeClearance: e.target.files?.[0] || null,
                      })
                    }
                  />
                  {/* Show status if already uploaded */}
                  <UploadedInfo
                    url={profile?.policeClearance}
                    label="Police Clearance"
                  />
                </div>

                {/* Certificate of Expertise */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Certificate of Expertise
                  </label>
                  <FormFileInput
                    name="certificateOfExpertise"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certificateOfExpertise: e.target.files?.[0] || null,
                      })
                    }
                  />
                  <UploadedInfo
                    url={profile?.certificateOfExpertise}
                    label="Certificate of Expertise"
                    extra={
                      formData.certificateOfExpertiseExpireDate ? (
                        <>
                          Expires on {formData.certificateOfExpertiseExpireDate}
                        </>
                      ) : undefined
                    }
                  />
                  {/* Only require date if a NEW file is picked */}
                  {(formData.certificateOfExpertise ||
                    formData.certificateOfExpertiseExpireDate) && (
                    <div className="mt-3">
                      <FormInput
                        type="date"
                        label="Certificate of Expertise Expiry Date"
                        name="certificateOfExpertiseExpireDate"
                        value={formData.certificateOfExpertiseExpireDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            certificateOfExpertiseExpireDate: e.target.value,
                          })
                        }
                        required={!!formData.certificateOfExpertise}
                      />
                    </div>
                  )}
                </div>

                {/* Business License */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Business License
                  </label>
                  <FormFileInput
                    name="businessLicense"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        businessLicense: e.target.files?.[0] || null,
                      })
                    }
                  />
                  <UploadedInfo
                    url={profile?.businessLicense}
                    label="Business License"
                    extra={
                      formData.businessLicenseExpireDate ? (
                        <>Expires on {formData.businessLicenseExpireDate}</>
                      ) : undefined
                    }
                  />
                </div>

                {(formData.businessLicense ||
                  formData.businessLicenseExpireDate) && (
                  <div>
                    <FormInput
                      type="date"
                      label="Business License Expiry Date"
                      name="businessLicenseExpireDate"
                      value={formData.businessLicenseExpireDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessLicenseExpireDate: e.target.value,
                        })
                      }
                      required={!!formData.businessLicense}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 space-x-4 ">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updating}
                  icon={<Save className="w-5 h-5" />}
                  className="text-white bg-green-600 border-green-600 hover:bg-green-700"
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditModal;
