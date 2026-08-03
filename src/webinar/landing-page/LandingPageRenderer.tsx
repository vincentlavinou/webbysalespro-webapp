"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ElementType } from "react";
import { Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DefaultRegistrationForm } from "@/app/(webinar)/[id]/(registration)/register/form";
import { WebinarFooter } from "@/webinar/components";
import type { Webinar } from "@/webinar/service";
import { buildContrastTokens } from "@/webinar/theme/contrast";
import { DEFAULT_REGISTRATION_THEME } from "@/webinar/theme/default-theme";
import { REGISTRATION_FONT_STACKS } from "@/webinar/theme/fonts";
import type { LandingPageAction, LandingPageBlock, LandingPageBlockStyle, LandingPageRender, LandingPageRow, LandingPageTheme, RichText } from "./types";

const themeStyle = (theme: LandingPageTheme): CSSProperties => {
  const background = theme.background_color || DEFAULT_REGISTRATION_THEME.background_color;
  const secondaryBackground = theme.secondary_background_color || DEFAULT_REGISTRATION_THEME.secondary_background_color;
  const contrast = buildContrastTokens(background);
  const secondaryContrast = buildContrastTokens(secondaryBackground);
  return {
    "--lp-primary": theme.primary_color || DEFAULT_REGISTRATION_THEME.primary_color,
    "--lp-secondary": theme.secondary_color || DEFAULT_REGISTRATION_THEME.secondary_color,
    "--lp-background": background,
    "--lp-secondary-background": secondaryBackground,
    "--lp-secondary-foreground": secondaryContrast.foreground,
    "--lp-secondary-border": secondaryContrast.border,
    "--lp-button-text": theme.button_text_color || DEFAULT_REGISTRATION_THEME.button_text_color,
    "--background": background,
    "--foreground": contrast.foreground,
    "--card": background,
    "--card-foreground": contrast.foreground,
    "--muted": secondaryBackground,
    "--muted-foreground": contrast.mutedForeground,
    "--border": contrast.border,
    "--input": contrast.border,
    fontFamily: REGISTRATION_FONT_STACKS[theme.font_family] || REGISTRATION_FONT_STACKS.system,
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  } as CSSProperties;
};

function isExternalAction(action?: LandingPageAction) {
  return action?.kind === "external_url";
}

function hrefFor(action?: LandingPageAction) {
  if (!action) return undefined;
  if (action.kind === "open_registration_form") return "#lp-registration-form";
  if (action.kind === "scroll_to_block") return `#${action.block_id}`;
  return action.url;
}

function RichTextView({ value, className }: { value?: RichText; className?: string }) {
  if (!value?.spans?.length) return null;
  const Tag = (value.level || "p") as ElementType;
  return <Tag className={className}>{value.spans.map((span, index) => {
    const external = isExternalAction(span.action);
    const content = span.style === "link" ? <a href={hrefFor(span.action)} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="underline underline-offset-2" style={{ color: "var(--lp-primary)" }}>{span.text}</a> : span.text;
    return <span key={index} className={span.style === "bold" ? "font-semibold" : undefined} style={span.style === "bold_primary" ? { color: "var(--lp-primary)", fontWeight: 600 } : undefined}>{content}</span>;
  })}</Tag>;
}

function Countdown({ target, nextSessionStart }: { target: LandingPageBlock["config"]; nextSessionStart?: string }) {
  const targetIso = target.target === "custom" ? target.target_datetime : nextSessionStart;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (!targetIso) return <div className="rounded-xl border p-6 text-center text-sm opacity-70">Countdown to the session start</div>;
  const seconds = Math.max(0, Math.floor((new Date(targetIso).getTime() - now) / 1000));
  const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  return <div className="flex flex-col items-center gap-3 rounded-xl border p-6"><div className="text-xs font-medium uppercase tracking-wide opacity-70">{target.target === "session_start" ? "Live in" : "Starts in"}</div><div className="flex gap-3">{values.map((value, index) => <div key={index} className="text-center"><div className="flex h-14 w-14 items-center justify-center rounded-lg text-xl font-bold" style={{ backgroundColor: "var(--lp-primary)", color: "var(--lp-button-text)" }}>{String(value).padStart(2, "0")}</div><div className="mt-1 text-[11px] uppercase opacity-70">{["Days", "Hrs", "Min", "Sec"][index]}</div></div>)}</div></div>;
}

function blockStyle(style?: LandingPageBlockStyle): CSSProperties | undefined {
  if (!style) return undefined;
  return {
    ...(style.background_color ? { backgroundColor: style.background_color } : {}),
    ...(style.text_color ? { color: style.text_color } : {}),
    ...(style.font_family ? { fontFamily: REGISTRATION_FONT_STACKS[style.font_family] } : {}),
  };
}

