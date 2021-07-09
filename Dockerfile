FROM node:16.4.2-alpine3.14 as builder
WORKDIR /app/

COPY ./package.json ./package-lock.json ./.npmrc ./.npmignore /app/
RUN npm ci

COPY . /app/
RUN npx esbuild --bundle --minify --outfile=./out/index.js --platform=node --sourcemap --target=node16 ./src/index.ts


FROM node:16.4.2-alpine3.14 as runner
WORKDIR /app/

COPY --from=builder /app/out/index.* /app/
ENTRYPOINT [ "node" ]
CMD [ "/app/index.js" ]
