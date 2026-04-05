import { PlaybackContainer } from "./components/PlaybackContainer";

type PlaybackManagerProps = {
  sessionId: string;
  webinarTitle: string;
  clientRedirectTo?: string;
};

export function PlaybackManager(props: PlaybackManagerProps) {
  return <PlaybackContainer {...props} />;
}
