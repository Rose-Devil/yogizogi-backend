const { sequelize } = require("../src/config/db");

async function inspect() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    console.log("\n--- TRIGGERS ---");
    const [triggers] = await sequelize.query("SHOW TRIGGERS");
    console.log(JSON.stringify(triggers, null, 2));

    console.log("\n--- COLUMNS IN Comment TABLE ---");
    const [columns] = await sequelize.query("SHOW COLUMNS FROM Comment");
    console.log(JSON.stringify(columns, null, 2));

  } catch (error) {
    console.error("Inspection failed:", error);
  } finally {
    await sequelize.close();
  }
}

inspect();
