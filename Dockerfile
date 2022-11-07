FROM node:18.12.0-alpine3.16 as builder
WORKDIR /app/

COPY ./package.json ./package-lock.json ./.npmrc ./.npmignore /app/
RUN npm ci

COPY . /app/
RUN npx esbuild --bundle --minify --outfile=./out/index.js --platform=node --sourcemap --target=node18 ./src/index.ts


FROM node:18.12.0-alpine3.16 as runner
WORKDIR /app/

COPY --from=builder /app/out/index.* /app/
ENTRYPOINT [ "node" ]
CMD [ "/app/index.js" ]
