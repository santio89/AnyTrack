FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app

ENV NODE_ENV=production
ENV DB_PATH=/var/data/sqlite.db
ENV SCREENSHOTS_PATH=/var/data/screenshots
ENV REFERENCE_IMAGES_PATH=/var/data/reference-images
# Set at runtime: AI_GATEWAY_API_KEY, OPENROUTER_API_KEY, RESEND_API_KEY, NOTIFICATION_FROM_EMAIL
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /var/data /var/data/screenshots /var/data/reference-images

EXPOSE 3000

CMD ["npm", "start"]
