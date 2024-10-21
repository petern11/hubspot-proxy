const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 1877;

// Function to generate a consistent 19-character hash
function generateFixedLengthString(input) {
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return hash.slice(0, 19); // Return the first 20 characters
}

// Configure multer for handling file uploads
const storage = multer.memoryStorage(); // Store the file in memory as a buffer
const upload = multer({ storage: storage });

// Middleware to allow CORS (if needed)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

app.use(express.json());

// Replace with your actual HubSpot Private App Access Token (from .env)
const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
const contactsUrl = "https://api.hubapi.com/crm/v3/objects/contacts";
const listsUrl = "https://api.hubapi.com/crm/v3/lists";

// Route to fetch contacts from HubSpot API
app.get("/api/contacts", async (req, res) => {
    try {
        const response = await axios.get(contactsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                properties: "email,lastname,firstname,phone,address,city,state,zip",
            },
        });

        res.json(response.data.results);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).send("Error fetching contacts from HubSpot");
    }
});

// Route to fetch lists from HubSpot API
app.get("/api/lists", async (req, res) => {
    try {
        const listIds = req.query.listIds || ""; // Get listIds from query parameter

        const response = await axios.get(listsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                listIds: listIds,
                includeFilters: true,
            },
        });

        console.log('response.data.lists',response.data.lists);
        res.json(response.data.lists);
    } catch (error) {
        console.error("Error fetching lists:", error);
        res.status(500).send("Error fetching lists from HubSpot");
    }
});

// New route to upload a design template to HubSpot
app.post("/api/upload-template", async (req, res) => {
    try {
        const templateData = req.body;
        const response = await axios.post("https://api.hubapi.com/content/api/v2/templates", templateData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error uploading template:", error.response ? error.response.data : error.message);
        res.status(500).send("Error uploading template to HubSpot");
    }
});

// Endpoint to search and upload file
app.post("/api/upload-file", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const { folderPath } = req.body;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;

        // Step 1: Generate a 19-character hash of the file name + file size for searching
        // Hubspot's file search API only supports up to 19-character or less when searching by name.
        const hashedFileName = generateFixedLengthString(fileName + fileSize.toString());

        // Step 2: Search for the file in HubSpot using the hashed file name
        const searchResponse = await axios.get("https://api.hubapi.com/files/v3/files/search", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                name: hashedFileName, // Use the hashed file name for the search
                limit: 1, // We're only interested in checking if the file exists
            },
        });

        // If the file exists, return its details
        if (searchResponse.data?.results.length > 0) {
            const existingFile = searchResponse.data.results[0];
            console.log(`File already exists: ${existingFile.url}`);
            return res.json({
                message: "File already exists.",
                fileUrl: existingFile.url,
                fileId: existingFile.id,
            });
        }

        // Step 3: If file doesn't exist, proceed with upload using the original file name
        const fileBuffer = req.file.buffer;

        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append("file", fileBuffer, hashedFileName); // Use the original file name for upload
        formData.append("options", JSON.stringify({ access: "PRIVATE" })); // Set the file as private
        formData.append("folderPath", folderPath || "/"); // Default folder path to root

        // Send the file to HubSpot using the File Manager API
        const uploadResponse = await axios.post("https://api.hubapi.com/files/v3/files", formData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...formData.getHeaders(), // Important to include correct headers for form data
            },
        });

        const uploadedFile = uploadResponse.data;
        res.json({
            message: "File uploaded successfully.",
            fileUrl: uploadedFile.url,
            fileId: uploadedFile.id,
        });
    } catch (error) {
        console.error("Error handling file upload:", error.response ? error.response.data : error.message);
        res.status(500).send("Error uploading file to HubSpot");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});