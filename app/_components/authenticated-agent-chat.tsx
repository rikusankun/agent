import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AgentChat } from "./agent-chat";
import { AccountControl, SignIn } from "./web-chat-auth";
import { DEFAULT_FREE_MODEL_ID, localModelsFromEnv } from "@/lib/free-models";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const modelsEnabled = Boolean(process.env.EVE_MODEL_BASE_URL);
  const localModels = localModelsFromEnv();
  const defaultModelId = process.env.EVE_MODEL_ID ?? DEFAULT_FREE_MODEL_ID;

  if (process.env.NODE_ENV === "development") {
    return (
      <AgentChat
        defaultModelId={defaultModelId}
        localModels={localModels}
        modelsEnabled={modelsEnabled}
        sessionId={sessionId}
        sessionless={sessionless}
      />
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <SignIn />;

  return (
    <>
      <AgentChat
        defaultModelId={defaultModelId}
        localModels={localModels}
        modelsEnabled={modelsEnabled}
        sessionId={sessionId}
        sessionless={sessionless}
      />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
