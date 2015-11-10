Docker Set Up
=============

What is it?
-----------
This contains a dockerfile to quickly create a pathfinder application stack, be it for production or development uses.
It will pull the latest code from github, install the project dependencies and run the gulp task.
It also pulls the latest database changes from fuzzwork ready for installation upon startup of the container.

Nginx and PHP-FPM processes are also installed, configured and started under supervisor.

This docker setup is designed to run alongside a separate MySQL database container (see docker-compose.yml)

Documentation
-------------

Prerequisites
-------------
A running installation of Docker is required. Docker-Compose is also recommended to run this project to easily
link the pathfinder container to the database container.

Configuration
-------------
You can edit the configuration as you please in `app/pathfinder.ini`, `Dockerfile` and `docker-compose.yml`.
It is recommended that you change the mysql `MYSQL_ROOT_PASSWORD` in `docker-compose.yml` and `MYSQL_PASS` 
in `Dockerfile`, however this is not necessary as your mysql container should not have remote access from
outside your docker environment.

A few things to note:

* Make sure the `MYSQL_ROOT_PASSWORD` specified in `docker-compose.yml` is the same as `MYSQL_PASS` at the 
top of `Dockerfile`
* Be careful when changing anything in `app/pathfinder.ini` specified inside `{ }`, these are edited by the `Dockerfile`.
    * e.g `BASE = /home/{USER}/pathfinder`
    

Starting pathfinder
-----------------
Starting pathfinder should be easy! Simply run the following command:

	$ docker-compose up

This will download the official mysql container from dockerhub and start it, as well as building the project image
and running it. It will take a while the first time you run this.

That's it! Your pathfinder application is up and running and can be accessed on a
web browser. Just point to:

	http::/<your_pc_ip>:8080

You can change the outbound port easily in `docker-compose.yml`

Debugging
---------
Whilst your containers are up and running, you can log onto them with the following commands:

	$ docker ps

This will list all your active containers. You can use the container id to login:

	$ docker exec -it CONTAINER_ID bash

You can now look at the logs or modify the environment.

	$ tail -f /var/log/nginx/error.log