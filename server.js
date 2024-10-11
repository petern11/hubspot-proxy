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
const url = 'https://api.hubapi.com/crm/v3/objects/contacts';

// Route to fetch contacts from HubSpot API
app.get("/api/contacts", async (req, res) => {
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: { 
                properties: "email,lastname,firstname,phone,address,city,state,zip"
            },
        });

        response.data.results.forEach(item => {
            console.log('item.properties',item.properties);
            
        });
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
