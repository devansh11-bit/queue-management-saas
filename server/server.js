import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import Razorpay from "razorpay";
import twilio from "twilio";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 5000;

app.use(cors());
app.use(express.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.get("/", (request, response) => {
  response.json({ message: "Queue notification server is running." });
});

app.post("/api/notify-whatsapp", async (request, response) => {
  const { phoneNumber, placeName, position } = request.body;

  if (!phoneNumber || !placeName || !position) {
    return response.status(400).json({
      message: "phoneNumber, placeName, and position are required."
    });
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${phoneNumber}`,
      body: `Your turn is near at ${placeName}. Your current queue position is #${position}.`
    });

    return response.json({ message: "WhatsApp notification sent." });
  } catch (error) {
    return response.status(500).json({
      message: "Could not send WhatsApp notification."
    });
  }
});

app.post("/api/create-razorpay-order", async (request, response) => {
  const { amount, placeName } = request.body;

  if (!amount || !placeName) {
    return response.status(400).json({
      message: "amount and placeName are required."
    });
  }

  try {
    const amountInPaise = Number(amount) * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      notes: {
        placeName
      }
    });

    return response.json(order);
  } catch (error) {
    return response.status(500).json({
      message: "Could not create Razorpay order."
    });
  }
});

app.post("/api/verify-razorpay-payment", (request, response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = request.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return response.status(400).json({
      message: "Payment verification fields are required."
    });
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return response.status(400).json({
      message: "Payment verification failed."
    });
  }

  return response.json({
    message: "Payment verified successfully.",
    paymentId: razorpay_payment_id
  });
});

app.get("/api/local-news", async (request, response) => {
  const city = request.query.city;

  if (!city) {
    return response.status(400).json({
      message: "city is required."
    });
  }

  try {
    const newsUrl = new URL("https://newsapi.org/v2/everything");
    newsUrl.searchParams.set("q", `${city} local`);
    newsUrl.searchParams.set("language", "en");
    newsUrl.searchParams.set("sortBy", "publishedAt");
    newsUrl.searchParams.set("pageSize", "6");

    const newsResponse = await fetch(newsUrl, {
      headers: {
        "X-Api-Key": process.env.NEWS_API_KEY
      }
    });

    if (!newsResponse.ok) {
      return response.status(500).json({
        message: "Could not fetch local news."
      });
    }

    const newsData = await newsResponse.json();

    const articles = (newsData.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      source: article.source?.name,
      url: article.url,
      publishedAt: article.publishedAt
    }));

    return response.json({ articles });
  } catch (error) {
    return response.status(500).json({
      message: "Could not fetch local news."
    });
  }
});

app.listen(port, () => {
  console.log(`Notification server running on http://localhost:${port}`);
});
