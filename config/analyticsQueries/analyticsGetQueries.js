const analyticsGetQueries = {
    getDashboardStats: `
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_approved = 1) AS total_users,
    (SELECT COUNT(*) FROM vendors WHERE is_authenticated = 1) AS total_vendors,
    (SELECT COUNT(*) FROM contractors WHERE is_active = 1) AS total_contractors,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 1) AS completed_bookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 0) AS pending_bookings;

    `,

    getBookingTrends: `
        SELECT 
            DATE(bookingDate) as booking_date,
            COUNT(*) as booking_count,
            SUM(CASE WHEN bookingStatus = 1 THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN bookingStatus = 0 THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN bookingStatus = 2 THEN 1 ELSE 0 END) as cancelled_count
        FROM service_booking 
        WHERE bookingDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(bookingDate)
        ORDER BY booking_date DESC
    `,

    getServiceCategoryStats: `
        SELECT 
            sc.serviceCategory,
            COUNT(sb.booking_id) as booking_count
        FROM service_categories sc
        LEFT JOIN services s ON sc.service_categories_id = s.service_categories_id
        LEFT JOIN service_booking sb ON s.service_id = sb.service_id
        LEFT JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
        LEFT JOIN packages p ON sbp.package_id = p.package_id
        WHERE sb.bookingStatus = 1
        GROUP BY sc.service_categories_id, sc.serviceCategory
        ORDER BY booking_count DESC
    `,

    getVendorPerformance: `
        SELECT 
            v.vendor_id,
            CASE 
                WHEN v.vendorType = 'individual' THEN ind.name
                WHEN v.vendorType = 'company' THEN comp.companyName
               END as vendor_name,
            v.vendorType,
            COUNT(sb.booking_id) as total_bookings,
            AVG(CASE WHEN sb.bookingStatus = 1 THEN 5 ELSE 0 END) as avg_rating
        FROM vendors v
        LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
        LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
        LEFT JOIN service_booking sb ON v.vendor_id = sb.vendor_id
        LEFT JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
        LEFT JOIN packages p ON sbp.package_id = p.package_id
        WHERE v.is_authenticated = 1
        GROUP BY v.vendor_id
        ORDER BY total_bookings DESC
        LIMIT 20
    `,

    getRevenueAnalytics: `
        SELECT 
            YEAR(sb.bookingDate) as year,
            MONTH(sb.bookingDate) as month,
            COUNT(sb.booking_id) as booking_count
        FROM service_booking sb
        LEFT JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
        LEFT JOIN packages p ON sbp.package_id = p.package_id
        LEFT JOIN vendor_supply_kits vsk ON sb.vendor_id = vsk.vendor_id 
            AND MONTH(vsk.order_date) = MONTH(sb.bookingDate)
            AND YEAR(vsk.order_date) = YEAR(sb.bookingDate)
        WHERE sb.bookingStatus = 1
        GROUP BY YEAR(sb.bookingDate), MONTH(sb.bookingDate)
        ORDER BY year DESC, month DESC
        LIMIT 12
    `
};

module.exports = analyticsGetQueries;