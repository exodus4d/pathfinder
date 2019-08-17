#!/bin/ash

htpasswd -B -b -c /etc/nginx/.setup_pass "$SETUP_USER" "$SETUP_PASS" && \
nginx