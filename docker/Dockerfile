FROM ubuntu:trusty
MAINTAINER Andrew Munro <synestry@gmail.com>

ENV ENVIRONMENT production
ENV USER pathfinder
ENV URL http://localhost
ENV NGINX_HOSTNAME localhost
ENV MYSQL_PASS changeme

# Install Packages
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -y php5-fpm php5-gd php5-mysql ruby ruby-dev nginx git nodejs npm wget mysql-client supervisor

# Add User
RUN adduser --disabled-password --gecos '' ${USER} && adduser ${USER} sudo && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER ${USER}
WORKDIR /home/${USER}

# Clone source
RUN sudo git clone https://github.com/exodus4d/pathfinder.git

# Concat latest eve mysql dump into single file
RUN wget https://www.fuzzwork.co.uk/dump/mysql-latest.tar.bz2
RUN mkdir evedump && tar xvf mysql-latest.tar.bz2 -C evedump
RUN touch evedump.sql && find ./evedump -type f -name "*.sql" -exec sh -c "cat {} > evedump.sql" \;
RUN rm -rf evedump && rm -rf mysql-latest.tar.bz2

USER root

# Configure nginx
ADD nginx/pathfinder /etc/nginx/sites-available/pathfinder
RUN sed -i -e "s@server_name {name};@server_name ${NGINX_HOSTNAME};@" /etc/nginx/sites-available/pathfinder
RUN sed -i -e "s@{USER}@${USER}@" /etc/nginx/sites-available/pathfinder
RUN rm /etc/nginx/sites-enabled/default
RUN ln -s /etc/nginx/sites-available/pathfinder /etc/nginx/sites-enabled/pathfinder
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN chown -R www-data:www-data /home/${USER}/pathfinder
RUN chmod -R 755 /home/${USER}/pathfinder

# Configure php-fpm and supervisor
RUN sed -i -e "s/;daemonize\s*=\s*yes/daemonize = no/g" /etc/php5/fpm/php-fpm.conf
ADD supervisor/conf.d /etc/supervisor/conf.d

# Install project dependencies, configure and build project
RUN ln -s /usr/bin/nodejs /usr/bin/node
WORKDIR /home/${USER}/pathfinder
ADD app/pathfinder.ini app/pathfinder.ini
RUN sed -i -e "s@URL = {URL}@URL = ${URL}@" app/pathfinder.ini
RUN sed -i -e "s@{MYSQL_PASS}@${MYSQL_PASS}@" app/pathfinder.ini
RUN sed -i -e "s@{USER}@${USER}@" app/pathfinder.ini
RUN npm install
RUN npm install --global gulp
RUN gulp ${ENVIRONMENT} --tag v0.0.15

# Expose 80, create entrypoint
EXPOSE 80
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
ADD entrypoint.sh /entrypoint.sh
RUN sed -i -e "s@{USER}@${USER}@" /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
