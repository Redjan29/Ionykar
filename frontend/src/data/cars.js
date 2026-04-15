// src/data/cars.js
import peugeot308 from "../assets/peugeot-308-sw-night.jpeg";
import peugeot508Paris from "../assets/peugeot-508.jpeg";
import nissanMicraBlack from "../assets/nissan-micra-black.jpeg";
import opelCorsaRed from "../assets/opel-corsa-red.jpeg";
import toyotaYarisRed from "../assets/toyota-yaris-red.jpeg";
import nissanMicraWhite from "../assets/nissan-micra-white.jpeg";
import opelCorsaSilver from "../assets/opel-corsa-silver.jpeg";
import skodaRapidBlack from "../assets/skoda-rapid-black.jpeg";
import nissanPrimeraGrey from "../assets/nissan-primera-grey.jpeg";


export const cars = [
  // 🔹 tes 2 voitures de base
  {
    id: "peugeot-308-sw",
    brand: "Peugeot",
    model: "308 SW",
    category: "BREAK",
    pricePerDay: 39,
    imageUrl: peugeot308,
    seats: 5,
    luggage: 3,
    transmission: "Auto",
    fuel: "Essence",
    description:
      "Parfaite pour les déplacements à Paris, confortable et économique, idéale pour les familles et les longs trajets.",
  },

  {
    id: "peugeot-508",
    brand: "Peugeot",
    model: "508",
    category: "BERLINE",
    pricePerDay: 49,
    imageUrl: peugeot508Paris,
    seats: 5,
    luggage: 3,
    transmission: "Auto",
    fuel: "Diesel",
    description:
      "Berline élégante idéale pour les trajets confortables dans Paris et en Île-de-France.",
  },
  {
    id: "nissan-micra-black",
    brand: "Nissan",
    model: "Micra Black",
    category: "CITADINE",
    pricePerDay: 36,
    imageUrl: nissanMicraBlack,
    seats: 5,
    luggage: 2,
    transmission: "Manuelle",
    fuel: "Essence",
    description:
      "Micra noire compacte, parfaite pour circuler et se garer facilement dans le centre de Paris.",
  },
  {
    id: "opel-corsa-red",
    brand: "Opel",
    model: "Corsa Rouge",
    category: "CITADINE",
    pricePerDay: 35,
    imageUrl: opelCorsaRed,
    seats: 5,
    luggage: 2,
    transmission: "Manuelle",
    fuel: "Essence",
    description:
      "Corsa rouge dynamique, idéale pour les courts séjours et les déplacements urbains.",
  },
  {
    id: "toyota-yaris-red",
    brand: "Toyota",
    model: "Yaris Rouge",
    category: "CITADINE",
    pricePerDay: 37,
    imageUrl: toyotaYarisRed,
    seats: 5,
    luggage: 2,
    transmission: "Auto",
    fuel: "Hybride",
    description:
      "Citadine hybride économique, parfaite pour limiter la consommation en ville.",
  },
  {
    id: "nissan-micra-white",
    brand: "Nissan",
    model: "Micra White",
    category: "CITADINE",
    pricePerDay: 36,
    imageUrl: nissanMicraWhite,
    seats: 5,
    luggage: 2,
    transmission: "Manuelle",
    fuel: "Essence",
    description:
      "Micra blanche polyvalente, idéale pour les déplacements quotidiens sur Paris.",
  },
  {
    id: "opel-corsa-silver",
    brand: "Opel",
    model: "Corsa Grise",
    category: "CITADINE",
    pricePerDay: 35,
    imageUrl: opelCorsaSilver,
    seats: 5,
    luggage: 2,
    transmission: "Manuelle",
    fuel: "Essence",
    description:
      "Corsa grise discrète et confortable, pour les séjours courts comme longs.",
  },
  {
    id: "skoda-rapid-black",
    brand: "Skoda",
    model: "Rapid",
    category: "BERLINE",
    pricePerDay: 45,
    imageUrl: skodaRapidBlack,
    seats: 5,
    luggage: 3,
    transmission: "Manuelle",
    fuel: "Diesel",
    description:
      "Berline spacieuse idéale pour les trajets en groupe ou en famille autour de Paris.",
  },
  {
    id: "nissan-primera-grey",
    brand: "Nissan",
    model: "Primera",
    category: "BERLINE",
    pricePerDay: 42,
    imageUrl: nissanPrimeraGrey,
    seats: 5,
    luggage: 3,
    transmission: "Manuelle",
    fuel: "Essence",
    description:
      "Berline confortable, parfaite pour les trajets domicile–aéroport ou les week-ends.",
  },
  
];

export function getCarById(id) {
  return cars.find((car) => car.id === id);
}
