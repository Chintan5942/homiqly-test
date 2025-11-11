import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "sonner";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import ProfileEditModal from "../../vendor/components/Modals/ProfileEditModal";
import {
  User,
  Calendar,
  Package,
  BadgeCheck,
  LinkIcon,
  AlertCircle,
  Pencil,
} from "lucide-react";
import ProfileServicesOffered from "./components/ProfileServicesOffered";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/vendor/getprofile");
      if (response.data?.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      toast.error("Failed to load profile data");
      console.error("Error fetching vendor profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    setIsEditModalOpen(false);
    fetchVendorProfile();
  };

  if (loading) {
    return (
      <>
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50/30">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Navigation Tabs with Edit Button */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-7xl">
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Tabs */}
                  <nav className="flex -mb-px space-x-8">
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                        activeTab === "profile"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <User className="inline w-4 h-4 mr-2" />
                      Profile Information
                    </button>

                    <button
                      onClick={() => setActiveTab("services")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                        activeTab === "services"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Package className="inline w-4 h-4 mr-2" />
                      Services Offered
                    </button>

                    <button
                      onClick={() => setActiveTab("certificates")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                        activeTab === "certificates"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <BadgeCheck className="inline w-4 h-4 mr-2" />
                      Certificates
                    </button>
                  </nav>

                  {/* Edit Button */}
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={() => setIsEditModalOpen(true)}
                      variant="primary"
                      size="sm"
                      icon={<Pencil className="w-4 h-4" />}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex justify-center">
            <div className="w-full max-w-7xl">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="transition-all duration-300 ease-in-out">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Sidebar - Profile Overview */}
                    <div className="lg:col-span-1">
                      <Card className="border-0 shadow-lg">
                        <div className="p-6 text-center">
                          {/* Profile Image */}
                          <div className="relative inline-block">
                            <div className="w-32 h-32 mx-auto overflow-hidden border-4 border-white shadow-lg rounded-2xl">
                              <img
                                src={
                                  profile?.profileImage || "/profile-img.webp"
                                }
                                alt="Profile"
                                className="object-cover w-full h-full"
                              />
                            </div>
                          </div>

                          {/* Profile Info */}
                          <div className="mt-6">
                            <h2 className="text-xl font-bold text-gray-900">
                              {profile?.name}
                            </h2>
                            <div className="inline-flex items-center px-3 py-1 mt-2 text-sm font-medium text-green-800 capitalize bg-green-100 rounded-full">
                              <BadgeCheck className="w-4 h-4 mr-1" />
                              {profile?.vendorType} Vendor
                            </div>
                          </div>

                          {/* Member Since */}
                          <div className="p-4 mt-6 border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                            <Calendar className="w-5 h-5 mx-auto mb-2 text-green-600" />
                            <div className="text-sm font-medium text-gray-900">
                              Member Since
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(profile?.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Right Content - Profile Details */}
                    <div className="lg:col-span-2">
                      <Card className="border-0 shadow-lg">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center">
                              <User className="w-6 h-6 mr-2 text-gray-700" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                Personal Information
                              </h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                Full Name
                              </label>
                              <p className="text-gray-900">
                                {profile?.name || "Not provided"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                Email Address
                              </label>
                              <p className="text-gray-900">
                                {profile?.email || "Not provided"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                Phone Number
                              </label>
                              <p className="text-gray-900">
                                {profile?.phone || "Not provided"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                Date of Birth
                              </label>
                              <p className="text-gray-900">
                                {profile?.birthDate
                                  ? new Date(
                                      profile.birthDate
                                    ).toLocaleDateString()
                                  : "Not provided"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                About me
                              </label>
                              <p className="text-gray-900">
                                {profile?.aboutMe || "Not provided"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">
                                Expertise
                              </label>
                              <p className="text-gray-900">
                                {profile?.expertise || "Not provided"}
                              </p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-sm font-medium text-gray-500">
                                Address
                              </label>
                              <p className="text-gray-900">
                                {profile?.address || "Not provided"}
                              </p>
                            </div>
                          </div>

                          {/* Company Specific */}
                          {profile?.vendorType === "company" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-500">
                                  Contact Person
                                </label>
                                <p className="text-gray-900">
                                  {profile?.contactPerson || "Not provided"}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-500">
                                  Google Business Profile
                                </label>
                                <p className="text-gray-900 truncate">
                                  {profile?.googleBusinessProfileLink ? (
                                    <a
                                      href={profile.googleBusinessProfileLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      {profile.googleBusinessProfileLink}
                                    </a>
                                  ) : (
                                    "Not provided"
                                  )}
                                </p>
                              </div>

                              <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-500">
                                  Company Address
                                </label>
                                <p className="text-gray-900">
                                  {profile?.companyAddress || "Not provided"}
                                </p>
                              </div>
                            </>
                          )}

                          {/* Individual Specific */}
                          {/* {profile?.vendorType === "individual" && <></>} */}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Tab — now a separate component with its own API calls */}
              {activeTab === "services" && (
                <div className="transition-all duration-300 ease-in-out">
                  <ProfileServicesOffered />
                </div>
              )}

              {/* Certificates Tab */}
              {activeTab === "certificates" && (
                <div className="transition-all duration-300 ease-in-out">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <BadgeCheck className="w-6 h-6 mr-2 text-gray-700" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Certificates
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Police Clearance */}
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">
                            Police Clearance
                          </label>
                          {profile?.policeClearance ? (
                            <a
                              href={profile.policeClearance}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                            >
                              <LinkIcon className="w-4 h-4 mr-1" />
                              Open Police Clearance
                            </a>
                          ) : (
                            <div className="inline-flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Not uploaded
                            </div>
                          )}
                        </div>

                        {/* Business License */}
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">
                            Business License
                          </label>
                          {profile?.businessLicense ? (
                            <a
                              href={profile.businessLicense}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                            >
                              <LinkIcon className="w-4 h-4 mr-1" />
                              Open Business License
                            </a>
                          ) : (
                            <div className="inline-flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Not uploaded
                            </div>
                          )}
                          {/* Expiry */}
                          <div className="my-2 text-sm">
                            <span className="text-gray-500">Expiry:&nbsp;</span>
                            {profile?.businessLicenseExpireDate ? (
                              <>
                                <span className="text-gray-900">
                                  {new Date(
                                    profile.businessLicenseExpireDate
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                                <span
                                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    new Date(
                                      profile.businessLicenseExpireDate
                                    ) < new Date()
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {new Date(profile.businessLicenseExpireDate) <
                                  new Date()
                                    ? "Expired"
                                    : "Valid"}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                        </div>

                        {/* Certificate of Expertise */}
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">
                            Certificate of Expertise
                          </label>
                          {profile?.certificateOfExpertise ? (
                            <a
                              href={profile.certificateOfExpertise}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                            >
                              <LinkIcon className="w-4 h-4 mr-1" />
                              Open Certificate of Expertise
                            </a>
                          ) : (
                            <div className="inline-flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Not uploaded
                            </div>
                          )}

                          <div className="my-2 text-sm">
                            <span className="text-gray-500">Expiry:&nbsp;</span>
                            {profile?.certificateOfExpertiseExpireDate ? (
                              <>
                                <span className="text-gray-900">
                                  {new Date(
                                    profile.certificateOfExpertiseExpireDate
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                                <span
                                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    new Date(
                                      profile.certificateOfExpertiseExpireDate
                                    ) < new Date()
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {new Date(
                                    profile.certificateOfExpertiseExpireDate
                                  ) < new Date()
                                    ? "Expired"
                                    : "Valid"}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
};

export default Profile;
