# cloudflared per tutte le architetture del NAS, compreso ARM a 32 bit (l'immagine ufficiale copre solo amd64 e arm64).
# Scarica il binario ufficiale dalle release di Cloudflare per l'architettura di destinazione.
FROM alpine:3.20
ARG TARGETARCH
ARG TARGETVARIANT
RUN apk add --no-cache ca-certificates curl \
 && case "${TARGETARCH}${TARGETVARIANT}" in \
      amd64) f=cloudflared-linux-amd64 ;; \
      arm64) f=cloudflared-linux-arm64 ;; \
      armv7) f=cloudflared-linux-arm ;; \
      *) echo "architettura non supportata: ${TARGETARCH}${TARGETVARIANT}" && exit 1 ;; \
    esac \
 && curl -fsSL -o /usr/local/bin/cloudflared "https://github.com/cloudflare/cloudflared/releases/latest/download/$f" \
 && chmod +x /usr/local/bin/cloudflared \
 && apk del curl \
 && cloudflared --version
USER nobody
ENTRYPOINT ["cloudflared", "--no-autoupdate"]
CMD ["tunnel", "run"]
