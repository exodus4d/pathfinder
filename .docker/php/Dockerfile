FROM php:7.2-fpm-alpine

RUN apk add --no-cache \
  curl-dev libpng-dev ${PHPIZE_DEPS} && \
  docker-php-ext-install curl gd pdo_mysql

RUN pecl install -o -f redis && \
  docker-php-ext-enable redis

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# RUN mkdir -p /usr/share/nginx/html && \
#   adduser -h /usr/share/nginx/html -D -u 1000 nginx

# RUN chown -R nginx:nginx /usr/share/nginx/html
# USER nginx

COPY --chown=www-data:www-data . /usr/share/nginx/html

WORKDIR /usr/share/nginx/html

RUN composer install

RUN chmod 0766 ./logs

RUN rm .htaccess
