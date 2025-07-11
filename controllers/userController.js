const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.createUser = async (req, res) => {
    try {
        const { name, email, password, address, latitude, longitude,status } = req.body;
        const Userexist = await User.findOne({ email });
        if (Userexist) {
            return res.status(400).json({
                status_code: "400",
                message: "User already exists",
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            address,
            latitude,
            longitude,
            status
        });

        const userSaved = await newUser.save();


        const token = jwt.sign(
            { id: userSaved._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );


        res.status(200).json({
            status_code: "200",
            message: "User registered successfully",
            data: {
                name: userSaved.name,
                email: userSaved.email,
                address: userSaved.address,
                latitude: userSaved.latitude,
                longitude: userSaved.longitude,
                status: userSaved.status,
                register_at: userSaved.register_at,
                token: token,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status_code: "500",
            message: "Server Error",
        });
    }
};
exports.toggleUserStatuses = async (req, res) => {
    try {

        const result = await User.updateMany(
            {},
            [
                {
                    $set: {
                        status: {
                            $cond: [
                                { $eq: ["$status", "active"] },
                                "inactive",
                                "active"
                            ]
                        }
                    }
                }
            ]
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                status_code: "404",
                message: "No users found to update",
            });
        }

        return res.status(200).json({
            status_code: "200",
            message: "All users' status updated successfully",
        });

    } catch (error) {
        console.error("Error toggling user statuses:", error);
        return res.status(500).json({
            status_code: "500",
            message: "Server Error",
        });
    }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRadians = degree => degree * (Math.PI / 180);
    const R = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c).toFixed(2);
}

exports.getDistance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { input_latitude, input_longitude } = req.query;

        if (!input_latitude || !input_longitude) {
            return res.status(400).json({
                status_code: "400",
                message: "Destination latitude and longitude are required"
            });
        }

        const user = await User.findById(userId);

        if (!user || !user.latitude || !user.longitude) {
            return res.status(404).json({
                status_code: "404",
                message: "User location not found"
            });
        }

        const distance = calculateDistance(
            parseFloat(user.latitude),
            parseFloat(user.longitude),
            parseFloat(input_latitude),
            parseFloat(input_longitude)
        );

        return res.status(200).json({
            status_code: "200",
            message: "Distance calculated successfully",
            distance: `${distance} km`
        });

    } catch (error) {
        console.error("Distance error:", error);
        return res.status(500).json({
            status_code: "500",
            message: "Server Error"
        });
    }
};
exports.getUserListingByWeekday = async (req, res) => {
    try {
        const { week_number } = req.query;

        if (!week_number) {
            return res.status(400).json({
                status_code: "400",
                message: "week_number  is required "
            });
        }

        const days = week_number.split(',').map(Number);


        const mongoDays = days.map(d => (d === 0 ? 1 : d + 1));

        const users = await User.aggregate([
            {
                $addFields: {
                    dayOfWeek: { $dayOfWeek: "$register_at" }
                }
            },
            {
                $match: {
                    dayOfWeek: { $in: mongoDays }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    dayOfWeek: 1
                }
            }
        ]);


        const dayNames = {
            1: "sunday",
            2: "monday",
            3: "tuesday",
            4: "wednesday",
            5: "thursday",
            6: "friday",
            7: "saturday"
        };

        const groupedData = {};

        mongoDays.forEach(day => {
            const name = dayNames[day];
            groupedData[name] = [];
        });


        users.forEach(user => {
            const dayName = dayNames[user.dayOfWeek];
            if (groupedData[dayName]) {
                groupedData[dayName].push({
                    name: user.name,
                    email: user.email
                });
            }
        });

        return res.status(200).json({
            status_code: "200",
            message: "User listing fetched successfully",
            data: groupedData
        });

    } catch (error) {
        console.error("Error in getUserListingByWeekday:", error);
        return res.status(500).json({
            status_code: "500",
            message: "Server Error"
        });
    }
};