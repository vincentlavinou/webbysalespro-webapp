import { z } from "zod"
import { realtimeConfigSchema } from "./schema"

export type RealtimeConfig = z.infer<typeof realtimeConfigSchema>
