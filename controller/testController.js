// controllers/authController.js
const getMe = (req, res) => {
    // You can replace this static object with DB data based on req.user if needed
    const user = {
        id: req.user.userId || "8864c717-587d-472a-929a-8e5f298024da-0",
        displayName: "Jaydon Frankie",
        photoURL: "https://api-dev-minimal-v630.pages.dev/assets/images/avatar/avatar-25.webp",
        phoneNumber: "+1 416-555-0198",
        country: "Canada",
        address: "90210 Broadway Blvd",
        state: "California",
        city: "San Francisco",
        zipCode: "94116",
        about: "Praesent turpis. Phasellus viverra nulla ut metus varius laoreet. Phasellus tempus.",
        role: "admin",
        isPublic: true,
        email: "demo@minimals.cc",
        password: "@2Minimal" // Only return this in mock/dummy mode!
    };

    res.status(200).json({ user });
};



module.exports = { getMe }
