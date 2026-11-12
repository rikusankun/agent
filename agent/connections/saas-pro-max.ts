import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://saaspro.dev/api/mcp",
  description: "Explore product analytics, investigate errors, and manage feature flags.",
  auth: connect({ connector: "saaspro.dev/" + process.env.VERCEL_PROJECT_ID, autoProvision: true }),
});
