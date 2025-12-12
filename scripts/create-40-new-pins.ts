import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

/**
 * Script to create 40 new PINs and restaurants
 * Generates unique 6-digit PINs and creates corresponding restaurant entries
 */

// Generate a random 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if PIN already exists in database
async function pinExists(pin: string): Promise<boolean> {
  const existing = await db.restaurant.findUnique({
    where: { pin },
  });
  return !!existing;
}

// Generate unique PIN
async function generateUniquePin(): Promise<string> {
  let pin: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    pin = generatePin();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error("Failed to generate unique PIN after many attempts");
    }
  } while (await pinExists(pin));

  return pin;
}

async function main() {
  console.log("Creating 40 new PINs and restaurants...\n");

  const newPins: Array<{ pin: string; restaurantId: string }> = [];

  try {
    for (let i = 1; i <= 40; i++) {
      const pin = await generateUniquePin();
      
      // Create restaurant with default settings
      const restaurant = await db.restaurant.create({
        data: {
          pin,
          name: null, // Will be set during onboarding
          alertDaysBeforeExpiry: 3,
          alertDaysBeforeExpiryMP: 3,
          alertDaysBeforeExpiryTransformado: 1,
          categories: {
            create: [
              { name: "Frescos", tipo: "mp" },
              { name: "Congelados", tipo: "mp" },
              { name: "Secos", tipo: "mp" },
              { name: "Salgados", tipo: "transformado" },
              { name: "Sopas", tipo: "transformado" },
            ],
          },
          locations: {
            create: [
              { name: "Frigorífico 1" },
              { name: "Despensa" },
              { name: "Arca" },
            ],
          },
        },
      });

      newPins.push({ pin, restaurantId: restaurant.id });
      console.log(`${i.toString().padStart(2, " ")}. PIN: ${pin} - Restaurant ID: ${restaurant.id}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Successfully created 40 new PINs!");
    console.log("=".repeat(60));
    console.log("\nAll PINs:");
    console.log("-".repeat(60));
    newPins.forEach((item, index) => {
      console.log(`${(index + 1).toString().padStart(2, " ")}. ${item.pin}`);
    });
    console.log("-".repeat(60));
    console.log(`\nTotal: ${newPins.length} PINs created\n`);

    // Also output as JSON for easy copying
    console.log("JSON format (for easy copying):");
    console.log(JSON.stringify(newPins.map(item => item.pin), null, 2));

  } catch (error) {
    console.error("Error creating PINs:", error);
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

