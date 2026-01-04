function getFetch() {
  if (typeof fetch === "function") return fetch;

  try {
    const nodeFetch = require("node-fetch");
    return nodeFetch;
  } catch {
    const error = new Error(
      "global.fetch is not available. Use Node 18+ or install node-fetch@2."
    );
    error.code = "FETCH_NOT_AVAILABLE";
    throw error;
  }
}

function normalizeNode(node) {
  if (!node) return null;
  return String(node).replace(/\/+$/, "");
}

function getEsConfig() {
  const node = normalizeNode(process.env.ES_NODE);
  const apiKey = process.env.ES_API_KEY ? String(process.env.ES_API_KEY) : null;

  if (!node || !apiKey) return null;
  return { node, apiKey };
}

async function readResponseBody(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    return await res.text();
  } catch {
    return null;
  }
}

function createEsError(message, status, body) {
  const error = new Error(message);
  error.name = "ElasticsearchError";
  error.status = status;
  error.body = body;
  return error;
}

function createEsClient({ node, apiKey }) {
  const fetchFn = getFetch();

  async function request(method, path, { query, body } = {}) {
    const url = new URL(node + path);
    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.set(key, String(value));
      });
    }

    const headers = {
      Authorization: `ApiKey ${apiKey}`,
    };

    let payload = undefined;
    if (body != null) {
      if (typeof body === "string") {
        payload = body;
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      }
    }

    const res = await fetchFn(url.toString(), {
      method,
      headers,
      body: payload,
    });

    const responseBody = await readResponseBody(res);
    if (!res.ok) {
      const message =
        (responseBody &&
          typeof responseBody === "object" &&
          responseBody.error &&
          responseBody.error.type) ||
        res.statusText ||
        "Elasticsearch request failed";
      throw createEsError(message, res.status, responseBody);
    }

    return responseBody;
  }

  return {
    request,

    async ping() {
      return request("GET", "/");
    },

    async index({ index, id, document, refresh } = {}) {
      if (!index) throw new Error("Missing required param: index");
      if (id == null) throw new Error("Missing required param: id");
      if (document == null) throw new Error("Missing required param: document");

      const path = `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(
        String(id)
      )}`;
      return request("PUT", path, { query: { refresh }, body: document });
    },

    async delete({ index, id, refresh } = {}) {
      if (!index) throw new Error("Missing required param: index");
      if (id == null) throw new Error("Missing required param: id");

      const path = `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(
        String(id)
      )}`;
      return request("DELETE", path, { query: { refresh } });
    },

    async search({ index, body } = {}) {
      if (!index) throw new Error("Missing required param: index");
      const path = `/${encodeURIComponent(String(index))}/_search`;
      return request("POST", path, { body: body ?? {} });
    },

    async bulk({ body, refresh } = {}) {
      if (typeof body !== "string") {
        throw new Error("bulk expects NDJSON string body");
      }

      const url = new URL(node + "/_bulk");
      if (refresh != null) url.searchParams.set("refresh", String(refresh));

      const res = await fetchFn(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `ApiKey ${apiKey}`,
          "Content-Type": "application/x-ndjson",
        },
        body,
      });

      const responseBody = await readResponseBody(res);
      if (!res.ok) {
        const message =
          (responseBody &&
            typeof responseBody === "object" &&
            responseBody.error &&
            responseBody.error.type) ||
          res.statusText ||
          "Elasticsearch request failed";
        throw createEsError(message, res.status, responseBody);
      }

      return responseBody;
    },

    async indicesCreate({ index, body } = {}) {
      if (!index) throw new Error("Missing required param: index");
      return request("PUT", `/${encodeURIComponent(String(index))}`, {
        body: body ?? {},
      });
    },

    async aliasesUpdate({ actions } = {}) {
      return request("POST", "/_aliases", { body: { actions: actions ?? [] } });
    },

    async aliasGet({ name } = {}) {
      if (!name) throw new Error("Missing required param: name");
      return request("GET", `/_alias/${encodeURIComponent(String(name))}`);
    },
  };
}

let cachedClient = null;

function getEsClient() {
  if (cachedClient) return cachedClient;
  const config = getEsConfig();
  if (!config) return null;
  cachedClient = createEsClient(config);
  return cachedClient;
}

module.exports = { getEsClient };
