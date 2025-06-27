import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protectRoute(req, res, next) {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized - no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized - invalid token" });
        }

        const user = await User.findById(decoded.userId).select("-password"); // ✅ await

        if (!user) {
            return res.status(401).json({ message: "Unauthorized - user not found" });
        }

        req.user = user; // ✅ attaches actual user object
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
