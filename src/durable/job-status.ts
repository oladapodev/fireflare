import { json } from "../utils/http";

export class JobStatusObject implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "PUT") {
      const payload = await request.json();
      await this.state.storage.put("status", payload);
      return json({ success: true });
    }

    const status = await this.state.storage.get("status");
    if (!status) return json({ success: false, error: "Status not found" }, { status: 404 });
    return json({ success: true, data: status });
  }
}
