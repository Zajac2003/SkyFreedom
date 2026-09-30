const OWNER_ID = "pilot-1";

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function fetchDrone() {
  return request("/api/drone");
}

export function fetchPins() {
  return request("/api/pins");
}

export function createPin({ note, lat, lng, owner_id = OWNER_ID, ttl_minutes = null }) {
  return request("/api/pins", {
    method: "POST",
    body: JSON.stringify({ note, lat, lng, owner_id, ttl_minutes }),
  });
}

export function patchPin(id, payload) {
  return request(`/api/pins/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export { OWNER_ID };
