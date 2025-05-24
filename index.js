const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors());

// API details
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE1ZThlYzNmLTkwZDEtNDEzNy1iNGJkLWJhN2M0MjFjMjVlMiIsIm5vbmNlIjoiNDE5MmI1MTctOGMzYy00ZjBjLTg2MzEtYzNiOWEyNGNiZmFjIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzQ3MTg3MTUxfQ.Qr7j1PEqSL5cVb7RuMXXLv1IDv4gvY98pUUU9Ca1pBM";

let leaderboardCache = [];

// Format username (e.g., azisai205 → az***05)
const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

// Fetch and process leaderboard data
async function fetchLeaderboardData() {
    try {
        const now = new Date();
        const nowUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        const currentUTCDay = nowUTC.getUTCDay(); // 0 = Sun, 6 = Sat
        const currentUTCDate = nowUTC.getUTCDate();
        const currentUTCMonth = nowUTC.getUTCMonth();
        const currentUTCYear = nowUTC.getUTCFullYear();

        // Find the most recent Saturday 00:00:01 UTC
        const daysSinceSaturday = (currentUTCDay + 1) % 7;
        const startDateObj = new Date(Date.UTC(
            currentUTCYear,
            currentUTCMonth,
            currentUTCDate - daysSinceSaturday,
            0, 0, 1
        ));

        // End = following Friday 23:59:59 UTC
        const endDateObj = new Date(startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399000);

        const startDate = startDateObj.toISOString();
        const endDate = endDateObj.toISOString();

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            params: {
                userId: "15e8ec3f-90d1-4137-b4bd-ba7c421c25e2",
                startDate,
                endDate,
            },
        });

        const data = response.data;

        leaderboardCache = data
            .filter((player) => player.username !== "azisai205")
            .sort((a, b) => b.weightedWagered - a.weightedWagered)
            .slice(0, 100000)
            .map((player) => ({
                username: formatUsername(player.username),
                wagered: Math.round(player.weightedWagered),
                weightedWager: Math.round(player.weightedWagered),
            }));

        console.log("Leaderboard updated:", leaderboardCache);
    } catch (error) {
        console.error("Error fetching leaderboard data:", error.message);
    }
}

// Routes
app.get("/", (req, res) => {
    res.send("Welcome to the Leaderboard API. Access /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
    res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
    const top14 = leaderboardCache.slice(0, 10);

    // Swap 1st and 2nd
    if (top14.length >= 2) {
        [top14[0], top14[1]] = [top14[1], top14[0]];
    }

    res.json(top14);
});

// Initial fetch and set interval
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Self-ping to stay alive
setInterval(() => {
    axios.get("https://azisailbdata.onrender.com/leaderboard/top14")
        .then(() => console.log("Self-ping successful."))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
