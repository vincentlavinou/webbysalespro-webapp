import { cookies } from "next/headers";
const VISITOR_ID_COOKIE = "visitor_id";

export async function getVisitorIdFromCookie(): Promise<string | undefined> {
  return (await cookies()).get(VISITOR_ID_COOKIE)?.value;
}
