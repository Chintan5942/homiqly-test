const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userAuthQueries = require("../config/userQueries/userAuthQueries");
const asyncHandler = require("express-async-handler");
const { assignWelcomeCode } = require("./promoCode");
const twilio = require('twilio');
const { sendPasswordUpdatedMail, sendPasswordResetCodeMail, sendUserVerificationMail } = require("../config/mailer");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000;
const generateResetCode = () =>
    Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");

const registerUser = asyncHandler(async (req, res) => {
    const { firstname, lastname, email, phone } = req.body;

    if (!firstname || !lastname || !email || !phone) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        // 🔍 Check if user already exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email, phone]);

        if (existingUsers.length > 0) {
            // Find the matching record by checking fields
            const existingUser = existingUsers.find(
                (user) => user.email === email || user.phone === phone
            );

            if (existingUser.email === email) {
                if (!existingUser.password) {
                    return res.status(400).json({
                        error: "This email is linked to a Google account. Please log in using Google.",
                    });
                }
                return res.status(400).json({ error: "This email is already registered." });
            }

            if (existingUser.phone === phone) {
                return res.status(400).json({ error: "This phone number already exists." });
            }
        }

        // 🟢 Create new user (no password yet)
        const [result] = await db.query(userAuthQueries.userInsert1, [
            firstname,
            lastname,
            email,
            phone,
        ]);

        // Generate and store OTP
        const code = generateResetCode();
        resetCodes.set(email, { code, expiresAt: Date.now() + RESET_EXPIRATION });

        // Send email
        sendUserVerificationMail({ firstname, userEmail: email, code }).catch(console.error);

        res.status(200).json({
            message: "Verification code sent to email.",
            user_id: result.insertId,
        });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const verifyCode = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const entry = resetCodes.get(email);

    const OTP_VALIDITY_MINUTES = 10;

    if (!entry) {
        return res.status(400).json({ error: "No OTP found for this email." });
    }

    const otpExpiryTime = new Date(entry.createdAt).getTime() + OTP_VALIDITY_MINUTES * 60 * 1000;
    const currentTime = new Date().getTime();

    if (entry.code !== otp || currentTime > otpExpiryTime) {
        return res.status(400).json({ error: "Invalid or expired code." });
    }

    // ✅ Remove code once used
    resetCodes.delete(email);

    res.status(200).json({ message: "Code verified. You can now set your password." });
});

const setPassword = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        // 1️⃣ Check if user exists
        const [rows] = await db.query(
            "SELECT password FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "User not found." });
        }

        // 2️⃣ Check if password already set
        const existingPassword = rows[0].password;
        if (existingPassword && existingPassword.trim() !== '') {
            return res.status(400).json({ error: "User already has a password." });
        }

        // 3️⃣ Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4️⃣ Update password
        await db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email]
        );

        res.status(200).json({ message: "Password set successfully. You can now log in." });
    } catch (err) {
        console.error("Set Password Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const [loginUser] = await db.query(userAuthQueries.userLogin, [email]);

        if (!loginUser || loginUser.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = loginUser[0];

        // 🧩 Check if user registered via Google (no password stored)
        if (!user.password) {
            return res.status(400).json({
                error: "This account was created using Google. Please log in using Google.",
            });
        }

        // 🧩 Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // 🧩 Update FCM token if needed
        if (fcmToken && typeof fcmToken === "string" && fcmToken.trim() !== "") {
            const trimmedToken = fcmToken.trim();

            if (user.fcmToken !== trimmedToken) {
                try {
                    await db.query(
                        "UPDATE users SET fcmToken = ? WHERE user_id = ?",
                        [trimmedToken, user.user_id]
                    );
                } catch (err) {
                    console.error("❌ FCM token update error:", err.message);
                }
            }
        }

        // 🧩 Assign welcome code if not already assigned
        let welcomeCode = null;
        try {
            welcomeCode = await assignWelcomeCode(user.user_id, user.email);
        } catch (err) {
            console.error("❌ Auto-assign welcome code error:", err.message);
        }

        // 🧩 Generate JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                status: user.status,
            },
            process.env.JWT_SECRET
        );

        res.status(200).json({
            message: "Login successful",
            user_id: user.user_id,
            token,
            ...(welcomeCode && { welcomeCode }),
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const requestReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        const [user] = await db.query(userAuthQueries.GetUserOnMail, [email]);
        if (!user || user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const code = generateResetCode();
        const expires = Date.now() + RESET_EXPIRATION;
        resetCodes.set(email, { code, expires });

        // ✅ Use helper for email
        sendPasswordResetCodeMail({ userEmail: email, code }).catch(console.error);

        res.status(200).json({ message: "Reset code sent to email." });
    } catch (err) {
        console.error("Email sending failed:", err);
        res.status(500).json({ error: "Internal error", details: err.message });
    }
});

const verifyResetCode = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and code are required" });
    }

    const stored = resetCodes.get(email);
    if (!stored || stored.expires < Date.now()) {
        return res.status(400).json({ error: "Code expired or invalid" });
    }

    if (stored.code !== otp) {
        return res.status(400).json({ error: "Incorrect reset code" });
    }

    resetCodes.delete(email);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    res.status(200).json({ message: "Code verified", token });
});

