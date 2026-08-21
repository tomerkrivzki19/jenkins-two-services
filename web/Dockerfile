FROM nginx:alpine

ARG DEPLOYMENT_SLOT=local

COPY index.html /usr/share/nginx/html/index.html
COPY script.js /usr/share/nginx/html/script.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN printf '{"slot":"%s"}' "$DEPLOYMENT_SLOT" \
    > /usr/share/nginx/html/deployment.json

EXPOSE 80