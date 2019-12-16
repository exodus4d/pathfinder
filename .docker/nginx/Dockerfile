FROM nginx:1.17.2-alpine

COPY --chown=nginx:nginx . /usr/share/nginx/html/
COPY ./.docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./.docker/nginx/pathfinder-http.conf /etc/nginx/conf.d/default.conf
COPY ./.docker/nginx/h5bp/ /etc/nginx/h5bp/
COPY ./.docker/nginx/mime.types /etc/nginx/mime.types

RUN apk add --no-cache apache2-utils

COPY ./.docker/nginx/entrypoint.sh /root/entrypoint.sh
RUN chmod +x /root/entrypoint.sh
RUN chmod 0766 /usr/share/nginx/html/logs

ENTRYPOINT ["sh", "-c", "/root/entrypoint.sh"]