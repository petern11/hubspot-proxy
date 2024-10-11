const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 1877;

// Middleware to allow CORS (if needed)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    next();
});

// Replace with your actual HubSpot Private App Access Token (from .env)
const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

// Route to fetch contacts from HubSpot API
app.get("/api/contacts", async (req, res) => {
    try {
        const response = await axios.get(
            "https://api.hubapi.com/crm/v3/objects/contacts?property=zip&property=firstname&property=lastname​",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                // params: {
                //     properties: ["zip"], // Pass properties as query parameters
                // },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).send("Error fetching contacts from HubSpot");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
