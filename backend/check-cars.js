import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import { Car } from "./src/models/index.js";

async function checkCars() {
  try {
    await connectDB();
    
    const totalCars = await Car.countDocuments();
    const availableCars = await Car.countDocuments({ status: "DISPONIBLE" });
    const allCars = await Car.find();
    
    console.log(`\n📊 STATISTIQUES VOITURES`);
    console.log(`═══════════════════════════`);
    console.log(`Total voitures: ${totalCars}`);
    console.log(`Voitures disponibles: ${availableCars}`);
    console.log(`\n📋 LISTE DES VOITURES:\n`);
    
    allCars.forEach((car, index) => {
      console.log(`${index + 1}. ${car.brand} ${car.model} - ${car.status} - ${car.pricePerDay}€/jour`);
    });
    
    console.log(`\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

checkCars();
