'use client'
import { useContext } from "react";
import { LocalMediaDeviceContext } from "../context/LocalMediaDeviceContext";

export const useLocalMediaDevices = () => {
    const ctx = useContext(LocalMediaDeviceContext)
    if (!ctx) throw new Error("useLocalMediaDevices must be used inside LocalMediaDeviceProvider");
    return ctx;
};
