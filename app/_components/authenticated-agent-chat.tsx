import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AgentChat } from "./agent-chat";
import { AccountControl, SignIn } from "./web-chat-auth";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const modelsEnabled = Boolean(process.env.EVE_MODEL_BASE_URL);

  if (process.env.NODE_ENV === "development") {
    return <AgentChat sessionId={sessionId} sessionless={sessionless} modelsEnabled={modelsEnabled} />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <SignIn />;

  return (
    <>
      <AgentChat sessionId={sessionId} sessionless={sessionless} modelsEnabled={modelsEnabled} />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
