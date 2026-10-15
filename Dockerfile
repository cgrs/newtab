FROM caddy:2-alpine
COPY index.html /srv/index.html
COPY style.css /srv/style.css
COPY script.js /srv/script.js
COPY lit-html.js /srv/lit-html.js
EXPOSE 80
CMD ["caddy", "file-server", "--root", "/srv", "--listen", ":80"]
