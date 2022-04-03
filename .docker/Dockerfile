FROM node:lts-gallium

RUN adduser --disabled-password --home /code code

USER code

WORKDIR /code

RUN chown -R code:code .

COPY --chown=code:code . .