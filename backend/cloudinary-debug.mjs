import dotenv from "dotenv";

dotenv.config();

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;

const form = new FormData();
form.append("file", "https://res.cloudinary.com/demo/image/upload/sample.jpg");
form.append("folder", "chatty-statuses");

try {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
      body: form,
    }
  );

  console.log("HTTP status:", response.status);
  console.log("Cloudinary error header:", response.headers.get("X-Cld-Error"));
  console.log("Response body:", await response.text());
} catch (error) {
  console.log("Request failed:", error.message);
}