const resetPassword = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token required" });
    }

    const token = authHeader.split(" ")[1];
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: "New password is required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.query(userAuthQueries.PasswordUpdate, [hashed, email]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // fetch user info for email
        const [[user]] = await db.query(
            "SELECT CONCAT(firstName, ' ', lastName) AS userName, email AS userEmail FROM users WHERE email = ?",
            [email]
        );

        // send email asynchronously (don’t block response)
        sendPasswordUpdatedMail({
            userName: user?.userName || "User",
            userEmail: user?.userEmail || email,
        }).catch(console.error);

        res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset Error:", err);
        res.status(400).json({ error: "Invalid or expired token", details: err.message });
    }
});

const googleLogin = asyncHandler(async (req, res) => {
    const { email, fcmToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // 1️⃣ Check if user exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheckGoogle, [email]);
        let user, user_id;

        if (!existingUsers || existingUsers.length === 0) {
            // 2️⃣ If not found → auto register a new Google user
            const [result] = await db.query(
                `INSERT INTO users (email, loginType, created_at)
                 VALUES (?, 'google', NOW())`,
                [email]
            );

            user_id = result.insertId;
            user = { user_id, email, loginType: "google" };

        } else {
            user = existingUsers[0];
            user_id = user.user_id;
        }

        // 3️⃣ Update FCM token if provided
        if (fcmToken && fcmToken !== user.fcmToken) {
            try {
                await db.query("UPDATE users SET fcmToken = ? WHERE user_id = ?", [fcmToken, user_id]);
            } catch (err) {
                console.error("❌ FCM token update error:", err.message);
            }
        }

        // 4️⃣ Optional: Assign welcome code (ignore failure)
        try {
            await assignWelcomeCode(user_id, email);
        } catch (err) {
            console.error("❌ Auto-assign welcome code error:", err.message);
        }

        // 5️⃣ Generate JWT
        const token = jwt.sign(
            {
                user_id,
                email,
                status: user.status || "active",
                loginType: "google",
            },
            process.env.JWT_SECRET
        );

        // 6️⃣ Return response
        res.status(200).json({
            message: existingUsers.length > 0
                ? "Login successful via Google"
                : "Account created & logged in via Google",
            user_id,
            email,
            token,
        });
    } catch (err) {
        console.error("Google Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// const googleSignup = asyncHandler(async (req, res) => {
//     const { email, name, picture, fcmToken } = req.body;

//     if (!email) {
//         return res.status(400).json({ error: "Email is required" });
//     }

//     const [given_name = "", family_name = ""] = name?.split(" ") || [];

//     try {
//         // ✅ Check if user already exists
//         const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email]);

//         // 🟠 If user exists
//         if (existingUsers.length > 0) {
//             const user = existingUsers[0];

//             // 🚫 If the user has a password → normal login account → reject
//             if (user.password && user.password.trim() !== "") {
//                 return res.status(409).json({
//                     error: "This email is registered with a password. Please log in using email and password.",
//                 });
//             }

//             // 🟢 If user exists but password is empty → login via Google
//             const token = jwt.sign(
//                 {
//                     user_id: user.user_id,
//                     email: user.email,
//                     status: user.status || "active",
//                 },
//                 process.env.JWT_SECRET
//                 // { expiresIn: "30d" }
//             );

//             // Optional: Update FCM token if changed
//             if (fcmToken && fcmToken !== user.fcmToken) {
//                 try {
//                     await db.query("UPDATE users SET fcmToken = ? WHERE user_id = ?", [fcmToken, user.user_id]);
//                 } catch (err) {
//                     console.error("❌ FCM token update error:", err.message);
//                 }
//             }

//             return res.status(200).json({
//                 message: "Login successful via Google",
//                 user_id: user.user_id,
//                 token,
//             });
//         }

//         // 🟢 If user not found → create new Google user
//         const [result] = await db.query(userAuthQueries.userInsert, [
//             given_name,
//             family_name,
//             email,
//             null, // phone
//             picture,
//             fcmToken || null
//         ]);

//         const user_id = result.insertId;

//         // Fetch the inserted user
//         const [[newUser]] = await db.query(userAuthQueries.userMailCheck, [email]);

//         // Optional: Assign welcome code
//         let welcomeCode = null;
//         try {
//             welcomeCode = await assignWelcomeCode(user_id, email);
//         } catch (err) {
//             console.error("❌ Auto-assign welcome code error:", err.message);
//         }

//         // Generate JWT
//         const token = jwt.sign(
//             {
//                 user_id: newUser.user_id,
//                 email: newUser.email,
//                 status: newUser.status || "active",
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "30d" }
//         );

//         res.status(201).json({
//             message: "Signup successful via Google",
//             user_id: newUser.user_id,
//             token,
//             ...(welcomeCode && { welcomeCode }),
//         });
//     } catch (err) {
//         console.error("Google Signup Error:", err);
//         res.status(500).json({ error: "Server error", details: err.message });
//     }
// });


// ✅ Step 1: Request OTP
const sendOtp = asyncHandler(async (req, res) => {
    const { phone, email, forceOtp = false } = req.body; // 👈 Add `forceOtp` flag for login-with-otp flow

    if (!phone && !email) {
        return res.status(400).json({ message: "Either phone or email is required" });
    }

    // ✅ 1. Check if user exists
    const [existingUsers] = await db.query(
        "SELECT * FROM users WHERE phone = ? OR email = ?",
        [phone || null, email || null]
    );

    const user = existingUsers[0];
    const is_registered = !!user;
    const is_password = user && user.password && user.password.trim() !== "";

    // ⚠️ 2. If user exists with email and has password — redirect to password login (unless forceOtp=true)
    if (email && is_registered && is_password && !forceOtp) {
        return res.status(200).json({
            message: "User already registered with password. Redirect to password login.",
            is_registered: true,
            is_password: true,
            can_send_otp: false,
            redirectToPassword: true
        });
    }

    // 🔢 3. Generate OTP
    const otp = generateOTP();

    // 🔐 4. Create JWT (30 minutes)
    const tokenPayload = { otp };
    if (phone) tokenPayload.phone = phone;
    if (email) tokenPayload.email = email;

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30m" });

    // 📩 5. Send OTP via SMS (if phone)
    if (phone) {
        try {
            await client.messages.create({
                body: `Your Homiqly code is: ${otp}. It expires in 5 minutes. Never share this code.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone,
            });
            console.log(`📱 OTP sent via SMS to ${phone}`);
        } catch (error) {
            console.error("❌ Failed to send SMS OTP:", error.message);
        }
    }

    // 📧 6. Send OTP via Email (if email)
    if (email) {
        try {
            await sendUserVerificationMail({
                userEmail: email,
                code: otp,
            });
            console.log(`📧 OTP sent via Email to ${email}`);
        } catch (error) {
            console.error("❌ Failed to send email OTP:", error.message);
        }
    }

    // ✅ 7. Respond
    res.status(200).json({
        message: "OTP sent successfully",
        token,
        is_registered,
        is_password,
        can_send_otp: true,
        redirectToPassword: false
    });
});



// ✅ Step 2: Verify OTP (Handles both Login & Registration)
const verifyOtp = asyncHandler(async (req, res) => {
    let { phone, email, otp, firstName, lastName, password } = req.body;
    const authHeader = req.headers.authorization;

    if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
    }

    otp = String(otp);
    let decoded = null;

    // ✅ 1. Verify JWT token from sendOtp API
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            decoded.otp = String(decoded.otp);

            const otpValidForPhone =
                decoded.phone && phone && decoded.phone === phone && decoded.otp === otp;
            const otpValidForEmail =
                decoded.email && email && decoded.email === email && decoded.otp === otp;

            if (!otpValidForPhone && !otpValidForEmail) {
                return res.status(400).json({ message: "Invalid OTP or identifier" });
            }
        } catch (err) {
            console.error("JWT Verification Error:", err);
            if (err.name === "TokenExpiredError") {
                return res.status(400).json({ message: "OTP expired. Please request a new one." });
            }
            return res.status(400).json({ message: "Invalid token" });
        }
    } else {
        return res.status(400).json({ message: "Authorization token missing" });
    }

    // ✅ 2. Lookup user (by phone or email)
    const [rows] = await db.query(
        `SELECT * FROM users WHERE phone = ? OR email = ?`,
        [phone || null, email || null]
    );
    const user = rows[0];

    // ✅ 3. OTP verified successfully
    if (decoded && decoded.otp === otp) {
        const identifier = decoded.phone || decoded.email;

        if (!user) {
            // 🟢 New User Registration
            if (!firstName || !lastName) {
                return res.status(200).json({
                    message: "Welcome — please provide name (and optionally password)",
                    requireDetails: true,
                });
            }

            const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

            const [result] = await db.query(
                `INSERT INTO users (firstName, lastName, phone, email, password, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [firstName, lastName, phone || null, email || null, hashedPassword]
            );

            const user_id = result.insertId;
            const loginToken = jwt.sign({ user_id, phone, email }, process.env.JWT_SECRET);

            return res.status(200).json({
                message: "Registration successful",
                user: { user_id, firstName, lastName, phone, email },
                token: loginToken,
            });
        }

        // 🟢 Existing user — login successful via OTP
        const loginToken = jwt.sign(
            { user_id: user.user_id, phone: user.phone, email: user.email },
            process.env.JWT_SECRET
        );

        return res.status(200).json({
            message: "Login successful via OTP",
            token: loginToken,
        });
    }

    // ✅ 4. Fallback login (email + password)
    if (email && password) {
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password || "");
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const loginToken = jwt.sign(
            { user_id: user.user_id, phone: user.phone, email: user.email },
            process.env.JWT_SECRET
        );

        return res.status(200).json({
            message: "Login successful via email/password",
            token: loginToken,
        });
    }

    // ✅ 5. Missing credentials
    return res.status(400).json({ message: "OTP or email/password required to login" });
});





module.exports = {
    registerUser,
    loginUser,
    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin,
    // googleSignup,
    sendOtp,
    verifyOtp
};
