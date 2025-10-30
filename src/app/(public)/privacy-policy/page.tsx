import React from 'react'
import { SanityDocument } from "@sanity/client";
import { PortableText } from "@portabletext/react";
import { sanityFetch } from "@sanity/lib/sanity-fetch";
import { privacyPolicyQuery } from '@sanity/lib/queries';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "haitimap privacy policy"
}


export default async function PrivacyPolicyPage() {
  
  const privacyPolicy = await sanityFetch<SanityDocument>({ query: privacyPolicyQuery })
  const lastUpdated = privacyPolicy._updatedAt == null ? new Date(privacyPolicy.publishedAt) : new Date(privacyPolicy._updatedAt)

  return (
    <main className="container mx-auto dark:prose-invert prose prose-lg md:p-4 md:pt-28  px-4 pt-10">
      <p>Last Updated: {lastUpdated.toDateString()}</p>
      <h1>{privacyPolicy.title}</h1>
      {privacyPolicy?.body ? <PortableText value={privacyPolicy.body} /> : null}
    </main>
  )
}
