# p2p-chat monorepo

## Structure

```
/p2p-chat
  /apps
    /web          # Next.js frontend
    /mobile       # React Native frontend
    /server       # Signaling server
  /packages
    /core
    /crypto
    /sockets
```

> Each `apps/*` directory should contain its own `package.json` file with at least the dev, build and start scripts defined

## Running dev with SSL

> CWD: root

```bash
$ ./scripts/generate-cert

$ node apps/web/server.mjs
```
