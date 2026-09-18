# Play Bench

A single-page Next.js site for **Play Bench**, a contemporary art and creative studio. The design follows museum and gallery conventions: restrained typography, generous whitespace, catalog-style labeling, and exhibition-focused layout.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Structure

- `src/app/page.tsx` — single-page layout
- `src/components/` — header, hero, exhibition, collection, studio, visit, footer
- `src/lib/content.ts` — copy and exhibition data

Content (exhibitions, works, hours, contact) can be edited in `src/lib/content.ts`.
