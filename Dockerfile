FROM valkey/valkey-admin:1.1.1

COPY server.mjs /app/

CMD ["node", "/app/server.mjs"]
