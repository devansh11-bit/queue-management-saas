const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function startBookingPayment({ placeName, amount }) {
  const scriptLoaded = await loadRazorpayScript();

  if (!scriptLoaded) {
    throw new Error("Could not load Razorpay Checkout.");
  }

  const orderResponse = await fetch(`${apiBaseUrl}/api/create-razorpay-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      placeName
    })
  });

  if (!orderResponse.ok) {
    throw new Error("Could not create payment order.");
  }

  const order = await orderResponse.json();

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Queue Management",
      description: `Booking for ${placeName}`,
      order_id: order.id,
      handler: async function (response) {
        try {
          const verifyResponse = await fetch(
            `${apiBaseUrl}/api/verify-razorpay-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(response)
            }
          );

          if (!verifyResponse.ok) {
            throw new Error("Payment verification failed.");
          }

          const verifiedPayment = await verifyResponse.json();
          resolve(verifiedPayment);
        } catch (error) {
          reject(error);
        }
      },
      prefill: {
        name: "Queue User"
      },
      theme: {
        color: "#111827"
      }
    });

    razorpay.on("payment.failed", function () {
      reject(new Error("Payment failed."));
    });

    razorpay.open();
  });
}
