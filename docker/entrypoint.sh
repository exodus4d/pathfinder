#!/bin/bash
set -e

: ${MYSQL_USER:=root}
: ${MYSQL_PASS:=$MYSQL_ENV_MYSQL_ROOT_PASSWORD}
: ${MYSQL_HOST:=mysql}
: ${USER:=pathfinder}

while ! mysqladmin ping -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" --silent; do
    echo "Waiting for mysql container..."
    sleep 1
done

if ! mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" -e "use pathfinder" --silent; then
        echo "Creating pathfinder database"
        mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" -e "create database pathfinder;"
#        mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" pathfinder_clean < /home/$USER/pathfinder/export/sql/pathfinder.sql
fi
#
if ! mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" -e "use eve_db" --silent; then
        echo "Creating eve_db database"
        mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" -e "create database eve_db;"
        mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" eve_db < /home/$USER/evedump.sql
fi

/usr/bin/supervisord