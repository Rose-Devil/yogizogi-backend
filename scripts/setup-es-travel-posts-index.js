const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { getEsClient } = require("../src/lib/esClient");

function getArgValue(args, name) {
  const prefix = `${name}=`;
  const byEquals = args.find((a) => a.startsWith(prefix));
  if (byEquals) return byEquals.slice(prefix.length);

  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function isNotFound(err) {
  return err && err.status === 404;
}

async function indexExists(es, indexName) {
  try {
    await es.request("GET", `/${encodeURIComponent(indexName)}`);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

async function getAliasInfo(es, aliasName) {
  try {
    return await es.aliasGet({ name: aliasName });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const indexName = getArgValue(args, "--index") || "travel_posts_v1";
  const aliasName = getArgValue(args, "--alias") || "travel_posts";

  const es = getEsClient();
  if (!es) {
    console.error("Missing ES config. Set ES_NODE and ES_API_KEY in .env");
    process.exit(1);
  }

  const exists = await indexExists(es, indexName);
  if (!exists) {
    console.log(`Creating index: ${indexName}`);
    await es.indicesCreate({
      index: indexName,
      body: {
        mappings: {
          dynamic: "strict",
          properties: {
            postId: { type: "keyword" },
            title: { type: "text" },
            content: { type: "text" },
            tags: { type: "keyword" },
            authorId: { type: "keyword" },
            createdAt: { type: "date" },
          },
        },
      },
    });
  } else {
    console.log(`Index already exists (skip): ${indexName}`);
  }

  const aliasInfo = await getAliasInfo(es, aliasName);
  if (!aliasInfo) {
    console.log(`Creating alias: ${aliasName} -> ${indexName}`);
    await es.aliasesUpdate({
      actions: [{ add: { index: indexName, alias: aliasName } }],
    });
    console.log("Done.");
    return;
  }

  const currentIndices = Object.keys(aliasInfo);
  const alreadyOk =
    currentIndices.length === 1 && currentIndices[0] === indexName;
  if (alreadyOk) {
    console.log(`Alias already points to index (skip): ${aliasName} -> ${indexName}`);
    return;
  }

  console.warn(
    `Alias "${aliasName}" already exists and points to: ${currentIndices.join(
      ", "
    )}`
  );
  if (!force) {
    console.warn('Run again with "--force" to repoint the alias.');
    process.exit(1);
  }

  console.log(`Repointing alias: ${aliasName} -> ${indexName}`);
  const actions = [
    ...currentIndices.map((idx) => ({ remove: { index: idx, alias: aliasName } })),
    { add: { index: indexName, alias: aliasName } },
  ];
  await es.aliasesUpdate({ actions });
  console.log("Done.");
}

main().catch((err) => {
  console.error("setup-es-travel-posts-index failed:", err);
  process.exit(1);
});

