const mongoose = require("mongoose");




const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://nidhins1807:testking54321@zensafe.rewx0ps.mongodb.net/UrbanGuard");
    import("chalk").then((chalk) => {
      console.log(chalk.default.blue.bold("MongoDB Connected Successfully! ✅"));
    }).catch((err) => {
      console.error("❌ Error importing chalk:", err);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};





module.exports = connectDB;
