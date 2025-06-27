import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { upsertStreamUser } from "../lib/stream.js";



export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }



        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie("jwt", token, {
            maxage: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true, //prevent xss attacks
            sameSite: "strict", //prevent csrf attacks
            secure: process.env.NODE_ENV === "production" //only send cookie over https in production
        });

        res.status(200).json({ success: true, user });

    } catch (error) {
        console.error("Error in login controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}



export async function signup(req, res) {
    const { fullName, email, password } = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists,please use another email" });
        }


         const seed = Math.random().toString(36).substring(2, 15);
        const randomAvatar = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;

            
        const newUser = await User.create({
            fullName,
            email,
            password,
            profilePic: randomAvatar
        });

        try {
            await upsertStreamUser({
                id: newUser._id.toString(),
                name: newUser.fullName,
                image: newUser.profilePic || ""
            });
            console.log(`Stream user created for ${newUser.fullName}`);
        } catch (error) {
            console.log("Error creating Stream user:", error);
        }

        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie("jwt", token, {
            maxage: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true, //prevent xss attacks
            sameSite: "strict", //prevent csrf attacks
            secure: process.env.NODE_ENV === "production" //only send cookie over https in production
        })

        res.status(201).json({ success: true, user: newUser });

    } catch (error) {
        console.error("Error in signup controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }

}


export function logout(req, res) {
    res.clearCookie("jwt");
    res.status(200).json({ success: true, message: "Logged out successfully" });
}

export async function onboard(req, res) {
    try {
        const userId = req.user._id;
        let { fullName, nativeLanguage, learningLanguage, location, bio, profilePic } = req.body;

        // Sahi default avatar (no .png)
        if (!profilePic) {
            const seed = Math.random().toString(36).substring(2, 15);
            profilePic = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
        }

        if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location || !profilePic) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !fullName && "fullName",
                    !bio && "bio",
                    !nativeLanguage && "nativeLanguage",
                    !learningLanguage && "learningLanguage",
                    !location && "location",
                    !profilePic && "profilePic"
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                fullName,
                nativeLanguage,
                learningLanguage,
                location,
                bio,
                profilePic,
                isOnboarded: true
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboard controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}