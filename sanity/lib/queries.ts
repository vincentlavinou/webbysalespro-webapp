import { groq } from "next-sanity";

// Get all posts
export const postsQuery = groq`*[_type == "post" && defined(slug.current)] | order(_createdAt asc) {
    _id, title, slug, images->{extendedImage}, publishedAt, excerpt
  }`;

// Get a single post by its slug
export const postQuery = groq`*[_type == "post" && slug.current == $slug][0]{ 
    title, images->{largeImage, openGraphImage}, 
    body, author->{name, image}, 
    excerpt, slug, 
    "headings": body[length(style) == 2 && string::startsWith(style, "h")]
  }`;

// Get all post slugs
export const postPathsQuery = groq`*[_type == "post" && defined(slug.current)][]{
    "params": { "slug": slug.current }
  }`;

// Get Privacy Policy
export const privacyPolicyQuery = groq`*[_type == "post" && slug.current == "privacy-policy"] | order(_createdAt asc) [0] {
  title, body, publishedAt, slug
} `;


export const termsOfServicesQuery = groq`*[_type == "post" && slug.current == "terms-of-services"] | order(_createdAt asc) [0] {
  title, body, publishedAt, slug
} `;


// Get About Message
export const aboutQuery = groq`*[_type == "about" && slug.current == "about-message"] | order(_createdAt asc) [0] {
  title, body, publishedAt, slug, mainImage
} `;

// Developer docs
export const gettingStartedDeveloper = groq`*[_type == "developer" && slug.current == "quest-ai-developer-integration-guide"] | order(_createdAt asc) [0] {
  title, body, publishedAt, slug, "headings": body[length(style) == 2 && string::startsWith(style, "h")]
} `;

export const landingPageFAQQuery = groq`*[_type == "faq"] | order(_createdAt asc)[0..5] {
  title, body, publishedAt
} `;