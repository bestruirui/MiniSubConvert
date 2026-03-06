FROM node:alpine

LABEL org.opencontainers.image.authors="bestrui"
LABEL org.opencontainers.image.source="https://github.com/bestruirui/MiniSubConvert"
LABEL org.opencontainers.image.title="MiniSubConvert"
LABEL org.opencontainers.image.description="A lightweight subscription converter"

ENV HOST=0.0.0.0 \
    PORT=3000 \
    SECRET="minisubconvert"

EXPOSE $PORT

WORKDIR /app
COPY dist/minisubconvert.js /app/minisubconvert.js

USER node

CMD ["node", "minisubconvert.js"]