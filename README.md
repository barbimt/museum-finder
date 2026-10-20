# Museum Finder

Search for museums and open a result to see its address. Matching places come from the public [Photon](https://photon.komoot.io/) geocoder.

## Stack

React, TypeScript, Vite, TanStack Query, and Leaflet. Styling is custom CSS.

## Prerequisites

Node.js and npm. The project is tested on Node.js 24.

## Setup

```sh
npm install
npm run dev
```

The dev server prints a local URL.

## Checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

`npm run preview` serves the production build from `dist`.

## How search works

A search is sent after the field has at least three characters and the user has paused for 400ms. The term is trimmed, internal spaces are collapsed, and it is lowercased, so `Tate  Modern` and `tate modern` share one result.

The request is `GET https://photon.komoot.io/api/` with `osm_tag=tourism:museum` and `limit=50`. Photon does not page past 50 features. The browser call uses the `AbortSignal` from TanStack Query, so a newer term cancels the previous request.

Results stay fresh for five minutes (`staleTime`). The cache keeps them for ten minutes (`gcTime`), which is long enough to show a recent term again while another search is on screen. Failed requests are not cached and are not retried automatically. The page shows an error with a Try again button, and the last successful list is not left in place after a failed search.

The list shows ten museums at a time from that single response. Show more reveals the next ten. Show less returns to the first ten. A museum selected from the extra results stays visible when the list collapses.

The address is a street line, then postcode, place, and country when Photon provides them. Missing parts are omitted. If Photon has no address, the details say so.

When a result includes valid coordinates, a read-only Leaflet map is loaded on selection. Museums without coordinates still show their address. Map tiles and attribution come from OpenStreetMap.

## Limits

The app depends on the public Photon demo server and OpenStreetMap tiles. Either can be slow or unavailable. The type is loaded from Google Fonts, with Georgia and system fonts as fallbacks.
