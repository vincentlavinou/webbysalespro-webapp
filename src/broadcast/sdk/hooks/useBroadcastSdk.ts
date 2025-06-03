import Button from '@/components/Button';
import Settings from '@/components/Settings';
import { ModalContext } from '@/providers/ModalContext';
import { UserSettingsContext } from '@/providers/UserSettingsContext';
import { useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  BroadcastClient,
  BroadcastClientEvents,
  ConnectionState,
  IVSBroadcastClientType
} from 'amazon-ivs-web-broadcast';

type BroadcastSDKType = typeof import('amazon-ivs-web-broadcast');

interface BroadcastError {
  message: string;
  code?: number;
}

const useBroadcastSDK = () => {
  const { streamKey, ingestEndpoint } = useContext(UserSettingsContext);
  const { toggleModal, setModalProps, setModalContent } =
    useContext(ModalContext);

  const [broadcastClientMounted, setBroadcastClientMounted] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [streamPending, setStreamPending] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState | undefined>();
  const [clientErrors, setClientErrors] = useState<BroadcastError[]>([]);

  const IVSBroadcastClientRef = useRef<BroadcastSDKType | undefined>();
  const broadcastClientRef = useRef<BroadcastClient | undefined>();
  const broadcastClientEventsRef = useRef<BroadcastClientEvents | undefined>();
  const startTimeRef = useRef<Date | undefined>();
  const sdkVersionRef = useRef<string | undefined>();

  const importBroadcastSDK = async (): Promise<BroadcastSDKType> => {
    const sdk = (await import('amazon-ivs-web-broadcast')).default;
    broadcastClientEventsRef.current = sdk.BroadcastClientEvents;
    IVSBroadcastClientRef.current = sdk;
    return sdk;
  };

  const createBroadcastClient = async ({
    config,
  }: {
    config: any;
  }): Promise<BroadcastClient> => {
    const IVSBroadcastClient =
      IVSBroadcastClientRef.current || (await importBroadcastSDK());

    const client = IVSBroadcastClient.create({ streamConfig: config });

    broadcastClientRef.current = client;
    sdkVersionRef.current = IVSBroadcastClient.__version;
    setIsSupported(IVSBroadcastClient.isSupported());
    attachBroadcastClientListeners(client);
    setBroadcastClientMounted(true);

    return client;
  };

  const destroyBroadcastClient = (client: BroadcastClient) => {
    detachBroadcastClientListeners(client);
    client.delete();
    setBroadcastClientMounted(false);
  };

  const attachBroadcastClientListeners = (client: BroadcastClient) => {
    client.on(
      broadcastClientEventsRef.current!.CONNECTION_STATE_CHANGE,
      handleConnectionStateChange
    );
    client.on(
      broadcastClientEventsRef.current!.ACTIVE_STATE_CHANGE,
      handleActiveStateChange
    );
    client.on(
      broadcastClientEventsRef.current!.ERROR,
      handleClientError
    );
  };

  const detachBroadcastClientListeners = (client: BroadcastClient) => {
    client.off(
      broadcastClientEventsRef.current!.CONNECTION_STATE_CHANGE,
      handleConnectionStateChange
    );
    client.off(
      broadcastClientEventsRef.current!.ACTIVE_STATE_CHANGE,
      handleActiveStateChange
    );
    client.off(
      broadcastClientEventsRef.current!.ERROR,
      handleClientError
    );
  };

  const restartBroadcastClient = async ({
    config,
    ingestEndpoint,
  }: {
    config: any;
    ingestEndpoint: string;
  }): Promise<BroadcastClient> => {
    if (isLive) await stopStream(broadcastClientRef.current!);
    destroyBroadcastClient(broadcastClientRef.current!);
    return await createBroadcastClient({ config });
  };

  const handleActiveStateChange = (active: boolean) => {
    setIsLive(active);
  };

  const handleConnectionStateChange = (state: ConnectionState) => {
    setConnectionState(state);
  };

  const handleClientError = (clientError: BroadcastError) => {
    setClientErrors((prev) => [...prev, clientError]);
  };

  const stopStream = async (client: BroadcastClient) => {
    try {
      setStreamPending(true);
      toast.loading('Stopping stream...', { id: 'STREAM_STATUS' });
      await client.stopBroadcast();
      startTimeRef.current = undefined;
      toast.success('Stopped stream', { id: 'STREAM_STATUS' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to stop stream', { id: 'STREAM_STATUS' });
    } finally {
      setStreamPending(false);
      toast.remove('STREAM_TIMEOUT');
    }
  };

  const startStream = async ({
    client,
    streamKey,
    ingestEndpoint,
  }: {
    client: BroadcastClient;
    streamKey: string;
    ingestEndpoint: string;
  }) => {
    let streamTimeout: NodeJS.Timeout;

    try {
      toast.loading((t) => (
        <span>
          <span className="pr-4">Starting stream...</span>
          <Button
            type="toast"
            onClick={() => {
              toast.dismiss(t.id);
              stopStream(client);
            }}
          >
            Stop
          </Button>
        </span>
      ), { id: 'STREAM_STATUS' });

      setStreamPending(true);

      streamTimeout = setTimeout(() => {
        toast(() => (
          <span className="text-black/50">
            It's taking longer than usual to start the stream. If you're on a VPN, check if port 4443 is unblocked.
          </span>
        ), { id: 'STREAM_TIMEOUT', duration: Infinity, icon: '⚠️' });
      }, 5000);

      await client.startBroadcast(streamKey, ingestEndpoint);
      clearTimeout(streamTimeout);
      startTimeRef.current = new Date();
      toast.success('Started stream.', { id: 'STREAM_STATUS' });
    } catch (err: any) {
      clearTimeout(streamTimeout);
      console.error(err);

      if (err.code === 18000) {
        toast((t) => (
          <div className="flex items-center">
            <span className="pr-4 grow">
              <strong>Invalid stream key.</strong> Enter a valid key to continue.
            </span>
            <span className="shrink-0">
              <Button
                type="toast"
                onClick={() => {
                  toast.dismiss(t.id);
                  setModalProps({ type: 'full' });
                  setModalContent(<Settings />);
                  toggleModal?.();
                }}
              >
                Open settings
              </Button>
            </span>
          </div>
        ), {
          id: 'STREAM_STATUS',
          position: 'bottom-center',
          duration: Infinity,
          style: {
            minWidth: '24rem',
            width: '100%',
          },
        });
      } else {
        toast.error('Failed to start stream', { id: 'STREAM_STATUS' });
      }
    } finally {
      toast.remove('STREAM_TIMEOUT');
      setStreamPending(false);
    }
  };

  const toggleStream = async () => {
    if (isLive) {
      await stopStream(broadcastClientRef.current!);
    } else {
      await startStream({
        client: broadcastClientRef.current!,
        streamKey: streamKey!,
        ingestEndpoint: ingestEndpoint!,
      });
    }
  };

  return {
    IVSBroadcastClientRef,
    sdkVersionRef,
    broadcastClientMounted,
    broadcastClientRef,
    connectionState,
    isLive,
    isSupported,
    streamPending,
    broadcastStartTimeRef: startTimeRef,
    broadcastErrors: clientErrors,
    toggleStream,
    stopStream,
    startStream,
    createBroadcastClient,
    destroyBroadcastClient,
    restartBroadcastClient,
  };
};

export default useBroadcastSDK;
