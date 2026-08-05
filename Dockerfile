# Build the static Astro site, then serve dist/ with nginx.
# The app must be served at the site root "/" — asset paths are absolute
# (/app.js, /data/*.js). See nginx.conf for the cache/charset rationale.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# build needs only astro (dependencies); playwright etc. stay out of the image
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
