import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.vercel.com",
  description: "Deploy agents and apps, manage projects, and more.",
  auth: connect({ connector: "mcp.vercel.com/" + process.env.VERCEL_PROJECT_ID, autoProvision: true }),
});
