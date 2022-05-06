FROM camer0/nico:latest

USER root
WORKDIR /code

EXPOSE 4242

CMD [ "bash", ".docker/entrypoint.sh" ]
