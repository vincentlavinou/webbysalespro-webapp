// The arrangement resolver lives in the shared package now.
//
// Parity with the console is the whole contract, and hand-syncing two copies
// did not deliver it: the console tells a host it is showing what the audience
// sees, so a difference between the copies made the console lie about what was
// going out.
//
// Still true, and now enforced by the package's own module layout rather than
// by a comment: a session without layout setup runs the solo path and never
// reaches this resolver. Do not reintroduce a "no layout" branch here — pass
// `stageStateEnabled: true` and let `src/playback/solo/solo-state.ts` own the
// other case.

import type {
  ResolvedStageArrangement as SharedArrangement,
  StageParticipant,
} from "@lavinou/webbysalespro/stage";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";

export { resolveStageArrangement } from "@lavinou/webbysalespro/stage";

export type { StageArrangementShape } from "@lavinou/webbysalespro/stage";

/**
 * The arrangement as this app holds it.
 *
 * The package's type is generic over the participant, so a caller passing
 * `WebiSalesProParticipant[]` gets this back by inference. The alias is for the
 * places that name the type directly — `StageArrangementContext`.
 */
export type ResolvedStageArrangement = SharedArrangement<WebiSalesProParticipant>;

// This app's participant must satisfy the package's structural shape. If IVS
// changes `StageParticipantInfo` under us it surfaces here, as a type error
// rather than as a wrong stage at runtime.
const _assertParticipantShape: StageParticipant =
  null as unknown as WebiSalesProParticipant;
void _assertParticipantShape;
