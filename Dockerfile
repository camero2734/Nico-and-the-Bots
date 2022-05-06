FROM camer0/nico:latest

USER root
WORKDIR /code

CMD [ "bash", ".docker/entrypoint.sh" ]
