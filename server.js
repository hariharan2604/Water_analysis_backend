const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize app
const app = express();
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/sensor_data')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Define the schema
const readingSchema = new mongoose.Schema({
    HomeID: Number,
    CurrentWaterLevel: Number,
    ElectricityUsage: Number,
    Power: Number,
    PumpRunningStatus: Boolean,
    timestamp: String
});

// Model for readings
const Reading = mongoose.model('Reading', readingSchema);

// Helper function to sum electricity usage
const sumElectricityUsage = (readings) => {
    return readings.reduce((sum, reading) => sum + (reading.Power || 0), 0);
};

// Fetch cumulative electricity usage for the current month
app.get('/api/electricityUsage', async (req, res) => {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based

        // Start of the current month
        const startOfMonth = `${year}-${month}-01 00:00:00`;

        // Fetch all readings for the current month for both Home 1 and Home 2
        const [home1MonthReadings, home2MonthReadings] = await Promise.all([
            Reading.find({ HomeID: 1, timestamp: { $gte: startOfMonth } }),
            Reading.find({ HomeID: 2, timestamp: { $gte: startOfMonth } })
        ]);

        // Calculate the sum of this month's electricity usage for both homes
        const home1TotalElectricity = sumElectricityUsage(home1MonthReadings);
        const home2TotalElectricity = sumElectricityUsage(home2MonthReadings);

        res.json({
            home1Usage: home1TotalElectricity,
            home2Usage: home2TotalElectricity
        });
    } catch (err) {
        console.error('Error fetching electricity usage:', err);
        res.status(500).json({ error: 'Failed to fetch electricity usage' });
    }
});

// Start server
app.listen(3001, () => {
    console.log('Server running on port 3001');
});
