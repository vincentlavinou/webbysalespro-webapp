import React from 'react'
import { SanityDocument } from "@sanity/client";
import { PortableText } from "@portabletext/react";
import { sanityFetch } from "@sanity/lib/sanity-fetch";
import { termsOfServicesQuery } from '@sanity/lib/queries';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Services",
  description: "The terms of services"
}


export default async function TermsOfServicesPage() {
  
  const termsOfServices = await sanityFetch<SanityDocument>({ query: termsOfServicesQuery })
  const lastUpdated = termsOfServices._updatedAt == null ? new Date(termsOfServices.publishedAt) : new Date(termsOfServices._updatedAt)

  return (
    <main className="container mx-auto prose dark:prose-invert prose-lg md:p-4 md:pt-28 px-4 pt-10">
      <p>Last Updated: {lastUpdated.toDateString()}</p>
      <h1>{termsOfServices.title}</h1>
      {termsOfServices?.body ? <PortableText value={termsOfServices.body} /> : null}
    </main>
  )
}
