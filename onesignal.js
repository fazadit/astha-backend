import axios from "axios";

const ONE_SIGNAL_APP_ID = "eaa8e30e-7ab7-4102-be16-c9398cf348a1"; 
const ONE_SIGNAL_API_KEY = "os_v2_app_5kuogdt2w5aqfpqwze4yz42iuf7jgv6fj6yubyfixuvg6myeptajs5y4kjfrhbgjiky5xx6kb5fjctujwihpnotumhejroskdwu37ya"; // API Key dari dashboard OneSignal

export async function sendNotification({ title, message, userId }) {
  try {
    const res = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONE_SIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: message },
        filters: [
          {
            field: "tag",
            key: "user_id",
            relation: "=",
            value: userId
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${ONE_SIGNAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Notif dikirim:", res.data);
  } catch (err) {
    console.error("❌ Gagal kirim notif:", err.response?.data || err.message);
  }
}
