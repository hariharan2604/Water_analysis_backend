const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize app
const app = express();
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/sensor_data', { useNewUrlParser: true, useUnifiedTopology: true })
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

// Helper function to get the start of today in UTC
const getStartOfDay = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};


// Helper function to sum electricity usage
const sumElectricityUsage = (readings) => {
    return readings.reduce((sum, reading) => sum + (reading.Power || 0), 0);
};

// Fetch the latest data and cumulative electricity usage from today
app.get('/api/data', async (req, res) => {
    try {

        const today = new Date();
        // Get the start of today in 'YYYY-MM-DD' format
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(today.getDate()).padStart(2, '0');

        // Create a string representing the start of today (e.g., "2024-10-20 00:00:00")
        const startOfDay = `${year}-${month}-${day} 00:00:00`;


        
        // Fetch latest reading and all readings for today for both Home 1 and Home 2
        const [home1Latest, home1TodayReadings, home2Latest, home2TodayReadings] = await Promise.all([
            Reading.findOne({ HomeID: 1 }).sort({ timestamp: -1 }),
            Reading.find({ HomeID: 1, timestamp: { $gte: '2024-10-20 00:00:00' } }),
            Reading.findOne({ HomeID: 2 }).sort({ timestamp: -1 }),
            Reading.find({ HomeID: 2, timestamp: { $gte: startOfDay } })
        ]);

        // Calculate the sum of today's electricity usage for both homes
        const home1TotalElectricity = sumElectricityUsage(home1TodayReadings);
        const home2TotalElectricity = sumElectricityUsage(home2TodayReadings);

        // Logging the fetched readings for debugging

        res.json({
            home1: {
                waterLevel: home1Latest?.CurrentWaterLevel ?? 0,
                electricityUsage: home1TotalElectricity,
                power: home1Latest?.Power ?? 0,
                pumpStatus: home1Latest?.PumpRunningStatus ? 'Running' : 'Stopped'
            },
            home2: {
                waterLevel: home2Latest?.CurrentWaterLevel ?? 0,
                electricityUsage: home2TotalElectricity,
                power: home2Latest?.Power ?? 0,
                pumpStatus: home2Latest?.PumpRunningStatus ? 'Running' : 'Stopped'
            }
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Start server
app.listen(3001, () => {
    console.log('Server running on port 3001');
});
