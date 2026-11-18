# FM_HOSTED=1 builds a hosted user's copy (owner decision 011, task 080): no desktop
# helper calls in the page and no helper route in nginx. The default is the owner's app.
FROM node:22-alpine AS build
ARG FM_HOSTED=0
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN VITE_FM_HOSTED=$FM_HOSTED npm run build

FROM nginx:1.27-alpine
ARG FM_HOSTED=0
COPY nginx.conf nginx.hosted.conf /tmp/nginx/
RUN if [ "$FM_HOSTED" = "1" ]; then cp /tmp/nginx/nginx.hosted.conf /etc/nginx/conf.d/default.conf; \
    else cp /tmp/nginx/nginx.conf /etc/nginx/conf.d/default.conf; fi && rm -r /tmp/nginx
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
