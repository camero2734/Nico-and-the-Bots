FROM node:lts-gallium

USER root

WORKDIR /code

RUN chown -R root:root .

COPY --chown=root:root . .

RUN yarn install

RUN yarn build

ENTRYPOINT [ "node" ]