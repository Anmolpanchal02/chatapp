import { generateStreamToken } from "../lib/stream.js";

export async function getStreamToken(req, res) {
    try {
        // Simulate token generation logic
        const token = generateStreamToken(req.user.id);
        res.status(200).json({ token });
    } catch (error) {
        console.log("Error in getStreamToken controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }

}