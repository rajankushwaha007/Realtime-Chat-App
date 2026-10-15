import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

try {
  const result = await cloudinary.uploader.upload(
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    {
      folder: "chatty-statuses",
      resource_type: "image",
    }
  );

  console.log("Upload successful:", result.public_id);
} catch (error) {
  console.dir(error, { depth: 5 });
}
