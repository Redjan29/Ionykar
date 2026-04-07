import "dotenv/config";
import { connectDB } from "../config/db.js";
import { User } from "../models/index.js";

await connectDB();

const latestUser = await User.findOne().sort({ createdAt: -1 });

if (!latestUser) {
  console.error("No users found.");
  process.exit(1);
}

latestUser.isAdmin = true;
await latestUser.save();

console.log(
  JSON.stringify(
    {
      updatedUserId: String(latestUser._id),
      email: latestUser.email,
      isAdmin: latestUser.isAdmin,
      createdAt: latestUser.createdAt,
    },
    null,
    2
  )
);

process.exit(0);

