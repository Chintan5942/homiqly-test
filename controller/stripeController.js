const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
// 1. Vendor creates Stripe account
exports.createStripeAccount = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: req.user.email,
        capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
        },
    });

    await db.query(`
      INSERT INTO vendor_stripe_accounts (vendor_id, stripe_account_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE stripe_account_id = VALUES(stripe_account_id)
    `, [vendorId, account.id]);

    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.CLIENT_URL}/stripe/refresh`,
        return_url: `${process.env.CLIENT_URL}/stripe/return`,
        type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
});

// 2. Refresh onboarding link
exports.refreshStripeOnboarding = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const [rows] = await db.query(
        "SELECT stripe_account_id FROM vendor_stripe_accounts WHERE vendor_id = ?",
        [vendorId]
    );

    if (!rows.length) return res.status(400).json({ error: "Stripe account not found" });

    const accountLink = await stripe.accountLinks.create({
        account: rows[0].stripe_account_id,
        refresh_url: `${process.env.CLIENT_URL}/stripe/refresh`,
        return_url: `${process.env.CLIENT_URL}/stripe/return`,
        type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
});


// 3. Get vendor account status
exports.getStripeAccountStatus = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const [rows] = await db.query(
        "SELECT stripe_account_id FROM vendor_stripe_accounts WHERE vendor_id = ?",
        [vendorId]
    );

    if (!rows.length) {
        return res.status(400).json({ error: "Stripe account not found" });
    }

    const stripeAccountId = rows[0].stripe_account_id;

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const payoutsEnabled = account.payouts_enabled ? 1 : 0;
    const chargesEnabled = account.charges_enabled ? 1 : 0;
    const detailsSubmitted = account.details_submitted ? 1 : 0;

    await db.query(
        `UPDATE vendor_stripe_accounts
         SET payouts_enabled = ?, charges_enabled = ?, details_submitted = ?
         WHERE vendor_id = ?`,
        [
            payoutsEnabled,
            chargesEnabled,
            detailsSubmitted,
            vendorId
        ]
    );
    console.log("Update query executed");

    res.json({
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
        details_submitted: detailsSubmitted,
    });
});


// 4. Admin retrieves vendor Stripe info
exports.adminGetVendorStripeInfo = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
    (
  SELECT
    vendor_stripe_accounts.*,
    individual_details.name AS vendor_name,
    individual_details.email AS vendor_email,
    'individual' AS vendor_type
  FROM vendor_stripe_accounts
  JOIN individual_details ON individual_details.vendor_id = vendor_stripe_accounts.vendor_id
)
UNION ALL
(
  SELECT
    vendor_stripe_accounts.*,
    company_details.contactPerson AS vendor_name,
    company_details.companyEmail AS vendor_email,
    'company' AS vendor_type
  FROM vendor_stripe_accounts
  JOIN company_details ON company_details.vendor_id = vendor_stripe_accounts.vendor_id
)`);
    res.json(rows);
});


