import { db } from "@/lib/db";

/**
 * Script to list all PINs from the database
 */

async function main() {
  console.log("Fetching all PINs from database...\n");

  try {
    const restaurants = await db.restaurant.findMany({
      select: {
        pin: true,
        name: true,
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc", // Oldest first
      },
    });

    console.log("=".repeat(80));
    console.log(`Total PINs: ${restaurants.length}`);
    console.log("=".repeat(80));
    console.log("\nAll PINs:");
    console.log("-".repeat(80));
    
    restaurants.forEach((restaurant, index) => {
      const name = restaurant.name || "(sem nome)";
      const date = restaurant.createdAt.toISOString().split("T")[0];
      console.log(
        `${(index + 1).toString().padStart(3, " ")}. PIN: ${restaurant.pin.padEnd(6, " ")} | Nome: ${name.padEnd(20, " ")} | Criado: ${date}`
      );
    });

    console.log("-".repeat(80));
    console.log(`\nTotal: ${restaurants.length} PINs\n`);

    // Output just the PINs in a simple list
    console.log("Lista simples de PINs:");
    console.log("-".repeat(80));
    restaurants.forEach((restaurant, index) => {
      console.log(`${(index + 1).toString().padStart(3, " ")}. ${restaurant.pin}`);
    });

    // JSON format
    console.log("\n\nJSON format (apenas PINs):");
    console.log(JSON.stringify(restaurants.map(r => r.pin), null, 2));

    // CSV format
    console.log("\n\nCSV format:");
    console.log("PIN,Nome,ID,Criado");
    restaurants.forEach((restaurant) => {
      const name = restaurant.name || "";
      const date = restaurant.createdAt.toISOString().split("T")[0];
      console.log(`${restaurant.pin},"${name}",${restaurant.id},${date}`);
    });

  } catch (error) {
    console.error("Error fetching PINs:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
