# https://bun.sh/guides/ecosystem/docker

FROM oven/bun:1-alpine AS base
USER bun

FROM base AS install
WORKDIR /build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS release
WORKDIR /usr/src/app
RUN chown bun:bun /usr/src/app
COPY --from=install /build/node_modules node_modules
COPY . .

ENV NODE_ENV=production \
	EMOJI=🎉 \
	COLOR="#5865F2"

ENTRYPOINT [ "bun", "run", "." ]