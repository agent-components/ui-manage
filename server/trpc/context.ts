import { extractBearerToken, findUserByToken, type AuthUser } from "./auth/session";

export type Context = {
  token: string | null;
  user: AuthUser | null;
};

export async function createContext(request: Request): Promise<Context> {
  const token = extractBearerToken(request.headers.get("authorization"));
  const user = token ? await findUserByToken(token) : null;
  return { token, user };
}
