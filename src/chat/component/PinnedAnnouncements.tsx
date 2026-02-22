'use client';

import Link from "next/link";
import { PinnedAnnouncement } from "../service/type";
import { Pin } from "lucide-react";
import { LinkifiedText } from "./LinkifiedText";

interface PinnedAnnouncementsProps {
    announcements: PinnedAnnouncement[];
}

export function PinnedAnnouncements({ announcements }: PinnedAnnouncementsProps) {
    if (announcements.length === 0) return null;

    return (
        <div className="flex flex-col gap-1 px-3 py-2 border-b bg-muted/50">
            {announcements.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                    <Pin className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <p className="text-foreground leading-snug break-words">
                            <LinkifiedText text={item.content} />
                        </p>
                        {item.cta_label && item.cta_url && (
                            <Link
                                href={item.cta_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block rounded-md bg-[#25D366] px-3 py-1 text-xs font-medium text-white hover:bg-[#1fa653] transition-colors"
                            >
                                {item.cta_label}
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
