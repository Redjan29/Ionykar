import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import { Car } from "./src/models/index.js";

const cars = [
  {
    brand: "Peugeot",
    model: "308 SW",
    category: "BREAK",
    year: 2023,
    licensePlate: "AA-123-BB",
    pricePerDay: 39,
    seats: 5,
    luggage: 3,
    transmission: "Auto",
    fuel: "Essence",
    imageUrl: "/cars/peugeot-308-sw-night.jpeg",
    description: "Parfaite pour les déplacements à Paris, confortable et économique, idéale pour les familles et les longs trajets.",
    status: "DISPONIBLE",
    mileage: 15000,
  },
  {
    brand: "Peugeot",
    model: "508",
    category: "BERLINE",
    year: 2024,
    licensePlate: "CC-456-DD",
    pricePerDay: 49,
    seats: 5,
    luggage: 3,
    transmission: "Auto",
    fuel: "Diesel",
    imageUrl: "/cars/peugeot-508.jpeg",
    description: "Berline élégante idéale pour les trajets confortables dans Paris et en Île-de-France.",
    status: "DISPONIBLE",
    mileage: 8000,
  },
  {
    brand: "Nissan",
    model: "Micra Black",
    category: "CITADINE",
    year: 2023,
    licensePlate: "EE-789-FF",
    pricePerDay: 36,
    seats: 5,
    luggage: 2,
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "/cars/nissan-micra-black.jpeg",
    description: "Micra noire compacte, parfaite pour circuler et se garer facilement dans le centre de Paris.",
    status: "DISPONIBLE",
    mileage: 12000,
  },
  {
    brand: "Opel",
    model: "Corsa Rouge",
    category: "CITADINE",
    year: 2023,
    licensePlate: "GG-012-HH",
    pricePerDay: 35,
    seats: 5,
    luggage: 2,
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "/cars/opel-corsa-red.jpeg",
    description: "Corsa rouge dynamique, idéale pour les courts séjours et les déplacements urbains.",
    status: "DISPONIBLE",
    mileage: 18000,
  },
  {
    brand: "Toyota",
    model: "Yaris Rouge",
    category: "CITADINE",
    year: 2024,
    licensePlate: "II-345-JJ",
    pricePerDay: 37,
    seats: 5,
    luggage: 2,
    transmission: "Auto",
    fuel: "Hybride",
    imageUrl: "/cars/toyota-yaris-red.jpeg",
    description: "Citadine hybride économique, parfaite pour limiter la consommation en ville.",
    status: "DISPONIBLE",
    mileage: 5000,
  },
  {
    brand: "Nissan",
    model: "Micra White",
    category: "CITADINE",
    year: 2023,
    licensePlate: "KK-678-LL",
    pricePerDay: 36,
    seats: 5,
    luggage: 2,
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "/cars/nissan-micra-white.jpeg",
    description: "Micra blanche polyvalente, idéale pour les déplacements quotidiens sur Paris.",
    status: "DISPONIBLE",
    mileage: 14000,
  },
  {
    brand: "Opel",
    model: "Corsa Grise",
    category: "CITADINE",
    year: 2023,
    licensePlate: "MM-901-NN",
    pricePerDay: 35,
    seats: 5,
    luggage: 2,
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "/cars/opel-corsa-silver.jpeg",
    description: "Corsa grise discrète et confortable, pour les séjours courts comme longs.",
    status: "DISPONIBLE",
    mileage: 16000,
  },
  {
    brand: "Skoda",
    model: "Rapid",
    category: "BERLINE",
    year: 2023,
    licensePlate: "OO-234-PP",
    pricePerDay: 45,
    seats: 5,
    luggage: 3,
    transmission: "Manuel",
    fuel: "Diesel",
    imageUrl: "/cars/skoda-rapid-black.jpeg",
    description: "Berline spacieuse idéale pour les trajets en groupe ou en famille autour de Paris.",
    status: "DISPONIBLE",
    mileage: 20000,
  },
  {
    brand: "Nissan",
    model: "Primera",
    category: "BERLINE",
    year: 2022,
    licensePlate: "QQ-567-RR",
    pricePerDay: 42,
    seats: 5,
    luggage: 3,
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "/cars/nissan-primera-grey.jpeg",
    description: "Berline confortable, parfaite pour les trajets domicile–aéroport ou les week-ends.",
    status: "DISPONIBLE",
    mileage: 25000,
  },
];

async function seed() {
  try {
    console.log("🔌 Connexion à MongoDB...");
    await connectDB();

    console.log("🗑️  Suppression des voitures existantes...");
    await Car.deleteMany({});

    console.log("🚗 Insertion de 9 voitures...");
    const result = await Car.insertMany(cars);

    console.log(`✅ ${result.length} voitures insérées avec succès !`);
    console.log("\nVoitures créées :");
    result.forEach((car, index) => {
      console.log(`  ${index + 1}. ${car.brand} ${car.model} - ${car.pricePerDay}€/jour`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors du seed :", error);
    process.exit(1);
  }
}

seed();
