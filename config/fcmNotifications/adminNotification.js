const { db } = require("../db");
const admin = require("../../config/firebaseConfig");

const sendVendorRegistrationNotification = async (vendorType, nameOrCompany) => {
    try {
        const [admins] = await db.query(`SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`);
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        const message = {
            notification: {
                title: "🆕 New Vendor Registered",
                body: `${vendorType === 'individual' ? 'Individual' : 'Company'} vendor "${nameOrCompany}" has registered.`,
            },
            data: {
                type: "new_vendor",
                vendorType,
                name: nameOrCompany,
            },
            tokens, // this replaces sendToDevice
        };

        const res = await admin.messaging().sendEachForMulticast(message);

        console.log("✅Registration Notification sent:", res.successCount, "successful,", res.failureCount, "failed");
        if (res.responses) {
            res.responses.forEach((resp, i) => {
                if (!resp.success) {
                    console.warn(`⚠️ Token [${tokens[i]}] failed:`, resp.error?.message);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error sending FCM notification:", error.message);
    }
};

const sendServiceBookingNotification = async (booking_id, service_type_id, user_id) => {
    try {
        // ✅ Fetch user name
        const [[userRow]] = await db.query(
            "SELECT firstName, lastName FROM users WHERE user_id = ?",
            [user_id]
        );
        const userName = userRow ? `${userRow.firstName} ${userRow.lastName}`.trim() : "Unknown";

        // ✅ Fetch service type name
        const [[serviceTypeRow]] = await db.query(
            "SELECT serviceTypeName FROM service_type WHERE service_type_id = ?",
            [service_type_id]
        );
        const service_type_name = serviceTypeRow?.serviceTypeName || "a service";

        // ✅ Get admin FCM tokens
        const [admins] = await db.query(`SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`);
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        // ✅ Send notification
        const message = {
            notification: {
                title: "📦 New Service Booking",
                body: `User "${userName}" booked "${service_type_name}" (Booking ID: ${booking_id})`,
            },
            data: {
                type: "new_booking",
                bookingId: booking_id.toString(),
                serviceTypeName: service_type_name + "",
                userName: userName + "",
            },
            tokens,
        };

        const res = await admin.messaging().sendEachForMulticast(message);

        console.log("✅ Notification sent:", res.successCount, "successful,", res.failureCount, "failed");

        if (res.responses) {
            res.responses.forEach((resp, i) => {
                if (!resp.success) {
                    console.warn(`⚠️ Token [${tokens[i]}] failed:`, resp.error?.message);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error sending booking FCM notification:", error.message);
    }
};

const sendEmployeeCreationNotification = async (vendor_id, employeeName) => {
    try {
        // 1️⃣ Fetch vendor info
        const [[vendor]] = await db.query(
            "SELECT companyName FROM company_details WHERE vendor_id = ?",
            [vendor_id]
        );
        console.log(vendor);

        const vendorName = vendor?.companyName || "Unknown Vendor";

        // 2️⃣ Fetch admin FCM tokens
        const [admins] = await db.query(`SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`);
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        // 3️⃣ Send FCM message
        const message = {
            notification: {
                title: "👨‍💼 New Employee Added",
                body: `Vendor "${vendorName}" added employee "${employeeName}"`,
            },
            data: {
                type: "employee_created",
                vendorName: vendorName + "",
                employeeName: employeeName + "",
            },
            tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Employee creation notification sent: ${response.successCount} success, ${response.failureCount} failed`);
    } catch (err) {
        console.error("❌ Failed to send employee creation notification:", err.message);
    }
};

const sendBookingAssignedNotification = async (employee_id, booking_id) => {
    try {
        // 🔹 1. Get employee FCM token and name
        const [[employee]] = await db.query(
            `SELECT fcmToken, first_name, last_name FROM company_employees WHERE employee_id = ? AND fcmToken IS NOT NULL`,
            [employee_id]
        );

        if (!employee) {
            console.warn(`⚠️ No FCM token found for employee ${employee_id}`);
            return;
        }

        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const token = employee.fcmToken;

        // 🔹 2. Send FCM message
        const message = {
            notification: {
                title: "📦 New Booking Assigned",
                body: `Hello ${employeeName}, you have a new booking assigned (ID: ${booking_id})`,
            },
            data: {
                type: "booking_assigned",
                bookingId: String(booking_id),
                employeeId: String(employee_id),
            },
            token,
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Booking assignment notification sent to employee ${employee_id}: ${response}`);
    } catch (err) {
        console.error("❌ Failed to send booking assigned notification:", err.message);
    }
};



module.exports = {
    sendVendorRegistrationNotification,
    sendServiceBookingNotification,
    sendEmployeeCreationNotification,
    sendBookingAssignedNotification
};
