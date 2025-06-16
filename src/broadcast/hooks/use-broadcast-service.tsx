'use client'
import { useContext } from "react";
import { BroadcastServiceContext } from "../context/BroadcastServiceContext";

export const useBroadcastService = () => {
    const ctx = useContext(BroadcastServiceContext)
    if (!ctx) throw new Error("useBroadcastService must be used inside BroadcastServiceProvider");
    return ctx;
};