function Block({ block, webinar, page, nextSessionStart, webinarPromise }: { block: LandingPageBlock; webinar: Webinar; page: LandingPageRender; nextSessionStart?: string; webinarPromise: Promise<Webinar> }) {
  const c = block.config;
  switch (block.type) {
    case "hero": return <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border px-6 py-16 text-center" style={{ backgroundColor: "var(--lp-secondary-background)", borderColor: "var(--lp-secondary-border)", color: "var(--lp-secondary-foreground)" }}>{c.background_image_url && <Image src={c.background_image_url} alt="" fill unoptimized sizes="100vw" className="absolute object-cover opacity-30" />}<div className="relative z-10 flex flex-col items-center gap-4"><RichTextView value={c.headline} className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl" /><RichTextView value={c.subheadline} className="max-w-xl text-base opacity-70" /><div className="flex flex-wrap justify-center gap-3">{[c.cta_primary, c.cta_secondary].map((cta, i) => cta && <a key={i} href={hrefFor(cta.action)} target={isExternalAction(cta.action) ? "_blank" : undefined} rel={isExternalAction(cta.action) ? "noopener noreferrer" : undefined} className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold" style={i === 0 ? { backgroundColor: "var(--lp-primary)", color: "var(--lp-button-text)" } : { border: "1px solid var(--lp-primary)", color: "var(--lp-primary)" }}>{cta.label}</a>)}</div></div></div>;
    case "text": return <div className="space-y-3 rounded-xl border p-6">{(c.lines || []).map((line: RichText, i: number) => <RichTextView key={i} value={line} className="text-base leading-relaxed" />)}</div>;
    case "image": return c.image_url ? <div className="relative min-h-40 overflow-hidden rounded-xl border"><Image src={c.image_url} alt={c.alt_text || ""} fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div> : null;
    case "video": { if (!c.url) return null; let src = c.url; try { const url = new URL(c.url); if (c.provider === "youtube") src = `https://www.youtube.com/embed/${url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v")}`; if (c.provider === "vimeo") src = `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean).pop()}`; if (c.provider === "wistia") src = `https://fast.wistia.net/embed/iframe/${url.pathname.split("/").filter(Boolean).pop()}`; } catch {} return <div className="overflow-hidden rounded-xl border bg-black"><div className="aspect-video">{c.provider === "url" ? <video src={c.url} controls className="h-full w-full" /> : <iframe src={src} className="h-full w-full" allowFullScreen title="Video" />}</div></div>; }
    case "testimonial": return <div className="flex flex-col items-center gap-4 rounded-xl border p-6 text-center" style={{ backgroundColor: "var(--lp-secondary-background)", borderColor: "var(--lp-secondary-border)", color: "var(--lp-secondary-foreground)" }}>{c.photo_url ? <Image src={c.photo_url} alt={c.name || ""} width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold" style={{ backgroundColor: "var(--lp-primary)", color: "var(--lp-button-text)" }}>{c.name?.slice(0, 1)}</div>}<RichTextView value={c.quote} className="max-w-lg text-base italic leading-relaxed" /><div><div className="text-sm font-semibold">{c.name}</div><div className="text-xs opacity-70">{c.title}</div></div></div>;
    case "countdown": return <Countdown target={c} nextSessionStart={nextSessionStart} />;
    case "bullets": return <div className="rounded-xl border p-6"><ul className="space-y-3">{(c.items || []).map((item, i) => <li key={i} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--lp-primary)" }} />{item.text}</li>)}</ul></div>;
    case "faq": return <div className="rounded-xl border p-6"><Accordion type="single" collapsible>{(c.items || []).map((item, i) => <AccordionItem key={i} value={`faq-${i}`}><AccordionTrigger>{item.question}</AccordionTrigger><AccordionContent>{item.answer}</AccordionContent></AccordionItem>)}</Accordion></div>;
    case "logos": return <div className="flex flex-wrap items-center justify-center gap-8 rounded-xl border p-6">{(c.items || []).map((item, i) => <Image key={i} src={item.image_url || ""} alt="" width={120} height={32} unoptimized className="h-8 w-auto object-contain opacity-80" />)}</div>;
    case "registration_form": return <div id="lp-registration-form" className="rounded-xl border p-6"><DefaultRegistrationForm webinarPromise={webinarPromise} webinarId={webinar.id} primaryColor={page.theme.primary_color} secondaryColor={page.theme.secondary_color} secondaryBackgroundColor={page.theme.secondary_background_color} buttonTextColor={page.theme.button_text_color} ctaLabel={c.cta_label} landingPageSource={page.slug} landingSuccessUrl={page.success_url} /></div>;
    case "footer": return c.links?.length ? <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border p-4 text-sm opacity-70">{c.links.map((link, i) => <a key={i} href={hrefFor(link.action)} target={isExternalAction(link.action) ? "_blank" : undefined} rel={isExternalAction(link.action) ? "noopener noreferrer" : undefined} className="hover:underline">{link.label}</a>)}</div> : null;
    default: return null;
  }
}

export function LandingPageRenderer({ page, webinar, webinarPromise }: { page: LandingPageRender; webinar: Webinar; webinarPromise: Promise<Webinar> }) {
  const nextSessionStart = webinar.series?.sessions?.[0]?.scheduled_start;
  return <div className="flex min-h-screen flex-col" style={themeStyle(page.theme)}><main className="flex-1"><div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">{page.definition.rows.map((row: LandingPageRow) => <div key={row.id} className={`grid gap-4 ${row.blocks.length === 1 ? "grid-cols-1" : row.blocks.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>{row.blocks.map((block) => <div key={block.id} id={block.id} style={blockStyle(block.style)}><Block block={block} webinar={webinar} page={page} nextSessionStart={nextSessionStart} webinarPromise={webinarPromise} /></div>)}</div>)}</div></main><WebinarFooter /></div>;
}