// 5. Create payment intent (user checkout)
exports.createPaymentIntent = asyncHandler(async (req, res) => {
    const { packages, currency = "cad", metadata = {} } = req.body;

    if (!packages) {
        return res.status(400).json({ error: "'packages' is required" });
    }

    let parsedPackages = [];
    try {
        parsedPackages = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages)) {
            return res.status(400).json({ error: "'packages' must be an array." });
        }
    } catch (e) {
        return res.status(400).json({ error: "'packages' must be valid JSON array", details: e.message });
    }

    let totalAmount = 0;
    const metadataToStore = { ...metadata };

    parsedPackages.forEach((pkg, index) => {
        const { package_id, package_name, sub_packages = [] } = pkg;
        const pkgLabel = `${package_name || "Package"} - ID:${package_id}`;
        metadataToStore[`package_${index}`] = pkgLabel;

        sub_packages.forEach((item, itemIndex) => {
            const quantity = item.quantity && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
            const price = item.price || 0;
            totalAmount += price * quantity;

            const itemName = item.item_name || `Item_${itemIndex}`;
            const itemKey = `pkg${index}_item${itemIndex}`;
            metadataToStore[itemKey] = `${itemName} x${quantity} @${price}`;
        });
    });

    if (totalAmount <= 0) {
        return res.status(400).json({ error: "Total amount must be greater than 0" });
    }

    metadataToStore.totalAmount = totalAmount;

    // ✅ Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // amount in cents
        currency: currency.toLowerCase(),
        metadata: metadataToStore,
        automatic_payment_methods: {
            enabled: true,
        },
    });

    // ✅ Save payment intent record in DB
    await db.query(
        `INSERT INTO payments (user_id, payment_intent_id, amount, currency, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
            req.user.user_id,
            paymentIntent.id,
            totalAmount,
            currency.toLowerCase(),
            "pending"
        ]
    );

    // ✅ Respond with payment info
    res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount,
        currency,
        paymentIntentId: paymentIntent.id
    });
});


exports.confirmPaymentIntentManually = asyncHandler(async (req, res) => {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: "Missing paymentIntentId" });

    // Confirm the intent (for testing, only if it's 'requires_confirmation')
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "requires_confirmation") {
        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        return res.status(200).json({ message: "Payment confirmed", status: confirmedIntent.status });
    }

    res.status(400).json({ message: "Intent is not in a confirmable state", status: paymentIntent.status });
});

// 6. Confirm booking after payment
exports.confirmBooking = asyncHandler(async (req, res) => {
    const { user_id, vendor_id, serviceId, paymentIntentId } = req.body;
    if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID required." });
    }

    // Validate payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not completed." });
    }

    // Store booking
    await db.query(
        "INSERT INTO service_booking (user_id, vendor_id, service_id, amount, payment_intent_id, status) VALUES (?, ?, ?, ?, ?, ?)",
        [user_id, vendor_id, serviceId, paymentIntent.amount, paymentIntent.id, "confirmed"]
    );

    res.json({ message: "Booking confirmed." });
});

// 7. Stripe webhook handler
exports.stripeWebhook = asyncHandler(async (req, res) => {
    let event;

    try {
        const sig = req.headers["stripe-signature"];
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("⚠️ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        console.log("✅ Payment succeeded:", paymentIntentId);

        try {

            const [paymentResult] = await db.query(
                `UPDATE payments
                 SET status = 'completed'
                 WHERE payment_intent_id = ?`,
                [paymentIntentId]
            );

            // Fetch user email for this payment
            const [userInfo] = await db.query(`
                SELECT u.email, u.name, sb.bookingDate, sb.bookingTime
                FROM users u
                JOIN service_booking sb ON u.user_id = sb.user_id
                WHERE sb.payment_intent_id = ?
                LIMIT 1
            `, [paymentIntentId]);

            if (userInfo.length > 0) {
                const user = userInfo[0];

                // Send email to user
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: "Your Booking is Confirmed!",
                    html: `
                        <h3>Hi ${user.name},</h3>
                        <p>Your payment was successful and your booking is confirmed.</p>
                        <p><strong>Booking Date:</strong> ${user.bookingDate}</p>
                        <p><strong>Booking Time:</strong> ${user.bookingTime}</p>
                        <p>Thank you for choosing us!</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`📧 Confirmation email sent to ${user.email}`);
            } else {
                console.warn("⚠️ User not found for this payment intent");
            }

        } catch (err) {
            console.error("❌ Error processing payment success:", err.message);
        }
    }

    res.json({ received: true });
});


// 8. Vendor sees their bookings
exports.getVendorBookings = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;
    const [rows] = await db.query(
        "SELECT * FROM bookings WHERE vendor_id = ? ORDER BY created_at DESC",
        [vendorId]
    );
    res.json(rows);
});

// 9. Admin gets vendor-wise booking summary
exports.getBookingsByVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const [rows] = await db.query(
        "SELECT * FROM bookings WHERE vendor_id = ? ORDER BY created_at DESC",
        [vendorId]
    );
    res.json(rows);
});

// 10. Vendor earnings summary
exports.getVendorEarnings = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;
    const [summary] = await db.query(
        `SELECT COUNT(*) as total_bookings, SUM(amount) as total_earned
     FROM bookings
     WHERE vendor_id = ? AND status = 'confirmed'`,
        [vendorId]
    );
    res.json(summary[0]);
});

// 11. Admin gets vendor payment summary
exports.adminGetVendorPaymentSummary = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
    SELECT v.vendor_id, v.name, COUNT(b.booking_id) as total_bookings, SUM(b.amount) as total_earned
    FROM vendors v
    LEFT JOIN bookings b ON v.vendor_id = b.vendor_id AND b.status = 'confirmed'
    GROUP BY v.vendor_id
  `);
    res.json(rows);
});

// 12. Mark vendor as paid
exports.markVendorPaid = asyncHandler(async (req, res) => {
    const { vendorId, bookings } = req.body;
    if (!vendorId || !bookings || !bookings.length) {
        return res.status(400).json({ error: "Missing vendorId or bookings array." });
    }
    await db.query(
        "UPDATE bookings SET status = 'paid' WHERE vendor_id = ? AND booking_id IN (?)",
        [vendorId, bookings]
    );
    res.json({ message: "Vendor marked as paid." });
});

// 13. Manual payout log
exports.logManualPayout = asyncHandler(async (req, res) => {
    const { vendorId, amount, reference } = req.body;
    if (!vendorId || !amount) {
        return res.status(400).json({ error: "Missing vendorId or amount." });
    }
    await db.query(
        "INSERT INTO payouts (vendor_id, amount, reference) VALUES (?, ?, ?)",
        [vendorId, amount, reference || null]
    );
    res.json({ message: "Payout logged." });
});
