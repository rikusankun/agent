import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.cloudflare.com/mcp",
  description: "Build applications with compute, storage, and AI.",
  auth: connect({ connector: "mcp.cloudflare.com/" + process.env.VERCEL_PROJECT_ID, autoProvision: true }),
});
