const { GoogleGenerativeAI } = require("@google/generative-ai");
const ParkingSlot = require("../models/ParkingSlot");

const handleChatRequest = async (req, res) => {
    try {
        const { history } = req.body;

        let replyText = "";

        // If no API key is set, fallback to a predefined response behavior
        if (!process.env.GEMINI_API_KEY) {
            console.log("No GEMINI_API_KEY found. Falling back to predefined responses.");
            const userMsg = history[history.length - 1].content.toLowerCase();
            if (userMsg.includes("book") || userMsg.includes("reserve")) {
                replyText = "To book a slot, go to the Dashboard, select 'New Booking', choose your vehicle type, pick a slot and a time range, and confirm your payment!";
            } else if (userMsg.includes("price") || userMsg.includes("cost")) {
                replyText = "Pricing varies by vehicle: Cars are typically ₹50/hr, Bikes ₹20/hr, and larger vehicles may cost more. Check the dashboard for exact rates.";
            } else if (userMsg.includes("cancel") || userMsg.includes("refund")) {
                replyText = "You can cancel active bookings from your Profile's 'My Bookings' tab. Note that refunds may be subject to our cancellation policy.";
            } else if (userMsg.includes("qr") || userMsg.includes("entry") || userMsg.includes("exit")) {
                replyText = "For entry and exit, go to your Bookings, click 'View Ticket', and show the QR Code to the gate scanner upon arrival or departure.";
            } else if (userMsg.includes("slot") || userMsg.includes("available")) {
                // Fetch dynamic data
                const availableCount = await ParkingSlot.countDocuments({ isOccupied: false });
                replyText = `There are currently ${availableCount} parking slots available across the campus. Go to the Dashboard to book yours!`;
            } else {
                replyText = "I'm a simple automated assistant right now. I can help answer basic questions about booking, prices, availability, QR entry, and cancellation! For complex issues, please contact support@campusparking.in.";
            }
        } else {
            // Intelligent behavior using Gemini
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Create system instructions as the first message
            const systemPrompt = "You are a helpful, professional AI assistant for the 'Campus Parking System'. You help users understand how to book parking slots, check availability, view pricing, and navigate the application. Be concise, polite, and directly address the user's questions about parking.";

            // Format history for Gemini SDK
            const formattedHistory = [];

            // We only need the previous conversational turns (excluding the very last one which is the new prompt)
            for (let i = 0; i < history.length - 1; i++) {
                formattedHistory.push({
                    role: history[i].role === 'user' ? 'user' : 'model',
                    parts: [{ text: history[i].content }],
                });
            }

            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `SYSTEM INSTRUCTION (Adopt this persona): ${systemPrompt}` }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I am the Campus Parking Assistant." }],
                    },
                    ...formattedHistory
                ],
            });

            const userMessage = history[history.length - 1].content;
            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            replyText = response.text();
        }

        res.json({ reply: replyText });

    } catch (error) {
        console.error("Chat API error:", error);
        res.status(500).json({ reply: "I'm sorry, I'm experiencing technical difficulties right now. Please try again later." });
    }
};

module.exports = {
    handleChatRequest
};
