FROM node:22-alpine AS build

ARG VITE_API_URL=http://localhost:4000
ARG VITE_KASPI_PHONE="+7 (777) 000-00-00"
ARG VITE_KASPI_AMOUNT=50000

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KASPI_PHONE=$VITE_KASPI_PHONE
ENV VITE_KASPI_AMOUNT=$VITE_KASPI_AMOUNT

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html ./
COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js vite.config.js ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
