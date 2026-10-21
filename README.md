# Museum Finder

A React application that lets users search for museums and view their addresses. Museum data comes from the [Photon API](https://photon.komoot.io/).

## Tech Stack

React, TypeScript, Vite, TanStack Query, Leaflet, and CSS.

## Getting Started

**Requirements:** Node.js 24 and npm.

Install the dependencies and start the development server:

```bash
npm install
npm run dev
```

## Testing and Build

Run the tests:

```bash
npm run test:run
```

Check code quality and types:

```bash
npm run format:check
npm run lint
npm run typecheck
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## How It Works

- **Search:** Users can search after entering at least three characters. Requests are delayed by 400ms to avoid unnecessary API calls.
- **Caching:** TanStack Query keeps search results fresh for five minutes, so repeated searches can reuse cached data.
- **Results:** The app fetches up to 50 museums and displays 10 at a time, with options to show more or fewer results.
- **Museum details:** Selecting a museum shows its available address and a location map when coordinates are provided.
- **Error handling:** If a request fails, users see an error message and can try again.

## Limitations

The app uses the public Photon API and OpenStreetMap tiles, so search results and maps depend on these services being available.
