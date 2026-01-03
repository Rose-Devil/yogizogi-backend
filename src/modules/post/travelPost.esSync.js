const { getEsClient } = require("../../lib/esClient");
const { TravelPost, Tag } = require("./models");

const DEFAULT_ES_INDEX = "travel_posts_v1";

function getTravelPostIndexName() {
  return process.env.ES_INDEX ?? DEFAULT_ES_INDEX;
}

function formatEsError(err) {
  if (!err) return "Unknown error";
  const status = err.status != null ? ` status=${err.status}` : "";
  const name = err.name ? ` ${err.name}` : "";
  const message = err.message ? ` ${err.message}` : "";
  return `[es]${name}${status}${message}`.trim();
}

function requireEsClient() {
  const client = getEsClient();
  if (client) return client;

  const error = new Error(
    "Elasticsearch is not configured (set ES_NODE and ES_API_KEY)"
  );
  error.code = "ES_NOT_CONFIGURED";
  throw error;
}

async function fetchTravelPostWithTags(postId) {
  return await TravelPost.findOne({
    where: { id: postId, is_deleted: false },
    attributes: ["id", "author_id", "title", "content", "created_at"],
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["name"],
        through: { attributes: [] },
        required: false,
      },
    ],
  });
}

async function buildTravelPostDoc(postId) {
  const post = await fetchTravelPostWithTags(postId);
  if (!post) return null;

  const data = post.get({ plain: true });
  const tags = Array.from(
    new Set((data.tags || []).map((t) => t && t.name).filter(Boolean))
  );

  return {
    postId: String(data.id),
    title: data.title ?? "",
    content: data.content ?? "",
    tags,
    authorId: data.author_id != null ? String(data.author_id) : undefined,
    createdAt: data.created_at ? new Date(data.created_at).toISOString() : undefined,
  };
}

async function upsertTravelPostDoc(doc) {
  const es = requireEsClient();
  const index = getTravelPostIndexName();
  return await es.index({ index, id: doc.postId, document: doc });
}

async function deleteTravelPostDoc(postId) {
  const es = requireEsClient();
  const index = getTravelPostIndexName();
  try {
    return await es.delete({ index, id: String(postId) });
  } catch (err) {
    if (err && err.status === 404) return null;
    throw err;
  }
}

async function safeSyncTravelPostUpsertById(postId, { reason } = {}) {
  try {
    const doc = await buildTravelPostDoc(postId);
    if (!doc) {
      await safeSyncTravelPostDeleteById(postId, { reason: reason ?? "not_found" });
      return { ok: false, skipped: true };
    }

    await upsertTravelPostDoc(doc);
    return { ok: true };
  } catch (err) {
    if (err && err.code === "ES_NOT_CONFIGURED") return { ok: false, skipped: true };
    console.warn(
      `[travelPost-es-sync] upsert failed postId=${postId}${
        reason ? ` reason=${reason}` : ""
      }: ${formatEsError(err)}`
    );
    return { ok: false, error: err };
  }
}

async function safeSyncTravelPostDeleteById(postId, { reason } = {}) {
  try {
    await deleteTravelPostDoc(postId);
    return { ok: true };
  } catch (err) {
    if (err && err.code === "ES_NOT_CONFIGURED") return { ok: false, skipped: true };
    console.warn(
      `[travelPost-es-sync] delete failed postId=${postId}${
        reason ? ` reason=${reason}` : ""
      }: ${formatEsError(err)}`
    );
    return { ok: false, error: err };
  }
}

module.exports = {
  getTravelPostIndexName,
  buildTravelPostDoc,
  upsertTravelPostDoc,
  deleteTravelPostDoc,
  safeSyncTravelPostUpsertById,
  safeSyncTravelPostDeleteById,
};
