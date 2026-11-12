import { eveChannel } from "eve/channels/eve";
import { localDev, type AuthFn, vercelOidc } from "eve/channels/auth";
import { auth } from "@/lib/auth";
import { findModel } from "@/lib/free-models";

const MODEL_HEADER = "x-eve-model";

/** Carry the browser's model choice into session auth so defineDynamic can read it. */
function withModelChoice(authFn: AuthFn<Request>): AuthFn<Request> {
  return async (request) => {
    const result = await authFn(request);
    if (!result) return result;
    const model = request.headers.get(MODEL_HEADER);
    if (!model || !findModel(model)) return result;
    return { ...result, attributes: { ...result.attributes, model } };
  };
}

const betterAuthSession: AuthFn<Request> = async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  const attributes: Record<string, string> = {
    email: session.user.email,
    name: session.user.name,
  };
  if (session.user.image) {
    attributes.picture = session.user.image;
  }

  return {
    attributes,
    authenticator: "better-auth:vercel",
    principalId: session.user.id,
    principalType: "user",
  };
};

export default eveChannel({
  auth: [betterAuthSession, vercelOidc(), localDev()].map(withModelChoice),
});
