import { createContext } from 'react';
import {
    getMediaSavedValues,
    clearMediaSavedValues
} from '@/broadcast/device/data/repository/MediaRepository';
import {
    ChannelType,
    Orientation,
    Resolution
} from '@/broadcast/device/data/model/enum';
import { MediaSettings } from '../data/model/type';


const MediaSettingsContext = createContext<MediaSettings>({
    channelType: undefined,
    setChannelType: (value: ChannelType) => {},
    savedVideoDeviceId: undefined,
    setSavedVideoDeviceId: (value: string | undefined) => {},
    savedAudioDeviceId: undefined,
    setSavedAudioDeviceId: (value: string | undefined) => {},
    orientation: undefined,
    setOrientation: (value: Orientation) => {},
    resolution: undefined,
    setResolution: (value: Resolution) => {},
    configRef: undefined,
    clearMediaSavedValues: () => {
        clearMediaSavedValues();
    }
})

function MediaSettingsProvider({ children }: { children: React.ReactNode }) {
    const {
        savedAudioDeviceId,
        setSavedAudioDeviceId,
        savedVideoDeviceId,
        setSavedVideoDeviceId,
        channelType,
        setChannelType,
        resolution,
        setResolution,
        orientation,
        setOrientation,
        configRef
    } = getMediaSavedValues();

    return (
        <MediaSettingsContext.Provider
            value={{
                savedAudioDeviceId,
                setSavedAudioDeviceId,
                savedVideoDeviceId,
                setSavedVideoDeviceId,
                channelType,
                setChannelType,
                resolution,
                setResolution,
                orientation,
                setOrientation,
                configRef,
                clearMediaSavedValues
            }}
        >
            {children}
        </MediaSettingsContext.Provider>
    );
}

export default MediaSettingsProvider;
export { MediaSettingsContext };