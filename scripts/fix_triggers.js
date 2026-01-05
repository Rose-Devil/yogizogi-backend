const { sequelize } = require("../src/config/db");

async function fixTriggers() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    console.log("Dropping trigger trg_comment_parent_same_post_ins...");
    await sequelize.query("DROP TRIGGER IF EXISTS trg_comment_parent_same_post_ins");
    console.log("Dropped.");

    console.log("Dropping trigger trg_comment_parent_same_post_upd...");
    await sequelize.query("DROP TRIGGER IF EXISTS trg_comment_parent_same_post_upd");
    console.log("Dropped.");

    console.log("✅ Triggers fixed.");

  } catch (error) {
    console.error("Fix failed:", error);
  } finally {
    await sequelize.close();
  }
}

fixTriggers();
