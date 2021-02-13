FROM node:carbon-alpine

WORKDIR /app
ARG NPM_TOKEN

COPY package*.json ./
COPY .npmrc .npmrc

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
RUN apk add --no-cache --update python build-base git \
	&& rm -rf /var/cache/apk/*

RUN yarn cache clean
RUN yarn install --production

COPY . .

RUN rm -f .npmrc
RUN apk del python build-base git

ENV NODE_ENV production

CMD [ "yarn", "start" ]
