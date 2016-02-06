FROM ubuntu:trusty
MAINTAINER Andrew Munro <synestry@gmail.com>

ENV ENVIRONMENT production
ENV USER pathfinder
ENV URL http://localhost
ENV NGINX_HOSTNAME localhost
ENV MYSQL_PASS changeme

# Install Packages
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -y python-software-properties software-properties-common
RUN add-apt-repository ppa:ondrej/php5-5.6 
RUN apt-get update && apt-get install -y --force-yes php5-fpm php5-gd php5-mysql ruby ruby-dev nginx git nodejs npm wget mysql-client supervisor sudo curl libcurl3 php5-curl

# Add User
RUN adduser --disabled-password --gecos '' ${USER} && adduser ${USER} sudo && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER ${USER}
WORKDIR /home/${USER}

# Clones source

# Concat latest eve mysql dump into single file
#RUN wget https://www.fuzzwork.co.uk/dump/mysql-latest.tar.bz2
#RUN mkdir evedump && tar xvf mysql-latest.tar.bz2 -C evedump
#RUN touch evedump.sql && find ./evedump -type f -name "*.sql" -exec sh -c "cat {} > evedump.sql" \;
#RUN rm -rf evedump && rm -rf mysql-latest.tar.bz2

RUN mkdir /home/${USER}/pathfinder
ADD ./ /home/${USER}/pathfinder/

RUN cp /home/${USER}/pathfinder/docker/evedump.sql /home/${USER}/

USER root

# Configure nginx
#ADD nginx/pathfinder /etc/nginx/sites-available/pathfinder
RUN cp /home/${USER}/pathfinder/docker/nginx/pathfinder /etc/nginx/sites-available/pathfinder
RUN sed -i -e "s@server_name {name};@server_name ${NGINX_HOSTNAME};@" /etc/nginx/sites-available/pathfinder
RUN sed -i -e "s@{USER}@${USER}@" /etc/nginx/sites-available/pathfinder
RUN rm /etc/nginx/sites-enabled/default
RUN ln -s /etc/nginx/sites-available/pathfinder /etc/nginx/sites-enabled/pathfinder
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN echo "always_populate_raw_post_data = -1" >> /etc/php5/fpm/php.ini
RUN chown -R www-data:www-data /home/${USER}/pathfinder
RUN chmod -R 755 /home/${USER}/pathfinder

# Configure php-fpm and supervisor
RUN sed -i -e "s/;daemonize\s*=\s*yes/daemonize = no/g" /etc/php5/fpm/php-fpm.conf
RUN cp -R /home/${USER}/pathfinder/docker/supervisor/conf.d/ /etc/supervisor/

# Install project dependencies, configure and build project
RUN ln -s /usr/bin/nodejs /usr/bin/node
WORKDIR /home/${USER}/pathfinder
RUN cp  /home/${USER}/pathfinder/docker/app/environment.ini app/environment.ini
RUN sed -i -e "s@URL = {URL}@URL = ${URL}@" app/environment.ini
RUN sed -i -e "s@{MYSQL_PASS}@${MYSQL_PASS}@" app/environment.ini
RUN sed -i -e "s@{USER}@${USER}@" app/environment.ini
RUN sudo npm install
RUN sudo npm install --global gulp
RUN gulp ${ENVIRONMENT}

# Expose 80, create entrypoint
EXPOSE 80
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN cp /home/${USER}/pathfinder/docker/entrypoint.sh /entrypoint.sh
RUN sed -i -e "s@{USER}@${USER}@" /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]